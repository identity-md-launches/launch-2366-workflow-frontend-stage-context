# Frontend delivery and validation

## Scope and outcome

Complete for the stated frontend stage: the existing Sworn Vite/React/TypeScript application is updated for the attested Ethereum mainnet deployment, and its static export is delivered in root `dist/`. The existing pages, terminal identity, palette, hive imagery and system-monospace typography are preserved. The approved site changes in docs/V3.md items 23–26 and the applicable F-21–F-50 rows are mapped in [site-requirements-review.md](site-requirements-review.md).

Contract source, deployment, root configuration, `lib/` and `.github/` are unchanged. This worker did not publish or redeploy anything. Source publication, IPFS pinning and naming belong to the subsequent control-plane stage. Required design documentation is [DESIGN.md](DESIGN.md) in the permitted `docs/` scope: creating the requested repository-root document would violate the explicit overriding path budget. No ignore file was changed; the existing `web/.gitignore` excludes dependency directories at every depth.

The one visual idea is Sworn's existing compact terminal reference, carried by green hive artwork, exact data and adjacent citations.

## Reproducible commands and actual results

Node 26.11.1 and npm 12.2.0 were used. The README describes install, preview and rebuild. The following ran successfully from `web/` unless a different location is stated:

| Command/check | Actual result |
| --- | --- |
| `npm ci --cache /tmp/sworn-npm-cache --no-audit --no-fund`; final `npm --prefix web ci --cache test/scratch/npm-cache --no-audit --no-fund` from repository root | Both successful runs installed 492 packages. The final run validated the delivered metadata-trimmed lockfile. Read-only/quota-limited temporary caches were bypassed using scratch storage. |
| `npm test` | 66 tests passed, none failed/skipped. Includes ABI/runtime integrity, exact amounts, eligibility, ABI grammar, wallet invalidation and transaction boundaries. |
| `npm run typecheck` | Passed. |
| `npm run check:abi` | All three implementation ABI copies and compiler runtime fixtures matched. |
| `npm run check:deployment` | Configured RPC chain 1, pinned source ABIs, three byte-for-byte compiled runtime matches and seven immutable getters passed at block 26,239,071. |
| `npm run build` | Passed after the last runtime/UI source change. Relative Vite base; root `dist/`; manifest emitted after all export assets. |
| `npm run check:export` | Exact handoff/network/configuration keys, three ABI hashes, every asset inventory/hash, relative entrypoint assets and size limits passed. |
| `git diff --check` | Passed. |
| Scratch-only Solidity compilation/storage inspection | Passed using unchanged pinned settings and scratch output/cache; actual commands are in [preview.md](preview.md). |
| Local Anvil mainnet-fork flow | 7 checks passed at block 26,239,084: integrity, unminted previews, exact-output ETH purchase/refund, exact approval/mint/metadata, paid oracle request and receipt-derived community registration id. Only local fork transactions. |

The nonfatal build messages concern third-party PURE annotations and a 552 kB main JavaScript chunk. Runtime dependencies remain complete. The only lockfile change removes optional upstream funding metadata; a structural comparison confirmed that package versions, integrity hashes and the entire dependency graph remain identical to the installed/tested lockfile. No dependency binaries, browser packages, caches or registry archives are delivered.

Browser tooling was installed outside the repository. These commands ran from the repository root with `PLAYWRIGHT_BROWSERS_PATH=/tmp/sworn-playwright-browsers`, `IMD_PLAYWRIGHT=/tmp/sworn-browser-tools/node_modules/playwright/index.mjs` and, for accessibility scans, `SWORN_AXE_MODULE=/tmp/sworn-browser-tools/node_modules/@axe-core/playwright/dist/index.mjs`:

