#!/usr/bin/env python3
"""Batch 678: builds the PathScribe Regulatory Readiness Matrix from the master requirements.

Source of truth: docs/compliance-guide/readiness/requirements.json (Layer 1: requirements with code and test
evidence; Layer 2: the crosswalk, a list of frameworks each requirement is potentially related to; the
jurisdiction table that drives Layer 3). Output: docs/compliance-guide/PathScribe_Regulatory_Readiness_Matrix.xlsx.

    python3 scripts/compliance/build_readiness_matrix.py

Fails (exit 1) when an evidence path does not exist, a status is not in the list, a crosswalk names an unknown
framework, or a row claims anything about compliance. Needs openpyxl.

Four separate ideas, none of which means compliant (Pete, Oct 25, 2026):
  Mapping         Candidate = potentially related by subject and intent; Mapped = relationship reviewed by the team
                  (list those frameworks in the requirement's optional "mapped" array).
  Implementation  Live / Built (Demo) / Partial / ...: functionality exists and evidence is identified.
  Verified        Independently reviewed or tested. "No" until an outside party has done it ("verified": "Independent
                  review" plus "verified_by").
  Compliance      Always "Not Assessed" here. Only external review (counsel, accreditation body, auditor, regulator)
                  can change it, and this generator refuses any other value.
"""
import json, os, sys
from openpyxl import Workbook
from openpyxl.formatting.rule import CellIsRule
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter as L

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SRC = os.path.join(ROOT, "docs", "compliance-guide", "readiness", "requirements.json")
OUT = os.path.join(ROOT, "docs", "compliance-guide", "PathScribe_Regulatory_Readiness_Matrix.xlsx")
STATUSES = ["Live", "Built (Demo)", "Partial", "Planned", "Not built", "Needs mapping", "Placeholder / Unverified", "Not assessed", "Customer / Host"]
COLORS = {"Live": "C6EFCE", "Built (Demo)": "E2F0D9", "Partial": "FFF2CC", "Planned": "FCE4D6", "Not built": "F8CBAD",
          "Needs mapping": "DDEBF7", "Placeholder / Unverified": "FFE699", "Not assessed": "D9D9D9", "Customer / Host": "EDEDED"}
F = "Arial"
COMPLIANCE = "Not Assessed"
INTERPRETATION = [
    "Crosswalk Interpretation",
    "This crosswalk identifies potential relationships between PathScribe requirements and external regulatory, accreditation, privacy, quality, and security frameworks.",
    "A \"Candidate\" mapping indicates that the requirement appears related to a framework requirement by topic or intent. It does not indicate compliance, certification, accreditation, legal sufficiency, or satisfaction of any framework requirement.",
    "PathScribe's internal assessment process is limited to: mapping requirements; reviewing implementation; reviewing test coverage; identifying functional gaps; documenting evidence.",
    "Formal determinations regarding compliance, certification, accreditation, medical-device classification, privacy-law interpretation, or conformity assessment require qualified external specialists, legal counsel, accreditation bodies, auditors, or regulatory authorities.",
    "Terms: Candidate = potentially related requirement. Mapped = relationship reviewed by the team. Implemented (the Implementation column) = functionality exists and evidence is identified. Verified = independently reviewed or tested. None of these terms means compliant. Compliance is a separate field and stays Not Assessed until external review occurs.",
]

data = json.load(open(SRC, encoding="utf-8"))
reqs, frameworks, phase1, juris = data["requirements"], data["frameworks"], data["phase1"], data["jurisdictions"]

problems, seen = [], set()
for q in reqs:
    if q["id"] in seen: problems.append(f"duplicate id {q['id']}")
    seen.add(q["id"])
    if q["status"] not in STATUSES: problems.append(f"{q['id']}: unknown status {q['status']!r}")
    for p in q["code"] + q["tests"]:
        if not os.path.exists(os.path.join(ROOT, p)): problems.append(f"{q['id']}: missing path {p}")
    for fw in q["crosswalk"]:
        if fw not in frameworks: problems.append(f"{q['id']}: unknown framework {fw}")
    for fw in q.get("mapped", []):
        if fw not in q["crosswalk"]: problems.append(f"{q['id']}: mapped framework {fw} is not in its crosswalk")
    if q.get("compliance", COMPLIANCE) != COMPLIANCE: problems.append(f"{q['id']}: compliance must stay {COMPLIANCE!r}; only external review may change it")
    if q.get("verified", "No") not in ("No", "Independent review"): problems.append(f"{q['id']}: unknown verified value")
    if q.get("verified", "No") == "Independent review" and not q.get("verified_by"): problems.append(f"{q['id']}: verified needs verified_by")
    if q["status"] in ("Live", "Built (Demo)", "Partial") and not q["tests"]:
        problems.append(f"{q['id']}: status {q['status']} needs test evidence")
