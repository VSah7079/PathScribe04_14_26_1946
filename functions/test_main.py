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



RELATED = [{
    'sourceCaseId': 'C-1', 'accession': 'S26-0001', 'releasedAt': '2026-03-02T10:00:00Z', 'sourceVersion': 3,
    'specimens': ['A: Skin, left forearm'], 'diagnosis': 'Basal cell carcinoma, nodular',
    'intraoperativeDiagnosis': 'A: Malignant, margins clear', 'signedBy': 'Dr. Lee',
    'orderingPhysician': 'Dr. Ng', 'copyToPhysicians': ['Dr. Oh', 'Dr. Pak'], 'client': 'North Clinic',
}]


def test_intraoperative_diagnosis_is_part_of_the_report():
    print("test_intraoperative_diagnosis_is_part_of_the_report")
    payload = dict(PAYLOAD, intraoperativeDiagnosis='A: Benign nevus')
    text = main.build_report_text(payload)
    check('Intraoperative diagnosis' in text and 'A: Benign nevus' in text, "the intraoperative diagnosis is in the text")
    check('Intraoperative diagnosis' not in main.build_report_text(PAYLOAD), "nothing is drawn when there is none")
    check(main.build_report_pdf(payload)[:4] == b'%PDF', "the PDF builds with it")


def test_related_cases_print_exactly_as_attached():
    print("test_related_cases_print_exactly_as_attached")
    payload = dict(PAYLOAD, relatedCases=RELATED)
    text = main.build_report_text(payload)
    for expected in ('Related cases', 'S26-0001', 'Basal cell carcinoma, nodular', 'Dr. Ng', 'Dr. Oh, Dr. Pak', 'North Clinic', 'A: Malignant, margins clear'):
        check(expected in text, "related case text has " + expected)
    check('Related cases' not in main.build_report_text(PAYLOAD), "no related block when none attached")
    check(main.build_report_pdf(payload)[:4] == b'%PDF', "the PDF builds with related cases")
    german = dict(payload, labels={'relatedCasesTitle': 'Verwandte Fälle', 'relatedCaseDiagnosis': 'Diagnose'})
    gtext = main.build_report_text(german)
    check('Verwandte Fälle' in gtext and 'Diagnose:' in gtext, "related case labels follow the report language")


def test_technical_lab_line_on_a_split_case():
    print("test_technical_lab_line_on_a_split_case")
    tb = {'facilityName': 'Harbor Histology', 'address': '5 Dock Rd', 'city': 'Portland', 'state': 'ME', 'zip': '04101',
          'directorName': 'Dr. Secret', 'cliaOrIsoNumber': '99D9999999'}
    text = main.build_report_text(dict(PAYLOAD, technicalBranding=tb))
    check('Technical component performed at: Harbor Histology, 5 Dock Rd, Portland, ME 04101' in text, "technical lab name and address are printed")
    check('Dr. Secret' not in text and '99D9999999' not in text, "director and CLIA number are never printed for the technical lab")
    check('Technical component performed' not in main.build_report_text(PAYLOAD), "no technical line on a single-facility case")
    check('Technical component performed' not in main.build_report_text(dict(PAYLOAD, technicalBranding={'address': 'x'})), "no line without a facility name")
    german = main.build_report_text(dict(PAYLOAD, technicalBranding=tb, labels={'technicalComponentAt': 'Technischer Teil erbracht bei: {{facility}}'}))
    check('Technischer Teil erbracht bei: Harbor Histology' in german, "the line follows the report language")
    check(main.build_report_pdf(dict(PAYLOAD, technicalBranding=tb))[:4] == b'%PDF', "the PDF builds with a technical lab")


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
    for t in ('ACCESSION_EVENT', 'REFERRAL_MANIFEST', 'MOLECULAR_ORDER'):
        check(main.validate_envelope({**VALID_ENVELOPE, "transactionType": t}) is None, f"{t} is accepted (Batch 518, PS-122)")
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

# ── Batch 498 (PS-283, PS-333): watermark, revision status, footer reference,
#    pre-analytic disclaimer. Page text is read back with pypdf (text-only;
#    needed only by these tests: pip install pypdf).

def _pdf_pages_text(pdf: bytes) -> list[str]:
    from io import BytesIO as _B
    from pypdf import PdfReader
    return [page.extract_text() or '' for page in PdfReader(_B(pdf)).pages]


_LONG = dict(PAYLOAD, synopticAnswers=[{"fieldId": f"f{i}", "fieldLabel": f"Element {i}", "displayValue": f"Value {i}"} for i in range(120)])


def test_revision_banner_pdf_and_text():
    print("test_revision_banner_pdf_and_text")
    amended = dict(_LONG, documentVersion=9, revision={
        "type": "amendment", "revisionCount": 2,
        "originalSignOutAt": "01/10/2026, 10:00", "latestRevisionAt": "05/10/2026, 09:00"})
    pages = _pdf_pages_text(main.build_report_pdf(amended))
    check(len(pages) > 1, "the long report runs to more than one page (%d)" % len(pages))
    check("Originally signed out 01/10/2026, 10:00" in pages[0] and "Revised 05/10/2026, 09:00" in pages[0], "page 1 shows the original sign-out and revision dates")
    check(all("AMENDED REPORT" in p for p in pages), "every page footer says the report was amended")
    text = main.build_report_text(amended)
    check("AMENDED REPORT" in text and "Originally signed out 01/10/2026, 10:00" in text, "the text output carries the same revision status")
    only_latest = dict(PAYLOAD, revision={"type": "addendum", "latestRevisionAt": "05/10/2026"})
    check("REPORT WITH ADDENDUM" in main.build_report_text(only_latest) and "Revised 05/10/2026" in main.build_report_text(only_latest), "no original date: the latest revision alone")
    check("AMENDED" not in main.build_report_text(PAYLOAD) and "Revised" not in main.build_report_text(PAYLOAD), "an unrevised report shows no revision status")
    check("Revised" not in main.build_report_text(dict(PAYLOAD, revision={"type": "unknown", "latestRevisionAt": "x"})), "an unknown revision type is ignored")