| Command/check | Actual result and evidence |
| --- | --- |
| `SWORN_BROWSER_ENGINES=chromium node web/tests/browser.mjs` | 52/52 passed, including every route at 320/390/780/1280, initial/deep-link routing, address validation, pre-wallet journal/reload behavior, source navigation, dialog focus/dismissal, local resources and console. All eight axe route scans had no applicable violations. [Results](evidence/browser-results.json). |
| `node web/tests/wallet-browser.mjs` | 10/10 passed: EIP-6963 names/marks, generic suppression, rejection/retry, visible switch rejection, exact add-chain fallback, reconnect, account changes/disconnect, phone links/Smart Wallet, 48px rows and focus return. [Results](evidence/wallet-browser-results.json). |
| `node web/tests/site-browser.mjs` | 14/14 passed with explicit deterministic JSON-RPC and wallet fixtures: non-Curator guards, acknowledgement/focus, previews/minted state, exact fact prices/origin, local errors/failed step, click-time price refresh, stored 601 window, recovery, copying and mobile tables. [Results](evidence/site-browser-results.json). |
| `node web/tests/live-browser.mjs` | 5/5 passed against actual configured public RPCs: contributor facts/image, oracle status, Explorer outage/retry, connected Claim recovery without reload, no script/resource errors or API calls. The transport proxy and simulated read-only provider are disclosed. [Results](evidence/live-browser-results.json). |
| `node .imd/reads/skills/design-critic/scripts/taste.mjs --out test/scratch/taste` | Ran on the final export. 11/16 checks passed; five inherited design exceptions are reviewed below. [Raw probe evidence](evidence/taste-results.json). |
| WebKit availability launch check | Download completed in scratch storage; launch failed with missing system libraries. No WebKit interaction pass is claimed. [Actual launch result](evidence/webkit-availability.json). |
| Assigned browser inspection | Production landing, Claim and Catalog viewed at 390px; direct public-node requests returned HTTP 200; console errors were zero. Final mobile Claim preparation bottom was 796.27px, and address action bottom was 644.34px in a 390×844 viewport. |

The result records identify the final manifest SHA-256 `c36c1365e1476e999fa64d46e58639aedce4d83de04b12524f84faa250fd155b`. Synthetic wallet/protocol responses exist only inside test harnesses; shipped card illustrations are labelled synthetic. No production fallback invents wallet balances, oracle verdicts or deployment values.

## Deployment and export integrity

The browser loads `dist/imd-deployment.json` and the ABI JSON paths referenced by that same file before rendering the app. It derives application addresses, chain and RPCs from it. Generated compatibility downloads and examples are build products of the same handoff, not an independent runtime address map.

The source commit is `e462b062e68c0962a15d05cfe7d70dacbb354cbd`; launch is `7f4dd9ec-15e4-4062-8b94-9d1a859513cd`; attestation hash is `bbe3ff03a37e92a5d34cd92811cb32e1ddda5c174cafdf99c99c9d318b3d86c2`. `network` and `walletAddChain` are copied unchanged. The handoff has no `poolKey`, so the manifest does not invent one. Contract names, addresses and ABI hashes match the supplied set exactly. Detailed provenance is in [deployment-verification.json](deployment-verification.json).

There are 52 declared assets, 1,590,217 asset bytes, and 1,599,701 export bytes including the manifest. The manifest excludes itself. An independent Python inventory/hash comparison against the original supplied handoffs also passed after building. All paths are relative to `dist/`; every exported file is inventoried; there are no export symlinks. The complete candidate regular-file snapshot and compressed snapshot were checked against the 8 MiB budget; exact measurements and exclusions are in [size-check.json](evidence/size-check.json).

The three V3 removal-pattern scans over all deliverable `web/` files returned no matches. The bundled third-party Coinbase account-abstraction runtime retains its generic `sponsor` object field; it is unrelated to the removed Registry feature. The mandatory Coinbase connector remains intact. There are no removed Registry operations or outcomes in the app, exported ABI or user-facing copy.

## Better Interface coverage

The pinned workflow and core principles of all six domains were read and applied. Review covered changed pages and shared controls, without replacing the established design.

