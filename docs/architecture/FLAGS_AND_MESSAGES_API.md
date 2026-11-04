# Flags And Messages: server calls

> **Route style (Batch 617).** Every call converted below uses the single route style of `HTTP_SERVICES_PATTERN.md` section 7: `/api/<area>/<service>/<method-kebab>`, `GET` for a plain-value read and `POST` for everything else. The path each call had before is in `HTTP_ROUTE_MAPPING.md` ("earlier path").

Batch 616. The calls the browser makes to the PathScribe API server for these services, written for the India team. Built on `HTTP_SERVICES_PATTERN.md`: `/api/...` paths, ids URL-encoded, JSON bodies, bearer token, fixed error codes only.

## Case flags

Browser service: `flagService` (`src/services/flags/httpFlagService.ts`, interface `IFlagService`). Used when an API server address is configured; otherwise the demonstration service answers.

| Method | Call | Sent | Answer |
|---|---|---|---|
| `getAll` | `GET /api/flags/flag/get-all` | - | the item(s) as JSON; failure = fixed error code |
| `getById` | `GET /api/flags/flag/get-by-id` | - | the item(s) as JSON; failure = fixed error code |
| `add` | `POST /api/flags/flag/add` | the `flag` argument as JSON | the item(s) as JSON; failure = fixed error code |
| `update` | `POST /api/flags/flag/update` | the `changes` argument as JSON | the item(s) as JSON; failure = fixed error code |
| `deactivate` | `POST /api/flags/flag/deactivate` | - | the item(s) as JSON; failure = fixed error code |
| `reactivate` | `POST /api/flags/flag/reactivate` | - | the item(s) as JSON; failure = fixed error code |

Permission: decided by the server on every call (`AUTHORIZATION_API.md`); a refusal is `403` and arrives as `NOT_PERMITTED`. A missing item is `404` (`NOT_FOUND`). No patient text is returned in an error.

## Secure messaging settings

Browser service: `secureMessagingConfigService` (`src/services/secureMessaging/httpSecureMessagingConfigService.ts`, interface `ISecureMessagingConfigService`). Used when an API server address is configured; otherwise the demonstration service answers.

| Method | Call | Sent | Answer |
|---|---|---|---|
| `getForFacility` | `GET /api/secure-messaging/secure-messaging-config/get-for-facility` | - | the item(s) as JSON; failure = fixed error code |
| `forOrganisation` | `GET /api/secure-messaging/config/organisation?organisationId={organisationId}` | - | the item(s) as JSON; failure = fixed error code |
| `save` | `POST /api/secure-messaging/secure-messaging-config/save` | the `config` argument as JSON | the item(s) as JSON; failure = fixed error code |

Permission: decided by the server on every call (`AUTHORIZATION_API.md`); a refusal is `403` and arrives as `NOT_PERMITTED`. A missing item is `404` (`NOT_FOUND`). No patient text is returned in an error.

## Internal messages

Browser service: `messageService` (`src/services/messages/httpMessageService.ts`, interface `IMessageService`). Used when an API server address is configured; otherwise the demonstration service answers.

| Method | Call | Sent | Answer |
|---|---|---|---|
| `listRecipients` | `GET /api/messages/message/list-recipients` | - | the item(s) as JSON; failure = fixed error code |
| `sendSecureEmail` | `POST /api/messages/message/send-secure-email` | the `input` argument as JSON | the item(s) as JSON; failure = fixed error code |
| `getInbox` | `GET /api/messages/message/get-inbox` | - | the item(s) as JSON; failure = fixed error code |
| `getById` | `GET /api/messages/message/get-by-id` | - | the item(s) as JSON; failure = fixed error code |
| `send` | `POST /api/messages/message/send` | JSON `{ message, options }` | the item(s) as JSON; failure = fixed error code |
| `reply` | `POST /api/messages/message/reply` | JSON `{ senderId, senderName, text, options }` | the item(s) as JSON; failure = fixed error code |
| `markRead` | `POST /api/messages/message/mark-read` | - | the item(s) as JSON; failure = fixed error code |
| `markAllRead` | `POST /api/messages/message/mark-all-read` | - | the item(s) as JSON; failure = fixed error code |
| `softDelete` | `POST /api/messages/message/soft-delete` | - | the item(s) as JSON; failure = fixed error code |
| `restore` | `POST /api/messages/message/restore` | - | the item(s) as JSON; failure = fixed error code |
| `permanentDelete` | `POST /api/messages/message/permanent-delete` | - | the item(s) as JSON; failure = fixed error code |
| `emptyDeleted` | `POST /api/messages/message/empty-deleted` | - | the item(s) as JSON; failure = fixed error code |

Permission: decided by the server on every call (`AUTHORIZATION_API.md`); a refusal is `403` and arrives as `NOT_PERMITTED`. A missing item is `404` (`NOT_FOUND`). No patient text is returned in an error.