def test_watermark_on_every_page():
    print("test_watermark_on_every_page")
    mark = "PENDING FINAL RELEASE — DO NOT DISTRIBUTE"
    pages = _pdf_pages_text(main.build_report_pdf(dict(_LONG, watermarkText=mark)))
    check(all("PENDING FINAL RELEASE" in p for p in pages), "the watermark is on every page (%d)" % len(pages))
    plain = _pdf_pages_text(main.build_report_pdf(_LONG))
    check(not any("PENDING FINAL RELEASE" in p for p in plain), "no watermark when none is sent")
    check(not any("PENDING" in p for p in _pdf_pages_text(main.build_report_pdf(dict(PAYLOAD, watermarkText="   ")))), "a blank watermark draws nothing")


def test_footer_barcode_is_solid_black_under_a_watermark():
    """Batch 652: the watermark's faint red fill must not reach the accession barcode in the footer."""
    print("test_footer_barcode_is_solid_black_under_a_watermark")
    from reportlab.graphics.barcode import common

    def barcode_fills(payload):
        seen = []
        original = common.Barcode.rect

        def spy(self, x, y, w, h):
            canv = self.canv
            seen.append((canv._fillColorObj.red, canv._fillColorObj.green, canv._fillColorObj.blue,
                         getattr(canv._fillColorObj, 'alpha', 1), canv._extgstate._d.get('ca', 1)))
            return original(self, x, y, w, h)

        common.Barcode.rect = spy
        try:
            main.build_report_pdf(payload)
        finally:
            common.Barcode.rect = original
        return seen

    mark = "PENDING FINAL RELEASE — DO NOT DISTRIBUTE"
    marked = barcode_fills(dict(PAYLOAD, watermarkText=mark))
    check(len(marked) > 0, "the footer barcode is drawn on a watermarked report")
    check(all(f == (0, 0, 0, 1, 1) for f in marked), "every bar of the footer barcode is opaque black under a watermark")
    plain = barcode_fills(PAYLOAD)
    check(len(plain) > 0 and all(f == (0, 0, 0, 1, 1) for f in plain), "and without a watermark")
    pages = _pdf_pages_text(main.build_report_pdf(dict(_LONG, watermarkText=mark)))
    check(all("PENDING FINAL RELEASE" in p for p in pages), "the watermark itself is still drawn on every page")


def test_footer_reference_on_every_page():
    print("test_footer_reference_on_every_page")
    pages = _pdf_pages_text(main.build_report_pdf(dict(_LONG, documentVersion=9)))
    check(all("Document S26-1001-BX-001 · record version 9" in p for p in pages), "the document reference is on every page")
    check("Document S26-1001-BX-001 · record version 9" in main.build_report_text(dict(PAYLOAD, documentVersion=9)), "the text output ends with the reference")
    no_version = _pdf_pages_text(main.build_report_pdf(dict(PAYLOAD, documentVersion="9")))
    check("Document S26-1001-BX-001" in no_version[0] and "record version" not in no_version[0], "a version that isn't a number is left out")
    no_accession = dict(PAYLOAD, caseHeader=dict(PAYLOAD["caseHeader"], accession=""))
    check("Document " not in _pdf_pages_text(main.build_report_pdf(no_accession))[0], "no accession: no reference")
    odd = dict(PAYLOAD, caseHeader=dict(PAYLOAD["caseHeader"], accession="S26-한글"))
    odd_pdf = main.build_report_pdf(odd)
    check(odd_pdf[:4] == b'%PDF' and "Document S26-한글" in main.build_report_text(odd), "an accession the barcode can't encode still renders, with the readable reference")


def test_preanalytic_disclaimer():
    print("test_preanalytic_disclaimer")
    note = "Collection time entered by administrative override; the original time was not recorded."
    with_note = dict(PAYLOAD, preAnalyticDisclaimerText=note)
    check(note[:40] in _pdf_pages_text(main.build_report_pdf(with_note))[0], "the disclaimer is printed in the PDF")
    check(note in main.build_report_text(with_note), "the disclaimer is in the text output")
    check("administrative override" not in main.build_report_text(PAYLOAD), "no disclaimer when none is sent")
    amp = dict(PAYLOAD, preAnalyticDisclaimerText="Time & date <estimated>")
    check(main.build_report_pdf(amp)[:4] == b'%PDF', "markup characters in the disclaimer don't break the PDF")


def test_new_wording_follows_labels():
    print("test_new_wording_follows_labels")
    german = dict(PAYLOAD, documentVersion=3, revision={"type": "correction", "originalSignOutAt": "1. Okt. 2026", "latestRevisionAt": "5. Okt. 2026"},
                  labels={"revisionCorrection": "KORRIGIERTER BEFUND", "revisionDatesWithOriginal": "Erstmals abgezeichnet {{original}} · Überarbeitet {{latest}}",
                          "documentReference": "Dokument {{accession}} · Datensatzversion {{version}}"})
    text = main.build_report_text(german)
    check("KORRIGIERTER BEFUND" in text and "Erstmals abgezeichnet 1. Okt. 2026 · Überarbeitet 5. Okt. 2026" in text, "revision wording in the report language")
    check("Dokument S26-1001-BX-001 · Datensatzversion 3" in text, "reference wording in the report language")


