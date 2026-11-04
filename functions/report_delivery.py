# functions/report_delivery.py
# ─────────────────────────────────────────────────────────────────────────────
# Batch 520 (PS-280): real report delivery by e-fax and by file drop, for the
# REPORT_DELIVERY interface transaction (receive_interface_message in main.py).
#
# PathScribe (the browser) can't send a fax or write to a hospital's server,
# so it sends the signed report PDF and its metadata here, and this module
# does the delivery. The production API server (ASP.NET Core) implements the
# same contract: docs/architecture/REPORT_DELIVERY_API.md.
#
#   FAX        through an email-to-fax gateway (Pete, Oct 10): one email per
#              fax, the PDF attached, to an address built from the fax number
#              (e.g. "{number}@efaxsend.com"). Provider-neutral: eFax Corporate,
#              SRFax, Documo mFax, RingCentral and most others accept it.
#              "Submitted" means the gateway accepted it; the provider's own
#              transmission report confirms delivery later (PS-281).
#   FILE_DROP  the PDF and a JSON metadata file, written to a configured
#              target: a directory (a local or mounted folder, or a UNC share
#              when this server runs inside the hospital's network) or an SFTP
#              server (the route from a cloud deployment). Files are written
#              under a temporary name and renamed when complete, so a reader
#              polling the folder never picks up half a file. An existing file
#              is never overwritten.
#
# Settings come from the server's environment (secrets stay here, never in
# PathScribe's data). PathScribe sends only a target name for a file drop.
#   FAX_SMTP_HOST, FAX_SMTP_PORT (587), FAX_SMTP_SECURITY (starttls | ssl |
#   none; starttls), FAX_SMTP_USERNAME, FAX_SMTP_PASSWORD, FAX_FROM_ADDRESS,
#   FAX_TO_PATTERN (must contain {number}), FAX_NUMBER_FORMAT (digits |
#   e164; digits), FAX_SUBJECT (Pathology report).
#   FILE_DROP_TARGETS: JSON, {"<targetId>": {"type": "directory", "path": "…"}
#   | {"type": "sftp", "host": "…", "port": 22, "username": "…",
#   "passwordEnv": "<env var holding the password>" | "privateKeyPath": "…",
#   "hostKey": "<key type> <base64 public key>", "path": "/inbound"}}.
#   An SFTP target must name its host key: an unknown host is refused.
# ─────────────────────────────────────────────────────────────────────────────

from __future__ import annotations

import base64
import hashlib
import io
import json
import os
import re
import smtplib
from email.message import EmailMessage
from typing import Callable

CHANNELS = ('FAX', 'FILE_DROP')
MAX_PDF_BYTES = 20 * 1024 * 1024
_SAFE_NAME = re.compile(r'[^A-Za-z0-9._-]+')


class DeliveryNotConfigured(Exception):
    """The server has no settings for this channel or target (HTTP 503)."""


class DeliveryFailed(Exception):
    """The channel was reached and the delivery failed (HTTP 502)."""


# ── Validation ───────────────────────────────────────────────────────────────

def normalize_fax_number(raw: str | None) -> str | None:
    """Digits only, with an optional leading +; 7 to 15 digits (E.164 allows
    up to 15). Spaces, dots, dashes and brackets are dropped. Anything else
    (letters, an extension) is refused: None."""
    if not raw or not isinstance(raw, str):
        return None
    s = raw.strip()
    plus = s.startswith('+')
    body = re.sub(r'[\s().-]', '', s[1:] if plus else s)
    if not body.isdigit() or not 7 <= len(body) <= 15:
        return None
    return ('+' if plus else '') + body


def safe_file_name(name: str) -> str:
    """A file name that can't leave its folder: letters, digits, dot, dash and
    underscore only, no leading dots, at most 120 characters."""
    cleaned = _SAFE_NAME.sub('_', name or '').strip('._')[:120]
    return cleaned or 'report'


