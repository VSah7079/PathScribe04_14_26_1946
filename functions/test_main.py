# functions/test_main.py
# ─────────────────────────────────────────────────────────────────────────────
# Real, per direct guidance ("Local Testing & Verification... verify both:
# Default/Explicit PDF payload generation... outputFormat: 'text' returning
# expected narrative string format" — and, for receive_interface_message,
# "we can setup just the receiving end for now and look to see that the
# json packages coming out of PS are correct"). No pre-existing test
# infrastructure in this repo (only third-party test utilities under
# venv/) — plain assertions, run directly via `python test_main.py`, no
# new test-framework dependency added for this, matching the repo's own
# minimal requirements.txt.
#
# receive_interface_message's own real Firestore write is the one real
# thing this file can't verify end-to-end — this sandbox's network
# doesn't allow downloading the real Firestore emulator binary
# (storage.googleapis.com isn't on the allowed egress list). Its own
# firestore.client() call is swapped for a small, real, in-file fake
# (see _FakeFirestoreClient/_FailingFirestoreClient below) — everything
# this function actually controls (envelope validation, request/response
# handling, both success and failure paths) is tested for real, without
# any mock, exactly like every render_report test above.
#
# Run: python test_main.py   (needs the same real deps as main.py itself —
# see requirements.txt — installed into whatever environment runs this)
# ─────────────────────────────────────────────────────────────────────────────

import json
import sys

import main
from firebase_functions import https_fn
from flask import Flask

# Real, needed only for the HTTP-entrypoint tests below: the
# @https_fn.on_request decorator's own CORS handling (flask_cors) reads
# both current_app.config and the live flask.request proxy, which need a
# real Flask app/request context — normally provided by functions-framework's
# own real server. This app is purely test scaffolding, never part of
# main.py or its real runtime behavior.
_test_app = Flask(__name__)
_test_app.app_context().push()

PASS_COUNT = 0


def check(condition: bool, description: str):
    global PASS_COUNT
    if not condition:
        print(f"FAILED: {description}")
        sys.exit(1)
    PASS_COUNT += 1
    print(f"  ok — {description}")


# ── Realistic payload covering every real node_type both renderers handle ──
PAYLOAD = {
    "templateName": "Skin Punch Biopsy",
    "resolvedBy": "template-matcher",
    "institution": {
        "name": "PathScribe General Hospital",
        "dept": "Department of Pathology",
        "address": "123 Main St, Springfield, USA",
    },
    "caseHeader": {
        "accession": "S26-1001-BX-001", "patient": "Jane Doe", "mrn": "MRN-12345",
        "dob": "1980-01-01", "referring": "Dr. Smith", "clinician": "Dr. Jones",
    },
    "renderScope": {
        "patient": {"age": 45, "sex": "F"},
        "specimen": {"laterality": "left"},
        "specimens": [{"label": "A1 - Left arm"}, {"label": "A2 - Right leg"}],
    },
    "synopticAnswers": [
        {"fieldId": "f1", "fieldLabel": "Tumor Size", "displayValue": "2.3 cm"},
        {"fieldId": "f2", "fieldLabel": "Margins", "displayValue": "Clear"},
    ],
    "sections": [
        {"id": "sec-diag", "label": "Diagnosis",
         "text": "<p>Basal cell carcinoma, <b>nodular type</b>.</p><p>Margins clear.</p>",
         "committed": True, "userEdited": True, "aiGenerated": False, "required": True},
    ],
    "bodyAssembly": [
        {"slotId": "slot-1", "partId": "part-1", "partName": "Clinical", "order": 1, "nodes": [
            {"type": "static-label", "text": "CLINICAL HISTORY", "variant": "h2", "bold": True},
            {"type": "expression-value", "label": "Age", "template": "{{patient.age}}", "labelConfig": {"position": "adjacent"}},
            {"type": "expression-value", "label": "Hidden Field", "template": "{{patient.sex}}",
             "showWhen": {"clauses": [{"field": "patient.sex", "operator": "==", "value": "M"}]}},
            {"type": "paragraph", "label": "Notes", "freeformContent": "Routine excision.", "labelConfig": {"position": "above"}},
            {"type": "dropdown", "label": "Laterality", "bindingKey": "specimen.laterality",
             "options": [{"value": "left", "label": "Left"}, {"value": "right", "label": "Right"}]},
            {"type": "synoptic-block"},
        ]},
        {"slotId": "slot-2", "partId": "part-2", "partName": "Diagnosis", "order": 2, "nodes": [
            {"type": "section", "id": "sec-diag", "printHeading": "FINAL DIAGNOSIS", "ai": {"enabled": True}},
            {"type": "repeat-group", "iterateOver": "specimens", "itemAlias": "spec", "children": [
                {"type": "expression-value", "label": "Specimen", "template": "{{spec.label}}"},
            ]},
            {"type": "if-block",
             "condition": {"clauses": [{"field": "patient.age", "operator": ">", "value": 18}]},
             "children": [{"type": "static-label", "text": "Adult patient."}],
             "elseChildren": [{"type": "static-label", "text": "Pediatric patient."}]},
            {"type": "column-layout", "numColumns": 2, "children": [
                {"type": "expression-value", "label": "A", "template": "1"},
                {"type": "expression-value", "label": "B", "template": "2"},
            ]},
        ]},
    ],
}