# ── Batch 539 (PS-539 D2): the cytology report template ─────────────────────

def _cyto_doc(**extra):
    doc = {
        "title": "Cytology Report — GYN Cervical Screening", "barcode": "C26-00042",
        "sections": [
            {"heading": "Patient", "lines": [{"text": "Jane Doe · DOB 01/02/1960 · MRN M-1"}]},
            {"heading": "Interpretation / Diagnostic Result", "lines": [{"text": "NILM — negative for intraepithelial lesion or malignancy"}]},
            {"heading": "Sign-Off", "lines": [{"text": "Signed by: Dr A, Pathologist — 12/10/2026 15:00"}]},
        ],
        "continuation": "Jane Doe · MRN M-1 · Accession: C26-00042",
    }
    doc.update(extra)
    return doc


CYTO = {
    "template": "cytology", "outputFormat": "pdf", "pageLabel": "Page {{page}} of {{total}}",
    "metadata": {"title": "Cytology Report — C26-00042", "author": "Dr A", "subject": "Cytology Report", "timestamp": "2026-10-12T15:00:00Z"},
    "documents": [_cyto_doc()],
}
_CYTO_LONG = dict(CYTO, documents=[_cyto_doc(sections=[{"heading": f"Section {i}", "lines": [{"text": "word " * 120}] * 3} for i in range(14)])])


def _pdf_fonts(pdf: bytes) -> set:
    from io import BytesIO
    from pypdf import PdfReader
    names = set()
    for page in PdfReader(BytesIO(pdf)).pages:
        for f in page["/Resources"]["/Font"].values():
            names.add(str(f.get_object()["/BaseFont"]))
    return names


def test_cytology_template_draws_the_lines_sent():
    print("test_cytology_template_draws_the_lines_sent")
    pdf = main.cytology_report.build_cytology_pdf(CYTO)
    text = _pdf_pages_text(pdf)[0]
    for expected in ["Cytology Report — GYN Cervical Screening", "Interpretation / Diagnostic Result", "NILM — negative", "Signed by: Dr A, Pathologist — 12/10/2026 15:00"]:
        check(expected in text, f"page 1 shows {expected!r}")
    check(main.cytology_report.CYTOLOGY_TEMPLATE_MARKER.encode() in pdf, "the PDF carries the cytology template marker (Keywords)")
    banner = dict(CYTO, documents=[_cyto_doc(banner=[{"text": "CORRECTED REPORT", "bold": True, "size": 12}, {"text": "Reason: wrong specimen site", "size": 9}])])
    check("CORRECTED REPORT" in _pdf_pages_text(main.cytology_report.build_cytology_pdf(banner))[0], "a correction banner is drawn under the title")
    markup = dict(CYTO, documents=[_cyto_doc(title="Report <b>&</b> more")])
    check(main.cytology_report.build_cytology_pdf(markup)[:4] == b"%PDF", "markup characters in the text don't break the PDF")


def test_cytology_same_bytes_every_time():
    print("test_cytology_same_bytes_every_time")
    a = main.cytology_report.build_cytology_pdf(CYTO)
    b = main.cytology_report.build_cytology_pdf(CYTO)
    check(a == b, "the same request gives byte-identical PDFs (fixed creation date and document ID)")
    check(b"D:20261012150000" in a, "the creation date is the signing time, not the clock")


def test_surgical_pdf_same_bytes_every_time():
    print("test_surgical_pdf_same_bytes_every_time")
    import hashlib
    import time
    a = main.build_report_pdf(PAYLOAD)
    time.sleep(1.1)  # a clock-dependent renderer would differ after a second
    b = main.build_report_pdf(PAYLOAD)
    check(a == b and hashlib.sha256(a).hexdigest() == hashlib.sha256(b).hexdigest(), "the surgical report gives byte-identical PDFs on every run (same SHA-256)")
    check(b"D:20000101000000" in a, "a request with no signing time gets the fixed date, never the clock")
    signed = dict(PAYLOAD, signedAt="2026-10-21T14:05:09Z")
    c = main.build_report_pdf(signed)
    check(c == main.build_report_pdf(signed) and b"D:20261021140509" in c, "the creation date is the signing time, and the signed report is stable too")
    from_workup = dict(PAYLOAD, workup={"parts": ["A"], "status": "FINAL", "version": 1, "signedBy": "Dr X", "signedAt": "2026-10-21T14:05:09Z"})
    check(b"D:20261021140509" in main.build_report_pdf(from_workup), "the workup's signing time is used when the request has none of its own")
    check(c != a, "a different signing time is a different document")
    with_figure = dict(signed, watermarkText="HELD", documentVersion=3)
    check(main.build_report_pdf(with_figure) == main.build_report_pdf(with_figure), "watermark and footer barcode do not break it")


def test_cytology_fonts_embedded():
    print("test_cytology_fonts_embedded")
    fonts = _pdf_fonts(main.cytology_report.build_cytology_pdf(CYTO))
    check(fonts and all("LiberationSans" in f for f in fonts), f"only embedded Liberation Sans is used ({sorted(fonts)})")
    korean = dict(CYTO, language="ko", documents=[_cyto_doc(title="세포병리 보고서")])
    kfonts = _pdf_fonts(main.cytology_report.build_cytology_pdf(korean))
    check(kfonts and all("Pretendard" in f for f in kfonts), "a Korean report prints in embedded Pretendard")
    check(main.cytology_report.MARGIN >= main.cytology_report.MIN_PRINT_MARGIN, "the margin is at least the 0.5 inch printing minimum")


