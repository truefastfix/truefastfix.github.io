# Skyfall website

Read docs/ASSISTANT_OPERATIONS.md before changing deployment or data behavior.
Preserve the existing website branding and the independent skyfall-honeypot Worker.
No private company projects, customer records, credentials or invented portfolio claims in source.
No email required during chat/design. Only explicit contact submission can send an inquiry.
Run npm run check and npm test. Generated staging assets: npm run build:preview.
External services are mocked only in runtime tests. Never treat mock results as live verification.
Production main stays unchanged until the live model, full email paths and mobile workflow are verified.
Use additive database migrations; rollback must preserve submitted inquiries.
