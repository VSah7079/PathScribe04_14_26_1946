# functions/test_report_delivery.py
# ─────────────────────────────────────────────────────────────────────────────
# Batch 520 (PS-280): report delivery by e-fax (email-to-fax gateway) and by
# file drop (folder or SFTP), tested end to end over real network connections:
#   • a real SMTP server on 127.0.0.1 receives the fax email (smtplib talks to
#     it over a socket; the test reads back the message it got);
#   • a real SFTP server on 127.0.0.1 (paramiko's server side, serving a
#     temporary folder) receives the dropped files, with host-key checking;
#   • a real temporary folder receives a directory drop.
# Login and STARTTLS are checked with a recording client (the local mail server
# here speaks plain SMTP). The receiver's handling of REPORT_DELIVERY is tested
# through receive_interface_message itself.
#
# Run: python test_report_delivery.py   (needs requirements.txt, paramiko included)
# ─────────────────────────────────────────────────────────────────────────────

import base64
import email
import json
import os
import socket
import socketserver
import sys
import tempfile
import threading

import paramiko

import report_delivery as rd

PASS_COUNT = 0


def check(condition: bool, description: str):
    global PASS_COUNT
    if not condition:
        print(f"FAILED: {description}")
        sys.exit(1)
    PASS_COUNT += 1
    print(f"  ok — {description}")


PDF = b'%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\ntrailer << /Root 1 0 R >>\n%%EOF\n'
PDF_B64 = base64.b64encode(PDF).decode()


def payload(channel='FAX', **over):
    p = {
        'channel': channel, 'caseId': 'case-1', 'reportType': 'FINAL', 'releasedAt': '2026-10-10T20:00:00Z',
        'documentName': 'S26-0001_FINAL_20261010T200000Z', 'pdfBase64': PDF_B64,
        'metadata': {'accession': 'S26-0001', 'mrn': 'MRN-1', 'orderingPhysician': 'Dr A Smith'},
    }
    if channel == 'FAX':
        p['fax'] = {'number': '+1 (520) 555-0100', 'recipientName': 'Dr A Smith'}
    else:
        p['fileDrop'] = {'targetId': 'client-a'}
    p.update(over)
    return p


# ── A real SMTP server on localhost ──────────────────────────────────────────

class _SmtpHandler(socketserver.StreamRequestHandler):
    def handle(self):
        server = self.server
        w = lambda line: self.wfile.write((line + '\r\n').encode())  # noqa: E731
        w('220 localhost test SMTP')
        mail_from, rcpts = None, []
        while True:
            line = self.rfile.readline().decode('utf-8', 'replace').rstrip('\r\n')
            if not line:
                return
            cmd = line[:4].upper()
            if cmd in ('EHLO', 'HELO'):
                w('250 localhost')
            elif cmd == 'MAIL':
                mail_from, rcpts = line[10:].strip('<> '), []
                w('250 OK')
            elif cmd == 'RCPT':
                addr = line[8:].strip('<> ')
                if addr.startswith('refuse'):
                    w('550 No such user')
                else:
                    rcpts.append(addr)
                    w('250 OK')
            elif cmd == 'DATA':
                w('354 End data with <CR><LF>.<CR><LF>')
                lines = []
                while True:
                    d = self.rfile.readline()
                    if d in (b'.\r\n', b'.\n'):
                        break
                    lines.append(d[1:] if d.startswith(b'..') else d)
                server.received.append({'from': mail_from, 'to': rcpts, 'data': b''.join(lines)})
                w('250 OK queued')
            elif cmd == 'QUIT':
                w('221 Bye')
                return
            else:
                w('250 OK')