for j, fws in juris.items():
    for fw in fws:
        if fw not in frameworks: problems.append(f"jurisdiction {j}: unknown framework {fw}")
if problems:
    print("\n".join(problems)); sys.exit(1)

mapping_of = lambda q, fw: "Mapped" if fw in q.get("mapped", []) else "Candidate"
verified_of = lambda q: q.get("verified", "No")
thin = Side(style="thin", color="BBBBBB")

def style_table(ws, widths, header_row=1):
    for c in ws[header_row]:
        c.font = Font(name=F, bold=True, color="FFFFFF"); c.fill = PatternFill("solid", fgColor="1F3864")
        c.alignment = Alignment(wrap_text=True, vertical="center")
    for i, w in enumerate(widths): ws.column_dimensions[L(i + 1)].width = w
    for row in ws.iter_rows(min_row=header_row + 1):
        for c in row:
            c.font = Font(name=F, size=10); c.alignment = Alignment(wrap_text=True, vertical="top")
            c.border = Border(top=thin, bottom=thin, left=thin, right=thin)

def colour(ws, rng):
    for k, v in COLORS.items():
        ws.conditional_formatting.add(rng, CellIsRule(operator="equal", formula=[f'"{k}"'], fill=PatternFill("solid", bgColor=v, fgColor=v)))

wb = Workbook()
ws = wb.active; ws.title = "Read me"
lines = [
    ("PathScribe Regulatory Readiness Matrix", True),
    ("Generated by scripts/compliance/build_readiness_matrix.py from docs/compliance-guide/readiness/requirements.json. Edit the JSON, not this file. This is a readiness matrix, not a compliance matrix.", False),
    ("Layer 1, Readiness Matrix sheet: one canonical PathScribe requirement per row, with code evidence, test evidence and an implementation status.", False),
    ("Layer 2, the framework columns and the Crosswalk sheet: which frameworks each requirement is potentially related to (see the interpretation below).", False),
    ("Layer 3, the sheets named after countries: generated views, one per jurisdiction. A framework with no mapped requirement shows 'none yet' and Not assessed.", False),
    ("Implementation status words: Live, Built (Demo), Partial, Planned, Not built (as FEATURE_OVERVIEW.md; status is for a server deployment, so a control the API server must repeat is Partial at best); Needs mapping; Placeholder / Unverified; Not assessed; Customer / Host.", False),
    ("The generator refuses to run if an evidence path does not exist, if a Live / Built / Partial row has no test evidence, or if any row's Compliance is anything but Not Assessed. A path proves the file exists, NOT that the test proves the requirement: each row still needs a reviewer to read the test (the next batch does this; one row was already downgraded for it).", False),
    ("Whether PathScribe is a medical device under IVDR is open (PS-R-042) and needs counsel. Public wording stays 'provides capabilities intended to support laboratory compliance'.", False),
    (f"{len(reqs)} requirements today; the product team expects 300 to 500 eventually.", False),
    ("", False),
] + [(t, i == 0) for i, t in enumerate(INTERPRETATION)]
for i, (t, b) in enumerate(lines, 1):
    c = ws.cell(i, 1, t); c.font = Font(name=F, bold=b, size=14 if i == 1 else 11); c.alignment = Alignment(wrap_text=True, vertical="top")
ws.column_dimensions["A"].width = 140

