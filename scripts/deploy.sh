#!/usr/bin/env bash
# StellarPay Soroban Payroll Contract — Deploy & Initialize (Testnet Only)
#
# Usage:
#   ./scripts/deploy.sh                          # deploy only
#   ./scripts/deploy.sh --init --admin G...      # deploy + initialize
#   STELLAR_SECRET_KEY=S... ./scripts/deploy.sh  # set deployer key

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
WASM_PATH="${ROOT_DIR}/contracts/payroll/target/wasm32v1-none/release/stellarpay_payroll.wasm"
NATIVE_SAC="CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC"
NETWORK="testnet"

# Parse flags
INIT=false
ADMIN=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --init) INIT=true; shift ;;
    --admin) ADMIN="$2"; shift 2 ;;
    --network) NETWORK="$2"; shift 2 ;;
    *) echo "Unknown flag: $1"; exit 1 ;;
  esac
done

echo "=== StellarPay Contract Deployment (${NETWORK}) ==="
echo ""

# Preflight checks
if ! command -v stellar &>/dev/null 2>&1; then
  echo "Error: 'stellar' CLI not found. Install Stellar CLI 21+:"
  echo "  curl -fsSL https://github.com/stellar/stellar-cli/raw/main/install.sh | bash"
  exit 1
fi

if ! command -v cargo &>/dev/null 2>&1; then
  echo "Error: 'cargo' not found. Install Rust: https://rustup.rs"
  exit 1
fi

# Ensure wasm target is installed
if ! rustup target list --installed 2>/dev/null | grep -q wasm32v1-none; then
  echo "Adding wasm32v1-none target..."
  rustup target add wasm32v1-none
fi

# Build WASM
if [ ! -f "$WASM_PATH" ]; then
  echo "Building WASM binary..."
  cd "${ROOT_DIR}/contracts/payroll"
  cargo build --target wasm32v1-none --release
  cd "${ROOT_DIR}"
  echo "WASM built: ${WASM_PATH}"
else
  echo "WASM already exists: ${WASM_PATH}"
  echo "  Rebuild with: cargo build --target wasm32v1-none --release"
fi

echo ""

# Deploy
echo "Deploying to ${NETWORK}..."
CONTRACT_ID=$(stellar contract deploy \
  --wasm "${WASM_PATH}" \
  --network "${NETWORK}" \
  --source "${STELLAR_SECRET_KEY}")
echo "✓ Contract deployed: ${CONTRACT_ID}"

# Optional: Initialize with admin + native SAC token
if [ "$INIT" = true ]; then
  if [ -z "$ADMIN" ]; then
    echo "Error: --admin <G... address> is required for initialization"
    exit 1
  fi
  echo ""
  echo "Initializing contract with admin=${ADMIN}..."
  stellar contract invoke \
    --id "${CONTRACT_ID}" \
    --network "${NETWORK}" \
    --source "${STELLAR_SECRET_KEY}" \
    -- \
    initialize \
    --admin "${ADMIN}" \
    --token "${NATIVE_SAC}"
  echo "✓ Contract initialized"
fi

echo ""
echo "============================================"
echo " Contract ID: ${CONTRACT_ID}"
echo "============================================"
echo ""
echo "Add to frontend/.env:"
echo "  VITE_SOROBAN_CONTRACT_ID=${CONTRACT_ID}"