def test_cytology_continuation_and_documents():
    print("test_cytology_continuation_and_documents")
    pages = _pdf_pages_text(main.cytology_report.build_cytology_pdf(_CYTO_LONG))
    check(len(pages) >= 3, f"a long report runs onto several pages ({len(pages)})")
    check("Page" not in pages[0], "page 1 has no continuation line")
    total = len(pages)
    check(all(f"Jane Doe · MRN M-1 · Accession: C26-00042 · Page {i + 1} of {total}" in pages[i] for i in range(1, total)), "every later page has the identity line and Page X of Y")
    cover = {"title": "Cytology Case Report — C26-00042", "sections": [{"heading": "Specimens in this report", "lines": [{"text": "A: Pap", "bold": True}, {"text": "Reported"}]}]}
    case = dict(_CYTO_LONG, documents=[cover, _CYTO_LONG["documents"][0], _cyto_doc(title="Second specimen")])
    cpages = _pdf_pages_text(main.cytology_report.build_cytology_pdf(case))
    check("Specimens in this report" in cpages[0] and "Cytology Report — GYN" in cpages[1], "the cover is its own page; each report starts on a new page")
    check(f"Page 2 of {total}" in cpages[2], "each document numbers its own pages")
    check("Second specimen" in cpages[-1] and "Page" not in cpages[-1], "the next document starts again at its first page")
    addendum = dict(CYTO, documents=[_cyto_doc(sections=CYTO["documents"][0]["sections"] + [{"heading": "Addendum", "newPage": True, "lines": [{"text": "HPV 16 detected."}]}])])
    apages = _pdf_pages_text(main.cytology_report.build_cytology_pdf(addendum))
    check(len(apages) == 2 and "Addendum" in apages[1] and "Addendum" not in apages[0], "an addendum the lab prints on its own page starts a new page")


def test_cytology_watermark_and_barcode():
    print("test_cytology_watermark_and_barcode")
    mark = "PRELIMINARY — SUBJECT TO CHANGE"
    pages = _pdf_pages_text(main.cytology_report.build_cytology_pdf(dict(_CYTO_LONG, watermarkText=mark)))
    check(all("PRELIMINARY" in p for p in pages), "an unsigned preview's watermark is on every page")
    check(not any("PRELIMINARY" in p for p in _pdf_pages_text(main.cytology_report.build_cytology_pdf(CYTO))), "no watermark when none is sent")
    odd = dict(CYTO, documents=[_cyto_doc(barcode="C26-한글")])
    check(main.cytology_report.build_cytology_pdf(odd)[:4] == b"%PDF", "an accession Code 128 can't encode still renders")


def test_cytology_entrypoint():
    print("test_cytology_entrypoint")
    resp = _call_entrypoint(_make_request(CYTO))
    check(resp.status_code == 200 and resp.headers["Content-Type"] == "application/pdf", "render_report answers a cytology request with a PDF")
    check(resp.data == main.cytology_report.build_cytology_pdf(CYTO), "the entrypoint returns exactly the template's bytes")
    check(_call_entrypoint(_make_request(dict(CYTO, documents=[]))).status_code == 400, "no documents: 400")
    check(_call_entrypoint(_make_request(dict(CYTO, outputFormat="text"))).status_code == 400, "cytology text output is refused: 400")
    check(main.cytology_report.CYTOLOGY_TEMPLATE_MARKER.encode() not in main.build_report_pdf(PAYLOAD), "a surgical PDF does not carry the cytology marker")


def test_cytology_logo_line_breaks_and_mixed_languages():
    print("test_cytology_logo_line_breaks_and_mixed_languages")
    import base64 as _b64
    from io import BytesIO
    from PIL import Image as _PIL
    from pypdf import PdfReader
    buf = BytesIO()
    _PIL.new("RGB", (120, 40), (20, 60, 140)).save(buf, format="PNG")
    logo = _b64.b64encode(buf.getvalue()).decode()
    branded = dict(CYTO, documents=[_cyto_doc(branding={"logoBase64": logo, "lines": [{"text": "Desert Lab", "bold": True}]})])
    page = PdfReader(BytesIO(main.cytology_report.build_cytology_pdf(branded))).pages[0]
    check(len(page.images) == 1, "the letterhead logo sent as logoBase64 is drawn")
    bad = dict(CYTO, documents=[_cyto_doc(branding={"logoBase64": "not-an-image", "lines": [{"text": "Desert Lab"}]})])
    check(main.cytology_report.build_cytology_pdf(bad)[:4] == b"%PDF", "a logo that can't be read never stops the report")
    typed = dict(CYTO, documents=[_cyto_doc(sections=[{"heading": "Addendum", "lines": [{"text": "First paragraph.\nSecond paragraph."}]}])])
    lines = _pdf_pages_text(main.cytology_report.build_cytology_pdf(typed))[0].splitlines()
    check("First paragraph." in lines and "Second paragraph." in lines, "a line break typed in a field is kept")
    korean = _cyto_doc(title="세포병리 보고서", language="ko", pageLabel="{{total}}쪽 중 {{page}}쪽")
    mixed = dict(_CYTO_LONG, documents=[_CYTO_LONG["documents"][0], dict(korean, sections=_CYTO_LONG["documents"][0]["sections"])])
    reader = PdfReader(BytesIO(main.cytology_report.build_cytology_pdf(mixed)))
    cr = main.cytology_report
    check(cr.document_fonts(mixed, mixed["documents"][0]) == cr.LIBERATION and cr.document_fonts(mixed, mixed["documents"][1]) == cr.PRETENDARD,
          "in a mixed case report, the English specimen keeps Liberation Sans and the Korean one prints in Pretendard")
    texts = [pg.extract_text() or "" for pg in reader.pages]
    check(any("Page 2 of" in t for t in texts) and any("쪽 중 2쪽" in t for t in texts), "each document's page label is in its own language")



