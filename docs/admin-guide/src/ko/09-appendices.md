---
chapter: 9
id: ch9
title: 부록: 문제 해결 및 감사 로그 검증
---

# 부록: 문제 해결 및 감사 로그 검증 {#ch9}

이 장은 세 부분으로 구성됩니다. 첫째는 문제 해결 매트릭스로, 관리자가 가장 자주 접하는 문제를 원인과 해결에 사용하는 화면과 함께 정리합니다. 둘째는 PathScribe가 표시하거나 기록하는 오류 코드의 색인입니다. 셋째는 시스템 로그 화면을 설명하고, 감사 로그에 담긴 내용을 검증하는 단계별 절차를 안내합니다. 용어집은 가이드의 마지막 장입니다([용어집](#ch99)).

**사용자 가이드(Batch 657).** 실제 업무를 하는 사람들을 위한 온라인 사용자 가이드는 `docs/user-guide/`의 Markdown으로부터 `python3 scripts/user-guide/build.py`로 빌드되어 애플리케이션과 함께 `/help` 아래에 게시됩니다. 각 화면의 도움말 버튼과 F1은 현재 표시된 화면의 문서를 엽니다. 구성 및 관리자 화면에는 관리자 가이드 버튼이 그대로 유지됩니다. 설정은 필요하지 않습니다. 페이지를 추가하거나 변경하려면 해당 파일을 편집한 후 다시 빌드하십시오. 빌드는 필수 섹션, 링크, 경로를 확인합니다.

여기에 인용된 모든 메시지는 제품의 영어 원문입니다. 모든 코드는 소스에 존재하는 코드입니다. 계약서에 자리 표시자로만 있고 제품에서 사용되지 않는 코드는 수록하지 않습니다.

## 문제 해결 매트릭스 {#ch9-matrix}
Breadcrumb: 홈 > 관리자 가이드 > 부록 > 문제 해결 매트릭스

**상태:** 구현됨

**매트릭스 사용 방법.** 사용자가 보고한 증상을 찾고, 가능한 원인을 확인한 다음, 해결 방법을 따르십시오. "작동하지 않는다"는 보고의 대부분은 두 가지 중 하나입니다. 설정한 적이 없는 사전(빈 목록)이거나, 권한을 보유하지 않은 역할(비활성화된 버튼 또는 거부된 저장)입니다. 증상에 대문자 코드가 표시되면 [오류 코드 색인](#ch9-error-codes)에서 찾으십시오.

**가장 먼저 확인할 사항.** 두 가지 확인으로 대부분의 질문에 답할 수 있습니다.

1. [시스템 로그](#screen-audit-log)를 열고 해당 사용자의 이름 또는 권한 키를 검색하십시오. 거부된 권한 확인은 해당 권한과 사용자의 세션 역할을 명시한 **Capability refused** 항목을 기록합니다.
2. **오류 로그** 탭에서 보고된 시각 부근의 코드, 소스, 시간이 있는 미해결 오류를 확인하십시오.

### 빈 목록과 "설정되지 않음" 메시지 {#ch9-matrix-empty}

비어 있는 드롭다운 또는 "구성된 항목 없음" 메시지는 거의 항상 설정 순서에서 앞선 사전을 건너뛰었다는 뜻입니다. 순서는 [설정 순서](setup-sequence.html) 페이지에 나와 있습니다.

| 증상(사용자에게 보이는 내용) | 가능한 원인 | 해결 | 화면 |
|---|---|---|---|
| 케이스의 팀 창에 **구성된 참여 유형이 없습니다**와 함께 "System → Participation Types에서 유형을 설정하십시오."라는 안내가 표시됩니다. | 참여 유형이 없습니다. | 검사실에서 사용하는 유형을 추가한 다음 창을 다시 여십시오. | [참여 유형](#screen-participation_types) |
| 테스트 인쇄 또는 라벨 창에 **구성된 프린터 프로필이 없습니다**라고 표시됩니다. | 프린터 프로필이 추가되지 않았습니다. | 라벨 프린터 모델마다 프린터 프로필을 추가하십시오. | [프린터 프로필](#screen-printer_profiles) |
| 포매 또는 미세절편 스테이션에 **구성된 프린터 없음** 또는 **구성된 프린터 프로필이 더 이상 존재하지 않습니다**라고 표시됩니다. 슬라이드 분배 스테이션에는 **This station isn't set up for slide-label printing.**이라고 표시됩니다. | 스테이션에 프린터 프로필이 없거나 프로필이 삭제되었습니다. | 스테이션을 열고 현재 존재하는 프린터 프로필을 선택하십시오. | [스캔 스테이션](#screen-scan_stations), [프린터 프로필](#screen-printer_profiles) |
| 슬라이드 분배 또는 스캔 배치 창에 **No slide scanners are set up**이라고 표시됩니다(텍스트에는 구성, 장비, 종류 "슬라이드 스캐너"가 언급됩니다). | 슬라이드 스캐너 종류의 장비 레코드가 없습니다. | 스캐너를 추가하십시오. | [장비](#screen-equipment) |
| 라벨이 인쇄되지 않고 메시지에 **GS1 GTIN이 설정되지 않았습니다. GS1 카세트 라벨을 인쇄하기 전에 인쇄 설정에서 설정하십시오.**(또는 슬라이드 라벨)라고 표시됩니다. | 시설에 GS1 GTIN이 입력되어 있지 않습니다. | 인쇄 설정에 GTIN을 입력하십시오. | [인쇄 설정](#screen-print_settings) |
| 시설 운영 대시보드에 **No display profiles are configured yet**이라고 표시됩니다. | 디스플레이 프로필이 없습니다. | 디스플레이 프로필에서 하나를 추가하십시오. | [디스플레이 프로필](#screen-display_profiles) |
| 수술실 대시보드에 **No terminals configured yet**이라고 표시됩니다. | 수술실 터미널이 없습니다. | 터미널을 추가하십시오. | [수술실 터미널](#screen-or_suite_terminals) |
| 라우팅 규칙 창에 **⚠ 활성 풀이 없습니다. 먼저 세부 전공에서 "풀 / 작업 그룹"을 활성화하세요.**라고 표시됩니다. | 풀 / 작업 그룹 모드인 세부 전문 분야가 없습니다. | 하나 이상의 세부 전문 분야에서 풀 / 작업 그룹을 켠 다음 규칙을 추가하십시오. | [세부 전문 분야](#screen-subspecialties), [라우팅 규칙](#screen-routing_rules) |
| 새 컨테이너 창에 **No facility is currently configured with the Reference Lab role.**이라고 표시됩니다. | 참조 검사실 역할을 가진 시설이 없습니다. | 시설 설정에서 한 시설에 해당 역할을 부여하십시오. | [시설 사전](#screen-facility-dictionary) |
| 보안 이메일을 사용하려는 사용자에게 **검사실에 보안 메시지 게이트웨이가 설정되어 있지 않습니다.**라고 표시됩니다. | 시설의 보안 메시지 탭에 게이트웨이가 없습니다. | 시설 설정에서 게이트웨이를 추가하십시오. | [시설 사전](#screen-facility-dictionary) |
| 고객별 서비스 수준의 **추가** 목록이 비어 있고, 모든 고객에게 이미 수준이 있거나 설정된 고객이 없다는 안내가 표시됩니다. | 모든 시설에 이미 서비스 수준이 있거나 고객 시설이 없습니다. | 먼저 시설을 추가하거나 기존 수준을 편집하십시오. | [시설 구성](#screen-clients), [고객별 서비스 수준](#screen-client_sla) |

### 저장 거부, 비활성화된 버튼, 열 수 없는 화면 {#ch9-matrix-permissions}

PathScribe는 권한을 두 번 확인합니다. 화면은 사용자가 할 수 없는 작업을 비활성화합니다. 그 작업 뒤의 서비스가 다시 확인하여 거부합니다. 운영 환경에서는 API 서버가 확인을 반복하며 최종 결정권을 가집니다. Superadmin을 포함하여 어떤 역할에도 우회 수단은 없습니다.

| 증상 | 가능한 원인 | 해결 | 화면 |
|---|---|---|---|
| 버튼이 비활성화되어 있습니다. 툴팁에 **내 역할에 ‘<capability>’ 권한이 없습니다.**라고 표시됩니다. | 사용자의 어떤 역할도 해당 권한을 보유하지 않습니다. | 사용자가 보유한 역할에 해당 권한을 추가하십시오. 권한은 역할 사전에서 영역별로 묶여 있습니다. | [역할](#screen-staff-roles), [구성원](#screen-staff-members) |
| 툴팁에 **‘<capability>’에는 ‘<other>’ 권한도 필요하지만, 내 역할에는 없습니다.**라고 표시됩니다. | 해당 권한은 다른 권한을 필요로 합니다(카탈로그의 `requires` 목록). | 두 권한을 모두 부여하십시오. 필요한 권한도 부여될 때까지 역할 저장은 "a capability is missing one it needs"로 거부됩니다. | [역할](#screen-staff-roles) |
| 툴팁에 **‘<capability>’은(는) 여기에서 사용할 수 없습니다: 담당 기관 범위에 포함되지 않습니다.**라고 표시됩니다. | 사용자가 해당 권한을 보유하고 있으나, 그 작업이 할당된 시설 밖의 시설을 대상으로 합니다(또는 모든 시설에 걸칩니다). | 사용자의 시설 할당을 변경하십시오. | [구성원](#screen-staff-members) |
| 구성 저장이 **저장되지 않음: “<permission>” 권한이 필요합니다. 관리자가 구성 → 직원 → 역할 사전에서 부여할 수 있습니다.**라는 메시지와 함께 실패합니다. | 사용자에게 해당 화면의 `config:...:manage` 권한이 없습니다(코드 `CONFIG_NOT_PERMITTED`). | 명시된 권한을 사용자의 역할에 부여하십시오. | [역할](#screen-staff-roles) |
| 역할 저장이 **Not saved: no role could manage roles afterwards.**라는 메시지와 함께 실패합니다. | 이 변경으로 `config:roles:manage`를 보유한 할당 가능한 역할이 하나도 남지 않게 됩니다. | 먼저 다른 할당 가능한 역할에 **역할 관리**를 부여한 다음 저장하십시오. | [역할](#screen-staff-roles) |
| 역할 또는 직원 저장이 **changing the clinical mismatch rules and approving the AI instructions are separate duties** 메시지와 함께 실패합니다. | 한 사람(또는 한 역할)이 `config:clinical-mismatch-rules:manage`와 `config:ai-prompt:approve`를 모두 보유할 수 없습니다(코드 `SEPARATION_OF_DUTIES`). | 두 권한을 서로 다른 사람이 보유한 두 역할로 나누십시오. | [역할](#screen-staff-roles), [구성원](#screen-staff-members) |
| 역할 저장이 **this role is managed by ForMedrixAI** 메시지와 함께 실패합니다. | Superadmin 역할은 병원에서 변경할 수 없습니다. | 방법이 없습니다. 다른 역할을 사용하십시오. | [역할](#screen-staff-roles) |
| 사용자가 화면을 열면 **이 화면에 대한 접근 권한이 없습니다**가 표시됩니다. 로그인 후 홈 페이지에는 **None of your roles gives you access to a screen yet.**라고 표시됩니다. | 역할에 `screen:<name>:open` 권한이 없으므로 홈에 타일이 표시되지 않고 라우트가 해당 주소를 거부합니다. | 역할에 화면 권한을 추가하십시오. | [역할](#screen-staff-roles) |
| 사용자가 자신의 편집을 승인할 수 없습니다: **이 텍스트를 편집하셨으므로 승인할 수 없습니다.** | AI 지침에서는 자기 승인이 거부됩니다(코드 `SELF_APPROVAL`). | `config:ai-prompt:approve`를 보유한 다른 사람이 승인하도록 하십시오. | [AI 지침](#screen-ai_instructions) |
| 내보내기 버튼이 작동하지 않거나, 내보내기 화면에 **이 보고서를 내보낼 권한이 없습니다.**라고 표시됩니다. | 각 내보내기에는 고유한 권한이 있으며(예: `audit:audit-log:export`), 서버는 다운로드 시 이를 다시 확인합니다. | 버튼 툴팁에 명시된 내보내기 권한을 부여하십시오. | [역할](#screen-staff-roles), [내 내보내기](#screen-my-exports) |

### 인쇄되지 않는 라벨과 보고서 {#ch9-matrix-print}

| 증상 | 가능한 원인 | 해결 | 화면 |
|---|---|---|---|
| 라벨이 브라우저 인쇄 창으로 전송되고 메시지에 **라벨 프린터가 연결되어 있지 않아 이 라벨이 브라우저 인쇄 창으로 전송되었습니다. 이 컴퓨터에서 QZ Tray가 실행 중인지 확인하세요.**라고 표시됩니다. | 해당 컴퓨터에서 QZ Tray 서비스가 실행 중이 아니거나 접근할 수 없습니다. | 컴퓨터에서 QZ Tray를 시작한 다음 다시 인쇄하십시오. | [프린터 프로필](#screen-printer_profiles), [인쇄 설정](#screen-print_settings) |
| **Label <id> did not print: <printer> is out of labels / is out of ribbon / the print head is open / could not be reached.** | 프린터가 해당 상태를 보고했습니다(코드 `PAPER_OUT`, `RIBBON_OUT`, `HEAD_OPEN`, `PRINTER_UNREACHABLE`). | 프린터를 수리한 다음 라벨을 다시 시도하십시오. 라벨은 저절로 다시 시도되지 않으므로 두 번 인쇄될 수 없습니다. | [인쇄 대기열](#screen-audit-interfaces) |
| **...did not print: <printer> rejected the label layout** 또는 **its barcode failed GS1 validation. This is a PathScribe problem; please report it.** | 라벨의 내용이 거부되었습니다(`MALFORMED_ZPL`, `INVALID_GS1`). 다시 시도해도 해결되지 않습니다. | 시각과 라벨의 레이아웃을 함께 ForMedrixAI 지원팀에 보고하십시오. | [라벨 디자이너](#screen-label_designer) |
| 보고서 인쇄 작업이 "Network printing needs the PathScribe site agent."와 함께 **실패**로 표시됩니다. | 브라우저에서 네트워크 프린터로 보고서를 보냈으나 브라우저는 해당 프린터에 접근할 수 없습니다(`NEEDS_SITE_AGENT`). | 검사실의 인쇄를 사이트 에이전트 프린터로 라우팅하십시오. | [사이트 에이전트](#screen-site_agents), [인쇄 대상 라우팅 규칙](#screen-print_routing_rules) |
| 인쇄가 "작동"하는 것처럼 보이지만 데모에서 아무것도 출력되지 않습니다. | 데모는 인쇄를 전송하지 않고 기록합니다. | 시뮬레이션 인쇄 기록을 확인하십시오. | [시뮬레이션 인쇄 기록](#screen-simulated_print) |

### 멈춰 있는 인터페이스 메시지 {#ch9-matrix-interfaces}

| 증상 | 가능한 원인 | 해결 | 화면 |
|---|---|---|---|
| 메시지가 **발신 인터페이스 DLQ**에 오류 **전송 거부됨**, **전송 시간 초과** 또는 **엔진에 접근할 수 없음**과 함께 표시됩니다. | 인터페이스 엔진이 2xx를 반환하지 않았습니다(`DISPATCH_REJECTED`, `DISPATCH_TIMEOUT`, `DISPATCH_UNREACHABLE`). 메시지는 재시도를 위해 보관됩니다. | **엔진** 하위 탭에서 엔진을 확인하십시오. 정상이면 **전송 재시도**를 선택하십시오(`interface:outbound:resend` 필요). | [시스템 로그: 인터페이스](#screen-audit-interfaces) |
| 재시도 시 **발신 대기열에서 보류됨: 먼저 그곳에서 해제하세요.**라는 응답이 표시됩니다. | 메시지가 발신 대기열에서 보류 중입니다. | 해당 화면에서 해제한 다음 다시 보내십시오. | [시스템 로그: 인터페이스](#screen-audit-interfaces) |
| 재시도 시 **Held: the report PDF isn't available yet.**라는 응답이 표시됩니다. | 보고서 문서가 아직 렌더링되지 않았습니다. | 기다리십시오. 이후 재시도에서 PDF와 함께 전송됩니다. | [시스템 로그: 인터페이스](#screen-audit-interfaces) |
| 수가 항목이 **발신 DLQ**(재무)에 **ICD-10 코드 누락** 또는 **제공자 NPI 누락**과 함께 있습니다. | 코드 또는 NPI 없이는 수가 항목을 생성할 수 없습니다(`MISSING_ICD10`, `MISSING_PROVIDER_NPI`). | 해당 행에 값을 입력하십시오. 행에는 각각에 대한 입력란이 있습니다. | [시스템 로그: 재무](#screen-audit-financial) |
| **서버 작업**의 작업을 다시 대기열에 넣을 수 없고 **이 작업은 인터페이스에서 다시 보내십시오.**라고 표시됩니다. | 인터페이스 및 인쇄 작업은 각자의 화면에서 다시 보냅니다(`WRONG_SCREEN`). | `interface:outbound:resend` 또는 `print:job:retry` 권한으로 인터페이스 또는 인쇄 대기열을 사용하십시오. | [시스템 로그: 인터페이스](#screen-audit-interfaces) |
| 다시 대기열에 넣으면 **이 작업은 더 이상 실패 상태가 아닙니다. 이미 다시 대기열에 들어갔을 수 있습니다.**라는 응답이 표시됩니다. | 다른 사람이 이미 다시 대기열에 넣었습니다(`NOT_DEAD_LETTERED`). | 새로 고치십시오. 조치는 필요하지 않습니다. | [시스템 로그](#screen-audit-log) |
| 보류 중인 인터페이스 예외(**인터페이스 로그** 탭의 개수 배지). | 환자 또는 케이스에 연결할 수 없었던 수신 메시지가 사람의 처리를 기다립니다. | **인터페이스 예외** 하위 탭을 열고 각각을 검토하십시오. | [시스템 로그: 인터페이스](#screen-audit-interfaces) |

### 로그인 실패 {#ch9-matrix-signin}

| 증상 | 가능한 원인 | 해결 | 화면 |
|---|---|---|---|
| **Incorrect email or password**에 이어 **One more failed attempt will lock sign-in for this email for 15 minutes.**가 표시됩니다. | 비밀번호 로그인은 연속 5회 실패하면 해당 이메일을 15분 동안 잠급니다. 횟수는 입력한 이메일별로 계산되며, 그 이메일이 계정에 속하는지 여부와 관계없습니다. | 15분을 기다리거나 사용자의 새 비밀번호를 설정하십시오. 비밀번호를 설정하면 잠금이 해제됩니다. 감사 로그에는 **Sign-in failed**, **Sign-in locked**, **Sign-in refused**가 기록됩니다. | [구성원](#screen-staff-members) |
| **관리자에게 직원 화면에서 비밀번호를 재설정해 달라고 요청하세요.** | 사용자가 비밀번호를 잊었습니다. 로그인 양식에는 셀프서비스 재설정이 없습니다. | 사용자의 레코드에 임시 비밀번호를 설정하십시오. 사용자는 다음 로그인 시 직접 비밀번호를 선택해야 합니다. | [구성원](#screen-staff-members) |
| 싱글 사인온: **You signed in, but there is no active PathScribe account for you.** | 일치하는 직원 레코드가 없습니다(`not_provisioned`). | 사용자를 구성원으로 추가하십시오. 첫 싱글 사인온은 이메일로 연결됩니다. | [구성원](#screen-staff-members) |
| 싱글 사인온: **Your PathScribe account is inactive.** | 직원 레코드가 비활성 상태입니다. | 다시 활성화하십시오. | [구성원](#screen-staff-members) |
| 싱글 사인온: **More than one PathScribe account matches this sign-in.** | 두 직원 레코드가 이메일을 공유합니다(`ambiguous`). | 중복을 제거하십시오. | [구성원](#screen-staff-members) |
| 싱글 사인온: **This PathScribe account is already linked to a different sign-in account.** | 메일함이 재할당되었습니다. 레코드가 같은 공급자의 다른 ID에 연결되어 있습니다(`already_linked`). | 사용자의 레코드에서 이전 계정의 연결을 해제한 다음 다시 로그인하십시오. | [구성원](#screen-staff-members) |
| 싱글 사인온: **Your PathScribe account doesn't include access to this application.** | 사용자의 역할에 케이스 접근도 구성 접근도 없습니다(`no_app_access`). | 접근 권한이 있는 역할을 사용자에게 부여하십시오. | [역할](#screen-staff-roles) |
| 싱글 사인온: **Your organisation requires a second factor, and the sign-in service did not report one.** | ID 제공자가 두 번째 인증 요소를 보고하지 않았습니다(`mfa_required`). | ID 제공자에서 두 번째 인증 요소를 완료하십시오. | [세션 보안](#screen-session_security) |
| **이 설치에는 로그인이 설정되어 있지 않습니다. 시스템 관리자에게 문의하세요.** | 빌드에 로그인이 구성되어 있지 않습니다. | `config.json`을 수정하십시오(아래의 시작 코드 참조). | [시작 구성 코드](#ch9-codes-config) |
| 코드 목록과 함께 전체 페이지에 **PathScribe를 시작할 수 없습니다: 구성을 수정해야 합니다**가 표시됩니다. | `config.json`에 제품이 거부하는 설정이 있습니다. 잘못된 설정으로는 PathScribe가 시작되지 않습니다. | 웹 서버의 `config.json`을 수정한 다음 다시 로드하십시오. 각 코드는 색인에 있습니다. | [시작 구성 코드](#ch9-codes-config) |
| 두 번째 인증 요소 코드: **이 코드는 이미 사용되었습니다. 다음 코드를 기다리세요.** 또는 **Too many attempts. Second-factor codes are locked until <time>.** | 코드가 재사용되었거나 잘못된 코드가 너무 많이 입력되었습니다. | 다음 코드를 기다리거나 잠금 시각까지 기다리십시오. | [세션 보안](#screen-session_security) |
| **This account is already signed in on another tab or window on this browser.** | PathScribe는 브라우저당 계정마다 하나의 활성 세션만 허용합니다. | 계속하여 다른 세션을 로그아웃하십시오(저장하지 않은 작업은 보관되며 검토하도록 제공됩니다). | [세션 보안](#screen-session_security) |

### 멈춘 것처럼 보이는 인터페이스 메시지 또는 화면 {#ch9-matrix-stuck}

| 증상 | 가능한 원인 | 해결 | 화면 |
|---|---|---|---|
| 화면에 **PathScribe 서버에 연결할 수 없습니다. 잠시 후 다시 시도하십시오.**라고 표시됩니다. | 브라우저가 API 서버에 접근하지 못했거나, 서버가 서버 오류로 응답했거나(`UNAVAILABLE`), 30초 이내에 응답하지 않았습니다(`TIMED_OUT`). | 네트워크 경로와 API 서버의 상태를 확인하십시오. 화면에 명시된 경우 화면이 다시 시도합니다(예: 엔진 패널은 1분마다). | [시스템 로그](#screen-audit-log) |
| **세션이 종료되었습니다. 다시 로그인하십시오.** | 서버가 401을 반환했습니다(`SIGNED_OUT`). | 다시 로그인하십시오. | [세션 보안](#screen-session_security) |
| **이미 처리되었습니다. 새로 고침 후 다시 확인하세요.** 또는 충돌을 보고하는 저장. | 다른 사람이 같은 레코드를 변경했습니다(`CONFLICT`). | 화면을 새로 고치고 변경을 다시 적용하십시오. | [시스템 로그](#screen-audit-log) |
| 내보내기가 **준비 중** 상태로 남아 있거나 **The export took too long and was stopped.**로 끝납니다. | 빌드는 30분 후에 중단됩니다(`TIMED_OUT`). | 필터를 좁혀 다시 내보내십시오. | [내 내보내기](#screen-my-exports) |
| **You already have 3 exports being prepared.** | 한 사용자는 열려 있는 내보내기를 3개까지 가질 수 있습니다(`TOO_MANY_OPEN`). | 하나가 끝날 때까지 기다리거나 하나를 취소하십시오. | [내 내보내기](#screen-my-exports) |

## 시스템 오류 코드 색인 {#ch9-error-codes}
Breadcrumb: 홈 > 관리자 가이드 > 부록 > 시스템 오류 코드 색인

**상태:** 구현됨

**이 색인이 다루는 범위.** 관리자가 화면에서 볼 수 있거나, 오류 로그에서 읽거나, 계약서에서 찾을 수 있는 소스의 대문자 코드입니다. 각 행은 코드가 나타나는 화면, 의미, 조치를 제공합니다. 두 번째 열에 명시된 계약서는 `docs/architecture/`에 있습니다. 어떤 계약서에도 코드가 없는 경우 해당 행에는 서비스 파일이 명시됩니다.

**코드가 화면에 도달하는 방식.** API 클라이언트는 실패한 모든 호출에 짧은 고정 코드를 부여하며, 서버의 메시지 텍스트에 환자 이름이 포함될 수 있으므로 이를 사용하지 않습니다. 서버 코드가 대문자, 숫자, 밑줄로 이루어져 있고 길이가 2~40자이며 문자로 시작하면 서버 코드를 사용합니다. 그렇지 않으면 코드는 HTTP 상태에서 가져옵니다.

| 상태 | 코드 |
|---|---|
| 401 | `SIGNED_OUT` |
| 403 | `NOT_PERMITTED` |
| 404 | `NOT_FOUND` |
| 409 | `CONFLICT` |
| 400, 422 | `INVALID` |
| 429 | `TOO_MANY_REQUESTS` |
| 그 외 모든 경우 | `UNAVAILABLE` |

소문자 사유도 있습니다(예: 로그인 사유 `not_provisioned`와 `inactive`, 서버의 `capability_refused`, `support_access_disabled`, `support_access_not_approved`). 이들은 대문자 코드가 아니므로 이 색인이 아니라 위의 매트릭스와 [지원 접근](#screen-support_access) 화면에 있습니다.

### 서버 기반의 모든 화면에 표시될 수 있는 코드 {#ch9-codes-http}

| 오류 코드 | 표시되는 위치 | 의미 | 조치 |
|---|---|---|---|
| `SIGNED_OUT` | API 서버를 호출하는 모든 화면. 계약서: `HTTP_SERVICES_PATTERN.md` 4절, `src/services/apiServer/apiHttpClient.ts`. | 서버가 401로 응답했습니다. 로그인이 종료되었거나 토큰이 수락되지 않았습니다. | 다시 로그인하십시오. 로그인 직후 다시 발생하면 ForMedrixAI 지원팀에 알리십시오. |
| `NOT_PERMITTED` | 서버 기반의 모든 화면. 계약서: `HTTP_SERVICES_PATTERN.md`, `AUTHORIZATION_API.md`. | 서버가 403으로 응답했습니다. 권한이 없거나 사용자의 시설 범위 밖입니다. | 비활성화된 버튼에 관한 매트릭스 행을 참조하십시오. [시스템 로그](#screen-audit-log)에서 **Capability refused**를 검색하십시오. |
| `NOT_FOUND` | 서버 기반의 모든 화면. 계약서: `HTTP_SERVICES_PATTERN.md`. | 레코드가 더 이상 존재하지 않습니다. 예를 들어 다른 사람이 삭제하거나 폐기했습니다. | 새로 고친 다음 다시 여십시오. |
| `CONFLICT` | 버전이 있는 저장이 있는 모든 화면. 계약서: `HTTP_SERVICES_PATTERN.md`(버전이 있는 저장). | 서버가 409로 응답했습니다. 레코드를 읽은 이후 변경되었습니다. 케이스의 경우 서버는 보유한 버전도 반환합니다. | 새로 고치고 변경을 다시 적용하십시오. |
| `INVALID` | 서버 기반의 모든 저장. 계약서: `HTTP_SERVICES_PATTERN.md`. | 서버가 400 또는 422로 응답했습니다. 값을 거부했습니다. | 양식의 입력값을 확인한 다음 다시 저장하십시오. |
| `TOO_MANY_REQUESTS` | 서버 기반의 모든 화면. 계약서: `HTTP_SERVICES_PATTERN.md`, `STAFF_ADMIN_API.md`. | 서버가 429로 응답했습니다. 속도 제한에 도달했습니다. | 잠시 기다린 다음 다시 시도하십시오. 반복되는 경우는 ForMedrixAI 지원팀으로 보내십시오. |
| `TIMED_OUT` | 서버 기반의 모든 화면, 내보내기 목록. 계약서: `HTTP_SERVICES_PATTERN.md`, `ASYNC_EXPORT_API.md` 4절. | 호출이 30초(클라이언트의 기본값) 이내에 응답을 받지 못했습니다. 내보내기 빌드의 경우 빌드가 30분 후에 중단되었습니다. | 다시 시도하십시오. 내보내기의 경우 필터를 좁히십시오. |
| `UNAVAILABLE` | 서버 기반의 모든 화면, 예를 들어 워크스테이션 목록, 사이트 에이전트 목록, 엔진 패널, 서버 작업. 계약서: `HTTP_SERVICES_PATTERN.md`. | 서버에 접근할 수 없었거나, 그 밖의 상태로 응답했거나, JSON 객체가 아닌 응답을 보냈습니다. | 네트워크와 API 서버를 확인하십시오. 다시 시도하십시오. |
| `NOT_SUPPORTED` | 서버 배포에서의 데모 전용 작업. 계약서: `HTTP_SERVICES_PATTERN.md`, `src/services/apiServer/httpServiceExtras.ts`. | 해당 메서드는 데모(데모 데이터 시드)에만 존재합니다. 서버 버전은 호출하지 않습니다. | 조치는 필요하지 않습니다. 서버 배포에서는 정상입니다. |
### 권한 및 승인 거부 {#ch9-codes-permission}

| 오류 코드 | 표시되는 위치 | 의미 | 조치 |
|---|---|---|---|
| `CONFIG_NOT_PERMITTED` | 모든 구성 저장. 계약서: `AUTHORIZATION_API.md`, `src/services/authorization/guardConfigWrites.ts`. | 사용자의 역할에 해당 화면의 권한이 없으므로 아무것도 저장되지 않았습니다. 구성 페이지에 권한 이름이 표시됩니다. | [역할](#screen-staff-roles)에서 해당 권한을 부여하십시오. |
| `EXPORT_NOT_PERMITTED` | 케이스 검색 내보내기와 케이스 보고서 내보내기. 계약서: `CASE_SEARCH_API.md`, `AUTHORIZATION_API.md`(내보내기). | 내보내기 권한(`search:case-results:export` 또는 `search:case-report:export`)이 없습니다. 반환되는 행이 없습니다. | 해당 권한을 부여하십시오. |
| `SEPARATION_OF_DUTIES` | 역할 저장과 직원 저장. 계약서: `AUTHORIZATION_API.md`(직무 분리). | 하나의 역할 또는 한 사람이 `config:clinical-mismatch-rules:manage`와 `config:ai-prompt:approve`를 모두 보유하게 됩니다. | 두 권한을 서로 다른 사람이 보유한 별도의 역할에 두십시오. |
| `SELF_APPROVAL` | AI 지침. 계약서: `AUTHORIZATION_API.md`, [AI 지침](#screen-ai_instructions). | 사용자가 보류 중인 텍스트를 편집했으므로 승인할 수 없습니다. | `config:ai-prompt:approve`를 보유한 다른 사람이 승인하도록 하십시오. |
| `AI_VENDOR_NOT_ALLOWED` | 모든 AI 기능. 계약서: `AI_PROXY.md`, `src/services/aiIntegration/aiCallPolicy.ts`. | AI 공급업체 정책이 해당 관할권에서 서비스 또는 지역을 거부합니다. 호출은 이루어지지 않으며 `AI_CALL_REFUSED`로 감사 기록됩니다. 기능은 AI 없이 계속 진행되며 "AI is not available for this jurisdiction."이라고 표시합니다. | 검사실의 정책이 허용하는 경우 [AI 동작](#screen-tab-ai) 탭에서 규칙 또는 호스팅 지역을 변경하십시오. |

### 내보내기 {#ch9-codes-exports}

| 오류 코드 | 표시되는 위치 | 의미 | 조치 |
|---|---|---|---|
| `INVALID_PARAMETERS` | [내 내보내기](#screen-my-exports). 계약서: `ASYNC_EXPORT_API.md` 3절. | 서버가 필터를 사용할 수 없었습니다. | 필터를 변경한 다음 다시 내보내십시오. |
| `TOO_MANY_ROWS` | [내 내보내기](#screen-my-exports). 계약서: `ASYNC_EXPORT_API.md`. | 일치하는 행이 1,000,000개를 초과했습니다. | 필터를 좁히십시오. |
| `TOO_MANY_OPEN` | [내 내보내기](#screen-my-exports). 계약서: `ASYNC_EXPORT_API.md`. | 사용자에게 이미 대기 중이거나 실행 중인 내보내기가 3개 있습니다. | 기다리거나 하나를 취소하십시오. |
| `BUILD_FAILED` | [내 내보내기](#screen-my-exports). 소스: `src/services/exports/asyncExportContract.ts`. | 서버가 파일을 만들 수 없었습니다. 빌드는 2회 시도됩니다. | 다시 시도하십시오. 다시 실패하면 ForMedrixAI 지원팀에 알리십시오. |
| `CANCELLED` | [내 내보내기](#screen-my-exports). 소스: `src/i18n/locales/en.json`(`exports.problem`). | 내보내기가 취소되었습니다. | 여전히 필요하면 다시 내보내십시오. |
| `EXPIRED` | [내 내보내기](#screen-my-exports), 사이트 에이전트. 계약서: `ASYNC_EXPORT_API.md`, `SITE_AGENT_API.md` 6절. | 내보내기의 경우: 보관 기간(기본 7일, 검사실이 1~30일로 설정) 후 파일이 삭제되었습니다. 사이트 에이전트 작업의 경우: 제때 시작되지 않아 반환되었습니다. | 다시 내보내십시오. 작업의 경우 아래의 인쇄 관련 행을 참조하십시오. |

### 시작 구성 {#ch9-codes-config}

이 코드들은 전체 페이지 **PathScribe를 시작할 수 없습니다: 구성을 수정해야 합니다** 화면에 표시됩니다. 수정될 때까지 PathScribe는 시작되지 않습니다. 설정과 규칙은 `RUNTIME_CONFIG.md` 3절에 있습니다. 코드는 `src/services/runtimeConfig/runtimeSettings.ts`입니다.

| 오류 코드 | 표시되는 위치 | 의미 | 조치 |
|---|---|---|---|
| `UNREADABLE` | 시작 화면. | `config.json`이 올바른 JSON이 아닙니다. | 파일을 수정하십시오. |
| `NOT_AN_OBJECT` | 시작 화면. | `config.json`은 설정과 값의 목록(JSON 객체)이어야 합니다. | 파일을 수정하십시오. |
| `UNKNOWN_SETTING` | 시작 화면. | 이름이 PathScribe가 아는 설정이 아니거나, 빌드 전용 이름입니다. | `RUNTIME_CONFIG.md`와 철자를 대조하십시오. |
| `NOT_TEXT` | 시작 화면. | 값은 텍스트, 숫자, 또는 true나 false여야 합니다. | 값을 수정하십시오. |
| `TOO_LONG` | 시작 화면. | 값이 2,000자보다 깁니다. | 줄이십시오. |
| `INVALID_URL` | 시작 화면. | 값은 웹 주소이거나 `/`로 시작하는 이 사이트의 경로여야 하며, 사용자 이름이나 비밀번호가 포함되어서는 안 됩니다. | 주소를 수정하십시오. |
| `NOT_HTTPS` | 시작 화면. | 주소는 https를 사용해야 합니다. 일반 http는 개발 빌드에서 이 컴퓨터로 향하는 경우에만 허용됩니다. | https 주소를 사용하십시오. |
| `NOT_THIS_SITE` | 시작 화면. | 프록시 경로가 다른 사이트로 연결됩니다(예: `//host`). | 이 사이트의 경로 또는 https 주소를 사용하십시오. |
| `API_SERVER_REQUIRED` | 시작 화면. | 서버 빌드에는 PathScribe 서버의 주소가 필요한데 설정되어 있지 않습니다. | API 주소를 설정하십시오. |
| `SSO_REQUIRED` | 시작 화면. | 서버 빌드는 ID 제공자를 통해서만 로그인하므로 `VITE_AUTH_MODE`는 `sso`여야 합니다. | 이를 설정하고 제공자의 설정을 입력하십시오. |
| `API_SERVER_IN_DEMO_BUILD` | 시작 화면. | 데모 빌드는 실제 서버와 통신하지 않습니다. | 서버 빌드를 설치하십시오. |
| `NOT_IN_DEMO_BUILD` | 시작 화면. | 데모 빌드는 허브, 렌더러, 인터페이스 수신기 또는 서버 작업 설정을 사용할 수 없으며 운영 환경이 될 수 없습니다. | 서버 빌드를 설치하십시오. |
| `ADDRESS_NOT_FROM_SERVER` | 시작 화면, "from the PathScribe server's /api/config"로 표시됨. | 사이트의 보안 정책이 `config.json`에서 만들어지므로 서버는 주소를 설정할 수 없습니다. | 주소를 `config.json`에 넣으십시오. |
| `NOT_FROM_SERVER` | 시작 화면, "from the PathScribe server's /api/config"로 표시됨. | 이 설정(로그인, 인스턴스 역할, 서버가 실행하는 작업)은 `config.json` 또는 빌드만 설정할 수 있습니다. | 설정을 `config.json`으로 옮기십시오. |

### 인쇄, 라벨 및 사이트 에이전트 {#ch9-codes-print}

처음 여섯 개의 코드에는 고유한 메시지 텍스트가 있습니다. 에이전트 코드의 계약서는 `SITE_AGENT_API.md` 6절이며, 목록은 `src/services/siteAgent/siteAgentContract.ts`의 `AGENT_ERROR_CODES`입니다. 보고서 인쇄는 검사실의 전달 일정(기본 1분, 5분, 15분, 최대 10회 재시도)에 따라 다시 시도됩니다. 라벨은 저절로 다시 시도되지 않습니다.

| 오류 코드 | 표시되는 위치 | 의미 | 조치 |
|---|---|---|---|
| `PRINTER_UNREACHABLE` | 라벨 토스트, 인쇄 대기열. 계약서: `SITE_AGENT_API.md`. | 프린터에 연결되지 않습니다. 보고서는 다시 시도됩니다. | 프린터의 전원과 네트워크를 확인한 다음 다시 시도하십시오. |
| `PAPER_OUT` | 라벨 토스트, 인쇄 대기열. 계약서: `SITE_AGENT_API.md`. | 라벨 프린터에 라벨이 떨어졌습니다. | 라벨을 넣고 다시 시도하십시오. |
| `RIBBON_OUT` | 라벨 토스트, 인쇄 대기열. 계약서: `SITE_AGENT_API.md`. | 라벨 프린터에 리본이 떨어졌습니다. | 리본을 넣고 다시 시도하십시오. |
| `HEAD_OPEN` | 라벨 토스트, 인쇄 대기열. 계약서: `SITE_AGENT_API.md`. | 프린트 헤드가 열려 있습니다. | 닫고 다시 시도하십시오. |
| `MALFORMED_ZPL` | 라벨 토스트. 계약서: `SITE_AGENT_API.md`. | 프린터가 라벨 레이아웃을 거부했습니다. 다시 시도되지 않습니다. | ForMedrixAI 지원팀에 보고하십시오. |
| `INVALID_GS1` | 라벨 토스트. 계약서: `SITE_AGENT_API.md`. | 라벨의 바코드가 GS1 검증에 실패했습니다. 다시 시도되지 않습니다. | ForMedrixAI 지원팀에 보고하십시오. [인쇄 설정](#screen-print_settings)에서 GTIN을 확인하십시오. |
| `NEEDS_SITE_AGENT` | [인쇄 대기열](#screen-audit-interfaces). 계약서: `SITE_AGENT_API.md`, `src/services/printing/printJobFailureReason.ts`. | 브라우저는 네트워크 프린터로 보낼 수 없습니다. 작업은 즉시 실패하고 예외 대기열로 이동합니다. | 사이트 에이전트 프린터를 사용하십시오. [사이트 에이전트](#screen-site_agents)를 참조하십시오. |
| `PRINTER_OFFLINE` | [인쇄 대기열](#screen-audit-interfaces). 소스: `src/services/printing/attemptPrintDelivery.ts`. | 인쇄 컴퓨터에 QZ Tray가 연결되어 있지 않습니다. 다시 시도됩니다. | QZ Tray를 시작하십시오. |
| `PRINT_REJECTED` | [인쇄 대기열](#screen-audit-interfaces). 소스: `attemptPrintDelivery.ts`, `redispatchPrintJob.ts`. | 작업을 인쇄할 수 없습니다. 예를 들어 QZ Tray 전달에 구성된 프린터가 없거나 보고서 문서를 만들 수 없었습니다. | 프린터 설정을 수정한 다음 다시 시도하십시오. |
| `PRINTER_REJECTED` | 인쇄 대기열. 계약서: `SITE_AGENT_API.md`. | 프린터가 작업을 거부했습니다. 다시 시도되지 않습니다. | 프린터 자체의 오류 표시를 확인하십시오. |
| `DOCUMENT_UNAVAILABLE` | 인쇄 대기열. 계약서: `SITE_AGENT_API.md`. | 에이전트의 다운로드 링크가 실패했거나 만료되었습니다. 다시 시도됩니다. | 처음에는 조치가 필요하지 않습니다. 계속되면 ForMedrixAI 지원팀에 알리십시오. |
| `DOCUMENT_INTEGRITY` | 인쇄 대기열. 계약서: `SITE_AGENT_API.md`. | 파일의 SHA-256이 일치하지 않아 인쇄되지 않았습니다. 다시 시도되지 않습니다. | ForMedrixAI 지원팀에 알리십시오. |
| `UNKNOWN_DESTINATION` | 인쇄 대기열, 파일 드롭. 계약서: `SITE_AGENT_API.md`. | 에이전트에 해당 id의 프린터 또는 공유가 없습니다(구성이 오래되었습니다). | [사이트 에이전트](#screen-site_agents)에서 에이전트의 프린터 목록을 업데이트하십시오. |
| `SHARE_UNREACHABLE` | 파일 드롭 전달. 계약서: `SITE_AGENT_API.md`. | 공유에 접근할 수 없었습니다. 다시 시도됩니다. | 공유를 확인하십시오. |
| `SHARE_ACCESS_DENIED` | 파일 드롭 전달. 계약서: `SITE_AGENT_API.md`. | 에이전트가 공유에 쓸 수 없습니다. 다시 시도되지 않습니다. | 공유의 권한을 수정하십시오. |
| `SHARE_FULL` | 파일 드롭 전달. 계약서: `SITE_AGENT_API.md`. | 공유가 가득 찼습니다. 다시 시도됩니다. | 공간을 확보하십시오. |
| `IN_DOUBT` | 인쇄 대기열. 계약서: `SITE_AGENT_API.md`. | 에이전트가 전송을 시작한 후 결과를 알기 전에 중단되었습니다. 저절로 다시 보내지지 않습니다. | 프린터를 확인하십시오. 페이지가 없으면 다시 인쇄하십시오. |
| `AGENT_ERROR` | 인쇄 대기열. 계약서: `SITE_AGENT_API.md`. | 그 밖의 모든 에이전트 실패입니다. 다시 시도됩니다. | [사이트 에이전트](#screen-site_agents)에서 에이전트를 확인하십시오. |

### 발신 메시지, 수가, 등록처 및 서버 작업 {#ch9-codes-outbound}

| 오류 코드 | 표시되는 위치 | 의미 | 조치 |
|---|---|---|---|
| `DISPATCH_REJECTED` | [시스템 로그: 인터페이스](#screen-audit-interfaces)("전송 거부됨"으로 표시). 계약서: `INTERFACE_TRANSACTIONS.md`. | 엔진이 2xx를 반환하지 않았습니다. 메시지는 재시도를 위해 보관됩니다. | 엔진을 확인한 다음 **전송 재시도**를 선택하십시오. |
| `DISPATCH_TIMEOUT` | [시스템 로그: 인터페이스](#screen-audit-interfaces)("전송 시간 초과"로 표시). 계약서: `OUTBOUND_QUEUE_API.md`, `INTERFACE_TRANSACTIONS.md`. | 엔진이 제때 응답하지 않았습니다. | 위와 같습니다. |
| `DISPATCH_UNREACHABLE` | [시스템 로그: 인터페이스](#screen-audit-interfaces)("엔진에 접근할 수 없음"으로 표시). 계약서: `INTERFACE_TRANSACTIONS.md`. | 엔진에 접근할 수 없었습니다. | 위와 같습니다. |
| `MISSING_ICD10` | [시스템 로그: 재무](#screen-audit-financial). 계약서: `DIAGNOSIS_CODING.md`, `src/services/billing/validateChargeMetadata.ts`. | 수가 항목에 ICD-10 코드가 없습니다. | 해당 행에 코드를 입력하십시오. |
| `MISSING_PROVIDER_NPI` | [시스템 로그: 재무](#screen-audit-financial). 소스: `validateChargeMetadata.ts`. | 수가 항목에 제공자 NPI가 없습니다. | 해당 행에 NPI를 입력하십시오. |
| `REGISTRY_NOT_READY` | 발신 대기열, 등록처 예외. 계약서: `BATCH_REGISTRY_FEED_API.md`, `REGISTRY_ACKNOWLEDGEMENT_API.md`. | 등록처 제출이 보류되었습니다. 필수 필드 또는 설정이 없습니다. | 항목에 명시된 누락 사항을 완료하십시오. |
| `REGISTRY_LIVE_NOT_APPROVED` | 발신 대기열, 등록처 예외. 계약서: `REGISTRY_GO_LIVE_API.md`. | 실제 케이스가 서명되어 확정되었으나 등록처 연결이 운영 전환 승인을 받지 않았습니다. 항목에 "Held: attestation required"가 표시됩니다. | 등록처 설정 화면에서 운영 전환 승인을 완료하십시오. |
| `NOT_DEAD_LETTERED` | 서버 작업. 계약서: `MESSAGE_BUS_API.md`. | 작업이 더 이상 실패 상태가 아닙니다(409). | 새로 고치십시오. |
| `WRONG_SCREEN` | 서버 작업. 소스: `src/services/serverJobs/serverJobsContract.ts`. | 인터페이스 및 인쇄 작업은 여기에서 다시 대기열에 넣지 않습니다. | 인터페이스 또는 인쇄 대기열에서 다시 보내십시오. |
| `CONSULT_LINK_NOT_ACTIVE` | 자문 링크 탭. 계약서: `CONSULT_ACCESS_API.md`. | 링크가 이미 폐기되었거나 만료되었습니다. | 새로 고치십시오. |
| `NO_RECIPIENTS` | 보고서 일정. 계약서: `SCHEDULED_REPORTS_API.md`. | 활성 수신자가 남아 있지 않습니다. | 수신자를 한 명 이상 선택하십시오. |
| `TOO_MANY_SCHEDULES` | 보고서 일정. 계약서: `SCHEDULED_REPORTS_API.md`. | 사용자가 허용되는 최대 개수의 일정을 보유하고 있습니다. | 일정을 삭제하거나 병합하십시오. |
| `RECIPIENT_ACCESS_UNKNOWN` | 보고서 일정. 계약서: `SCHEDULED_REPORTS_API.md`. | 수신자가 볼 수 있는 항목을 확인할 수 없어 아무것도 생성되지 않았습니다. | 수신자의 역할과 시설을 확인하십시오. |
| `RUN_FAILED` | 보고서 일정. 소스: `src/services/scheduledReports/createScheduledReportService.ts`. | 예약된 실행이 실패했습니다. | 오류 로그를 확인하십시오. |

### 구성 화면: 알아 둘 만한 거부 {#ch9-codes-config-screens}

| 오류 코드 | 표시되는 위치 | 의미 | 조치 |
|---|---|---|---|
| `REASON_REQUIRED` | [코드 가져오기](#screen-code_import), 워크스테이션 및 피드 폐기, 여러 케이스 작업. 소스: 각 화면의 서비스. | 변경에 사유가 필요합니다. | 사유를 입력하십시오. |
| `BAD_DATE` | [코드 체계](#screen-code_systems). 소스: `src/services/coding/codeSystemPolicyRules.ts`. | 날짜가 실제 달력 날짜가 아닙니다. | 수정하십시오. |
| `BAD_ROLE` | [코드 체계](#screen-code_systems). 소스: `codeSystemPolicyRules.ts`. | 규칙의 역할이 올바르지 않습니다. | 올바른 역할을 선택하십시오. |
| `BAD_SYSTEM` | [코드 체계](#screen-code_systems). 소스: `codeSystemPolicyRules.ts`. | 코드 체계가 비어 있거나 올바르지 않습니다. | 코드 체계를 선택하십시오. |
| `DUPLICATE` | [코드 체계](#screen-code_systems). 소스: `codeSystemPolicyRules.ts`. | 같은 코드 체계에 시작일이 같은 행이 두 개 있습니다. | 한 행을 제거하거나 날짜를 변경하십시오. |
| `NO_RULES` | [코드 체계](#screen-code_systems). 소스: `codeSystemPolicyRules.ts`. | 규칙이 없습니다. | 규칙을 추가하거나 기본값으로 재설정하십시오. |
| `TOO_MANY` | [코드 체계](#screen-code_systems). 소스: `codeSystemPolicyRules.ts`. | 규칙이 너무 많습니다. | 일부를 제거하십시오. |
| `SAME_PERSON` | [코드 가져오기](#screen-code_import). 소스: `src/services/billing/codeEngine/planImportJob.ts`. | 가져오기를 업로드한 사람은 이를 승인하거나 거부할 수 없습니다(이중 확인 원칙). | 다른 사람이 결정해야 합니다. |
| `JOB_NOT_APPROVED` | [코드 가져오기](#screen-code_import). 소스: `planImportJob.ts`. | 승인된 가져오기만 롤백할 수 있습니다. | 없습니다. |
| `JOB_NOT_PENDING` | [코드 가져오기](#screen-code_import). 소스: `planImportJob.ts`. | 가져오기가 더 이상 승인 대기 중이 아닙니다. | 새로 고치십시오. |
| `MAPPING_INCOMPLETE` | [코드 가져오기](#screen-code_import). 소스: `src/services/billing/mockCodeImportService.ts`. | 청구 코드, CPT 코드, 적용일 열이 모두 매칭되지 않았습니다. | 매칭하거나 파일 전체에 하나의 적용일을 지정하십시오. |
| `NO_ROWS` | [코드 가져오기](#screen-code_import). 소스: `mockCodeImportService.ts`. | 파일에 가져올 수 있는 행이 없습니다. | 파일을 확인하십시오. |
| `ROWS_REFUSED` | [코드 가져오기](#screen-code_import). 소스: `mockCodeImportService.ts`. | 일부 행을 가져올 수 없습니다. | 수정하거나 건너뛰도록 선택하십시오. |
| `ROW_MISSING` | [코드 가져오기](#screen-code_import). 소스: `mockCodeImportService.ts`. | 가져오기의 코드 버전이 더 이상 존재하지 않아 승인할 수 없습니다. | 가져오기를 다시 업로드하십시오. |
| `ROW_NOT_PENDING` | [코드 가져오기](#screen-code_import). 소스: `mockCodeImportService.ts`. | 가져오기의 코드 버전이 더 이상 대기 중이 아닙니다. | 가져오기를 다시 업로드하십시오. |
| `NAME_TAKEN` | [워크스테이션](#screen-workstations), [보고 피드](#screen-bi_feed). 소스: `src/services/workstationRegistry/workstationRegistryRules.ts`, `src/services/biFeed/biFeedRules.ts`. | 시설의 다른 활성 워크스테이션이 해당 이름을 사용하고 있습니다. | 다른 이름을 선택하십시오. |
| `ALREADY_REVOKED` | [워크스테이션](#screen-workstations), [보고 피드](#screen-bi_feed). 소스: 같은 두 서비스. | 워크스테이션이 이미 폐기되었습니다. | 없습니다. |
| `REVOKE_REASON_INVALID` | [워크스테이션](#screen-workstations), [보고 피드](#screen-bi_feed). 소스: 같은 두 서비스. | 사유를 선택해야 하며, 기타의 경우에는 메모가 필요합니다. | 사유를 선택하십시오. |
| `FEED_OFF` | [보고 피드](#screen-bi_feed). 소스: `src/services/biFeed/biFeedRules.ts`. | 피드가 꺼져 있습니다. | 피드 설정에서 켜십시오. |
| `DATASET_NOT_IN_FEED` | [보고 피드](#screen-bi_feed). 소스: `biFeedRules.ts`. | 데이터 세트가 피드에서 제공되지 않습니다. | 먼저 피드 설정에 추가하십시오. |
| `FACILITY_NOT_IN_FEED` | [보고 피드](#screen-bi_feed). 소스: `biFeedRules.ts`. | 시설이 피드에서 제공되지 않습니다. | 먼저 피드 설정에 추가하십시오. |
| `IDENTIFIED_NOT_APPROVED` | [보고 피드](#screen-bi_feed). 소스: `biFeedRules.ts`. | 식별 상태의 토큰에는 기록된 승인이 필요합니다. | 승인을 기록하십시오. |
| `NOT_HL7` | [LIS 수신(어시스트 모드)](#screen-assist_lis_polling). 소스: `src/services/lisIngestion/adapters/hl7v2StatusAdapter.ts`. | 메시지가 HL7 v2 메시지가 아닙니다(MSH 세그먼트로 시작해야 합니다). | 송신 시스템을 확인하십시오. |
| `UNSUPPORTED_MESSAGE_TYPE` | [LIS 수신(어시스트 모드)](#screen-assist_lis_polling). 소스: `hl7v2StatusAdapter.ts`. | ORU^R01, ORM^O01, OML^O21 메시지만 수락됩니다. | 지원되는 유형을 보내십시오. |
| `MISSING_ACCESSION` | [LIS 수신(어시스트 모드)](#screen-assist_lis_polling). 소스: `hl7v2StatusAdapter.ts`, `webhookJsonAdapter.ts`. | 메시지에 접수번호가 없습니다. | 송신 측을 수정하십시오. |
| `MISSING_STATUS` | [LIS 수신(어시스트 모드)](#screen-assist_lis_polling). 소스: `src/services/lisIngestion/types.ts`. | 메시지에 LIS 상태가 없습니다. | 송신 측을 수정하십시오. |
| `INVALID_JSON` | [LIS 수신(어시스트 모드)](#screen-assist_lis_polling). 소스: `types.ts`. | 메시지가 올바른 JSON이 아닙니다. | 송신 측을 수정하십시오. |
| `CROSSWALK_DUPLICATE_STATUS` | [LIS 수신(어시스트 모드)](#screen-assist_lis_polling). 소스: `src/services/assistPolling/mockAssistPollingService.ts`. | LIS 상태가 두 번 매핑되었습니다. | 각 상태를 한 번만 매핑하십시오. |
| `INTERVAL_OUT_OF_RANGE` | [LIS 수신(어시스트 모드)](#screen-assist_lis_polling). 소스: `mockAssistPollingService.ts`. | 폴링 간격이 허용되는 정수 분의 범위를 벗어났습니다. | 표시된 범위의 값을 입력하십시오. |
| `NHS_NUMBER_CHECK_DIGIT` | [영국 암 등록소(COSD)](#screen-cosd_destination). 계약서: `UK_COSD_API.md`. | NHS 번호가 체크 디지트 검사에 실패합니다. | 케이스의 번호를 수정하십시오. |
| `NHS_NUMBER_FORMAT` | [영국 암 등록소(COSD)](#screen-cosd_destination). 계약서: `UK_COSD_API.md`. | NHS 번호가 10자리가 아닙니다. | 수정하십시오. |
| `PATIENT_IDENTIFIER_MISSING` | [영국 암 등록소(COSD)](#screen-cosd_destination). 계약서: `UK_COSD_API.md`. | NHS 번호가 없습니다. | 입력하십시오. |
| `ICDO_MISSING` | [영국 암 등록소(COSD)](#screen-cosd_destination). 계약서: `UK_COSD_API.md`. | ICD-O-3 코드가 없습니다. | 케이스에 추가하십시오. |
| `ICDO_FORMAT` | [영국 암 등록소(COSD)](#screen-cosd_destination). 계약서: `UK_COSD_API.md`. | ICD-O-3 코드가 `8500/3` 형식이 아닙니다. | 수정하십시오. |
| `DIAGNOSIS_DATE_MISSING` | [영국 암 등록소(COSD)](#screen-cosd_destination). 계약서: `UK_COSD_API.md`. | 진단일이 없습니다. | 입력하십시오. |
| `XML_NOT_WELL_FORMED` | [영국 암 등록소(COSD)](#screen-cosd_destination), 프로토콜 업로드. 계약서: `UK_COSD_API.md`, 소스: `protocolUploadValidation.ts`. | 미리 보기 또는 업로드한 파일이 올바른 형식의 XML이 아닙니다. | 데이터 또는 파일을 수정하십시오. |
| `UNSUPPORTED_FORMAT` | 개요 라이브러리 프로토콜 업로드([개요 라이브러리](#screen-tab-protocols)). 소스: `src/services/templates/protocolUploadValidation.ts`. | 파일 형식이 지원되지 않습니다. JSON, XML 또는 XLSX를 사용하십시오. | 파일을 변환하십시오. |
| `FILE_TOO_LARGE` | 프로토콜 업로드. 소스: `protocolUploadValidation.ts`. | 파일이 10 MB보다 큽니다. | 크기를 줄이십시오. |
| `JSON_INVALID` | 프로토콜 업로드. 소스: `protocolUploadValidation.ts`. | 파일이 올바른 JSON이 아닙니다. | 수정하십시오. |
| `JSON_NEWER_FORMAT` | 프로토콜 업로드. 소스: `protocolUploadValidation.ts`. | 파일이 더 최신 버전의 PathScribe에서 내보내졌습니다. | PathScribe를 업데이트하거나 같은 버전에서 내보내십시오. |
| `XML_NOT_SDC` | 프로토콜 업로드. 소스: `protocolUploadValidation.ts`. | XML이 CAP eCC(SDC) 양식이 아닙니다. | 올바른 파일을 사용하십시오. |
| `NOT_IMPORTABLE` | 프로토콜 업로드. 소스: `protocolUploadValidation.ts`. | 형식은 확인할 수 있으나 아직 가져올 수 없습니다. 가져오기는 PathScribe 프로토콜 파일(JSON)에서 작동합니다. | PathScribe JSON 파일을 사용하십시오. |
| `XLSX_NOT_MAPPED` | 프로토콜 업로드. 소스: `protocolUploadValidation.ts`. | 통합 문서의 시트를 읽지 않았으므로 열이 질문에 매칭되지 않았습니다. | 지원되는 형식을 사용하십시오. |
| `PRODUCTION_GATED` | [Smart Capture](#screen-smart_capture). 소스: `src/services/smartCapture/smartCaptureStates.ts`. | 실제 인터페이스 엔진이 구성되어 있고 운영 전환 게이트가 닫혀 있어 아무것도 전송되지 않았습니다. | 검사실이 준비되면 운영 전환 게이트를 여십시오. |
| `ALREADY_ACCESSIONED` | [락박스 접수](#screen-lockbox-drop-off). 계약서: `LOCKBOX_API.md`. | 영수증이 이미 접수되었습니다(409). | 없습니다. |
| `PLACEHOLDER_UNRESOLVED` | [락박스 접수](#screen-lockbox-drop-off). 계약서: `LOCKBOX_API.md`. | 연결된 오더 번호가 없는 임시 기록에 대해 접수가 요청되었습니다(409). | 먼저 임시 기록을 해당 오더에 연결하십시오. |
| `NOT_A_PLACEHOLDER` | [락박스 접수](#screen-lockbox-drop-off). 계약서: `LOCKBOX_API.md`. | 임시 기록만 오더에 연결할 수 있습니다. | 없습니다. |

## 시스템 로그 참조 {#ch9-system-logs}
Breadcrumb: 홈 > 관리자 가이드 > 부록 > 시스템 로그 참조

**상태:** 구현됨

시스템 로그는 사람, 시스템, AI가 수행한 작업의 기록을 읽는 곳입니다. 이 부분은 해당 화면을 설명합니다. 다음 부분([감사 로그 검증 가이드](#ch9-audit-verification))은 감사자의 질문에 답하기 위해 이 화면을 사용하는 방법을 설명합니다.

### 시스템 로그 {#screen-audit-log}
Breadcrumb: 홈 > 시스템 로그

**상태:** 구현됨. 데모에서는 감사 로그가 브라우저에 보관되며, API 서버를 사용하면 서버가 보관합니다(알려진 제한 사항 참조).

**1. 탐색:** 홈 타일 **시스템 로그**(주소 `/audit`).
**2. 관리 항목:** 시스템 로그(참조 화면이며 여기에서 설정하는 것은 없습니다).

**3. 업무 목적 및 범위.** 검사실의 컴플라이언스 기록을 한 화면에 모은 것입니다. AI 작업, 사용자 변경, 시스템 이벤트, 오류, 품질 보증 활동, 인터페이스 및 인쇄 활동, 재무 전송 실패, 위급 알림, 외부 자문 링크, API 서버의 백그라운드 작업이 포함됩니다. 세 가지 작업을 제외하면 읽기 전용입니다. 오류를 **해결**로 표시하는 것, 실패한 인터페이스 메시지 또는 인쇄 작업을 다시 보내는 것, 자문 링크를 폐기하는 것입니다. 각 탭은 서로 다른 서비스가 보관하는 서로 다른 기록입니다. 감사 로그 탭과 오류 로그 탭은 여기에서 설명합니다. **인터페이스 로그** 탭은 [시스템 로그: 인터페이스](#screen-audit-interfaces)에, **재무** 탭은 [시스템 로그: 재무](#screen-audit-financial)에 설명되어 있습니다.

**4. 선행 조건 및 종속 관계.** 이 화면은 이미 일어난 일만 보여 주므로, 누가 화면을 열 수 있는지를 제외하면 먼저 설정할 것이 없습니다. `screen:audit-log:open`이 없는 사용자는 홈 타일이 보이지 않으며, 주소를 직접 입력하면 "이 화면에 대한 접근 권한이 없습니다"라는 메시지가 표시됩니다.

Setup step: Reference, not part of setup
Requires: [역할](#screen-staff-roles), [구성원](#screen-staff-members)
Unlocks: 없음.

**5. 화면.**

[SCREENSHOT PLACEHOLDER: screen-audit-log - 시스템 로그, 유형 필, 필터, CSV 내보내기가 있는 감사 로그 탭]

페이지 머리글에는 **시스템 로그**와 부제목 "AI 작업, 사용자 변경, 시스템 이벤트, 오류 및 품질 보증 활동의 전체 기록"이 표시됩니다. 그 아래에 탭 줄이 있고, 이어서 **지원 참조 번호 찾기** 상자, 그리고 활성 탭이 나옵니다. **오류 로그**의 개수 배지는 미해결 오류를, **인터페이스 로그**의 배지는 보류 중인 인터페이스 예외를, **품질보증**의 배지는 미해결 품질 항목을 표시합니다. 역할이 병리의인 사용자에게는 "본인의 증례 활동만 표시됩니다 — 검증 연구 이벤트는 병리의에게 표시되지 않습니다"라는 안내가 표시됩니다.

[SCREENSHOT PLACEHOLDER: screen-audit-log-errors - 시스템 로그, 오류 로그 탭]

**6. 필드 참조.** 이 화면에는 양식 필드가 아니라 필터, 열, 버튼이 있습니다. 행 이름은 탭 이름으로 시작합니다.

#### 탭

| 필드 이름 | 데이터 유형 / 형식 | 필수/선택 | 설명 및 업무 로직 | 시스템 기본값 |
|---|---|---|---|---|
| 탭: 감사 로그 | 탭 | 해당 없음 | 사용자가 볼 수 있는 모든 감사 항목입니다. 아래에 설명되어 있습니다. | 열 때 선택됨 |
| 탭: 오류 로그 | 탭 | 해당 없음 | 시스템이 코드와 함께 기록한 오류입니다. 아래에 설명되어 있습니다. | 해당 없음 |
| 탭: 인터페이스 로그 | 인터페이스 예외, 발신 인터페이스 DLQ, 발신 전송 내역, 인쇄 대기열, 엔진 하위 탭이 있는 탭 | 해당 없음 | [시스템 로그: 인터페이스](#screen-audit-interfaces)를 참조하십시오. 주소 `?tab=interfaces`로 열 수 있습니다. | 해당 없음 |
| 탭: 품질보증 | 그룹 선택이 있는 탭 | 해당 없음 | 품질 기록의 여덟 가지 그룹: 결함, 수술 중 연결, 불일치 및 조정, 부서명 처리 시간, 자격 심사, 최종화 후 변동, 환자 매칭 검토, 경영진 검토. 각 그룹에는 고유한 상태 선택 항목이 있습니다. | 해당 없음 |
| 탭: 재무 | 청구 로그와 발신 DLQ 하위 탭이 있는 탭 | 해당 없음 | [시스템 로그: 재무](#screen-audit-financial)를 참조하십시오. | 해당 없음 |
| 탭: 위급 알림 | 탭 | 해당 없음 | 중대 결과 알림의 기록입니다. | 해당 없음 |
| 탭: 자문 링크 | 탭 | 해당 없음 | 모든 케이스의 모든 외부 자문 링크이며 **유효한 링크만**과 **폐기**가 있습니다. `audit:consult-links:view`가 있는 사용자에게 표시됩니다. | 해당 없음 |
| 탭: 서버 작업 | 탭 | 해당 없음 | API 서버의 백그라운드 작업: 상태와 데드 레터이며 다시 대기열에 넣을 수 있습니다. `jobs:server-job:view`가 있는 사용자에게만 표시됩니다. 해당 권한 없이 연 링크는 감사 로그로 이동합니다. | 권한이 없으면 숨겨짐 |
| 지원 참조 번호 찾기 | 텍스트, 형식 `SR-XXXX-XXXX` | 선택 | 지원 참조 번호가 가리키는 케이스, 감사 항목, 오류 항목 또는 인터페이스 예외의 이름을 표시합니다. 조회 자체도 감사 기록됩니다(`support_reference.resolved`). 항목이 불러온 범위 밖에 있으면 기간을 넓히라고 안내합니다. | 비어 있음 |

#### 감사 로그 탭

| 필드 이름 | 데이터 유형 / 형식 | 필수/선택 | 설명 및 업무 로직 | 시스템 기본값 |
|---|---|---|---|---|
| 감사 로그: 유형 필 | 선택: 전체, AI, 사용자, 시스템, 개수 포함 | 선택 | 항목의 유형으로 필터링합니다. | 전체 |
| 감사 로그: 환자 관리만 | 개수가 있는 예/아니요 체크박스 | 선택 | 이름이 `mpi.`로 시작하는 이벤트(병합, 이동, 연결, 재연결, 인구통계 갱신)만 표시합니다. 다른 필터와 함께 적용됩니다. 앞으로 추가되는 `mpi.` 이벤트도 자동으로 포함됩니다. | 아니요 |
| 감사 로그: 사용자 필터 | 불러온 항목의 모든 사용자 중 선택 | 선택 | Superadmin 세션에서만 표시됩니다. 그 외의 사용자는 검색 상자에 이름을 입력하여 사람을 찾습니다. | 모든 사용자 |
| 감사 로그: 기간 | 선택: 오늘, 최근 7일, 최근 30일, 최근 90일, 사용자 지정 기간 | 선택 | 시설의 시간대를 기준으로 한 기준 시점입니다. 사용자 지정 기간에서는 **시작** 날짜와 **종료** 날짜가 추가되며, 종료일은 그날 전체를 포함합니다. | 최근 7일 |
| 감사 로그: 검색 | 텍스트 | 선택 | 이벤트 이름, 상세 텍스트, 사용자, 케이스 id(접수번호)를 대소문자 구분 없이 일치시킵니다. | 비어 있음 |
| 감사 로그: CSV 내보내기 | 버튼 | 해당 없음 | `audit:audit-log:export`가 필요합니다. 검증 가이드를 참조하십시오. 권한이 없으면 비활성화됩니다. | 해당 없음 |
| 감사 로그: 타임스탬프 | 열, `YYYY-MM-DD HH:MM:SS.mmm UTC` | 해당 없음 | 항목이 기록된 시각이며 항상 UTC로 표시됩니다. | 해당 없음 |
| 감사 로그: 유형 | 열 | 해당 없음 | AI, 사용자 또는 시스템. | 해당 없음 |
| 감사 로그: 이벤트 | 열 | 해당 없음 | 이벤트 이름이며 뒤에 지원 참조 칩이 붙습니다. | 해당 없음 |
| 감사 로그: 상세 | 열 | 해당 없음 | 환자 이름, 생년월일, MRN, 임상 수치가 없는 영어 텍스트입니다. | 해당 없음 |
| 감사 로그: 사용자 | 열 | 해당 없음 | 사람 또는 시스템 행위자의 표시 이름입니다. 자동 작업에는 `SYSTEM`과 같은 시스템 행위자가 표시됩니다. | 해당 없음 |
| 감사 로그: 증례 | 열 | 해당 없음 | 항목이 케이스와 관련된 경우의 접수번호입니다. 클릭하면 케이스가 열립니다. | 해당 없음 |

항목에는 신뢰도 값(AI 항목의 경우), 시설 id, 스캔 스테이션 id도 있습니다. 이들은 저장되며 서버 계약서에도 있지만, 화면에는 해당 열이 없고 CSV에도 시설 또는 스테이션이 포함되지 않습니다. 시설 id는 해당 필드가 생기기 전에 기록된 항목이나 이를 제공하지 않는 코드가 기록한 항목에는 없습니다.

#### 오류 로그 탭

| 필드 이름 | 데이터 유형 / 형식 | 필수/선택 | 설명 및 업무 로직 | 시스템 기본값 |
|---|---|---|---|---|
| 오류 로그: 심각도 필 | 선택: 전체, 오류, 경고, 정보, 개수 포함 | 선택 | 심각도로 필터링합니다. | 전체 |
| 오류 로그: 상태 | 선택: 모든 상태, 미해결만, 해결됨만 | 선택 | 해결 여부로 필터링합니다. | 모든 상태 |
| 오류 로그: 검색 | 텍스트 | 선택 | 메시지, 코드, 소스를 일치시킵니다. | 비어 있음 |
| 오류 로그: 해결 | 미해결 각 행의 버튼 | 해당 없음 | `audit:error:resolve`가 필요합니다. 처리자와 시각을 기록하며, 이후 행에는 "Resolved by <name>, <time>"이 표시됩니다. | 해당 없음 |
| 오류 로그: CSV 내보내기 | 버튼 | 해당 없음 | `audit:error-log:export`가 필요합니다. | 해당 없음 |
| 오류 로그: 열 | 타임스탬프, 심각도, 코드, 메시지, 소스, 증례, 상태 | 해당 없음 | 코드 열에는 [색인](#ch9-error-codes)의 코드가 들어 있습니다. | 해당 없음 |

**7. 권한.**
- 화면 열기: `screen:audit-log:open`. Admin, Lab Director, QA Reviewer 역할은 기본적으로 이를 보유합니다. Pathologist 역할은 기본적으로 보유하지 않습니다.
- 내보내기: 로그마다 하나의 권한이 있으며, 각각 고위험이고 각각 `screen:audit-log:open`을 필요로 합니다. `audit:audit-log:export`, `audit:error-log:export`, `audit:interface-log:export`, `audit:qa-log:export`, `audit:billing-log:export`입니다. 화면을 여는 역할에는 다섯 가지가 모두 기본으로 부여됩니다. 모든 내보내기는 그 자체로 감사 기록됩니다.
- 오류 해결: `audit:error:resolve`(고위험).
- 자문 링크 탭: `audit:consult-links:view`. 서버 작업: `jobs:server-job:view`이며, 다시 대기열에 넣으려면 `jobs:server-job:requeue`가 필요합니다.
- 화면에서의 범위 지정: Pathologist는 케이스를 명시한 모든 항목과 케이스가 없는 본인의 항목을 봅니다. 검증 연구 이벤트(`validation_study_created`, `validation_study_activated`, `validation_study_closed`, `validation_study_deleted`, `validation_report_generated`, 그리고 세 개의 `validation_routing_rule_*` 이벤트)는 Admin, Pathologist-Admin, Superadmin을 제외한 모든 사용자에게 숨겨집니다.
- 로그를 보는 것 자체는 감사 기록되지 않습니다. 내보내기, 오류 해결, 지원 참조 번호 조회는 기록됩니다.

**알려진 제한 사항.**
- **주 감사 로그에는 변조 증거 기능이 없습니다.** 주 감사 로그는 설계상 추가 전용이며(서비스에 업데이트 또는 삭제 호출이 없고, 서버 계약서는 애플리케이션의 데이터베이스 로그인에 그러한 권한을 부여하지 않습니다), 항목은 해시 체인으로 연결되어 있지 않고 화면에서 이를 검증하는 기능도 없습니다. 해시 체인으로 연결된 유일한 기록은 [지원 접근](#screen-support_access) 감사입니다. 검증 가이드를 참조하십시오.
- **보존은 설정일 뿐 강제되지 않습니다.** 로그의 보관 기간은 [데이터 보존](#screen-retention)에서 설정합니다. 이를 읽는 삭제 작업이 아직 없으므로(PS-345) 현재는 이 설정으로 삭제되는 것이 없습니다.
- **감사 `detail`은 설계상 영어입니다.** 이는 인터페이스 텍스트가 아니라 컴플라이언스 산출물입니다. 열 제목, 필터, 버튼은 번역되어 있으나 상세 텍스트와 내보낸 파일은 번역되지 않습니다.
- **데모.** API 서버가 없으면 감사 로그는 브라우저에 저장되며 미리 입력된 샘플 항목으로 시작합니다. 시각과 행위 사용자는 브라우저에서 가져옵니다. API 서버를 사용하면 서버가 로그인 토큰에서 시각과 행위자를 설정합니다.
- **화면과 CSV에 시설 또는 스테이션 열이 없습니다.** 둘 다 기록되지만 그렇습니다(위 참조).
## 감사 로그 검증 가이드 {#ch9-audit-verification}
Breadcrumb: 홈 > 관리자 가이드 > 부록 > 감사 로그 검증 가이드

**상태:** 부분 구현. 기록, 검색, 내보내기는 구현되어 있습니다. 주 감사 로그의 변조 증거 기능과 보존 기간에 따른 자동 삭제는 구현되어 있지 않습니다.

**이 가이드의 대상.** 무엇이 변경되었는지, 누가 변경했는지, 언제 변경했는지를 감사자나 조사관에게 보여 주어야 하는 관리자 또는 ForMedrixAI 서비스 엔지니어입니다. 현재 존재하는 기능만 사용합니다.

### 기록되는 내용 {#ch9-audit-recorded}

각 감사 항목에는 다음이 들어 있습니다. id, 시각(UTC로 저장), 유형(**AI**, **사용자** 또는 **시스템**), 이벤트 이름, 영어로 된 상세 문장, 작업한 사용자의 표시 이름, 해당하는 경우 케이스 접수번호, 해당하는 경우 AI 신뢰도, 코드가 제공하는 경우 시설 id, 작업이 수행된 스캔 스테이션. 스테이션 id는 감사 서비스가 기록하는 모든 항목에 자동으로 추가됩니다.

로그에 남는 내용은 다음과 같습니다.

- **높은 위험도 권한의 모든 확인**(허용 또는 거부). 이벤트는 **권한 허용됨** 또는 **권한 거부됨**입니다. 상세에는 권한 키, 해당 권한을 부여한 역할 또는 거부된 사유, 사용자의 세션 역할, 시설이 기재됩니다. 어떤 권한이 높은 위험도인지는 권한 카탈로그에 표시되어 있습니다. 구성 화면의 저장도 이러한 확인 중 하나입니다.
- **역할 및 직원 변경.** **역할 권한 변경됨**은 역할에 대해 부여된 권한과 제거된 권한을 나열합니다. **직원 접근 변경됨**은 사용자의 역할, 시설, 소아 접근, 오케스트레이션 접근 또는 테넌트 간 QA 접근의 변경을 변경 전 값과 변경 후 값으로 기록합니다. **직원 자격 증명 변경됨**은 자격 증명 편집을 기록합니다.
- **로그인 이벤트.** **로그인됨**, **로그인 실패**(5회 중 n번째 시도), **로그인 잠김**, **로그인 거부됨**, **SSO 계정 연결됨**, **SSO 계정 연결 해제됨**, **SSO 로그인 거부됨**. 로그에는 입력한 내용이 기록되지 않습니다.
- **일부 설정의 이름 있는 변경 이벤트.** 예를 들어 `AI_VENDOR_POLICY_CHANGED`, `CLINICAL_MISMATCH_RULE_CHANGED`, `AI_PROMPT_EDITED`, `AI_PROMPT_APPROVED`, `FEEDBACK_SETTINGS_CHANGED`, `RECALL_SETTINGS_CHANGED`, `QA_TREND_POLICY_CHANGED`, `CODE_SYSTEM_POLICY_CHANGED`, `PEER_REVIEW_GATE_CHANGED`, **템플릿 검토 설정 변경됨**, **장기 지도 색상 변경됨**, **서명 권한 국가 프로필 변경됨**, 그리고 네 가지 **서명 권한 시설 재정의** 이벤트(추가, 변경, 제거, 사유 갱신)가 있습니다. 시설 재정의 이벤트에는 변경된 각 플래그의 변경 전 값과 변경 후 값, 그리고 관리자의 사유 또는 "사유: 제공되지 않음"이 기재됩니다.
- **음성 명령.** **Voice command executed** 및 **Voice command refused**. 세부 정보에는 작업 ID와 화면이 표시됩니다(예: `Voice command executed: action TABLE_DELETE on screen WORKLIST; confirmed by repeating the phrase`). 거부된 경우 사유가 표시됩니다(이 화면에서 사용할 수 없음, 확인을 위해 문구를 반복하지 않음, 제때 반복하지 않음). 사람은 작업을 수행한 사용자입니다. 로그에는 말한 내용이 기록되지 않으며 어떤 항목도 증례를 지정하지 않습니다.
- **인쇄와 내보내기.** `DOCUMENT_PRINTED`, `DOCUMENT_REPRINTED`, `DOCUMENT_RENDERED`, `DOCUMENT_EXPORTED`, `DOCUMENT_FAXED`: 누가, 접수번호, 대상, 상태, 그리고 내보내기의 경우 행 수가 기록됩니다.
- **케이스 이벤트.** 예를 들어 종합 보고 생성, 필드 갱신, 최종 확정, 프로토콜 선택, 드리프트 감지 및 수정, 청구 정정, 환자 관리(`mpi.*`)가 있습니다.
- 시스템 행위자에 의한 **자동 작업**.

기록을 읽을 때 중요한 제한이 두 가지 있습니다.

1. 권한 항목은 어떤 사용자가 권한을 사용했다는 것과 허용되었는지 여부를 보여 줍니다. 대부분의 설정에서는 이전 값과 새 값이 표시되지 **않습니다**. 위에 이름이 나온 이벤트와 몇 가지 다른 이벤트만 변경 내용 자체를 담고 있습니다.
2. Superadmin 세션이 다른 조직에서 작업하는 동안 이루어진 변경은 그 조직의 [지원 접근](#screen-support_access) 기록에도 기록됩니다.

**상세 텍스트는 설계상 영어입니다.** 감사 기록은 인터페이스 텍스트가 아니라 컴플라이언스 산출물이므로, 상세는 제품의 모든 언어와 내보낸 파일에서 영어 그대로 유지됩니다. 영어 이벤트 이름이나 권한 키로 검색하십시오.

### 설정 변경을 찾는 방법 {#ch9-audit-find-setting}

1. [시스템 로그](#screen-audit-log)의 **감사 로그** 탭을 엽니다.
2. **기간**을 설정합니다. 기본값은 **최근 7일**이며, 더 오래된 변경은 **사용자 지정 기간**을 선택합니다. 기간 밖의 항목은 숨겨져 있을 뿐 없어진 것이 아닙니다.
3. **검색**에 확인하려는 화면의 권한 키를 입력합니다. 모든 구성 화면의 변경 권한은 이 가이드의 **권한** 부분에 이름이 나와 있습니다(예를 들어 [데이터 보존](#screen-retention)은 `config:retention-policy:manage`). 검색은 상세 텍스트와 일치하므로 **권한 허용됨** 항목을 찾습니다.
4. 누가 언제 했는지는 **사용자** 열과 **타임스탬프** 열에서 확인합니다. 상세에는 해당 권한을 부여한 역할이 기재됩니다.
5. 해당 화면에 이름 있는 변경 이벤트가 있으면(위 목록 참조) 그 이벤트 이름으로도 검색합니다. 그 이벤트에는 권한 확인뿐 아니라 변경 내용 자체가 들어 있습니다.
6. 불필요한 항목을 제외하려면 **유형** 필을 사용합니다(**사용자**는 사람의 작업을 표시합니다).
7. 거부된 항목만 보려면 `Capability refused`를 검색합니다.

**권한 허용됨**이라고 표시된 항목은 그 사용자가 변경할 수 있는 권한을 가지고 있었고 변경이 시도되었음을 보여 줍니다. 그것만으로 어떤 값이 저장되었는지가 증명되지는 않습니다. 자체 변경 이벤트가 없는 설정은 화면의 현재 값과 비교하고, 검사실이 구성 내보내기를 보관하고 있다면 그것과도 비교하십시오(아래 **내보내기** 참조).

### 권한을 누가 변경했는지 확인하는 방법 {#ch9-audit-find-permission}

1. **감사 로그** 탭에서 `Role capabilities changed`를 검색합니다. 각 항목은 `Role "<name>": granted <keys>; removed <keys>.` 형식입니다. **사용자** 열은 역할을 저장한 사용자입니다.
2. 누구에게 역할이 부여되었거나 박탈되었는지 보려면 `Staff access changed`를 검색합니다. 상세에는 각 변경이 변경 전 값과 변경 후 값으로 나열됩니다(역할, 시설, 소아 접근, 오케스트레이션 접근, 테넌트 간 QA 접근).
3. 자격 증명 편집을 보려면 `Staff credentials changed`를 검색합니다.
4. 사용자가 권한을 실제로 사용했는지 보려면 권한 키를 검색하고 **권한 허용됨** 및 **권한 거부됨** 항목을 읽습니다.
5. 현재 누가 무엇을 할 수 있는지 나열하려면 [역할](#screen-staff-roles)과 [구성원](#screen-staff-members)을 사용합니다. 로그는 이력을 보여 주고, 이 화면들은 현재 상태를 보여 줍니다.
6. 병원이 변경할 수 없는 역할에 대해: Superadmin 역할의 변경은 병원에서는 거부되므로 그러한 항목은 나타나지 않습니다. Superadmin은 ForMedrixAI 지원 직원이 보유하며 병원의 직원 디렉터리 밖에서 부여됩니다.

역할 저장은, 역할을 관리할 수 있는 역할이 하나도 남지 않게 되는 경우, 직무 분리 쌍을 깨뜨리는 경우, 또는 필수 권한 없이 권한을 부여하는 경우에도 아무것도 기록되기 전에 거부됩니다. 거부된 저장은 **역할 권한 변경됨** 항목을 기록하지 않습니다.

### 기록 무결성과 보존이 작동하는 방식 {#ch9-audit-integrity}

**추가 전용.** 감사 서비스에는 항목을 갱신하거나 삭제하는 호출이 없으며, 새 항목을 쓰고 읽을 수만 있습니다. 서버 계약서(`STAFF_ADMIN_API.md` 1절, `AUTHORIZATION_API.md`)는 감사 테이블이 추가 전용일 것을 요구합니다. 갱신 또는 삭제 호출이 없고, 애플리케이션의 데이터베이스 로그인에 그러한 권한이 없습니다. 기록에 허용되는 유일한 변경은 해결된 오류이며, 이는 메시지를 덮어쓰는 것이 아니라 오류 항목에 누가 언제 해결했는지로 기록됩니다.

**시각과 행위자를 정하는 주체.** API 서버를 사용하면 서버가 시각을 정하고, 행위 사용자는 베어러 토큰에서 가져옵니다. 브라우저는 이벤트만 보내므로 사용자가 표시되는 이름을 선택할 수 없습니다. 데모에서는 브라우저가 이를 정합니다.

**고유 id.** 모든 항목에는 고유 id가 부여됩니다. 서버의 테이블도 고유성을 강제할 것으로 예상됩니다.

**변조 증거: 주 감사 로그에는 없습니다.** 주 감사 로그는 해시 체인으로 연결되어 있지도, 서명되어 있지도 **않습니다**. 시스템 로그 화면의 어떤 것도 데이터베이스에 직접 접근할 수 있는 사람이 항목을 변경하지 않았음을 증명하지 못하며, 이를 위한 "검증" 버튼도 없습니다. 무결성은 위의 추가 전용 규칙과 데이터베이스 권한에 의존합니다. 해시 체인으로 연결된 유일한 기록은 [지원 접근](#screen-support_access) 감사입니다(아래 참조). 감사자가 주 로그에 대해 암호학적 변조 증거를 요구하는 경우 ForMedrixAI에 알리십시오. 이 기능은 구현되어 있지 않습니다.

**보존.** 감사 로그의 보관 기간은 [데이터 보존](#screen-retention)의 설정입니다. **감사 로그** 필드이며 일 단위로 90에서 3650까지, 기본값은 365입니다. 화면에는 변경 사항이 "다음 삭제 주기에 적용됩니다"라고 표시됩니다. **이 설정을 읽는 삭제 작업이 아직 없으므로(PS-345)** 현재는 이 설정으로 삭제되는 것이 없습니다. 이 숫자는 강제되는 정책이 아니라 기록된 정책으로 취급하십시오. 각 내보내기의 기록(누가, 무엇을, 언제, 행 수, 파일 해시)은 감사 로그의 보존 기간에 따라 보관됩니다.

**내보내기는 작업용 사본입니다.** 내보낸 CSV는 화면에 있던 내용의 사본입니다. 내보내기의 기록은 감사 항목입니다.

### 내보내는 방법 {#ch9-audit-export}

1. 필요한 탭에서 먼저 필터를 설정합니다. 내보내기는 로그 전체가 아니라 필터가 남긴 행을 대상으로 합니다.
2. **CSV 내보내기**를 선택합니다. 해당 탭의 내보내기 권한이 있는 사용자가 아니면 버튼이 회색으로 비활성화되고 툴팁에 권한 이름이 표시됩니다(위의 권한 부분 참조).
3. 서비스는 파일을 만들기 전에 권한을 확인합니다. 거부되면 아무것도 만들어지지 않습니다.
4. API 서버를 사용하면 내보내기는 서버가 만듭니다([내 내보내기](#screen-my-exports) 참조). 파일은 기본 7일(1~30일) 동안 보관되는 작업용 사본이며, 한 사용자가 열어 둘 수 있는 내보내기는 3개이고, 1,000,000행을 초과하면 거부됩니다. 데모에서는 브라우저가 파일을 만들어 즉시 다운로드합니다.
5. 파일 이름은 `pathscribe-audit-log-<date>.csv` 형식입니다. 처음 몇 줄은 보고서 이름, 요청한 사용자, 사용한 필터, 행 수를 알리는 머리글입니다. 그다음 열은 **ID, 타임스탬프, 유형, 이벤트, 상세, 처리자, 접수번호, AI 신뢰도**입니다. `=`, `+`, `-`, `@`로 시작하는 셀은 스프레드시트가 수식으로 실행하지 않도록 무력화됩니다.
6. 모든 내보내기는 사용자, 파일 이름, 형식, 행 수가 담긴 `DOCUMENT_EXPORTED` 항목을 기록합니다. 로그를 누가 내보냈는지 보려면 `DOCUMENT_EXPORTED`를 검색합니다.
7. CSV에는 시설 id와 스테이션 id가 들어 있지 않습니다. 조사관에게 필요하면 ForMedrixAI 서비스에 알리십시오. 서버에 이 정보가 있습니다.
8. 다른 탭도 같은 방식으로 내보내며, 각각 고유한 권한과 고유한 열이 있습니다. 오류 로그(ID, 타임스탬프, 심각도, 코드, 메시지, 소스, 접수번호, 해결됨), 품질보증(ID, 그룹, 날짜, 케이스, 검체, 상세, 상태, 사용자), 인터페이스 로그, 재무 청구 로그입니다.

### 지원 접근 감사가 맞물리는 방식 {#ch9-audit-support}

ForMedrixAI 지원 담당자가 귀하의 데이터에 접근한 내용은 주 감사 로그와는 별도의 자체 기록 흐름에 기록되며, 이 기록은 귀하의 조직에 속합니다. 이는 [지원 접근](#screen-support_access)에 설명되어 있습니다.

- **기록하는 내용.** 정책 변경, 요청·승인·거부·만료·조기 종료·취소, 거부된 열기, 케이스 열기와 편집, 귀하의 케이스를 노출한 모든 목록·검색·보고서(케이스 id 포함), 검색 조건의 이름(값은 기록하지 않음), 이 감사의 내보내기. 지원 담당자 본인의 내보내기와 구성 변경도 여기에(`supportExport` 및 `supportConfigChange`로) 기록되며, 주 감사 로그에도 기록됩니다.
- **항목은 절대 제거되지 않습니다.** 각 항목에는 순번, 시각, 행위자, 티켓, 작업, 케이스 id, 영어로 된 환자 정보 없는 상세가 들어 있습니다.
- **해시 체인으로 연결되어 있습니다.** 각 항목은 자신의 필드와 이전 항목의 해시에 대한 SHA-256을 가지며, 첫 항목은 64개의 0에서 시작합니다. 항목이 변경, 제거 또는 순서가 바뀌면 체인이 끊어집니다. 화면에는 **기록 온전함(N개 항목)** 또는 **N번째 항목에서 기록 변경됨**이 표시되며, JSON 내보내기에는 체인 검사 결과가 들어 있습니다.
- **검증하는 방법.** 지원 접근을 열고 감사 패널의 체인 줄을 읽은 다음, 독립적인 검사를 위해 JSON을 내보냅니다. `config:support-audit:view`가 필요합니다.
- **내보내기 형식.** CSV, JSON, PDF이며 열은 타임스탬프, 지원 담당자 이름, 발신 IP, 발신 국가, 티켓 ID, 수행한 작업, 케이스 ID, 상세입니다.
- **제한.** 발신 IP와 국가는 서버가 요청에서 가져와야만 사실대로 기록할 수 있으므로 데모에서는 비워 둡니다. 자체 추가 전용 테이블에 테넌트별로 분리하여 저장하는 것은 서버 작업입니다(PS-358).

이것은 제품에서 변조 증거 기능이 내장된 유일한 기록입니다. 지원 접근만 대상으로 하며 주 감사 로그는 대상이 아닙니다.

### 간단한 검증 절차 {#ch9-audit-routine}

표본으로 선정한 기간을 정기적으로 검토할 때는 다음 단계를 따르십시오.

1. **감사 로그** 기간을 해당 기간으로 설정합니다. 바닥글의 개수("{총}개 중 {표시}개 이벤트 표시 중")를 기록합니다.
2. `Role capabilities changed`, `Staff access changed`, `Capability refused`를 검색하여 각 항목을 읽습니다.
3. 로그인 문제를 확인하려면 `Sign-in locked`와 `Sign-in refused`를 검색합니다.
4. 누가 데이터를 반출했는지 보려면 `DOCUMENT_EXPORTED`를 검색합니다.
5. **오류 로그** 탭을 열고 **미해결만**으로 필터링하여 중요한 항목이 해결되지 않은 채 남아 있지 않은지 확인합니다.
6. [지원 접근](#screen-support_access)을 열어 체인 줄이 온전함으로 표시되는지 확인하고 해당 기간의 항목을 읽습니다.
7. 해당 기간의 감사 로그 CSV를 내보내 검토 메모와 함께 파일을 보관합니다. 이 내보내기 자체도 기록됩니다.
8. 스캔하지 않고 입력한 ID를 보려면 `Manual Entry`를 검색하십시오(Batch 759). 각 항목에는 모듈, 입력 내용, 사용자, 워크스테이션이 표시되며 케이스로 연결됩니다. 한 워크스테이션에서 많이 발생하면 스캐너 고장이나 라벨 손상을 의미할 수 있습니다.