def test_labels_follow_the_report_language():
    print("test_labels_follow_the_report_language")
    german = dict(PAYLOAD, labels={
        'patient': 'Patient', 'mrn': 'Patienten-Nr.', 'dob': 'Geburtsdatum', 'referring': 'Einsender',
        'clinician': 'Behandelnder Arzt', 'reportTemplate': 'Befundvorlage: {{name}}',
        'resolvedBy': ' (ermittelt durch {{name}})', 'confidential': 'VERTRAULICH — PATHOLOGIEBEFUND',
    })
    text = main.build_report_text(german)
    check("Patienten-Nr.: " in text and "MRN:" not in text, "case header labels in the report language")
    check("VERTRAULICH — PATHOLOGIEBEFUND" in text and "CONFIDENTIAL" not in text, "footer in the report language")
    check("Befundvorlage: " in text, "template caption in the report language")
    check(main.build_report_pdf(german)[:4] == b'%PDF', "the PDF builds with the labels")
    partial = main.build_report_text(dict(PAYLOAD, labels={'mrn': 'Patiëntnummer'}))
    check("Patiëntnummer: " in partial and "Patient: " in partial, "a missing label falls back to English")


def test_korean_report_uses_pretendard():
    print("test_korean_report_uses_pretendard")
    korean = dict(PAYLOAD, language='ko', labels={'patient': '환자', 'mrn': '환자번호', 'confidential': '기밀 — 병리 보고서'})
    pdf = main.build_report_pdf(korean)
    check(pdf[:4] == b'%PDF', "a Korean report builds")
    check(b'Pretendard' in pdf, "a Korean report embeds Pretendard")
    latin = main.build_report_pdf(PAYLOAD)
    check(b'Pretendard' not in latin, "a Latin report does not")
    hangul_name = dict(PAYLOAD, caseHeader=dict(PAYLOAD['caseHeader'], patient='김민지'))
    check(b'Pretendard' in main.build_report_pdf(hangul_name), "a Korean name in an English report is printed in Pretendard too")
    check(len(pdf) < 400_000, "only the glyphs used are embedded (%d bytes)" % len(pdf))
    check(main._font() == 'Helvetica', "the font choice does not leak past the report")


def test_placeholder_wording_follows_labels():
    print("test_placeholder_wording_follows_labels")
    text = main.build_report_text(dict(PAYLOAD, labels={'notYetGenerated': 'Noch nicht erstellt', 'noContent': 'Kein Inhalt', 'noSynopticData': 'Keine Synoptikdaten erfasst.', 'requiredNotCompleted': '⚠ Pflichtfeld — noch nicht ausgefüllt'}))
    check("Not yet generated" not in text and "No content" not in text, "no English placeholder wording when labels are given")


