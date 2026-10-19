# QZ Tray and your own certificate: a guide for hospital IT (PS-55)

**Status: Planned in part.** The app now connects to QZ Tray before it prints (Batch 589). Signing print requests with a certificate needs the PathScribe server (phase 2e) and is not built yet. This guide says what IT will be asked to do, so it can be planned. Steps marked **Test first** have not been run on a pilot machine and must be checked against QZ Tray's own documentation (qz.io, "Custom Provisioning" and "Unattended Deployment").

## What the prompts are

QZ Tray is the small program that lets PathScribe send labels straight to a thermal printer. Two different prompts can appear, and they have different fixes.

| Prompt | Why it appears | Fix |
|---|---|---|
| QZ Tray asks "Allow this website to use your printers?" | PathScribe's print requests are not signed with a certificate QZ Tray already trusts | Sign requests with your organisation's certificate (server side), and add that certificate to QZ Tray's allowed list on every workstation |
| The browser or the operating system does not trust QZ Tray's local connection (a security warning or password prompt on first launch) | QZ Tray secures its local connection with its own self-signed certificate | Install the certificate in the machine's trust store, deployed by MDM or Group Policy |

## Decision taken

One **self-signed certificate per customer** (Pete, Oct 16, 2026). It is simpler to issue than a public certificate, but it has an expiry date, so IT must renew and redeploy it before then. A calendar reminder 60 days before expiry is recommended.

## Who does what

| Step | Owner |
|---|---|
| Create the customer's certificate and keep its private key on the PathScribe server | ForMedrixAI and the dev team (phase 2e). The private key is never put in the browser or on a workstation |
| Deliver the public certificate to the customer's IT team | ForMedrixAI |
| Add the certificate to each workstation's trust store | Customer IT, through MDM or Group Policy (below) |
| Add the certificate to QZ Tray's allowed list on each workstation | Customer IT (below) |
| Renew before expiry | Customer IT with ForMedrixAI |

## Trust store, by tool

These are the standard ways to push a trusted certificate. The certificate goes in as a trusted root (or trusted authority) certificate.

- **Microsoft Intune:** a "Trusted certificate" configuration profile, assigned to the workstation group.
- **Jamf Pro:** a Configuration Profile with a Certificates payload, set to trusted.
- **Group Policy (Windows domain):** Computer Configuration → Policies → Windows Settings → Security Settings → Public Key Policies → Trusted Root Certification Authorities.

## QZ Tray's allowed list

QZ Tray keeps the certificates it trusts in a file called `allowed.dat`. Its documentation gives these system-wide locations ([qz.io headless guide](https://qz.io/docs/headless)):

- Windows: `%PROGRAMDATA%\qz\allowed.dat`
- macOS: `/Library/Application Support/qz/allowed.dat`
- Linux: `/srv/qz/allowed.dat`

The documented way to add a certificate is to run QZ Tray once with its whitelist option on a reference machine (the page names `--whitelist`, also `--allow` or `-a`), then deploy the resulting file to the other machines with the same tool IT already uses (an Intune script or Win32 app, a Jamf package, or a Group Policy file preference). **Test first:** the exact command and file contents for your QZ Tray version.

## Known limits

- Installing the certificate in the operating system alone may not remove QZ Tray's own "Allow" prompt. Both parts are needed.
- One report from a Jamf user found a first-launch password prompt still appeared after the certificate was installed through a configuration profile ([thread](https://community.jamf.com/general-discussions-2/qz-tray-override-crt-hail-mary-pass-26498)). Treat the macOS steps as **Test first**.
- Until the server signs requests, users may still see QZ Tray's prompt once per workstation and choose "Remember this decision".

## What the app does today

- Before a label prints to a QZ Tray printer, the app opens the connection itself.
- If QZ Tray is not running, the label opens in the browser's print window as before, and a message says the label printer is not connected and to check that QZ Tray is running.

## For the dev team (phase 2e)

- Hold the certificate's private key on the server; expose one signing endpoint that signs the message QZ Tray asks for, only for a signed-in user.
- Return the public certificate to the browser for QZ Tray's certificate request.
- Log each signing request in the audit log.

Sources: [QZ Tray headless guide](https://qz.io/docs/headless); [Jamf community thread](https://community.jamf.com/general-discussions-2/qz-tray-override-crt-hail-mary-pass-26498).
