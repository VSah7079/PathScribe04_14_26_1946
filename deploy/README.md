# deploy/

Deployment material for the PathScribe front end (Batch 503).

- **`security-headers/`** — the browser security headers (Content-Security-Policy, HSTS, framing, referrer, permissions) for every hosting option: nginx, IIS / Azure App Service, Azure Static Web Apps, Azure Front Door, and Vercel for the demo. Defined once, generated per host. See [security-headers/README.md](security-headers/README.md).

## Batch 511 (PS-478): full strict type-checking

See `security-headers/README.md`.

## Batch 546

`security-headers/`: the policy allows the workstation print bridges (the workstation agent and QZ Tray), on loopback only, by default (finding F4). `"workstationBridges": false` leaves them out. The generated configs and `vercel.json` are regenerated.

## Batch 547

- `runtime-config/` (new): a deployment's `config.json` (an example, and how to serve it). One server build (`npm run build:server`) serves every site.
- `security-headers/`: `--runtime-config config.json` adds its addresses to the Content-Security-Policy.

## Batch 555 (PS-539 phase 2d: browser stand-ins for server jobs)

- Batch 555: `runtime-config/` documents `VITE_SERVER_JOBS`.

## Batch 557 (PS-539 phase 2d: /api/config and hosting regions)

- Batch 557: `runtime-config/`: `/api/config`, and the example's API address corrected.