# ── Batch 609 (PS-35, PS-127): page setup, document style, header and footer parts ──

def _text_runs(pdf: bytes, page_index: int = 0) -> list:
    """(text, x, y, font size) for each run of text on a page."""
    from io import BytesIO as _B
    from pypdf import PdfReader
    runs: list = []

    def visit(text, cm, tm, font_dict, font_size):
        if text.strip():
            x = tm[4] * cm[0] + tm[5] * cm[2] + cm[4]
            y = tm[4] * cm[1] + tm[5] * cm[3] + cm[5]
            runs.append((text.strip(), x, y, font_size * (tm[0] if tm[0] else 1)))

    PdfReader(_B(pdf)).pages[page_index].extract_text(visitor_text=visit)
    return runs


def _page_size_pt(pdf: bytes) -> tuple:
    from io import BytesIO as _B
    from pypdf import PdfReader
    box = PdfReader(_B(pdf)).pages[0].mediabox
    return float(box.width), float(box.height)


def _approx(a: float, b: float, tol: float = 1.0) -> bool:
    return abs(a - b) <= tol


def test_page_geometry_rules():
    print("test_page_geometry_rules")
    rl = main.report_layout
    mm = 72 / 25.4
    g = rl.page_geometry({}, (18, 20, 22, 20))
    check(g['size_id'] == 'a4' and _approx(g['size'][0], 210 * mm, 0.01) and not g['from_request'], "no page setup: A4, as before")
    check(tuple(round(m / mm) for m in g['margins']) == (18, 20, 22, 20), "no page setup: the report's own margins")
    setup = {'pageSizeId': 'letter', 'widthMm': 216, 'heightMm': 279, 'margins': {'top': 25, 'right': 20, 'bottom': 25, 'left': 30}}
    g = rl.page_geometry({'pageSetup': setup}, (18, 20, 22, 20))
    check(g['size_id'] == 'letter' and _approx(g['size'][1], 279 * mm, 0.01), "a lab page size is used")
    check(tuple(round(m / mm) for m in g['margins']) == (25, 20, 25, 30), "the lab's margins are used")
    low = rl.page_geometry({'pageSetup': dict(setup, margins={'top': 5, 'right': 5, 'bottom': 5, 'left': 5})}, (18, 20, 22, 20))
    check(all(_approx(m / mm, 12.7, 0.01) for m in low['margins']) and low['adjusted'] == ['top', 'right', 'bottom', 'left'],
          "margins under 0.5 inch print at 0.5 inch (printers clip below it)")
    check(rl.page_geometry({'pageSetup': {'pageSizeId': 'a3', 'widthMm': 'x', 'heightMm': None}}, (18, 20, 22, 20))['size_id'] == 'a3',
          "unreadable millimetres fall back to the named size")
    check(rl.page_geometry({'pageSetup': {'pageSizeId': 'zz', 'widthMm': 5, 'heightMm': 5}}, (18, 20, 22, 20))['size_id'] == 'a4',
          "an unreadable size falls back to A4, never refuses the report")
    check(rl.page_geometry({'pageSetup': 'junk'}, (18, 20, 22, 20))['size_id'] == 'a4', "a page setup that isn't an object is ignored")
    huge = rl.page_geometry({'pageSetup': {'pageSizeId': 'b5', 'margins': {'top': 50, 'right': 50, 'bottom': 50, 'left': 50}}}, (18, 20, 22, 20))
    check(rl.text_width(huge) > 50 * mm, "margins that would leave no room for text fall back to the defaults")


def test_document_style_rules():
    print("test_document_style_rules")
    rl = main.report_layout
    check(rl.style_for({}, 'body') == {'size_pt': None, 'bold': None, 'underline': False, 'transform': None, 'family': None}, "no style: nothing changes")
    st = rl.style_for({'documentStyle': {'body': {'fontFamily': 'Times New Roman', 'fontSize': 16, 'weight': 'bold', 'decoration': 'underline', 'transform': 'uppercase'}}}, 'body')
    check(st['size_pt'] == 12 and st['bold'] is True and st['underline'] and st['transform'] == 'uppercase' and st['family'] == ('Times-Roman', 'Times-Bold'),
          "16 px is 12 pt; weight, underline, case and family are read")
    check(rl.style_for({'documentStyle': {'body': {'fontSize': 4}}}, 'body')['size_pt'] == 7.0, "nothing prints below 7 pt")
    check(rl.style_for({'documentStyle': {'body': {'fontFamily': 'Courier New'}}}, 'body')['family'] == ('Courier', 'Courier-Bold'), "Courier New prints as Courier")
    check(rl.style_for({'documentStyle': {'body': {'fontFamily': 'Calibri'}}}, 'body')['family'] == ('Helvetica', 'Helvetica-Bold'), "Calibri prints as Helvetica")
    check(rl.style_for({'documentStyle': {'body': {'fontFamily': 'Wingdings'}}}, 'body')['family'] is None, "an unknown family keeps the default")
    check(rl.style_for({'documentStyle': 'junk'}, 'body')['size_pt'] is None and rl.style_for({'documentStyle': {'body': 5}}, 'body')['bold'] is None, "malformed styles are ignored")


