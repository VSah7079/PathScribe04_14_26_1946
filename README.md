# pathscribe AI - Frontend Application

AI-Powered CAP Synoptic Reporting System for Pathologists

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- npm or yarn package manager

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

## Demo Credentials
Contact the team lead for access credentials.

## 📁 Project Structure

The app has grown substantially since this README was first written — the
structure below reflects what's actually in the codebase today, not the
original scaffold.

```
pathscribe-ai/
├── src/
│   ├── App.tsx                  # Main app with routing
│   ├── AuthContext.tsx          # Authentication state management
│   ├── main.tsx                 # App entry point
│   ├── pages/                   # Route-level pages
│   │   ├── SynopticReportPage/  # The core clinical workflow — see below
│   │   ├── WorklistPage/
│   │   ├── AccessionPage/
│   │   ├── ConfigurationPage.tsx
│   │   ├── Synoptic/, ReportPreview/, system/, modals/
│   │   └── ... (AuditLogPage, DeficienciesPage, IntraopQueuePage,
│   │             SearchPage, ContributionDashboardPage, etc.)
│   ├── components/               # ~24 feature-area directories: Config,
│   │                              #   Worklist, TemplateBuilder, Voice,
│   │                              #   Synoptic, ValidationStudies, etc.
│   ├── services/                 # ~65 directories, one per domain — each
│   │                              #   typically an interface
│   │                              #   (`I<X>Service.ts`) plus a mock
│   │                              #   implementation (`mock<X>Service.ts`),
│   │                              #   with a Firestore implementation
│   │                              #   alongside where the domain has one
│   ├── orchestrator/              # AI report-generation engine and
│   │                              #   context-building for Orchestration
│   │                              #   mode
│   ├── types/                    # Shared domain types (Case, Specimen,
│   │                              #   AmendmentRecord, etc.)
│   ├── contexts/, hooks/         # App-wide React context/hooks (distinct
│   │                              #   from page-specific hooks — see
│   │                              #   SynopticReportPage/hooks below)
│   ├── firebase/                 # Firebase config and initialization
│   └── utils/
├── public/                       # Static assets (SVGs, images)
├── package.json
├── vite.config.ts
└── tsconfig.json
```

### `SynopticReportPage/` — the core clinical workflow

This is where a pathologist actually builds and signs out a report
(`/case/:caseId/synoptic`). It's the single largest, most actively
developed part of the app, and has its own extracted architecture:

```
SynopticReportPage/
├── SynopticReportPage.tsx   # Layout + modal wiring — business logic
│                             #   lives in hooks/, not here
├── hooks/                   # Seven domain hooks (LIS integration,
│                             #   specimen/block management, report
│                             #   generation, amendment workflow, grossing
│                             #   completion, orchestrator draft
│                             #   lifecycle, sign-out/finalize) plus
│                             #   shared types. 131 tests.
│                             #   See hooks/README.md for the full
│                             #   architecture and hooks/__tests__/README.md
│                             #   for the testing approach.
├── components/               # Presentational pieces specific to this page
└── modals/
```


## 🎨 Design System

### Color Palette
- **Primary Cyan**: `#0891B2` - Main brand color
- **Dark Cyan**: `#0E7490` - Gradients and accents
- **Success Green**: `#10b981` - Positive states
- **Warning Yellow**: `#f59e0b` - Alerts and medium confidence
- **Error Red**: `#ef4444` - Errors and critical alerts

### Typography
- System fonts: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
- Professional, medical software aesthetic

## 📄 Pages Overview

The route list below reflects `App.tsx` as it exists today. A few of the
original pages (Login, Home, Worklist) are still accurate in spirit; most
of the rest — including the core clinical workflow — didn't exist when
this README was first written.

### Core clinical workflow

- **`/case/:caseId/synoptic`** — the Synoptic Report Page. Where a
  pathologist builds and signs out a report. Supports two distinct
  operating modes: **CoPilot** (PathScribe as a passive synoptic
  data-capture layer feeding a host LIS) and **Orchestration** (PathScribe
  owns the full report lifecycle as a lightweight LIS for outreach
  cases). See `src/pages/SynopticReportPage/hooks/README.md` for the full
  architecture.
