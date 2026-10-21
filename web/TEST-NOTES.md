# Frontend validation

Validated on 2026-10-21 against the current Ethereum deployment.

- `npm ci --cache /tmp/sworn-npm-cache --no-audit --no-fund`: passed.
- `npm test`: 66/66 passed.
- `npm run typecheck`, `npm run check:abi`, `npm run build`, `npm run check:export`: passed.
- `npm run check:deployment`: pinned-source ABI, deployed code and seven immutable getter checks passed.
- Production Chromium: 52/52 general checks, 10/10 wallet checks, 14/14 focused UI checks, 5/5 live-RPC checks passed.
- Local mainnet-fork transactions: 7/7 checks passed. No transaction was sent to mainnet.
- Design probe: 11/16 generic checks passed; the five inherited design exceptions are explained in the complete review.

The final export has 52 declared assets, 1,590,217 asset bytes and 1,599,701 bytes including its deployment manifest. Every asset has a validated SHA-256 digest. The first-screen address action and mint preparation fit at 390×844. All routes fit at 320, 390, 780 and 1280 pixels; the design probe also checked 1440.

WebKit downloaded after moving its cache to scratch storage, but it could not launch because required system libraries are absent; WebKit remains unverified. Real wallet extensions, phone wallet applications, Coinbase passkey creation, native screen-reader sessions and native 200% browser zoom were not performed. Live-RPC automation uses a local transport proxy; direct public-node requests were additionally observed in the browser, but every operator's browser CORS behavior was not established.

See [the consolidated validation record](../docs/frontend-validation.md), [the site requirement mapping](../docs/site-requirements-review.md), [wallet validation](../docs/wallet-validation.md), [design implementation](../docs/DESIGN.md) and the actual results/screenshots in [docs/evidence](../docs/evidence).