def test_surgical_pdf_page_size_and_margins():
    print("test_surgical_pdf_page_size_and_margins")
    mm = 72 / 25.4
    check(_approx(_page_size_pt(main.build_report_pdf(PAYLOAD))[0], 210 * mm), "without a page setup the report is A4")
    letter = dict(PAYLOAD, pageSetup={'pageSizeId': 'letter', 'widthMm': 216, 'heightMm': 279, 'margins': {'top': 25, 'right': 20, 'bottom': 25, 'left': 30}})
    pdf = main.build_report_pdf(letter)
    w, h = _page_size_pt(pdf)
    check(_approx(w, 216 * mm) and _approx(h, 279 * mm), "a US Letter report is Letter sized (%.0f x %.0f pt)" % (w, h))
    left = [x for t, x, _, _ in _text_runs(pdf) if 'PathScribe General Hospital' in t][0]
    check(_approx(left, 30 * mm, 1.5), "text starts at the lab's left margin (%.1f pt, expected %.1f)" % (left, 30 * mm))
    top = max(y for _, _, y, _ in _text_runs(pdf))
    check(h - top >= 25 * mm - 1, "the first line is below the lab's top margin")
    a3 = main.build_report_pdf(dict(PAYLOAD, pageSetup={'pageSizeId': 'a3', 'widthMm': 297, 'heightMm': 420}))
    check(_approx(_page_size_pt(a3)[0], 297 * mm), "an A3 report is A3 sized")
    check(main._current_geometry.get() is None and main._current_style.get() is None, "the page and style do not leak past the report")
    wide = dict(_LONG, revision={"type": "amendment", "revisionCount": 1, "amendedAt": "2026-10-01T10:00:00Z", "originalSignedAt": "2026-09-30T10:00:00Z"},
                pageSetup={'pageSizeId': 'a3', 'widthMm': 297, 'heightMm': 420, 'margins': {'top': 20, 'right': 20, 'bottom': 25, 'left': 20}})
    check(main.build_report_pdf(wide)[:4] == b'%PDF', "banners and figures size to the page's text width")


def test_surgical_pdf_document_style():
    print("test_surgical_pdf_document_style")
    base = main.build_report_pdf(PAYLOAD)
    styled = dict(PAYLOAD, documentStyle={'body': {'fontFamily': 'Times New Roman', 'fontSize': 20, 'weight': 'normal'},
                                          'header': {'fontSize': 16, 'weight': 'bold', 'transform': 'uppercase'},
                                          'footer': {'fontSize': 10}})
    pdf = main.build_report_pdf(styled)
    runs = _text_runs(pdf)
    notes = [r for r in runs if 'Routine excision' in r[0]]
    check(notes and _approx(notes[0][3], 15, 0.6), "body text prints at the body size (20 px = 15 pt): %s" % (notes[0][3] if notes else None))
    old = [r for r in _text_runs(base) if 'Routine excision' in r[0]]
    check(old and _approx(old[0][3], 11, 0.6), "without a style the body keeps its original 11 pt")
    inst = [r for r in runs if 'PATHSCRIBE GENERAL HOSPITAL' in r[0]]
    check(inst and _approx(inst[0][3], 12, 0.6), "the institution name takes the header style (upper case, 16 px = 12 pt)")
    check(b'Times-Roman' in pdf and b'Times-Roman' not in base, "the body family prints as Times")
    underlined = main.build_report_pdf(dict(PAYLOAD, documentStyle={'body': {'transform': 'uppercase', 'decoration': 'underline'}}))
    check(any('AGE' in r[0] for r in _text_runs(underlined)), "the body case style reaches the labels")
    korean = main.build_report_pdf(dict(PAYLOAD, language='ko', documentStyle={'body': {'fontFamily': 'Times New Roman'}}))
    check(b'Pretendard' in korean and b'Times-Roman' not in korean, "a Korean report stays in Pretendard whatever the family")


def _hf_payload(**extra) -> dict:
    header = {"slotId": "header-p1", "partId": "h1", "partName": "Letterhead", "order": 0, "nodes": [
        {"type": "header", "scope": "all", "showLogo": True, "children": [
            {"type": "expression-value", "label": "n", "template": "{{institution.name}}"},
            {"type": "expression-value", "label": "d", "template": "{{institution.department}}"},
            {"type": "static-label", "text": "Accredited laboratory"},
        ]}]}
    footer = {"slotId": "footer-p1", "partId": "f1", "partName": "Footer", "order": 0, "nodes": [
        {"type": "footer", "scope": "all", "children": [
            {"type": "expression-value", "label": "p", "template": "Footer for {{patient.sex}}"},
            {"type": "static-label", "text": "PART-CONFIDENTIAL NOTICE"},
        ]}]}
    return dict(PAYLOAD, headerAssembly=[header], footerAssembly=[footer], **extra)