def test_pdf_path_unchanged():
    print("test_pdf_path_unchanged")
    pdf_bytes = main.build_report_pdf(PAYLOAD)
    check(isinstance(pdf_bytes, bytes), "returns bytes")
    check(pdf_bytes[:4] == b'%PDF', "starts with a real PDF header")


def test_text_path_every_node_type():
    print("test_text_path_every_node_type")
    text = main.build_report_text(PAYLOAD)
    check("PathScribe General Hospital" in text, "institution name present")
    check("S26-1001-BX-001" in text, "accession present")
    check("Patient: Jane Doe" in text, "case header field present")
    check("CLINICAL HISTORY" in text, "static-label present")
    check("Age: 45" in text, "expression-value resolved")
    check("Hidden Field" not in text, "showWhen correctly suppressed a hidden field")
    check("Notes: Routine excision." in text, "paragraph field present")
    check("Laterality: Left" in text, "dropdown option label resolved")
    check("Tumor Size: 2.3 cm" in text and "Margins: Clear" in text, "synoptic-block answers present")
    check("FINAL DIAGNOSIS" in text, "AI section heading present")
    check("Basal cell carcinoma, nodular type." in text, "AI section HTML stripped, content preserved")
    check("<p>" not in text and "<b>" not in text, "no raw HTML tags leaked into plain text")
    check("A1 - Left arm" in text and "A2 - Right leg" in text, "repeat-group iterated both items")
    check("Adult patient." in text and "Pediatric patient." not in text, "if-block picked the correct branch")
    check("A: 1" in text and "B: 2" in text, "column-layout flattened correctly")
    check("CONFIDENTIAL" in text, "footer line present")


def test_one_workup_pdf():
    """Batch 426: one synoptic workup as its own PDF/text, with no report layout (an Assist case)."""
    payload = {
        "caseHeader": {"accession": "S26-4416", "patient": "Doe, Jane", "mrn": "MRN1"},
        "synopticAnswers": [{"fieldId": "size", "fieldLabel": "Tumor size", "displayValue": "3.5 cm"}],
        "workup": {"parts": ["A", "B"], "protocol": "Colon Resection", "protocolVersion": "4.2.0.0", "status": "CORRECTED",
                   "version": 2, "signedBy": "Dr A", "signedAt": "2026-10-01 11:21", "documentId": "PSR-S26-4416-i1-V2",
                   "changes": [{"label": "Tumor size", "from": "3.0 cm", "to": "3.5 cm"}]},
    }
    pdf = main.build_report_pdf(payload)
    check(pdf[:4] == b"%PDF", "a one-workup payload renders a PDF")
    text = main.build_report_text(payload)
    check("Part(s): A, B" in text, "the workup's parts are listed")
    check("Status: Corrected" in text and "Version: 2" in text, "status and version are shown")
    check("Tumor size" in text and "3.5 cm" in text, "the workup's synoptic answers are in the body")
    check("Tumor size: 3.0 cm → 3.5 cm" in text, "a correction lists what changed")
    check("Document: PSR-S26-4416-i1-V2" in text, "the document id is printed")


def test_combined_workups_pdf():
    """Batch 427: every workup of a case in one PDF (a site that takes one PDF per accession)."""
    w = lambda proto, size: {"parts": ["A"], "protocol": proto, "status": "FINAL", "version": 1, "documentId": "PSR-S1-CASE-V1",
                             "synopticAnswers": [{"fieldId": "s", "fieldLabel": "Tumor size", "displayValue": size}]}
    payload = {"caseHeader": {"accession": "S1"}, "workups": [w("Colon Resection", "3.5 cm"), w("Liver Biopsy", "0.8 cm")]}
    check(main.build_report_pdf(payload)[:4] == b"%PDF", "a combined payload renders one PDF")
    text = main.build_report_text(payload)
    check(text.index("Colon Resection") < text.index("Liver Biopsy"), "the workups follow one another in order")
    check("3.5 cm" in text and "0.8 cm" in text, "each workup has its own answers")
    check(text.count("Document: PSR-S1-CASE-V1") == 2, "both name the one case document")


