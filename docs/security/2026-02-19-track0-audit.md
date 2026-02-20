# Track 0 Security Audit - Service Account Key

**Date:** 2026-02-19  
**Scope:** Pre-production gate for push notifications rollout.

## Findings

1. **Local sensitive file exists**
- File detected: `functions/service-account-key.json`.
- This file contains a private key and must be treated as sensitive material.

2. **Repository tracking status**
- `functions/service-account-key.json` is currently ignored by Git (`.gitignore`).
- It is **not** present in `origin/master` tracked tree.
- No match found in `origin/master` history object listing for `service-account-key.json` or `adminsdk`.

3. **Remote exposure checks**
- Remote repository: `https://github.com/FOREVERARGENTINA/puerto-nuevo`.
- Default branch: `master`.
- Public forks found via GitHub API: `0`.
- No tracked private key patterns found in `origin/master` grep.

4. **Runtime dependency check**
- Cloud Functions runtime (`functions/index.js`) uses `admin.initializeApp()` and does not require local key files.
- Two local scripts previously defaulted to `functions/service-account-key.json`; this was hardened to require explicit credentials (`--key` or `GOOGLE_APPLICATION_CREDENTIALS`):
  - `scripts/migrateTalleristaId.js`
  - `scripts/fixMojibake.js`

## Risk Assessment

- **Git remote exposure:** Low (no evidence in current remote branch/history and no forks).
- **Local workstation exposure:** Medium (private key file is present on disk in repo folder).
- **Production gate status:** **Open** until local key handling policy is closed.

## Required Actions to Close Track 0

1. Move or delete `functions/service-account-key.json` from the repo workspace.
2. Keep credentials outside repository path and pass explicitly through:
- `GOOGLE_APPLICATION_CREDENTIALS`, or
- `--key=/secure/path/key.json`.
3. If there is any chance the key was shared, synced, or copied outside controlled machines, rotate/revoke the service account key in Google Cloud before production deploy.
4. Record closure evidence (who, when, and what was rotated/removed).

## Notes

- This audit does not print or store private key values.
- This document is intended to satisfy the Track 0 pre-production control.

## Update (Local Closure - 2026-02-19)

1. `functions/service-account-key.json` was removed from the repository workspace.
2. Local key moved to: `C:\Users\casa\.pn-secrets\service-account-key.json`.
3. Suggested script execution pattern:
   - PowerShell:
     - `$env:GOOGLE_APPLICATION_CREDENTIALS='C:\Users\casa\.pn-secrets\service-account-key.json'`
     - `node scripts\migrateTalleristaId.js --apply`
4. Track 0 local handling is closed for this workstation.
5. Production security closure still requires key rotation **if** any historical exposure is later confirmed.
