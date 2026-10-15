import { HTTPFacilitatorClient, x402ResourceServer, type RoutesConfig } from "@x402/core/server";
import { ExactEvmScheme } from "@x402/evm/exact/server";

export const BASE_SEPOLIA_NETWORK = "eip155:84532";
export const PROJECT_RISK_PATH = "/api/project-risk";

const DEFAULT_FACILITATOR_URL = "https://x402.org/facilitator";
const DEFAULT_PRICE = "$0.01";

export function getPayTo(): `0x${string}` | null {
  const value = process.env.X402_PAY_TO?.trim();
  return value && /^0x[a-fA-F0-9]{40}$/.test(value)
    ? (value as `0x${string}`)
    : null;
}

export function getProjectRiskRoutes(): RoutesConfig | null {
  const payTo = getPayTo();
  if (!payTo) return null;

  return {
    [PROJECT_RISK_PATH]: {
      accepts: [
        {
          scheme: "exact",
          price: process.env.X402_PRICE?.trim() || DEFAULT_PRICE,
          network: BASE_SEPOLIA_NETWORK,
          payTo,
        },
      ],
      description: "Preliminary project-risk assessment",
      mimeType: "application/json",
    },
  };
}

let resourceServer: x402ResourceServer | null = null;

export function getProjectRiskResourceServer(): x402ResourceServer {
  if (!resourceServer) {
    resourceServer = new x402ResourceServer(
      new HTTPFacilitatorClient({
        url: process.env.X402_FACILITATOR_URL?.trim() || DEFAULT_FACILITATOR_URL,
      }),
    );
    resourceServer.register(BASE_SEPOLIA_NETWORK, new ExactEvmScheme());
  }
  return resourceServer;
}