class _SmtpServer(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True

    def __init__(self):
        super().__init__(('127.0.0.1', 0), _SmtpHandler)
        self.received = []


# ── A real SFTP server on localhost ──────────────────────────────────────────

class _Handle(paramiko.SFTPHandle):
    def stat(self):
        return paramiko.SFTPAttributes.from_stat(os.fstat(self.readfile.fileno()))


class _FolderSftp(paramiko.SFTPServerInterface):
    root = ''

    def _real(self, path):
        real = os.path.realpath(os.path.join(self.root, path.lstrip('/')))
        if not real.startswith(os.path.realpath(self.root)):
            raise PermissionError(path)
        return real

    def stat(self, path):
        try:
            return paramiko.SFTPAttributes.from_stat(os.stat(self._real(path)))
        except OSError as e:
            return paramiko.SFTPServer.convert_errno(e.errno)

    lstat = stat

    def open(self, path, flags, attr):
        try:
            fd = os.open(self._real(path), flags | getattr(os, 'O_BINARY', 0), 0o644)
        except OSError as e:
            return paramiko.SFTPServer.convert_errno(e.errno)
        mode = 'wb' if flags & os.O_WRONLY else ('r+b' if flags & os.O_RDWR else 'rb')
        f = os.fdopen(fd, mode)
        h = _Handle(flags)
        h.filename, h.readfile, h.writefile = path, f, f
        return h

    def rename(self, oldpath, newpath):
        try:
            os.rename(self._real(oldpath), self._real(newpath))
        except OSError as e:
            return paramiko.SFTPServer.convert_errno(e.errno)
        return paramiko.SFTP_OK

    def remove(self, path):
        try:
            os.remove(self._real(path))
        except OSError as e:
            return paramiko.SFTPServer.convert_errno(e.errno)
        return paramiko.SFTP_OK


class _Auth(paramiko.ServerInterface):
    def check_auth_password(self, username, password):
        return paramiko.AUTH_SUCCESSFUL if (username, password) == ('lab', 's3cret') else paramiko.AUTH_FAILED

    def get_allowed_auths(self, username):
        return 'password'

    def check_channel_request(self, kind, chanid):
        return paramiko.OPEN_SUCCEEDED if kind == 'session' else paramiko.OPEN_FAILED_ADMINISTRATIVELY_PROHIBITED


class _SftpServer:
    def __init__(self, root):
        self.key = paramiko.RSAKey.generate(2048)
        _FolderSftp.root = root
        self.sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        self.sock.bind(('127.0.0.1', 0))
        self.sock.listen(5)
        self.port = self.sock.getsockname()[1]
        threading.Thread(target=self._serve, daemon=True).start()

    def _serve(self):
        while True:
            try:
                conn, _ = self.sock.accept()
            except OSError:
                return
            t = paramiko.Transport(conn)
            t.add_server_key(self.key)
            t.set_subsystem_handler('sftp', paramiko.SFTPServer, _FolderSftp)
            t.start_server(server=_Auth())

    @property
    def host_key(self):
        return f'{self.key.get_name()} {self.key.get_base64()}'


# ── Tests ────────────────────────────────────────────────────────────────────

def test_validation():
    print('test_validation')
    check(rd.validate_report_delivery(payload()) is None, 'a complete fax delivery is valid')
    check(rd.validate_report_delivery(payload('FILE_DROP')) is None, 'a complete file drop is valid')
    check('channel' in rd.validate_report_delivery(payload(channel='EMAIL')), 'an unknown channel is refused')
    check('not a PDF' in rd.validate_report_delivery(payload(pdfBase64=base64.b64encode(b'hello').decode())), 'a non-PDF is refused')
    check('base64' in rd.validate_report_delivery(payload(pdfBase64='***')), 'bad base64 is refused')
    check('fax number' in rd.validate_report_delivery(payload(fax={'number': '555-CALL-NOW'})), 'a fax number with letters is refused')
    check('targetId' in rd.validate_report_delivery(payload('FILE_DROP', fileDrop={})), 'a file drop without a target is refused')
    check(rd.normalize_fax_number('+1 (520) 555-0100') == '+15205550100', 'a fax number keeps its + and digits')
    check(rd.normalize_fax_number('020 7946 0018') == '02079460018', 'a national number keeps its digits')
    check(rd.normalize_fax_number('123') is None and rd.normalize_fax_number('12345678901234567') is None, 'too short or too long is refused')
    check(rd.safe_file_name('../../etc/passwd') == 'etc_passwd', 'a file name cannot leave its folder')
    stored = rd.stored_copy(payload())
    check('pdfBase64' not in stored and stored['pdfBytes'] == len(PDF) and len(stored['pdfSha256']) == 64, 'the stored record keeps the PDF size and hash, not the PDF')


FAX_ENV = {'FAX_SMTP_HOST': '127.0.0.1', 'FAX_SMTP_SECURITY': 'none', 'FAX_FROM_ADDRESS': 'reports@lab.example', 'FAX_TO_PATTERN': '{number}@fax.example'}


def test_fax_over_a_real_smtp_connection():
    print('test_fax_over_a_real_smtp_connection')
    server = _SmtpServer()
    threading.Thread(target=server.serve_forever, daemon=True).start()
    env = {**FAX_ENV, 'FAX_SMTP_PORT': str(server.server_address[1])}
    try:
        result = rd.deliver(payload(), env)
        check(result['status'] == 'SUBMITTED' and result['to'] == '15205550100@fax.example', 'the gateway accepted it, addressed from the number (digits)')
        check(len(server.received) == 1 and server.received[0]['to'] == ['15205550100@fax.example'], 'the mail server received one message for the fax address')
        msg = email.message_from_bytes(server.received[0]['data'])
        check(msg['Subject'] == 'Pathology report' and msg['From'] == 'reports@lab.example', 'subject and sender as configured')
        parts = [p for p in msg.walk() if p.get_content_type() == 'application/pdf']
        check(len(parts) == 1 and parts[0].get_payload(decode=True) == PDF, 'the PDF arrived intact as the attachment')
        check(parts[0].get_filename() == 'S26-0001_FINAL_20261010T200000Z.pdf', 'the attachment is named from the document name')
        r2 = rd.deliver(payload(), {**env, 'FAX_NUMBER_FORMAT': 'e164'})
        check(r2['to'] == '+15205550100@fax.example', 'e164 format keeps the +')
        try:
            rd.deliver(payload(), {**env, 'FAX_TO_PATTERN': 'refuse-{number}@fax.example'})
            check(False, 'a refused recipient raises')
        except rd.DeliveryFailed as e:
            check('refused' in str(e), 'a recipient the gateway refuses is a failed delivery')
    finally:
        server.shutdown()
        server.server_close()
    try:
        rd.deliver(payload(), {**env})
        check(False, 'an unreachable gateway raises')
    except rd.DeliveryFailed as e:
        check('could not be reached' in str(e) or 'refused' in str(e), 'an unreachable gateway is a failed delivery, with the reason')


def test_fax_login_and_starttls():
    print('test_fax_login_and_starttls')
    calls = []

    class Recording:
        def __init__(self, host, port, ssl):
            calls.append(('connect', host, port, ssl))

        def starttls(self):
            calls.append(('starttls',))

        def login(self, u, p):
            calls.append(('login', u, p))

        def send_message(self, msg):
            calls.append(('send', msg['To']))
            return {}

        def quit(self):
            calls.append(('quit',))

    env = {**FAX_ENV, 'FAX_SMTP_HOST': 'smtp.gateway.example', 'FAX_SMTP_SECURITY': 'starttls', 'FAX_SMTP_USERNAME': 'lab', 'FAX_SMTP_PASSWORD': 'pw'}
    del env['FAX_SMTP_SECURITY']
    rd.deliver(payload(), env, smtp_factory=Recording)
    check(calls == [('connect', 'smtp.gateway.example', 587, False), ('starttls',), ('login', 'lab', 'pw'), ('send', '15205550100@fax.example'), ('quit',)],
          'default: port 587, STARTTLS, then login, then send')
    calls.clear()
    rd.deliver(payload(), {**env, 'FAX_SMTP_SECURITY': 'ssl'}, smtp_factory=Recording)
    check(calls[0] == ('connect', 'smtp.gateway.example', 465, True) and ('starttls',) not in calls, 'ssl: port 465, encrypted from the start')


def test_fax_not_configured():
    print('test_fax_not_configured')
    for env, word in (({}, 'not set up'), ({**FAX_ENV, 'FAX_TO_PATTERN': 'fax@x.example'}, '{number}'), ({**FAX_ENV, 'FAX_SMTP_SECURITY': 'tls13'}, 'FAX_SMTP_SECURITY')):
        try:
            rd.deliver(payload(), env)
            check(False, 'should raise')
        except rd.DeliveryNotConfigured as e:
            check(word in str(e), f'not configured: {word}')


def test_file_drop_to_a_folder():
    print('test_file_drop_to_a_folder')
    with tempfile.TemporaryDirectory() as folder:
        env = {'FILE_DROP_TARGETS': json.dumps({'client-a': {'type': 'directory', 'path': folder}})}
        result = rd.deliver(payload('FILE_DROP'), env)
        names = sorted(os.listdir(folder))
        check(result['status'] == 'DELIVERED' and names == ['S26-0001_FINAL_20261010T200000Z.json', 'S26-0001_FINAL_20261010T200000Z.pdf'], 'the PDF and its metadata, named from the document name; no .part file left')
        with open(os.path.join(folder, names[1]), 'rb') as f:
            check(f.read() == PDF, 'the PDF is intact')
        with open(os.path.join(folder, names[0]), encoding='utf-8') as f:
            meta = json.load(f)
        check(meta['accession'] == 'S26-0001' and meta['reportType'] == 'FINAL' and meta['source'] == 'PathScribe' and len(meta['pdfSha256']) == 64, 'the metadata names the accession, report type, and the PDF hash')
        rd.deliver(payload('FILE_DROP'), env)
        check('S26-0001_FINAL_20261010T200000Z_2.pdf' in os.listdir(folder), 'a second drop of the same name never overwrites: _2')
    try:
        rd.deliver(payload('FILE_DROP'), {'FILE_DROP_TARGETS': json.dumps({'client-a': {'type': 'directory', 'path': '/no/such/folder'}})})
        check(False, 'should raise')
    except rd.DeliveryFailed as e:
        check('cannot be reached' in str(e), 'a folder this server cannot reach is a failed delivery')
    for env, word in (({}, 'not set up'), ({'FILE_DROP_TARGETS': '{bad'}, 'not valid JSON'), ({'FILE_DROP_TARGETS': json.dumps({'client-a': {'type': 'ftp'}})}, 'unknown type')):
        try:
            rd.deliver(payload('FILE_DROP'), env)
            check(False, 'should raise')
        except rd.DeliveryNotConfigured as e:
            check(word in str(e), f'not configured: {word}')


def test_file_drop_over_real_sftp():
    print('test_file_drop_over_real_sftp')
    with tempfile.TemporaryDirectory() as root:
        os.mkdir(os.path.join(root, 'inbound'))
        server = _SftpServer(root)
        target = {'type': 'sftp', 'host': '127.0.0.1', 'port': server.port, 'username': 'lab', 'passwordEnv': 'CLIENT_A_SFTP_PASSWORD', 'hostKey': server.host_key, 'path': '/inbound'}
        env = {'FILE_DROP_TARGETS': json.dumps({'client-a': target}), 'CLIENT_A_SFTP_PASSWORD': 's3cret'}
        result = rd.deliver(payload('FILE_DROP'), env)
        names = sorted(os.listdir(os.path.join(root, 'inbound')))
        check(result['status'] == 'DELIVERED' and names == ['S26-0001_FINAL_20261010T200000Z.json', 'S26-0001_FINAL_20261010T200000Z.pdf'], 'both files arrived on the SFTP server, renamed from .part when complete')
        with open(os.path.join(root, 'inbound', names[1]), 'rb') as f:
            check(f.read() == PDF, 'the PDF is intact over SFTP')
        rd.deliver(payload('FILE_DROP'), env)
        check('S26-0001_FINAL_20261010T200000Z_2.pdf' in os.listdir(os.path.join(root, 'inbound')), 'no overwrite over SFTP either')
        other = paramiko.RSAKey.generate(2048)
        wrong = {**target, 'hostKey': f'{other.get_name()} {other.get_base64()}'}
        try:
            rd.deliver(payload('FILE_DROP'), {**env, 'FILE_DROP_TARGETS': json.dumps({'client-a': wrong})})
            check(False, 'should raise')
        except rd.DeliveryFailed as e:
            check('host key' in str(e), 'a server presenting another host key is refused, nothing sent')
        try:
            rd.deliver(payload('FILE_DROP'), {**env, 'CLIENT_A_SFTP_PASSWORD': 'wrong'})
            check(False, 'should raise')
        except rd.DeliveryFailed as e:
            check('Could not connect' in str(e), 'a wrong password is a failed delivery')
        try:
            rd.deliver(payload('FILE_DROP'), {**env, 'FILE_DROP_TARGETS': json.dumps({'client-a': {**target, 'hostKey': ''}})})
            check(False, 'should raise')
        except rd.DeliveryNotConfigured as e:
            check('hostKey' in str(e), 'an SFTP target without a host key is not accepted')
        server.sock.close()


def test_receiver_carries_out_and_records_the_delivery():
    print('test_receiver_carries_out_and_records_the_delivery')
    import main
    from firebase_functions import https_fn
    from flask import Flask
    app = Flask(__name__)
    app.app_context().push()
    stored = {}

    class Doc:
        id = 'doc-1'

        def set(self, data):
            stored.update(data)

    class Client:
        def collection(self, name):
            return type('C', (), {'document': lambda self: Doc()})()

    def call(envelope):
        req = https_fn.Request.from_values(method='POST', content_type='application/json', data=json.dumps(envelope))
        with app.request_context(req.environ):
            return main.receive_interface_message(req)

    original_client, original_env = main.firestore.client, dict(os.environ)
    main.firestore.client = lambda: Client()
    try:
        with tempfile.TemporaryDirectory() as folder:
            os.environ['FILE_DROP_TARGETS'] = json.dumps({'client-a': {'type': 'directory', 'path': folder}})
            env = {'queueEntryId': 'q-1', 'transactionType': 'REPORT_DELIVERY', 'dispatchedAt': '2026-10-10T20:00:01Z', 'payload': payload('FILE_DROP')}
            resp = call(env)
            body = json.loads(resp.data)
            check(resp.status_code == 200 and body['delivery']['status'] == 'DELIVERED', 'the receiver delivers and answers DELIVERED')
            check('pdfBase64' not in stored['payload'] and stored['delivery']['status'] == 'DELIVERED' and stored['payload']['pdfBytes'] == len(PDF), 'the record has the outcome and the PDF hash, not the PDF')
            os.environ['FILE_DROP_TARGETS'] = json.dumps({})
            resp = call(env)
            check(resp.status_code == 503 and 'not set up' in json.loads(resp.data)['error'], 'a target this server lacks: 503, with the reason')
            os.environ['FILE_DROP_TARGETS'] = json.dumps({'client-a': {'type': 'directory', 'path': '/no/such/folder'}})
            resp = call(env)
            check(resp.status_code == 502 and json.loads(resp.data)['ok'] is False, 'a folder it cannot reach: 502')
            bad = {**env, 'payload': payload('FILE_DROP', pdfBase64=base64.b64encode(b'x').decode())}
            check(call(bad).status_code == 422, 'an invalid delivery is refused before anything is sent: 422')
    finally:
        main.firestore.client = original_client
        os.environ.clear()
        os.environ.update(original_env)


if __name__ == '__main__':
    test_validation()
    test_fax_over_a_real_smtp_connection()
    test_fax_login_and_starttls()
    test_fax_not_configured()
    test_file_drop_to_a_folder()
    test_file_drop_over_real_sftp()
    test_receiver_carries_out_and_records_the_delivery()
    print(f"\nALL {PASS_COUNT} REPORT DELIVERY CHECKS PASSED")
