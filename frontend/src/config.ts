// Stellar Testnet configuration — TESTNET ONLY. Never mainnet.
import { Networks } from "@stellar/stellar-sdk";

export const HORIZON_URL = "https://horizon-testnet.stellar.org";
export const NETWORK_PASSPHRASE = Networks.TESTNET;

// Freighter reports its selected network with this label when on testnet.
export const EXPECTED_NETWORK = "TESTNET";

// Friendbot funds new testnet accounts (used by the "fund me" helper).
export const FRIENDBOT_URL = "https://friendbot.stellar.org";

export const EXPLORER_TX = (hash: string) =>
  `https://stellar.expert/explorer/testnet/tx/${hash}`;