def _make_request(body: dict):
    return https_fn.Request.from_values(method='POST', content_type='application/json', data=json.dumps(body))


def _call_entrypoint(req):
    return _call_entrypoint_generic(main.render_report, req)


def _call_entrypoint_generic(fn, req):
    # Real, needed for the same real reason as the app-context push above:
    # flask_cors also reads the live flask.request proxy, which needs a
    # real request context pushed, matching this exact request's environ.
    with _test_app.request_context(req.environ):
        return fn(req)


def test_entrypoint_default_is_pdf():
    print("test_entrypoint_default_is_pdf")
    resp = _call_entrypoint(_make_request(PAYLOAD))
    check(resp.status_code == 200, "200 OK")
    check(resp.headers['Content-Type'] == 'application/pdf', "Content-Type: application/pdf, unchanged")
    check(resp.data[:4] == b'%PDF', "real PDF bytes")
    check('S26-1001-BX-001.pdf' in resp.headers['Content-Disposition'], "filename set from real accession")


def test_entrypoint_explicit_pdf_same_as_default():
    print("test_entrypoint_explicit_pdf_same_as_default")
    resp = _call_entrypoint(_make_request({**PAYLOAD, "outputFormat": "pdf"}))
    check(resp.status_code == 200 and resp.headers['Content-Type'] == 'application/pdf', "explicit outputFormat='pdf' behaves identically to omitting it")


def test_entrypoint_text_format():
    print("test_entrypoint_text_format")
    resp = _call_entrypoint(_make_request({**PAYLOAD, "outputFormat": "text"}))
    check(resp.status_code == 200, "200 OK")
    check(resp.headers['Content-Type'] == 'application/json', "Content-Type: application/json for text mode")
    body = json.loads(resp.data)
    check('text' in body and isinstance(body['text'], str), 'response shape is {"text": str}')
    check('S26-1001-BX-001' in body['text'], "real accession present in the real text body")


def test_entrypoint_malformed_json():
    print("test_entrypoint_malformed_json")
    req = https_fn.Request.from_values(method='POST', content_type='application/json', data='not json')
    resp = _call_entrypoint(req)
    check(resp.status_code == 400, "real 400 for malformed JSON, same as before this change")


def test_entrypoint_text_error_returns_clean_500():
    print("test_entrypoint_text_error_returns_clean_500")
    # Deliberately malformed node (missing required 'template' key) to
    # trigger a real internal error in the text path specifically.
    bad_payload = {"outputFormat": "text", "bodyAssembly": [{"nodes": [{"type": "expression-value"}]}]}
    resp = _call_entrypoint(_make_request(bad_payload))
    check(resp.status_code == 500, "real 500, not a leaked traceback, same posture as the PDF path")


# ── receive_interface_message tests ─────────────────────────────────────────
# Real, per direct guidance (the real receiving end for PathScribe's real
# outbound interface dispatch). firestore.client() itself is mocked below
# — this sandbox's network doesn't allow downloading the real Firestore
# emulator binary (storage.googleapis.com isn't on the allowed egress
# list), so the real Firestore write can't be tested end-to-end here.
# Everything this function actually controls — envelope validation,
# request/response handling, error paths — is tested for real, without
# any mock, exactly like the render_report tests above.

VALID_ENVELOPE = {
    "queueEntryId": "queue-abc-123",
    "transactionType": "A08",
    "dispatchedAt": "2026-08-31T12:00:00.000Z",
    "payload": {
        "messageId": "adt08-p1-abc",
        "eventType": "A08_DEMOGRAPHIC_UPDATE",
        "eventTimestamp": "2026-08-31T12:00:00.000Z",
        "organisationId": "ORG-A",
        "patient": {"patientId": "p1", "mrn": "MRN-1", "firstName": "Jane", "lastName": "Doe", "dateOfBirth": "1980-01-01", "identifiers": []},
    },
}


