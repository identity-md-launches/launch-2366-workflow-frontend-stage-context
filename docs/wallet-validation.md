# Wallet and transaction validation

Chromium passed all 10 wallet browser scenarios on the final static export. The final site keeps one Connect control. Named browser wallets use EIP-6963 discovery; phone browsers without a provider offer MetaMask, Coinbase Wallet, Rabby and Phantom deep links, followed by Coinbase Smart Wallet. The runtime wallet chain and add-chain parameters come from the same attested deployment manifest used for contract reads. No relay or project ID is configured.

`web/tests/wallet-browser.mjs` exercises the production export at a static-hosting subpath with deterministic EIP-6963 providers and deliberately unavailable RPC responses. It checks discovery names and marks, generic-row suppression, rejected connection retry, wrong-chain switching, visible rejected-switch feedback, the exact add-chain parameters, stored reconnect, account changes, disconnect, phone links, 48px rows, bottom-sheet bounds and focus restoration. The result and phone screenshot are in `docs/evidence/wallet-browser-results.json` and `docs/evidence/phone-wallet-picker-390.png`.

The browser test does not connect a real extension, launch a phone wallet, create a Coinbase passkey or send a mainnet transaction. Vendor application behavior is therefore not established by this run. The SDK connector and all four links are wired in source; automated checks cover their presentation and URL construction.

`npm test` also exercises meaningful transaction boundaries: abort after an account/session change, exact transaction values, route managers, stale/wrong-market quotes, upward input slippage, calldata recipients and refunds, receipt replacement/cancellation/revert, unknown-broadcast recovery without repeating a swap, exact IMD receipt and allowance checks, balance and simulation failures before signing, changed oracle price, exact spec-registration id, zero native value on Registry calls and deployment-integrity failure. Guard tests cover non-contributor restrictions, recovery after unavailable reads, shared acknowledgement, precision-preserving amounts and closed ABI signatures.

Run the browser scenario from the repository root after building with `npm --prefix web run build`:

```sh
node web/tests/wallet-browser.mjs
```

It requires a working Playwright Chromium installation. `IMD_PLAYWRIGHT` can point to an externally installed Playwright module; `PLAYWRIGHT_BROWSERS_PATH` is supported by Playwright. Browser output goes to the disposable `test/scratch/wallet-validation/` directory. The build and validation scripts do not need a funded wallet.
