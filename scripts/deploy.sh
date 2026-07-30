#!/usr/bin/env bash
# StellarPay Soroban Payroll Contract — Deploy & Initialize (Testnet Only)
#
# Usage:
#   ./scripts/deploy.sh                          # deploy only
#   ./scripts/deploy.sh --init --admin G...      # deploy + initialize
#   ./scripts/deploy.sh --source deployer         # use a configured CLI identity
#   STELLAR_SECRET_KEY=S... ./scripts/deploy.sh   # or use a secret from the environment

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
WASM_PATH="${ROOT_DIR}/contracts/payroll/target/wasm32v1-none/release/stellarpay_payroll.wasm"
NATIVE_SAC="CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC"
NETWORK="testnet"
SOURCE="${STELLAR_SECRET_KEY:-}"

# Parse flags
INIT=false
ADMIN=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --init) INIT=true; shift ;;
    --admin) ADMIN="$2"; shift 2 ;;
    --network) NETWORK="$2"; shift 2 ;;
    --source) SOURCE="$2"; shift 2 ;;
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

if [ -z "$SOURCE" ]; then
  echo "Error: a signing source is required. Pass --source <identity-or-secret>"
  echo "or set STELLAR_SECRET_KEY in the environment."
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

# Always ask Cargo to build so its dependency tracking verifies the artifact
# corresponds to the current source instead of silently accepting any old WASM.
echo "Building current release WASM..."
cd "${ROOT_DIR}/contracts/payroll"
cargo build --target wasm32v1-none --release
cd "${ROOT_DIR}"
echo "✓ WASM built: ${WASM_PATH}"

echo ""

# Verify ABI — check that the contract interface includes all required functions
echo "Verifying contract ABI..."
ABI_OUTPUT=$(stellar contract info interface --wasm "${WASM_PATH}" 2>&1)

REQUIRED_FUNCS=(
  "fn initialize("
  "fn pay_salaries("
  "fn next_cycle("
  "fn get_token("
  "fn is_paused("
  "fn get_admin("
  "fn get_cycle("
  "fn get_unpaid_payroll("
  "fn add_employee("
  "fn get_employee("
)

ABI_MISSING=false
for func in "${REQUIRED_FUNCS[@]}"; do
  if ! echo "$ABI_OUTPUT" | grep -q "$func"; then
    echo "  ✗ MISSING: $func"
    ABI_MISSING=true
  else
    echo "  ✓ $func"
  fi
done

# Names alone are insufficient: the incident this check prevents had an
# `initialize` export with one argument instead of two. Count all explicit
# Soroban arguments, including `env`, in the generated Rust interface.
function abi_arg_count() {
  local fn_name="$1"
  local signature
  signature=$(printf '%s\n' "$ABI_OUTPUT" | awk -v needle="fn ${fn_name}(" '
    index($0, needle) { in_signature = 1 }
    in_signature {
      print
      if (index($0, ";")) exit
    }
  ')
  (printf '%s' "$signature" | grep -oE '[a-z_]+: soroban_sdk::' || true) | wc -l | tr -d ' '
}

INITIALIZE_ARGS=$(abi_arg_count "initialize")
PAY_SALARIES_ARGS=$(abi_arg_count "pay_salaries")

if [ "$INITIALIZE_ARGS" != "3" ]; then
  echo "  ✗ initialize ABI mismatch: expected env + admin + token; found ${INITIALIZE_ARGS} arguments"
  ABI_MISSING=true
else
  echo "  ✓ initialize(env, admin, token)"
fi

if [ "$PAY_SALARIES_ARGS" != "1" ]; then
  echo "  ✗ pay_salaries ABI mismatch: expected env only; found ${PAY_SALARIES_ARGS} arguments"
  ABI_MISSING=true
else
  echo "  ✓ pay_salaries(env)"
fi

if [ "$ABI_MISSING" = true ]; then
  echo ""
  echo "Error: Contract ABI is missing required functions. Aborting deployment."
  echo "Check that contracts/payroll/src/lib.rs exports all required public functions."
  exit 1
fi

echo "✓ ABI verification passed — all required functions present"
echo ""

# Deploy
echo "Deploying to ${NETWORK}..."
CONTRACT_ID=$(stellar contract deploy \
  --wasm "${WASM_PATH}" \
  --network "${NETWORK}" \
  --source "${SOURCE}")
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
    --source "${SOURCE}" \
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
