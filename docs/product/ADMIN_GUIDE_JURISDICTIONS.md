# Admin Guide source: setting up and maintaining jurisdictions (PS-334)

Source text for an Admin Guide chapter (the PDF in `public/help/` is edited outside this repository). Every step below was checked against the screens and wording in the app on Oct 16, 2026 (Batch 593). Anything not built is marked **Planned**.

## 1. What a jurisdiction is, and what it controls

A jurisdiction is the country or health-system region a facility works under. There are 13: United States, Canada, England & Wales (NHS), Scotland (NHS Scotland), Northern Ireland (HSC), Republic of Ireland (HSE), Australia, New Zealand, South Korea, Belgium, Netherlands, Germany and France.

**There is no single "Region" screen.** A facility is given a jurisdiction once, and each rule set that varies by country is then kept on its own screen. Setting up a region means doing step 2, then reviewing the screens in step 3.

What the facility's jurisdiction decides today:
- the facility's default report language (see the table in section 4);
- which country's signing rules apply to its staff (Country Signing Rules);
- which payment schemes the Accessioning screen offers (Jurisdiction Payment Mapping);
- which AI services and hosting regions are allowed (AI vendor policy);
- the cytology-histology and biopsy-resection correlation windows, the cancer registry setting and the organ-map settings, where those are set per jurisdiction;
- the retention figures for the governing bodies linked to that jurisdiction.

## 2. Give a facility its jurisdiction

1. Open **Facility Configuration** (the Facility Dictionary).
2. Add a facility, or edit the existing one.
3. On the **General** tab, choose the **Jurisdiction**.
4. Check **Reporting**: the report language shows "Default for the jurisdiction (…)". Leave it, or choose another language for this lab.
5. Save.

**Check:** a US facility defaults to English, Korea to Korean, Belgium to Dutch (Belgian variant), Netherlands to Dutch, Germany to German, France to French. A French-speaking Belgian lab sets French (Belgian variant) on the Reporting tab.

**Changing it later:** the new jurisdiction applies from then on. Review sections 3.1 to 3.5 again for that facility, because settings made for the old jurisdiction do not move with it.

## 3. Review the screens that vary by jurisdiction

Open **Configuration → System** and look in the sidebar for each of these.

### 3.0 Code Systems (Batch 595)
Which code systems (ICD-10, ICD-11, ICD-O, SNOMED CT and others) each jurisdiction uses. Each system is **Off**, **Optional** or **Required**, from a start date.
1. Open **Configuration → System → Code Systems** (also found by searching "ICD-11" or "Jurisdiction").
2. The table lists the laboratory's jurisdiction and each facility's. **In use today** shows each system's role today and any change already scheduled; **Set by** says Default or Set here.
3. **Edit**. Each row is one system and its role. To change a role later, add a second row for the same system with an **Applies from** date, for example ICD-11 Optional now and Required from a later date. The latest row that has started applies. Leave the date empty for a rule that applies now.
4. **Save**. A change needs the Manage the code systems permission (Admin and Lab Director have it) and is recorded in the audit log. **Reset to default** removes your settings.
5. The default asks for nothing: every system is optional except ICD-11, which is off.

**Planned:** the Add Code window, sign-out and outbound messages do not read these settings yet. Until they do, saving a policy changes nothing a pathologist sees. The screen says so.

### 3.1 Country Signing Rules
National rules for each participation type: local title, whether it may sign out, whether its work needs a countersign, whether it may view the whole case. Every lab in the country inherits them unless the lab has its own exception under **Participation Types → Edit**.
- **Who can change them:** only a platform administrator. Everyone else sees the screen read-only.
- **To change (platform administrator):** pick the country, change the rules, give a **Reason for the change** and the **Regulatory basis**, then **Save changes**. Each change is audited.
- Save or discard before switching country; the screen will not switch with unsaved changes.
- **Offer in this country / Stop offering here** controls whether a participation type exists for that country.

### 3.2 Jurisdiction Payment Mapping
Maps each country's local payment schemes to a Master Payment Type. The Accessioning screen's Primary Jurisdiction selector reads these.
1. Optionally filter by country.
2. **Add mapping**: country code, local scheme code, local terminology, Master Payment Type, outbound format, notes.
3. Use **Deactivate / Reactivate** instead of deleting; **Show inactive** lists them.

### 3.3 Governing Bodies and retention figures
Governing bodies (for example CAP, RCPath) decide which protocols appear in the Synoptic Library and which retention figures apply.
1. Turn each body on or off. Use **Add Custom Body** only for a body that is not in the standard list; custom bodies add to the standard ones.
2. Open **Retention figures** for a body to see its version history.
3. **Add New Version**: effective date, days for block, slide and wet tissue, and the source or citation. Tick **Apply retroactively** only for a lengthening change; a shortening change leaves earlier cases under the version active at their sign-out.
4. Under **Applies to Jurisdiction(s)**, tick the jurisdictions this body is the live source for, then **Save jurisdictions**. Leave all unticked if the body is not yet the source for any real jurisdiction. A body not linked shows "not yet linked to a jurisdiction".

**Planned:** the nightly monitoring of SNOMED CT and ICD-10/11 for deprecated codes shows as "Terminology Monitoring — Coming Soon".

### 3.4 Rules that can differ by jurisdiction
These are set per enterprise, per jurisdiction and per facility, and the most specific setting wins:
- AI vendor policy (which AI services and hosting regions are allowed; no rule means every service is allowed);
- cytology-histology correlation window;
- biopsy-resection correlation window;
- cancer registry settings (including whether the jurisdiction honours a patient's opt-out; leave it off where reporting is statutory);
- organ maps (colours, patterns, legend wording, thresholds);
- the interpretation terminology a lab uses.

### 3.5 Staff credentials by jurisdiction
A forensic case needs the signer to hold an active medicolegal appointment for the case's jurisdiction on their staff record (**Staff**, jurisdictional credentials).

## 4. Default report language by jurisdiction

| Jurisdiction | Default report language |
|---|---|
| United States, Canada, England & Wales, Scotland, Northern Ireland, Ireland, Australia, New Zealand | English |
| South Korea | Korean |
| Belgium | Dutch (Belgian variant) |
| Netherlands | Dutch |
| Germany | German |
| France | French |

Korean wording in particular has had no native-speaker review yet; see `KNOWN_GAPS.md`.

## 5. Add a country that is not in the list
**Not available.** The 13 jurisdictions are fixed in the application. Adding a country needs a software change (its default language, labels and rule sets), not an Admin setting. Planned work, no date.

## 6. Open point
- Search used to promise a setting for the SNOMED CT release and ICD variant. That is now the **Code Systems** screen (section 3.0). The SNOMED CT release itself (US Edition, UK Edition and so on) is still not chosen on any screen: it follows the server's terminology service, which is **Planned** (`docs/architecture/DIAGNOSIS_CODING.md`).
