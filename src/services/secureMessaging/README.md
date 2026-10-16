# services/secureMessaging

Batch 517 (PS-143). These files hold the secure messaging gateways a lab can send through, and the agreement that allows patient data through each one.

**Pete's decisions**
- **Oct 2.** Branding follows the lab's own gateway, and NHSmail is one of the gateway values. Patient or finding details go only through a gateway that has its own BAA (US) or data processing agreement on file. When a lab has several gateways, each is checked on its own.
- **Oct 10.** Gateways for Australia, New Zealand and South Korea are in scope now, not deferred.

| File | What it does |
|---|---|
| `secureGateways.ts` | The catalogue. Email gateways: NHSmail, Egress, Accurx, Paubox, Virtru, Zix. Clinical-messaging networks: HealthLink, Medical-Objects and ReferralNet (Australia and New Zealand, Secure Message Delivery), plus Korea's 진료정보교류 (health information exchange, CDA). Argus is left out because it is being retired. Pure data. |
| `secureGatewayRules.ts` | The setup's rules and the send check (`secureSendProblem`: no gateway / gateway not available / patient data without an agreement in force). Also `agreementInForce`, `sendableGateways`, `preferredGateway`, and `secureMessagingConfigProblem` for saves. Pure. |
| `ISecureMessagingConfigService.ts`, `mockSecureMessagingConfigService.ts` | One setup per performing-lab tenant (enterprise facility), stored under `pathscribe_secure_messaging`. `forOrganisation` finds a person's lab. `save` needs `config:secure-messaging:manage` (seeded to Admin and Lab Director). |

**Demo seeds.** They come back on Full Reset.

| Lab | Gateways |
|---|---|
| Desert Valley Medical Center | Paubox with a BAA (the default), and Virtru with none. This is the "one gateway covered, one not" case. |
| Manchester University NHS FT | NHSmail, with a data processing agreement |
| Midwest Pathology Associates | Zix, with a BAA |
| Sydney Cytology & Pathology | HealthLink and Medical-Objects |
| Auckland Cytology Services | HealthLink |
| Seoul General Screening Center | Korea's health information exchange |

Henry Ford and the EU and Canadian demo labs have no gateway, so they show the "no secure messaging gateway" message.

**Screens**
- Facility editor → **Secure messaging** tab (`components/FacilityDictionary/FacilitySecureMessagingTab.tsx`, enterprise facilities only).
- The secure message window (`components/SecureEmail/`).

**Removed.** `organisationService.secureEmailGateway` ('Paubox' | 'Virtru' | 'Zix'). Nothing ever read it, and it is replaced by these files.

**Still open**
- The real transports (PS-332).
- Pete to confirm which of the AU/NZ/KR networks to support first (Jira PS-143).
- A per-site gateway (below the tenant), if a lab wants one.