def validate_report_delivery(payload: dict) -> str | None:
    """The REPORT_DELIVERY payload, checked before anything is sent."""
    channel = payload.get('channel')
    if channel not in CHANNELS:
        return f'REPORT_DELIVERY channel must be one of {list(CHANNELS)}'
    for field in ('caseId', 'reportType', 'documentName', 'pdfBase64'):
        if not payload.get(field):
            return f'REPORT_DELIVERY payload is missing {field}'
    try:
        pdf = base64.b64decode(payload['pdfBase64'], validate=True)
    except (ValueError, TypeError):
        return 'REPORT_DELIVERY pdfBase64 is not valid base64'
    if not pdf.startswith(b'%PDF'):
        return 'REPORT_DELIVERY pdfBase64 is not a PDF'
    if len(pdf) > MAX_PDF_BYTES:
        return f'REPORT_DELIVERY PDF is larger than {MAX_PDF_BYTES // (1024 * 1024)} MB'
    if channel == 'FAX':
        if normalize_fax_number((payload.get('fax') or {}).get('number')) is None:
            return 'REPORT_DELIVERY fax number is missing or not a fax number'
    if channel == 'FILE_DROP' and not (payload.get('fileDrop') or {}).get('targetId'):
        return 'REPORT_DELIVERY fileDrop.targetId is missing'
    return None


def stored_copy(payload: dict) -> dict:
    """What the receiver keeps of a delivery: everything but the PDF itself
    (a stored record has a 1 MB limit, and the PDF is the lab's signed copy
    anyway), with its size and SHA-256 so the record proves which PDF went."""
    pdf = base64.b64decode(payload['pdfBase64'])
    rest = {k: v for k, v in payload.items() if k != 'pdfBase64'}
    return {**rest, 'pdfBytes': len(pdf), 'pdfSha256': hashlib.sha256(pdf).hexdigest()}


# ── Fax by email gateway ─────────────────────────────────────────────────────

def fax_settings(env: dict) -> dict:
    host = env.get('FAX_SMTP_HOST')
    pattern = env.get('FAX_TO_PATTERN')
    sender = env.get('FAX_FROM_ADDRESS')
    if not host or not pattern or not sender:
        raise DeliveryNotConfigured('Fax is not set up on the interface server (FAX_SMTP_HOST, FAX_TO_PATTERN and FAX_FROM_ADDRESS are needed).')
    if '{number}' not in pattern:
        raise DeliveryNotConfigured('FAX_TO_PATTERN must contain {number}, e.g. {number}@efaxsend.com.')
    security = (env.get('FAX_SMTP_SECURITY') or 'starttls').lower()
    if security not in ('starttls', 'ssl', 'none'):
        raise DeliveryNotConfigured('FAX_SMTP_SECURITY must be starttls, ssl or none.')
    number_format = (env.get('FAX_NUMBER_FORMAT') or 'digits').lower()
    if number_format not in ('digits', 'e164'):
        raise DeliveryNotConfigured('FAX_NUMBER_FORMAT must be digits or e164.')
    return {
        'host': host,
        'port': int(env.get('FAX_SMTP_PORT') or (465 if security == 'ssl' else 587)),
        'security': security,
        'username': env.get('FAX_SMTP_USERNAME') or None,
        'password': env.get('FAX_SMTP_PASSWORD') or None,
        'from': sender,
        'pattern': pattern,
        'number_format': number_format,
        'subject': env.get('FAX_SUBJECT') or 'Pathology report',
    }


def fax_address(number: str, settings: dict) -> str:
    n = number if settings['number_format'] == 'e164' else number.lstrip('+')
    return settings['pattern'].replace('{number}', n)