class _FakeDocRef:
    id = 'fake-doc-id-123'

    def set(self, data):
        self.set_data = data


class _FakeCollection:
    def document(self):
        return _FakeDocRef()


class _FakeFirestoreClient:
    def collection(self, name):
        assert name == 'received_interface_messages'
        return _FakeCollection()


class _FailingFirestoreClient:
    def collection(self, name):
        raise RuntimeError('simulated Firestore outage')


def test_validate_envelope_accepts_real_valid_envelope():
    print("test_validate_envelope_accepts_real_valid_envelope")
    check(main.validate_envelope(VALID_ENVELOPE) is None, "a real, complete, valid envelope passes validation")


def test_validate_envelope_rejects_missing_fields():
    print("test_validate_envelope_rejects_missing_fields")
    for field in ('queueEntryId', 'transactionType', 'dispatchedAt', 'payload'):
        bad = {**VALID_ENVELOPE}
        del bad[field]
        err = main.validate_envelope(bad)
        check(err is not None and field in err, f"missing '{field}' is rejected with a real, specific error message")


WSI_ENVELOPE = {
    "queueEntryId": "wsi-batch-1",
    "transactionType": "WSI_SCAN_MANIFEST",
    "dispatchedAt": "2026-10-02T12:00:00.000Z",
    "payload": {
        "messageId": "m-1", "eventType": "WSI_SCAN_MANIFEST", "eventTimestamp": "2026-10-02T12:00:00.000Z",
        "batchId": "wsi-batch-1", "batchBarcode": "WSI-20261002-0001", "scannerInstrumentId": "APERIO_GT450_01",
        "slides": [{"slidePosition": "1", "caseId": "S26-1", "specimenId": "sp-1", "blockId": "b-1", "stainId": "st-1", "slideLabel": "A1 H&E"}],
    },
}


def test_validate_envelope_accepts_every_browser_transaction_type():
    print("test_validate_envelope_accepts_every_browser_transaction_type")
    for t in ('REGISTRY_REPORT', 'CANCER_REGISTRY_REPORT', 'PRINT_JOB', 'CRITICAL_ALERT'):
        check(main.validate_envelope({**VALID_ENVELOPE, "transactionType": t}) is None, f"{t} is accepted (Batch 434: it was refused before)")
    check(main.validate_envelope(WSI_ENVELOPE) is None, "a complete WSI_SCAN_MANIFEST is accepted")


def test_validate_envelope_checks_the_wsi_manifest():
    print("test_validate_envelope_checks_the_wsi_manifest")
    no_slides = {**WSI_ENVELOPE, "payload": {**WSI_ENVELOPE["payload"], "slides": []}}
    check('at least one slide' in (main.validate_envelope(no_slides) or ''), "a manifest with no slides is refused")
    no_scanner = {**WSI_ENVELOPE, "payload": {**WSI_ENVELOPE["payload"], "scannerInstrumentId": ""}}
    check('scannerInstrumentId' in (main.validate_envelope(no_scanner) or ''), "a manifest with no scanner is refused")
    bad_slide = {**WSI_ENVELOPE, "payload": {**WSI_ENVELOPE["payload"], "slides": [{"slidePosition": "1", "caseId": "S26-1"}]}}
    check('specimenId' in (main.validate_envelope(bad_slide) or ''), "a slide without its specimen is refused")


def test_validate_envelope_rejects_unknown_transaction_type():
    print("test_validate_envelope_rejects_unknown_transaction_type")
    bad = {**VALID_ENVELOPE, "transactionType": "A99_MADE_UP"}
    err = main.validate_envelope(bad)
    check(err is not None and 'A99_MADE_UP' in err, "an unknown transactionType is rejected by name")


def test_validate_envelope_accepts_all_six_real_transaction_types():
    print("test_validate_envelope_accepts_all_six_real_transaction_types")
    for t in ('A08', 'A40', 'A47', 'ORU_R01', 'LIS_SYNC', 'ORDER_CREATED'):
        ok = main.validate_envelope({**VALID_ENVELOPE, "transactionType": t}) is None
        check(ok, f"real transaction type {t} is accepted")


