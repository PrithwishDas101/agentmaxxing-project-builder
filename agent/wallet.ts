/**
 * THE AGENT'S WALLET
 *
 * The agent owns a wallet (a private key). It uses it to sign payments,
 * so it can pay for APIs on its own. This is the "x402" idea:
 *
 *   1. Agent calls an API         ->  API answers "402 Payment Required" + a price
 *   2. Agent signs a payment      ->  with its wallet
 *   3. Agent retries with payment ->  API checks the signature and answers 200 OK
 *
 * You create the wallet with the "Create wallet" button on the page.
 * It is saved in `.agent-wallet.json` so it survives restarts.
 *
 * Payments here are signed but NOT sent on-chain (it's a demo, no real money).
 */
import fs from "fs";
import path from "path";
import { createPublicClient, formatEther, http, verifyMessage, type Address, type Hex } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";

const WALLET_FILE = path.join(process.cwd(), ".agent-wallet.json");
const chain = createPublicClient({ chain: baseSepolia, transport: http() });

export type Payment = { from: Address; to: Address; amount: string; asset: string; resource: string; nonce: string };

/** The wallet from .env or .agent-wallet.json, or null if none was created yet. */
function loadAccount() {
  const key = process.env.WALLET_PRIVATE_KEY || (fs.existsSync(WALLET_FILE) && JSON.parse(fs.readFileSync(WALLET_FILE, "utf8")).privateKey);
  return key ? privateKeyToAccount(key as Hex) : null;
}

function requireAccount() {
  const account = loadAccount();
  if (!account) throw new Error("The agent has no wallet yet. Ask the user to click 'Create wallet' first.");
  return account;
}

/** Make a brand new wallet and save it. */
export function createWallet() {
  if (loadAccount()) return getWalletAddress();
  const privateKey = generatePrivateKey();
  fs.writeFileSync(WALLET_FILE, JSON.stringify({ privateKey }, null, 2));
  return privateKeyToAccount(privateKey).address;
}

export function getWalletAddress() {
  return loadAccount()?.address ?? null;
}

export async function getWalletBalance() {
  const wei = await chain.getBalance({ address: requireAccount().address });
  return `${formatEther(wei)} ETH`;
}

/** Fetch a URL. If it asks for payment (402), sign one with the wallet and try again. */
export async function payAndFetch(url: string) {
  const first = await fetch(url);
  if (first.status !== 402) return { data: await first.json() };

  const account = requireAccount();
  const { price, asset, payTo } = await first.json();
  const payment: Payment = {
    from: account.address,
    to: payTo,
    amount: price,
    asset,
    resource: new URL(url).pathname,
    nonce: crypto.randomUUID(),
  };
  const signature = await account.signMessage({ message: JSON.stringify(payment) });
  const header = Buffer.from(JSON.stringify({ payment, signature })).toString("base64");

  const paid = await fetch(url, { headers: { "X-PAYMENT": header } });
  return {
    data: await paid.json(),
    payment: { status: paid.status, amount: `${price} ${asset}`, to: payTo, signature: `${signature.slice(0, 18)}...` },
  };
}

/** Verify a signed demo payment and require it to come from the configured agent wallet. */
export async function verifyPayment(header: string | null) {
  if (!header) return null;

  try {
    const { payment, signature } = JSON.parse(
      Buffer.from(header, "base64").toString(),
    ) as {
      payment: Payment;
      signature: Hex;
    };

    if (!payment || !signature || !payment.from || !payment.to) return null;

    const account = loadAccount();
    if (!account || payment.from.toLowerCase() !== account.address.toLowerCase()) {
      return null;
    }

    const valid = await verifyMessage({
      address: account.address,
      message: JSON.stringify(payment),
      signature,
    });

    return valid ? payment : null;
  } catch {
    return null;
  }
}


/**
 * Call an x402-protected endpoint with the agent's wallet.
 * The wallet signs an EIP-712 authorization; the official facilitator
 * handles verification and settlement on Base Sepolia.
 */
export async function payAndFetchX402(url: string) {
  const account = requireAccount();
  const { x402Client } = await import("@x402/core/client");
  const { registerExactEvmScheme } = await import("@x402/evm/exact/client");
  const { wrapFetchWithPayment, decodePaymentResponseHeader } = await import("@x402/fetch");
  const client = new x402Client();

  registerExactEvmScheme(client, {
    signer: {
      address: account.address,
      async signTypedData(message) {
        return account.signTypedData(message as any);
      },
    },
    networks: ["eip155:84532"],
  });
  client.setSpendControls({ maxAmountPerPayment: process.env.X402_PRICE?.trim() || "$0.01" });

  const fetchWithPayment = wrapFetchWithPayment(fetch, client);
  const response = await fetchWithPayment(url);
  const data = await response.json().catch(() => null) as unknown;

  if (!response.ok) {
    return {
      error: "The x402 project-risk request failed.",
      status: response.status,
      details: data,
    };
  }

  const header = response.headers.get("PAYMENT-RESPONSE") || response.headers.get("X-PAYMENT-RESPONSE");
  let settlement: { success?: boolean; transaction?: string; network?: string } | null = null;
  if (header) {
    try {
      settlement = decodePaymentResponseHeader(header) as typeof settlement;
    } catch {
      settlement = null;
    }
  }

  return {
    data,
    payment: {
      status: settlement?.success ? "settled" : "accepted",
      protocol: "x402",
      network: "Base Sepolia",
      transaction: settlement?.transaction ?? null,
      explorer: settlement?.transaction
        ? `https://sepolia.basescan.org/tx/${settlement.transaction}`
        : null,
    },
  };
}
