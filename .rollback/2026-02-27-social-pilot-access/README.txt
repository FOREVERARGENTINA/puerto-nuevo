Rollback checkpoint: 2026-02-27-social-pilot-access
Created: 2026-02-27 14:31:23

Files backed up:
- src/components/auth/SocialFeatureGuard.jsx
- src/components/layout/Sidebar.jsx
- src/services/social.service.js

Restore commands (PowerShell):
Copy-Item .rollback/2026-02-27-social-pilot-access/SocialFeatureGuard.jsx.bak src/components/auth/SocialFeatureGuard.jsx -Force
Copy-Item .rollback/2026-02-27-social-pilot-access/Sidebar.jsx.bak src/components/layout/Sidebar.jsx -Force
Copy-Item .rollback/2026-02-27-social-pilot-access/social.service.js.bak src/services/social.service.js -Force