# Layer 1 + 2
mx = wb.create_sheet("Readiness Matrix")
other = [f for f in frameworks if f not in phase1]
hdr = ["Req ID", "Area", "Requirement", "Code evidence", "Test evidence"] + phase1 + ["Other frameworks", "Implementation status", "Verified", "Compliance", "Gap", "Outside reviewer needed"]
mx.append(hdr)
for q in reqs:
    mx.append([q["id"], q["area"], q["requirement"], "\n".join(q["code"]) or "none", "\n".join(q["tests"]) or "none"]
              + [mapping_of(q, f) if f in q["crosswalk"] else "" for f in phase1]
              + [", ".join(f for f in other if f in q["crosswalk"])]
              + [q["status"], verified_of(q), COMPLIANCE, q["gap"], q["reviewer"]])
n = len(reqs) + 1
style_table(mx, [10, 14, 46, 44, 44] + [11] * len(phase1) + [22, 18, 10, 14, 44, 28])
colour(mx, f"{L(6 + len(phase1) + 1)}2:{L(6 + len(phase1) + 1)}{n}")
mx.freeze_panes = "D2"; mx.auto_filter.ref = f"A1:{L(len(hdr))}{n}"

# Crosswalk, with the interpretation at the top
cw = wb.create_sheet("Crosswalk")
for i, t in enumerate(INTERPRETATION, 1):
    c = cw.cell(i, 1, t); c.font = Font(name=F, bold=(i == 1), size=12 if i == 1 else 10)
    c.alignment = Alignment(wrap_text=True, vertical="top")
    cw.merge_cells(start_row=i, start_column=1, end_row=i, end_column=8)
    cw.row_dimensions[i].height = 20 if i == 1 else 46
H = len(INTERPRETATION) + 2
for k, h in enumerate(["Req ID", "Framework", "Mapping", "Clause (to be confirmed by assessor)", "Implementation", "Verified", "Compliance", "Requirement"], 1):
    cw.cell(H, k, h)
r = H
for q in reqs:
    for f in q["crosswalk"]:
        r += 1
        for k, v in enumerate([q["id"], f, mapping_of(q, f), "", q["status"], verified_of(q), COMPLIANCE, q["requirement"]], 1):
            cw.cell(r, k, v)
style_table(cw, [10, 16, 12, 30, 18, 12, 14, 70], header_row=H)
colour(cw, f"E{H + 1}:E{r}")
cw.freeze_panes = f"A{H + 1}"; cw.auto_filter.ref = f"A{H}:H{r}"
CW0, CW1 = H + 1, r

# Layer 3
for j, fws in juris.items():
    s = wb.create_sheet(j.split(" (")[0][:31])
    s.append(["Regulation", "Req ID", "Requirement", "Mapping", "Implementation", "Compliance", "Gap"])
    for f in fws:
        hits = [q for q in reqs if f in q["crosswalk"]]
        if not hits: s.append([f, "none yet", "No requirement mapped yet", "Not mapped", "Not assessed", COMPLIANCE, "Needs a gap analysis against this framework"])
        for q in hits: s.append([f, q["id"], q["requirement"], mapping_of(q, f), q["status"], COMPLIANCE, q["gap"]])
    style_table(s, [18, 11, 70, 12, 20, 14, 50]); colour(s, f"E2:E{s.max_row}"); s.freeze_panes = "A2"

# Summary
sm = wb.create_sheet("Framework summary", 1)
sm.append(["Framework", "Phase", "Requirements related (Candidate or Mapped)", "Live or Built (Demo)", "Partial", "Gaps (Planned, Not built, Not assessed, Needs mapping)", "Compliance"])
fw_rng, st_rng = f"Crosswalk!$B${CW0}:$B${CW1}", f"Crosswalk!$E${CW0}:$E${CW1}"
for i, f in enumerate(frameworks, 2):
    cnt = lambda st: f'COUNTIFS({fw_rng},A{i},{st_rng},"{st}")'
    sm.append([f, "1" if f in phase1 else "2", f"=COUNTIF({fw_rng},A{i})", f"={cnt('Live')}+{cnt('Built (Demo)')}", f"={cnt('Partial')}",
               "=" + "+".join(cnt(s) for s in ("Planned", "Not built", "Not assessed", "Needs mapping")), COMPLIANCE])
style_table(sm, [18, 8, 24, 22, 10, 40, 14])
wb.save(OUT)
print(f"{len(reqs)} requirements, {sum(len(q['crosswalk']) for q in reqs)} crosswalk entries -> {os.path.relpath(OUT, ROOT)}")
