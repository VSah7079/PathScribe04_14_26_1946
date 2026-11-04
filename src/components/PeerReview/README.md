# components/PeerReview

PS-144 (Batch 439): the peer review forms shared by the report page's banner
(`pages/SynopticReportPage/components/PeerReviewBanner.tsx`) and the sign-out
gate (`pages/SynopticReportPage/modals/PeerReviewGateModal.tsx`).

- `PeerReviewDialogs.tsx`
  - `PeerReviewRequestForm`: choose the reviewer (active pathologists, never the signer) and add a note.
  - `PeerReviewDialog`: the reviewer's independent read (agree, or disagree with their diagnosis and how far apart the reads are), the consensus step (consensus reached with the diagnosis, or unresolved with why), and withdrawing a request.

Render and dispatch only. The checks are in `services/quality/peerReviewRules.ts` and run again in `services/quality/peerReviewService.ts`, which also checks the capabilities (`case:peer-review:request`, `case:peer-review:record`).