| Domain | Coverage and evidence | Limitations |
| --- | --- | --- |
| Accessibility | Native links/buttons/labels, route/anchor focus, modal containment and focus return, status regions, disabled explanations, one radiogroup, visible focus, input validation, 24px citation targets, 44/48px primary controls; eight axe route scans. | No native screen-reader or physical-device session; automated scans are not full compliance certification. |
| Layout | Every route at 320/390/780/1280; probe at 320/390/1440; compact mobile rows and full-width claim steps; first-screen action; code/hour-table scrolling cues. Eleven table-body screenshots are in [site-tables](evidence/site-tables/). | Native 200% zoom, RTL and localization stress tests were not performed; no localization/theme feature is requested. |
| Writing | Short product headline and plain description, explicit cost/irreversibility, live request pricing, exact Swarmed wording, three-step references, actionable adjacent errors, honest unavailable/pending states. | External linked material and future oracle answers are outside the app's control. |
| Typography | Six shared content sizes, three weights, system-monospace identity, tabular numbers, exact formatting, mobile 16px fields, readable instructions and wrapping critical values. | Actual system font differs across operating systems; WebKit was unavailable. |
| Colors | Existing semantic tokens preserved; status has text as well as color; source gutter corrected. Probe's resolved solid text pairs pass. Rendered page-token contrast against `#0a0a0a`: text 14.73:1, muted 6.48:1, accent 14.50:1, danger 7.69:1. Large faint 24px numerals are 3.43:1. | These are identified solid-color pairs, not a claim about every SVG/art pixel or alpha overlay. |
| UI | Hover/active/focus/disabled states, exact transaction/receipt stages, local pending/error/success, empty/read-error recovery, wallet dismissal, copy feedback, no endless animation or broad transitions. | Real vendor wallet UI/passkeys and native phone deep-link destinations were not exercised. No theme or animation system is requested. |

## Findings fixed and rechecked

Locations refer to the final source, where the correction is implemented.

| Severity/domain | Finding, correction and final source | Reproduction/evidence |
| --- | --- | --- |
| High / integrity | Old deployment configuration and downloaded example addresses could disagree with the live deployment. The runtime manifest and generated examples now use the exact attested handoff; ABI/code/getter checks gate transactions. `web/src/config.ts:18`, `web/scripts/prepare.mjs`. | ABI/export checks, live deployment check and download tests passed. |
| High / layout | Desktop-width tables and the separate step numeral compressed phone content. Mobile rows now expose labels and preserve all values; only the explicitly permitted hour table scrolls. `web/src/components.tsx:26`, `web/src/styles.css:386`. | All route overflow checks passed; live 390px Explorer tables and eleven body screenshots inspected. |
| High / usability | One failed dependency check left signing disabled until reload. Retry scheduling, online/manual retry and non-latching price/eligibility guards now restore controls. `web/src/main.tsx:27`, `web/src/Claim.tsx:43`. | Both deterministic and actual public-RPC outage/recovery checks passed without reload. |
| High / writing | Non-Curator wallets could be offered facts that cannot be true. Guard and Explorer now explain the restriction and omit request links for those ids. `web/src/eligibility.ts:37`, `web/src/pages.tsx:74`. | Non-member fixture at 390/1280 passed; 601/1301/community paths remained eligible. |
| High / feedback | Preparation/simulation failures had distant or neutral feedback. Per-action status and persisted failed journal steps now display the error at its button. `web/src/Claim.tsx:155`, `web/src/flow.ts:185`. | Invalid local spec, insufficient balance, rejected send and simulation unit/browser checks passed. |
| Medium / accessibility | The shared acknowledgement was remote from its first gated action. It now sits beside that action; every acknowledgement reason focuses it. `web/src/Claim.tsx:156`, `web/src/Claim.tsx:193`. | Focus-link check passed; acknowledgement and action span 189.6px at 390. |
| Medium / UI | A connected wallet still saw a generic mint image. Token state and Renderer/Registry metadata now follow the connected account; already-minted state disables mint. `web/src/Claim.tsx:65`, `web/src/Claim.tsx:161`. | Minted/unminted browser fixtures and fork mint/metadata checks passed. |
| Medium / accessibility | Initial route titles/anchors and header order were inconsistent. Initialization handles direct links, section focus and selected traits; brand/menu/Connect order is consistent in DOM and visual layout. `web/src/main.tsx:15`, `web/src/main.tsx:36`, `web/src/styles.css:363`. | Direct loads, selected 601/1201 links, anchor focus and all-width checks passed. |
| Medium / writing | Registration and transaction review could obscure the live first-claim price and selected facts. Preparation rereads it; journal lists ids/names/prices and links to/from its origin. `web/src/Claim.tsx:115`, `web/src/Claim.tsx:164`. | Changed-price fixture, one/two-fact review and receipt-derived registration checks passed. |
| Medium / typography/colors | Instruction/error text used citation sizing and source line numbers used a faint role. Helpers/errors now use 12/13px; line numbers use the existing muted token. `web/src/styles.css:168`, `web/src/styles.css:209`, `web/src/styles.css:433`. | Computed-style/browser review and all eight axe scans passed; muted contrast is 6.48:1. |
| Medium / UI | Secondary hover did not visibly change text/border, and switch rejection feedback was hidden on other routes. Hover now uses `--text`; connected switch errors render in the header. `web/src/styles.css:56`, `web/src/ConnectSheet.tsx:8`. | Wallet rejection/fallback test passed; visible hover/pressed/focus states inspected. |

