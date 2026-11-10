# Skyfall website

Read docs/ASSISTANT_OPERATIONS.md before changing deployment or data behavior.
Preserve the existing website branding and the independent skyfall-honeypot Worker.
No private company projects, customer records, credentials or invented portfolio claims in source.
No email required during chat/design. Only explicit contact submission can send an inquiry.
Run npm run check and npm test. Generated staging assets: npm run build:preview.
External services are mocked only in runtime tests. Never treat mock results as live verification.
Before production changes, verify the live model, both full email paths and responsive workflow. Preserve the rollback branch and actual verification evidence.
Use additive database migrations; rollback must preserve submitted inquiries.