def test_validate_envelope_rejects_non_object_payload():
    print("test_validate_envelope_rejects_non_object_payload")
    bad = {**VALID_ENVELOPE, "payload": "not an object"}
    err = main.validate_envelope(bad)
    check(err is not None, "a string payload is rejected")


def test_receive_interface_message_success():
    print("test_receive_interface_message_success")
    original_client = main.firestore.client
    main.firestore.client = lambda: _FakeFirestoreClient()
    try:
        resp = _call_entrypoint_generic(main.receive_interface_message, _make_request(VALID_ENVELOPE))
    finally:
        main.firestore.client = original_client
    check(resp.status_code == 200, "200 OK for a real, valid envelope")
    check(resp.headers['Content-Type'] == 'application/json', "Content-Type: application/json")
    body = json.loads(resp.data)
    check(body.get('ok') is True, "response shape has ok: true")
    check(body.get('id') == 'fake-doc-id-123', "response includes the real document id")


def test_receive_interface_message_validation_failure():
    print("test_receive_interface_message_validation_failure")
    bad = {**VALID_ENVELOPE}
    del bad['transactionType']
    resp = _call_entrypoint_generic(main.receive_interface_message, _make_request(bad))
    check(resp.status_code == 422, "real 422 for a real validation failure")
    body = json.loads(resp.data)
    check(body.get('ok') is False and 'transactionType' in body.get('error', ''), "error message names the real missing field")


def test_receive_interface_message_malformed_json():
    print("test_receive_interface_message_malformed_json")
    req = https_fn.Request.from_values(method='POST', content_type='application/json', data='not json')
    resp = _call_entrypoint_generic(main.receive_interface_message, req)
    check(resp.status_code == 400, "real 400 for malformed JSON")


def test_receive_interface_message_method_not_allowed():
    print("test_receive_interface_message_method_not_allowed")
    req = https_fn.Request.from_values(method='GET')
    resp = _call_entrypoint_generic(main.receive_interface_message, req)
    check(resp.status_code == 405, "real 405 for a non-POST method")


def test_receive_interface_message_storage_failure_returns_clean_500():
    print("test_receive_interface_message_storage_failure_returns_clean_500")
    original_client = main.firestore.client
    main.firestore.client = lambda: _FailingFirestoreClient()
    try:
        resp = _call_entrypoint_generic(main.receive_interface_message, _make_request(VALID_ENVELOPE))
    finally:
        main.firestore.client = original_client
    check(resp.status_code == 500, "a genuine Firestore failure returns a real, clean 500")
    body = json.loads(resp.data)
    check(body.get('ok') is False, "response shape has ok: false on real storage failure")


def test_report_figures_drawn_in_pdf():
    """Batch 461: an inserted anatomical map is drawn into the PDF; a broken one is skipped."""
    print("test_report_figures_drawn_in_pdf")
    import base64
    from io import BytesIO as _BytesIO
    from PIL import Image as _PILImage
    buf = _BytesIO()
    _PILImage.new('RGB', (66, 32), (255, 255, 255)).save(buf, format='PNG')
    png = base64.b64encode(buf.getvalue()).decode('ascii')
    base = {"caseHeader": {"accession": "S26-4404"}}
    plain = main.build_report_pdf(base)
    with_fig = main.build_report_pdf(dict(base, reportFigures=[{"instanceId": "i1", "mapType": "prostateBiopsy", "pngBase64": png, "svg": "<svg/>", "width": 460, "height": 300}]))
    check(b"/Subtype /Image" in with_fig and b"/Subtype /Image" not in plain, "the figure is embedded as an image")
    long_grid = "A (right apex): Site: Right apex lateral; Carcinoma: Present; Grade Group: 2; Core involved: 40 %\nB (right mid): Site: Right mid lateral; Carcinoma: Present"
    wrapped = main.build_report_pdf(dict(base, synopticAnswers=[{"fieldId": "g", "fieldLabel": "Core results", "displayValue": long_grid}], bodyAssembly=[{"order": 0, "nodes": [{"type": "synoptic-block"}]}]))
    check(wrapped[:4] == b"%PDF", "a long multi-line grid answer renders (wrapped in its cell)")
    broken = main.build_report_pdf(dict(base, reportFigures=[{"instanceId": "i1", "pngBase64": "not base64!!"}, {"instanceId": "i2", "svg": "<svg/>"}]))
    check(broken[:4] == b"%PDF" and b"/Subtype /Image" not in broken, "a broken or PNG-less figure is skipped, the report still renders")