## Probe findings and retained design

The final probe passed render, layout, targets, contrast, type sizes, glyphs, slogans, repetition, chrome, motion and share metadata. It found no horizontal page scroll, overlapping/cut-off text, missing local resources or script errors. The first phone screen has 33 prose words, below its 60-word bar.

Five generic probe checks remain exceptions to the explicit approved workflow instruction “keep its design, colours, type and pages”:

- Casing/tracking: inherited uppercase labels and `.12em` section/caption tracking are retained (`web/src/styles.css:103`, `web/src/styles.css:319`). They are part of the existing reference design, not new decorative labels.
- Eyebrows: the phone Connect utility is a false positive because it is near the headline. The four existing class labels name actual evidence classes and retain their established placement (`web/src/components.tsx`, `web/src/styles.css:317`).
- Type faces: the site's intentional system-monospace prose is retained. The probe reports one family, three weights and five repeated content sizes plus the display one-off.
- Desktop copy budget: 183 prose words appear at 1440, above the generic 90-word preference, because the existing proof/class explanation is visible beneath the lookup. The primary product/action remains first; required explanations were preserved rather than hidden to change a count.

These are recorded design decisions, not claims that those probe checks passed. The applicable functional/accessibility findings above were corrected and rechecked. Share title, favicon, description, `og:title` and local `og:image` are present.

## Remaining verification limits

Initial WebKit downloads failed with DNS `ENOTFOUND` and a temporary-filesystem quota error (`Unknown system error -122`). Moving both browser download/cache paths to scratch storage allowed the download, but the actual launch check found missing system libraries (including GTK 4, GStreamer, Soup and image libraries). The attempted WebKit browser run therefore recorded an availability failure, with no WebKit interaction check performed. Chromium browser validation completed; WebKit/Safari behavior is explicitly unverified. No requester input is required to deliver the tested source/export.

No real extension, phone wallet application, Coinbase passkey creation or funded mainnet transaction was exercised. The local fork did execute the economic flow without spending real funds. A genuine accepted shared-list application requires an oracle result; ABI/intent and guard behavior were checked without fabricating a live verdict. Public-RPC automation used a local proxy, so full browser CORS coverage across both operators remains unverified; direct primary public-node HTTP 200 responses and zero console errors were additionally observed in the assigned browser.

Native screen readers, native zoom and forced-colors hardware/device behavior were not exercised. There is no claim of formal accessibility certification, external audit, hosting or control-plane publication checks.