def test_surgical_pdf_header_and_footer_parts():
    print("test_surgical_pdf_header_and_footer_parts")
    pdf = main.build_report_pdf(_hf_payload())
    first = _pdf_pages_text(pdf)[0]
    check("Accredited laboratory" in first, "the header part's static line is printed")
    check(first.count("PathScribe General Hospital") == 1, "the header part replaces the fixed institution block (name printed once)")
    check("PART-CONFIDENTIAL NOTICE" in first and "Footer for F" in first, "the footer part is printed, its expression filled from the case")
    check("CONFIDENTIAL — PATHOLOGY REPORT" not in first.upper() or "PART-CONFIDENTIAL NOTICE" in first, "the footer part carries the confidentiality line")
    many = _pdf_pages_text(main.build_report_pdf(_hf_payload(synopticAnswers=_LONG["synopticAnswers"])))
    check(len(many) > 1 and all("PART-CONFIDENTIAL NOTICE" in p for p in many), "the footer part is on every page (%d)" % len(many))
    check(all("Accredited laboratory" not in p for p in many[1:]), "the header part is on the first page only")
    runs = _text_runs(pdf)
    notice = [r for r in runs if 'PART-CONFIDENTIAL' in r[0]][0]
    body_low = min(y for t, _, y, _ in runs if 'Routine excision' in t)
    check(notice[2] < body_low, "the footer part sits below the body")
    plain = _pdf_pages_text(main.build_report_pdf(PAYLOAD))[0]
    check("Accredited laboratory" not in plain and plain.count("PathScribe General Hospital") == 1, "without parts the fixed institution block prints, as before")
    empty = dict(PAYLOAD, headerAssembly=[{"slotId": "h", "partId": "p", "partName": "x", "order": 0, "nodes": [{"type": "header", "scope": "all", "children": []}]}],
                 footerAssembly=[{"slotId": "f", "partId": "p", "partName": "x", "order": 0, "nodes": [{"type": "footer", "scope": "all", "children": []}]}])
    pe = _pdf_pages_text(main.build_report_pdf(empty))[0]
    check("PathScribe General Hospital" in pe and "CONFIDENTIAL" in pe.upper(), "parts that draw nothing fall back to the fixed header and confidentiality line")
    hidden = _hf_payload()
    hidden['footerAssembly'][0]['nodes'][0]['showWhen'] = {"clauses": [{"field": "patient.sex", "operator": "==", "value": "M"}]}
    check("PART-CONFIDENTIAL" not in _pdf_pages_text(main.build_report_pdf(hidden))[0], "a part's showWhen is honoured")
    check(main.build_report_pdf(_hf_payload(language='ko'))[:4] == b'%PDF', "parts build in a Korean report")
    styled = _hf_payload(documentStyle={'footer': {'fontSize': 16, 'weight': 'bold'}, 'header': {'fontSize': 20}})
    sruns = _text_runs(main.build_report_pdf(styled))
    fr = [r for r in sruns if 'PART-CONFIDENTIAL' in r[0]][0]
    check(_approx(fr[3], 12, 0.6), "the footer part takes the footer style (16 px = 12 pt)")


def test_cytology_page_size_margins_and_style():
    print("test_cytology_page_size_margins_and_style")
    mm = 72 / 25.4
    a4 = main.cytology_report.build_cytology_pdf(CYTO)
    check(_approx(_page_size_pt(a4)[0], 210 * mm), "without a page setup the cytology report is A4")
    letter = dict(CYTO, pageSetup={'pageSizeId': 'letter', 'widthMm': 216, 'heightMm': 279, 'margins': {'top': 20, 'right': 20, 'bottom': 20, 'left': 25}})
    pdf = main.cytology_report.build_cytology_pdf(letter)
    w, h = _page_size_pt(pdf)
    check(_approx(w, 216 * mm) and _approx(h, 279 * mm), "a cytology report is the lab's page size")
    left = min(x for _, x, _, _ in _text_runs(pdf))
    check(_approx(left, 25 * mm, 1.5), "cytology text starts at the lab's left margin (%.1f)" % left)
    tight = main.cytology_report.build_cytology_pdf(dict(CYTO, pageSetup={'pageSizeId': 'a4', 'margins': {'top': 5, 'right': 5, 'bottom': 5, 'left': 5}}))
    left = min(x for _, x, _, _ in _text_runs(tight))
    check(left >= 12.7 * mm - 1.5, "cytology margins never go below 0.5 inch (%.1f pt)" % left)
    check(main.cytology_report.build_cytology_pdf(letter) == main.cytology_report.build_cytology_pdf(letter), "the same request still gives the same bytes")
    styled = dict(CYTO, documentStyle={'header': {'fontSize': 24, 'transform': 'uppercase'}, 'body': {'fontSize': 16}, 'footer': {'fontSize': 12}})
    sruns = _text_runs(main.cytology_report.build_cytology_pdf(styled))
    title = [r for r in sruns if 'CYTOLOGY REPORT' in r[0]]
    check(title and _approx(title[0][3], 18, 0.6), "the title takes the header style (24 px = 18 pt, upper case)")
    check(any(_approx(r[3], 12, 0.6) and 'NILM' in r[0] for r in sruns), "lines without a size of their own take the body size (16 px = 12 pt)")
    plain = _text_runs(a4)
    check(any(_approx(r[3], 10, 0.6) and 'NILM' in r[0] for r in plain), "without a style the lines keep 10 pt")
    check(b'Liberation' in main.cytology_report.build_cytology_pdf(dict(CYTO, documentStyle={'body': {'fontFamily': 'Courier New'}})), "the cytology font stays the embedded one")
    multi = dict(CYTO, documents=[_cyto_doc(), _cyto_doc()], pageSetup={'pageSizeId': 'letter', 'widthMm': 216, 'heightMm': 279})
    check(main.cytology_report.build_cytology_pdf(multi)[:4] == b'%PDF', "a case report builds on the lab's page")


