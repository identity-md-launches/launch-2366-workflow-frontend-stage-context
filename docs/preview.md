# Renderer previews and deployment provenance

The frontend uses the attested deployed source commit `e462b062e68c0962a15d05cfe7d70dacbb354cbd`. The three `docs/abi/<Contract>.json` files were read directly from that commit with `git show <sourceCommit>:docs/abi/<Contract>.json`; they are already implementation-derived compiler ABI arrays in that tree. Their canonical Keccak hashes exactly match the supplied handoff. No contracts or root compiler configuration were changed for this assignment.

`web/deployment-handoff.json` and `web/network.json` preserve the supplied inputs. `web/scripts/prepare.mjs` verifies the source ABI hashes, copies the JSON to `public/abi/`, and generates the runtime manifest, compatibility downloads and integration examples. `npm run build` emits the site to root `dist/` and then records a SHA-256 digest for every export file except the manifest itself. The browser loads `imd-deployment.json` and its referenced ABI files before importing the interface. It takes application contract addresses and chain/RPC configuration from that manifest.

A scratch-only compilation used the repository's existing settings: solc 0.8.24, optimizer 200, Cancun, no bytecode metadata hash, CBOR metadata disabled, no IR. These actual commands completed successfully:

```sh
forge inspect src/Registry.sol:Registry storage-layout --json --offline \
  --use /tmp/sworn-solc-v0.8.24 --out test/scratch/solidity-out \
  --cache-path test/scratch/solidity-cache > test/scratch/storage-layout.json
forge build --use /tmp/sworn-solc-v0.8.24 \
  --out test/scratch/solidity-out --cache-path test/scratch/solidity-cache \
  --skip test --skip script --offline
```

The compiler's three deployed bytecode arrays are retained as test fixtures. All three match code read from Ethereum mainnet byte for byte: Renderer 23,553 bytes, Composer 24,068 bytes, Registry 20,465 bytes. `npm run check:abi` verifies the ABI copies and runtime fixture hashes; `npm run check:deployment` repeats the pinned-source ABI and public-RPC checks and writes [deployment-verification.json](deployment-verification.json). That evidence records the actual endpoint, block and seven immutable dependency getters. Runtime integrity checks validate the RPC chain, current deployed bytecode hashes and these getters before any transaction step.

## A wallet without a card

The Renderer exposes `tokenURIOf(address registry,uint256 tokenId)`. `web/src/chain.ts` calls that deployed function at the lookup block. For this read-only `eth_call`, a storage override sets `Registry.claimantOf(totalSupply() + 1)` to the inspected wallet. The compiler storage layout confirms that `claimantOf` is mapping slot **15**. The key is `keccak256(abi.encode(nextTokenId, uint256(15)))`; the value is the left-padded wallet address.

No other state is overridden. `tokenOf(wallet)` remains zero, direct Curator facts read live before mint, and oracle facts/community specs remain the wallet's actual facts. No helper is deployed, no mint or signature occurs, and no attestation API request is made. The result is labelled “preview, no card minted”. A minted wallet uses `Registry.tokenURI(tokenOf(wallet))` without overrides. RPC support for standard `eth_call` state overrides is required; an unavailable read shows an error and retry.

## Bundled illustrations

Run `node scripts/render-assets.mjs` from `web/` to call the deployed Renderer and regenerate the sample card and 26 single-trait/empty illustrations. The `eth_call` uses an ephemeral `ICardSource` code override that returns explicitly synthetic rendering inputs; it does not persist state or enter a transaction path. Catalog specs come from the live Registry, including Swarmed (601). Zero request identifiers indicate that an illustration proves no oracle claim. The script saves SVG images and records their exact hashes, live block and adapter code hashes in [renderer-assets.json](renderer-assets.json).

All 27 images were regenerated for the current deployment and checked for absent token-number text. The current local Anvil fork validation also exercised a real public contributor preview, an empty-wallet preview, a mint and its normal metadata path. See [evidence/fork-results.json](evidence/fork-results.json). No transaction was sent to mainnet.
