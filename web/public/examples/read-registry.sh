#!/usr/bin/env bash
set -euo pipefail

wallet="${1:?Usage: ./read-registry.sh <wallet-address>}"

cast call 0x9cb36ecca47d753e4e62ed87c12a2b7b20dfa828 \
  'hasTrait(address,uint16)(bool)' \
  "$wallet" 701 \
  --rpc-url https://ethereum-rpc.publicnode.com

cast call 0x9cb36ecca47d753e4e62ed87c12a2b7b20dfa828 \
  'tokenOf(address)(uint256)' \
  "$wallet" \
  --rpc-url https://ethereum-rpc.publicnode.com
