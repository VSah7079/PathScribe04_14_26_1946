#!/usr/bin/env python3
"""Rewrites src/services/apiServer/directMockImportBaseline.ts from the code (Batch 670).
Run it after converting a file to its instance; the guard test only lets the list shrink."""
import re, os, json
IMPORT = re.compile(r"""(?:from\s+|import\(\s*)['"][^'"]*/(mock\w*Service)['"]""")
found = {}
for d, _, fs in os.walk('src'):
    for f in fs:
        if not f.endswith(('.ts', '.tsx')) or '.test.' in f or f.startswith('mock') or f.endswith('Instance.ts'): continue
        p = os.path.join(d, f); rel = os.path.relpath(p, 'src').replace(os.sep, '/')
        if rel == 'services/index.ts': continue
        mods = set()
        for line in open(p, encoding='utf-8').read().split('\n'):
            if re.match(r'\s*(//|\*)', line) or re.match(r'\s*import\s+type\b', line): continue
            for m in IMPORT.finditer(line): mods.add(m.group(1))
        if mods: found[rel] = sorted(mods)
head = ["// src/services/apiServer/directMockImportBaseline.ts",
        "// Batch 670: files that still import a mock service module directly instead of the",
        "// `…Instance` that picks the server version. A ratchet: remove entries as the wiring",
        "// steps convert them (scripts/dev/regen-direct-mock-baseline.py rewrites this file);",
        "// directMockImports.guard.test.ts fails on a new one.",
        "// Intentionally demo-only (no server version, by design): services/signIn.ts -> mockStaffPasswordService",
        "// (server deployments are single sign-on only, AUTHENTICATION_MODEL.md); demoReset.ts -> seed versions.",
        "export const DIRECT_MOCK_IMPORT_BASELINE: Readonly<Record<string, readonly string[]>> = {"]
body = [f"  '{k}': {json.dumps(found[k])}," .replace('"', "'") for k in sorted(found)]
open('src/services/apiServer/directMockImportBaseline.ts', 'w').write('\n'.join(head + body + ['};']) + '\n')
print(len(found), 'files remain')
