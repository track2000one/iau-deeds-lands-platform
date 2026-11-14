# UI test coverage — IAU Deeds

These checks run **against isolated, synthetic data only**; no university login or production API is required.

## Automatic checks

- `npm run build && npm run test:ui:contracts`: validates the generated release manifest, HTML entrypoint and cache rules; verifies that PDF/Excel/print operations still receive **all** report rows rather than the 60-row preview, and checks card/attachment regression contracts.
- `npm run test:ui:browser`: Playwright Chromium smoke tests via a temporary Vite server and `tests/ui/harness.html`, covering login form presence, PDF iframe open/close, gallery pagination, report preview pagination, linked/unlinked card styles, release-status responses, charts, **and the real multi-page deed PDF merger** with synthetic original deed/plan/site PDFs. The PDF download is parsed and its 6 original pages/dimensions verified.
- The browser test harness is not linked from `App.tsx` or the app router and is **not part of production's Vite build**.
- The PR workflow installs a pinned, test-only Playwright runner separately; it does not change `package-lock.json` or the runtime application. Failed screenshots/traces are retained for 7 days in GitHub Actions.

## Deliberate limitations

The automated browser suite exercises production React components with mock data, **not authenticated workflows against Railway**. It does not verify database permissions, server-rendered report exports or real external attachment links. The deed/plan/site PDF merge test does exercise the live client-side merger on generated in-memory files. Browser-level regression tests are supplemented by production build validation, and high-risk end-to-end tests require a dedicated non-production test account and isolated backend before they can safely run in CI.

## Browser test setup (local)

Run `npm ci`, then `npm install --no-save --package-lock=false @playwright/test@1.56.1`, then `npx playwright install chromium` and `npm run test:ui:browser`.

If a test fails, inspect the GitHub Actions `UI browser smoke` job and its failure screenshots/traces before merging.
