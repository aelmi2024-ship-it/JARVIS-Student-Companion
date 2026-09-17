# Security policy

## Reporting a vulnerability

Do not open a public issue containing credentials, access tokens, student records, or exploit details. Contact the repository owner privately and include the affected route, reproduction steps, and impact.

## Secrets

Never commit `.env`, API keys, Canvas client secrets, access tokens, cookies, or real student records. If a secret is ever pasted into a file, chat, commit, or screenshot, revoke and replace it immediately; deleting the visible text does not make the original secret safe again.

## Production deployment checklist

The included backend is appropriate for local development and a controlled showcase. Before serving real student data:

- use HTTPS and secure cookies;
- replace the in-memory session map with encrypted, expiring persistent sessions;
- add token refresh and revocation handling;
- use a strict allowlist for institution Canvas domains;
- add centralized audit logging without recording message content or credentials;
- configure per-user and per-IP rate limits behind a trusted proxy;
- complete institutional privacy, accessibility, and security review;
- document data retention and deletion controls;
- run dependency, secret, and static-analysis scans in CI.

The GitHub Pages build publishes only the static `public/` demo and must not contain real credentials or student data.