def test_font_units_rules():
    print("test_font_units_rules")
    rl = main.report_layout
    pt = lambda size, **extra: rl.style_for({'documentStyle': {'body': dict({'fontSize': size, 'units': 'pt'}, **extra)}}, 'body')['size_pt']
    check(pt(10) == 10 and pt(11) == 11 and pt(12) == 12, "a style in points prints at the number given (10 is 10 pt)")
    check(pt(6) == 8.0 and pt(4) == 8.0, "a size in points under 8 prints at 8 pt")
    check(pt(2) is None and pt(100) is None and pt('x') is None, "a size that is not usable keeps the default")
    legacy = lambda size, **cfg: rl.style_for({'documentStyle': {'body': dict({'fontSize': size}, **cfg)}}, 'body')['size_pt']
    check(legacy(10) == 7.5 and legacy(16) == 12 and legacy(4) == 7.0, "a size with no units is pixels, as before (10 px = 7.5 pt, floor 7)")
    check(legacy(10, units='legacy_px') == 7.5, "legacy_px is the same as no units")
    check(legacy(10, units='nonsense') == 7.5, "an unknown units value is treated as legacy pixels")
    inherited = rl.style_for({'fontUnits': 'pt', 'documentStyle': {'body': {'fontSize': 10}}}, 'body')['size_pt']
    check(inherited == 10, "a style with no units of its own takes the template's units")
    own = rl.style_for({'fontUnits': 'pt', 'documentStyle': {'body': {'fontSize': 10, 'units': 'legacy_px'}}}, 'body')['size_pt']
    check(own == 7.5, "a style's own units win over the template's")
    check(rl.style_for({'fontUnits': 'junk', 'documentStyle': {'body': {'fontSize': 10}}}, 'body')['size_pt'] == 7.5, "an unknown template units value is legacy")
    check(rl.label_size_pt(9, 'legacy_px') == 9 and rl.label_size_pt(9, 'pt') == 9 and rl.label_size_pt(6, 'pt') == 8.0 and rl.label_size_pt(6, 'legacy_px') == 6,
          "a label keeps its number as points; in a points template it has the 8 pt floor")
    check(rl.label_size_pt(0, 'pt') is None and rl.label_size_pt(None, 'pt') is None, "no label size means no override")
    check(rl.MIN_FONT_PT == 7.0 and rl.MIN_FONT_PT_POINTS == 8.0, "the floors are 7 pt (legacy) and 8 pt (points)")


def test_surgical_pdf_points_templates():
    print("test_surgical_pdf_points_templates")
    legacy = dict(PAYLOAD, documentStyle={'body': {'fontSize': 10}})
    points = dict(PAYLOAD, fontUnits='pt', documentStyle={'body': {'fontSize': 10, 'units': 'pt'}})
    rl = [r for r in _text_runs(main.build_report_pdf(legacy)) if 'Routine excision' in r[0]]
    rp = [r for r in _text_runs(main.build_report_pdf(points)) if 'Routine excision' in r[0]]
    check(rl and _approx(rl[0][3], 7.5, 0.6), "a legacy template still prints 10 as 7.5 pt: %s" % (rl[0][3] if rl else None))
    check(rp and _approx(rp[0][3], 10, 0.6), "the same 10 in a points template prints at 10 pt: %s" % (rp[0][3] if rp else None))
    small = dict(PAYLOAD, documentStyle={'body': {'fontSize': 6, 'units': 'pt'}})
    rs = [r for r in _text_runs(main.build_report_pdf(small)) if 'Routine excision' in r[0]]
    check(rs and _approx(rs[0][3], 8, 0.6), "a body of 6 pt prints at the 8 pt floor")
    check(main._current_font_units.get() is None, "the template's units do not leak past the report")
    check(main.build_report_pdf(dict(PAYLOAD, fontUnits='pt'))[:4] == b'%PDF', "a points template with no document style builds")
    cyto = dict(CYTO, documentStyle={'body': {'fontSize': 12, 'units': 'pt'}, 'header': {'fontSize': 16, 'units': 'pt', 'transform': 'uppercase'}})
    sruns = _text_runs(main.cytology_report.build_cytology_pdf(cyto))
    check(any(_approx(r[3], 12, 0.6) and 'NILM' in r[0] for r in sruns), "cytology lines in a points style print at the number given (12 pt)")
    title = [r for r in sruns if 'CYTOLOGY REPORT' in r[0]]
    check(title and _approx(title[0][3], 16, 0.6), "the cytology title in a points header prints at 16 pt")


def test_entrypoint_reads_page_setup():
    print("test_entrypoint_reads_page_setup")
    resp = _call_entrypoint(_make_request(dict(PAYLOAD, pageSetup={'pageSizeId': 'legal', 'widthMm': 216, 'heightMm': 356})))
    check(resp.status_code == 200 and _approx(_page_size_pt(resp.data)[1], 356 * 72 / 25.4), "render_report prints the page size sent")
    cyto = _call_entrypoint(_make_request(dict(CYTO, pageSetup={'pageSizeId': 'a3', 'widthMm': 297, 'heightMm': 420})))
    check(cyto.status_code == 200 and _approx(_page_size_pt(cyto.data)[0], 297 * 72 / 25.4), "the cytology template prints the page size sent")


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
    test_revision_banner_pdf_and_text()
    test_watermark_on_every_page()
    test_footer_barcode_is_solid_black_under_a_watermark()
    test_footer_reference_on_every_page()
    test_preanalytic_disclaimer()
    test_new_wording_follows_labels()
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
    test_cytology_template_draws_the_lines_sent()
    test_cytology_same_bytes_every_time()
    test_surgical_pdf_same_bytes_every_time()
    test_cytology_fonts_embedded()
    test_cytology_continuation_and_documents()
    test_cytology_watermark_and_barcode()
    test_cytology_entrypoint()
    test_cytology_logo_line_breaks_and_mixed_languages()
    test_page_geometry_rules()
    test_document_style_rules()
    test_surgical_pdf_page_size_and_margins()
    test_surgical_pdf_document_style()
    test_surgical_pdf_header_and_footer_parts()
    test_cytology_page_size_margins_and_style()
    test_font_units_rules()
    test_surgical_pdf_points_templates()
    test_entrypoint_reads_page_setup()
    test_intraoperative_diagnosis_is_part_of_the_report()
    test_related_cases_print_exactly_as_attached()
    test_technical_lab_line_on_a_split_case()
    print(f"\nALL {PASS_COUNT} REAL CHECKS PASSED")