def build_fax_email(payload: dict, settings: dict) -> EmailMessage:
    number = normalize_fax_number(payload['fax']['number'])
    msg = EmailMessage()
    msg['From'] = settings['from']
    msg['To'] = fax_address(number, settings)
    msg['Subject'] = settings['subject']
    recipient = (payload.get('fax') or {}).get('recipientName')
    msg.set_content(f'For: {recipient}\n' if recipient else '\n')
    msg.add_attachment(base64.b64decode(payload['pdfBase64']), maintype='application', subtype='pdf',
                       filename=safe_file_name(payload['documentName']) + '.pdf')
    return msg


def send_fax(payload: dict, env: dict, smtp_factory: Callable | None = None) -> dict:
    """Submits the fax to the gateway. smtp_factory(host, port, ssl) returns an
    smtplib-like client (tests pass their own); by default smtplib itself."""
    settings = fax_settings(env)
    msg = build_fax_email(payload, settings)
    factory = smtp_factory or (lambda host, port, ssl: (smtplib.SMTP_SSL if ssl else smtplib.SMTP)(host, port, timeout=30))
    try:
        client = factory(settings['host'], settings['port'], settings['security'] == 'ssl')
        try:
            if settings['security'] == 'starttls':
                client.starttls()
            if settings['username']:
                client.login(settings['username'], settings['password'] or '')
            refused = client.send_message(msg)
        finally:
            try:
                client.quit()
            except Exception:  # noqa: BLE001 — the message is already sent or already failed
                pass
    except (smtplib.SMTPException, OSError) as e:
        raise DeliveryFailed(f'The fax gateway refused or could not be reached: {e}') from e
    if refused:
        raise DeliveryFailed(f'The fax gateway refused the recipient {msg["To"]}.')
    return {'status': 'SUBMITTED', 'detail': f'Submitted to the fax gateway for {msg["To"]}.', 'to': msg['To']}


# ── File drop ────────────────────────────────────────────────────────────────

def file_drop_targets(env: dict) -> dict:
    raw = env.get('FILE_DROP_TARGETS')
    if not raw:
        return {}
    try:
        targets = json.loads(raw)
    except ValueError as e:
        raise DeliveryNotConfigured(f'FILE_DROP_TARGETS is not valid JSON: {e}') from e
    if not isinstance(targets, dict):
        raise DeliveryNotConfigured('FILE_DROP_TARGETS must be a JSON object of targets.')
    return targets


def metadata_for(payload: dict) -> dict:
    """The JSON written next to the PDF: what a receiving system needs to file it."""
    meta = payload.get('metadata') or {}
    pdf = base64.b64decode(payload['pdfBase64'])
    return {
        **meta,
        'caseId': payload['caseId'],
        'reportType': payload['reportType'],
        'releasedAt': payload.get('releasedAt'),
        'documentName': payload['documentName'],
        'pdfSha256': hashlib.sha256(pdf).hexdigest(),
        'source': 'PathScribe',
    }


def _drop_to_directory(target: dict, base: str, files: list[tuple[str, bytes]]) -> list[str]:
    folder = target.get('path')
    if not folder or not os.path.isdir(folder):
        raise DeliveryFailed(f'The file-drop folder {folder!r} does not exist or cannot be reached from this server.')
    name = base
    n = 1
    while any(os.path.exists(os.path.join(folder, name + ext)) for ext, _ in files):
        n += 1
        name = f'{base}_{n}'
    written = []
    try:
        for ext, data in files:
            final = os.path.join(folder, name + ext)
            temp = final + '.part'
            with open(temp, 'xb') as f:
                f.write(data)
            os.replace(temp, final)
            written.append(final)
    except OSError as e:
        raise DeliveryFailed(f'Could not write to the file-drop folder: {e}') from e
    return written