- **`/accession`** — case accessioning.
- **`/worklist`** — sortable/filterable case table, AI generation status,
  priority badges (Routine/Rush/STAT — Rush and STAT both group under
  Worklist's "Urgent" filter; see `components/Worklist/README.md`).
- **`/deficiencies`**, **`/intraop-queue`**, **`/search`**, **`/audit`** —
  specimen-deficiency tracking, intraoperative-consult queue, case search,
  and the audit log.
- **`/report/:accession`**, **`/report-preview/:caseId`** — generated
  report viewing/preview.

### Configuration & templates

- **`/configuration`** — admin configuration (organisation, users,
  templates, AI behavior, and more — see `components/Config/`).
- **`/template-editor/*`**, **`/template-review/*`**,
  **`/admin/templates/*`**, **`/admin/parts/*`** — the synoptic template
  builder: assembling report templates from reusable Parts, plus the
  review/approval workflow for template changes.

### Other

- **`/contribution`** — pathologist productivity/quality dashboard.
- **`/mock-emr`** — a mock EMR view, used for demoing the "Launch EMR"
  integration point.
- **`/login`**, **`/`** (Home) — authentication and dashboard, described
  below.

### Login Page (`/login`)
- Email/password authentication
- SSO placeholders (Google, Microsoft)
- Theme switching (Light, Dark, Auto, Scheduled)
- Geolocation-based scheduled dark mode

### Home Dashboard (`/`)
- Key metrics overview
- Recent cases list
- Quick action buttons
- Role-based navigation (admin badge for admins)

## 🔐 Authentication

The app uses a context-based auth system:
- `AuthProvider` wraps the entire app
- `useAuth()` hook provides auth state and methods
- Protected routes redirect to login if not authenticated
- Demo credentials stored in `AuthContext.tsx`

## 🛠️ Technology Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **React Router v6** - Client-side routing
- **Vite** - Build tool and dev server
- **Firebase** - Backend for the services that have a real (non-mock)
  implementation; most domains currently run on an in-memory mock service
  behind the same interface, swappable without touching calling code
- **Vitest** - Test runner; `@testing-library/react` + `happy-dom` for the
  React-hook test suites (see Testing below)
- **SunCalc** - Geolocation-based theming

## 🧪 Testing

```bash
npm test              # Full suite (excludes firestore.rules.test.ts)
npm run test:rules    # Firestore security rules tests, run separately
npm run test:watch    # Watch mode
npm run type-check    # tsc --noEmit — run this separately from tests;
                       #   vitest's esbuild transform is more lenient
                       #   about lib/target settings than the real
                       #   tsconfig, so a clean test run is not proof a
                       #   file compiles under the project's real settings
npm run lint
```

Most of the suite is plain Node-environment tests (services, utilities,
calculations) with no DOM dependency. The `SynopticReportPage/hooks`
directory also has real React-hook tests (131 of them) — see
`src/pages/SynopticReportPage/hooks/__tests__/README.md` for the
`happy-dom` setup, the unit/integration split, and known tooling gotchas
before adding to that suite.

## 🎯 Key Features

### Theming System
- 4 modes: Light, Dark, Auto (system), Scheduled (geolocation-based)
- Smooth transitions between themes
- Persistent theme preference in localStorage

### Authentication
- Mock authentication for demo
- Role-based access (pathologist vs admin)
- Protected routes with redirect

### Responsive Design
- Professional medical software UI
- Color-coded confidence indicators
- Priority badges and status chips
- Consistent branding across all pages

## 🔧 Configuration

### Vite Config (`vite.config.ts`)
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173
  }
});
```

### TypeScript Config (`tsconfig.json`)
Standard React + TypeScript configuration with strict mode enabled.

## 📦 Building for Production

```bash
# Build optimized production bundle
npm run build

# Preview production build locally
npm run preview
```

The build output will be in the `dist/` directory.

## 🚧 Notes on this README's history

This file originally described the project at its earliest scaffolding
stage — a "Future Enhancements" section here once listed "Case detail
view with synoptic editor" as planned work; that's now the
`SynopticReportPage` system described above, one of the largest and most
actively developed parts of the app. If you're looking for what's
currently being worked on or planned next, check with the team lead
rather than this file — a static list here would go stale again quickly
given how fast this area moves.

## 📝 Notes

- All UI components use inline styles for portability
- No external UI library dependencies (pure React)
- Cyan theme matches the original synoptic UI design
- Designed for medical professionals (clear, professional, trustworthy)

## 🐛 Troubleshooting

**Issue: Theme icons not showing**
- Create SVG files in `/public` directory for theme icons
- Or use emoji fallbacks (currently implemented)

**Issue: Login not working**
- Check you're using the demo credentials
- Clear localStorage and refresh

**Issue: Navigation not working**
- Ensure React Router is properly installed
- Check browser console for errors

## 📞 Support

For questions or issues, contact the pathscribe AI development team.

---

**Version:** 1.0.0 (README last substantively updated August 2026 — see note above)
**Last Updated:** August 06, 2026
**License:** Proprietary - pathscribe AI