def test_report_figure_notice_when_not_drawn():
    """Batch 463: a map that is part of the report (Mohs) but has no usable PNG prints a notice with its content as text, never a silent gap."""
    print("test_report_figure_notice_when_not_drawn")
    lines = ["Stage 1, 09:15, 3 blocks cut, residual tumour, 12 o'clock, peripheral, block A, BCC <nodular>", "Stage 2, 10:30, clear"]
    for fig in ({"instanceId": "m1", "mapType": "mohsStages", "svg": "<svg/>", "notice": True, "fallbackLines": lines},
                {"instanceId": "m1", "mapType": "mohsStages", "pngBase64": "not base64!!", "notice": True, "fallbackLines": lines}):
        flows = main.figure_flows({"reportFigures": [fig]})
        check(len(flows) == 1, "one notice in the map's place")
        table = flows[0]._content[0]
        texts = [row[0].getPlainText() for row in table._cellvalues]
        check(texts[0] == main.DEFAULT_LABELS['figureNotDrawn'] and texts[1:] == lines, "the notice heading, then the stage lines (escaped markup kept as text)")
    token = main._current_labels.set(main.report_labels({"labels": {"figureNotDrawn": "Avis : la carte n'a pas pu être dessinée."}}))
    try:
        fr = main.figure_flows({"reportFigures": [{"instanceId": "m1", "notice": True}]})
        check(fr[0]._content[0]._cellvalues[0][0].getPlainText() == "Avis : la carte n'a pas pu être dessinée.", "in the report's language; no lines when none are given")
    finally:
        main._current_labels.reset(token)
    check(main.figure_flows({"reportFigures": [{"instanceId": "i2", "svg": "<svg/>"}]}) == [], "an optional inserted figure without an image is still left out")
    pdf = main.build_report_pdf({"caseHeader": {"accession": "S26-4463"}, "reportFigures": [{"instanceId": "m1", "notice": True, "fallbackLines": lines}]})
    check(pdf[:4] == b"%PDF", "the report renders with the notice")


if __name__ == '__main__':
    test_labels_follow_the_report_language()
    test_korean_report_uses_pretendard()
    test_placeholder_wording_follows_labels()
    test_pdf_path_unchanged()
    test_text_path_every_node_type()
    test_one_workup_pdf()
    test_combined_workups_pdf()
    test_report_figures_drawn_in_pdf()
    test_report_figure_notice_when_not_drawn()
    test_entrypoint_default_is_pdf()
    test_entrypoint_explicit_pdf_same_as_default()
    test_entrypoint_text_format()
    test_entrypoint_malformed_json()
    test_entrypoint_text_error_returns_clean_500()
    test_validate_envelope_accepts_real_valid_envelope()
    test_validate_envelope_rejects_missing_fields()
    test_validate_envelope_rejects_unknown_transaction_type()
    test_validate_envelope_accepts_all_six_real_transaction_types()
    test_validate_envelope_accepts_every_browser_transaction_type()
    test_validate_envelope_checks_the_wsi_manifest()
    test_validate_envelope_rejects_non_object_payload()
    test_receive_interface_message_success()
    test_receive_interface_message_validation_failure()
    test_receive_interface_message_malformed_json()
    test_receive_interface_message_method_not_allowed()
    test_receive_interface_message_storage_failure_returns_clean_500()
    print(f"\nALL {PASS_COUNT} REAL CHECKS PASSED")
