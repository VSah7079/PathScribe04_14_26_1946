# Retention Holds queue (Batch 610)

Status: **Built (Demo).** Batch Management → Retention Holds (`/batch-management/retention-holds`).

Every case with an active retention hold, in one list: the case accession, the reason (patient requested, litigation, research, other), the note, who placed the hold and when. A hold keeps a case's material out of the disposal queue.

- **Release** (`case:retention-hold:release` for the case's facility): asks for the release note the organisation's Field Requirements require, then releases through the same service as the report page's Retention hold window, so it is audited and saved against the case's version. A refusal (no permission, no note, already released, case missing) is said in words and the hold stays listed.
- **Search** by accession, reason or person.
- **Export CSV** (`retention:holds-queue:export`): through the export service (`retention.holds-queue`). The free-text note is not exported because it can name people.

A released hold never appears. Accession numbers and notes are tagged as patient data on screen.

Waits for the server: a 409 on a stale case version when two people release at once (the browser already re-reads the case and reports a conflict).