def _sftp_connect(target: dict, env: dict, transport_factory: Callable | None):
    """An SFTP client to the target, with its host key checked against the one
    configured. Without paramiko installed, the SFTP route is not available."""
    if transport_factory:
        return transport_factory(target)
    try:
        import paramiko  # noqa: PLC0415 — optional; only an SFTP target needs it
    except ImportError as e:
        raise DeliveryNotConfigured('SFTP needs the paramiko package on the interface server (requirements.txt).') from e
    host, port = target.get('host'), int(target.get('port') or 22)
    expected = (target.get('hostKey') or '').split()
    if not host or not target.get('username') or len(expected) < 2:
        raise DeliveryNotConfigured('An SFTP target needs host, username and hostKey ("<type> <base64 key>").')
    pkey = None
    if target.get('privateKeyPath'):
        pkey = paramiko.PKey.from_path(target['privateKeyPath'])
    password = env.get(target['passwordEnv']) if target.get('passwordEnv') else None
    try:
        transport = paramiko.Transport((host, port))
        transport.start_client(timeout=30)
        key = transport.get_remote_server_key()
        if key.get_name() != expected[0] or key.get_base64() != expected[1]:
            transport.close()
            raise DeliveryFailed(f'The SFTP server {host} did not present the configured host key; nothing was sent.')
        if pkey is not None:
            transport.auth_publickey(target['username'], pkey)
        else:
            transport.auth_password(target['username'], password or '')
        return paramiko.SFTPClient.from_transport(transport)
    except DeliveryFailed:
        raise
    except Exception as e:  # noqa: BLE001 — paramiko raises several families of errors
        raise DeliveryFailed(f'Could not connect to the SFTP server {host}: {e}') from e


def _drop_to_sftp(target: dict, env: dict, base: str, files: list[tuple[str, bytes]], transport_factory: Callable | None) -> list[str]:
    sftp = _sftp_connect(target, env, transport_factory)
    folder = (target.get('path') or '.').rstrip('/') or '/'

    def exists(p: str) -> bool:
        try:
            sftp.stat(p)
            return True
        except OSError:
            return False

    try:
        name, n = base, 1
        while any(exists(f'{folder}/{name}{ext}') for ext, _ in files):
            n += 1
            name = f'{base}_{n}'
        written = []
        for ext, data in files:
            final = f'{folder}/{name}{ext}'
            temp = final + '.part'
            sftp.putfo(io.BytesIO(data), temp)
            sftp.rename(temp, final)
            written.append(final)
        return written
    except OSError as e:
        raise DeliveryFailed(f'Could not write to the SFTP folder {folder}: {e}') from e
    finally:
        try:
            sftp.close()
        except Exception:  # noqa: BLE001
            pass


def drop_file(payload: dict, env: dict, sftp_factory: Callable | None = None) -> dict:
    target_id = payload['fileDrop']['targetId']
    target = file_drop_targets(env).get(target_id)
    if not target:
        raise DeliveryNotConfigured(f'File-drop target {target_id!r} is not set up on the interface server (FILE_DROP_TARGETS).')
    base = safe_file_name(payload['documentName'])
    files = [('.pdf', base64.b64decode(payload['pdfBase64'])),
             ('.json', json.dumps(metadata_for(payload), indent=2, ensure_ascii=False).encode('utf-8'))]
    kind = target.get('type')
    if kind == 'directory':
        written = _drop_to_directory(target, base, files)
    elif kind == 'sftp':
        written = _drop_to_sftp(target, env, base, files, sftp_factory)
    else:
        raise DeliveryNotConfigured(f'File-drop target {target_id!r} has an unknown type {kind!r} (directory or sftp).')
    return {'status': 'DELIVERED', 'detail': f'Written to {target_id}: {", ".join(os.path.basename(w) for w in written)}.', 'files': written}


# ── Entry point ──────────────────────────────────────────────────────────────

def deliver(payload: dict, env: dict | None = None, *, smtp_factory: Callable | None = None, sftp_factory: Callable | None = None) -> dict:
    """Delivers one validated REPORT_DELIVERY payload. Returns the outcome, or
    raises DeliveryNotConfigured / DeliveryFailed."""
    env = os.environ if env is None else env
    if payload['channel'] == 'FAX':
        return send_fax(payload, env, smtp_factory)
    return drop_file(payload, env, sftp_factory)
