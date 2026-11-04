# Self-collected HPV recall: values and engine handoff (Australia and New Zealand)

Prepared Oct 20, 2026 for Pete; updated in Batches 640 and 641. **Nothing here is waiting on PathScribe or on a sign-off.** A laboratory's administrator chooses the country from a dropdown in Configuration > Cytology > Screening Strategy and sets that country's windows and recall wording (per language) themselves; the values below are the built-in starting point. The register's own recommendation codes belong to the interface engine team's onboarding of each programme (section 2). Everything below is built and working in the demo. Nothing here is sent to a register: the interface engine team maps the codes and sends the message. See `docs/architecture/HPV_RESULT_INBOUND.md` section 8 for the design.

## What triggers a recall

A self-collected specimen is vaginal, not cervical, so it can never be reflexed to cytology. Every self-collected **Positive** or **Invalid** result therefore goes to the Recall needed tile. Which country's rule applies follows the **performing laboratory's** jurisdiction (the institution setting if none is assigned). Only AU and NZ have it.

## 1. Target windows (a setting, in whole weeks)

Set per country in Configuration > Cytology > Screening Strategy > "Self-collected HPV recall windows" (Country dropdown). Needs `config:cytology-screening-strategy:manage`. Empty boxes mean "as soon as practicable".

| Recall | Default now | Applies to | Please confirm |
|---|---|---|---|
| Urgent | 2 to 4 weeks | HPV 16/18 positive; positive with genotype not reported | AU: ___ NZ: ___ |
| Routine | 6 to 12 weeks | Other oncogenic types positive | AU: ___ NZ: ___ |
| Australia repeat collection | 6 to 12 weeks | Invalid result (Australia calls it "Unsatisfactory") | ___ |
| New Zealand repeat collection | No fixed period ("as soon as practicable") | Invalid / unsuitable swab | ___ (NZ also has: unsatisfactory cytology within 3 months) |

Questions an administrator may want to settle with their programme:
1. Are the Urgent and Routine windows the same in Australia and New Zealand? Today one setting serves both.
2. Is the window counted from the **result date** or the **date the laboratory reported**? PathScribe counts weeks from the result.
3. When the genotype is not reported (or only the combined 18/45 group is), is Urgent right? PathScribe treats it as Urgent, without a colposcopy claim, because the group cannot tell 18 (urgent) from 45 (routine).

## 2. Recommendation codes: handoff for the interface engine team

PathScribe says what the recall is, using six internal keys; the engine decides how each register receives it. These are not set in PathScribe. Each key travels in the register payload as `{ recommendation_code, display_text, authority: "PATHSCRIBE_INTERNAL", status: "PLACEHOLDER_MAPPED", target_registry }`, and the engine maps it to the register's own code. The `PLACEHOLDER_MAPPED` label only says the engine has not yet confirmed its mapping; it blocks nothing.

| Internal key | Display text | When PathScribe sends it | Register's own code |
|---|---|---|---|
| AU_RECALL_CLINICIAN_LBC | Recall for Clinician-Collected LBC | AU positive, any oncogenic type | engine to map |
| AU_REFER_COLPOSCOPY | Refer for Colposcopy Assessment | AU positive, HPV 16/18 (sent together with the LBC key) | engine to map |
| AU_RECALL_REPEAT_COLLECTION | Repeat Sample Collection Required (Unsatisfactory Result) | AU invalid | engine to map |
| NZ_RECALL_CLINICIAN_LBC | Recall for Clinician-Collected Cytology | NZ positive, any oncogenic type | engine to map |
| NZ_REFER_COLPOSCOPY | Refer for Colposcopy Assessment | NZ positive, HPV 16/18 (with the LBC key) | engine to map |
| NZ_RECALL_REPEAT_COLLECTION | Repeat Sample Collection Required (Invalid / Unsuitable Sample) | NZ invalid | engine to map |

Question for the engine team during onboarding: does each register accept two recommendations on one result (a 16/18 result carries both colposcopy and LBC), or does it want one combined code?

## 3. Recall wording shown to staff

The built-in text is below (Pete's text from the programme guidance). A laboratory administrator can replace it per country, kind and language in the same card; an empty box keeps the built-in text. Shown in six languages (the fr/de/nl/ko/es versions are machine translated and also need review).

- **Australia, positive:** "Oncogenic HPV ({type}) was detected in the self-collected vaginal specimen. In accordance with National Cervical Screening Program guidelines, reflex cytology cannot be performed on a self-collected sample. A clinician-collected cervical specimen (liquid-based cytology, LBC) is required for reflex cytology triage prior to {colposcopy referral | further management}."
- **Australia, invalid:** "The self-collected specimen gave an invalid hrHPV result. A repeat self-collection or a clinician-collected specimen is required."
- **New Zealand, positive:** "HPV ({type}) was identified from the self-collected vaginal swab. As self-collected samples do not contain cervical transformation zone cells, automated reflex cytology is not possible. Please recall the participant for a clinician-collected cervical sample (LBC) to enable cytological evaluation."
- **New Zealand, invalid:** "The self-collected swab gave an invalid hrHPV result (unsuitable for analysis). Please repeat the HPV test as soon as practicable, by a repeat self-collected swab or a clinician-collected sample."

`{type}` reads "type 16/18", "other oncogenic types" or "type not reported".

## 4. How a recall closes

A recall clears on its own when the same patient has a **later clinician-collected cervical (GYN cytology) case** (any GYN sample, for a repeat collection). Matching is by patient and creation time only, until the register supplies its own identifiers. Question: should closure also require the register to acknowledge the later sample?

## 5. Not PathScribe's to decide

- The laboratory's **NATA accreditation identifier** (Australia): PathScribe does not hold it and sends null.
- The registry ids `ncsr_australia` and `ncsp_new_zealand` are placeholders.

## Record of what each laboratory set

Not a sign-off: a lab's settings and wording are in its own configuration and the Audit Log (`RECALL_SETTINGS_CHANGED`). The older questions about programme windows (same for Australia and New Zealand? counted from result or report date? Urgent when the genotype is not reported?) are now the administrator's to answer in the setting.
