# services/apiServer

Batch 551 (PS-539).

**`apiServerUrl.ts`** gives the PathScribe API server's address to the services that call it directly:
- the exports (`exports/exportTrackerInstance.ts`);
- the server jobs (`serverJobs/serverJobsInstance.ts`).

**How the address is checked:** the same way sign-in checks it (`utils/serviceEndpoint.ts`): https, or plain http only to this computer in a development build.

**When there is no address:** it returns null when there is no API server (the demo), and also when the address fails the check. A failed check is logged, and the service then works without the server.
