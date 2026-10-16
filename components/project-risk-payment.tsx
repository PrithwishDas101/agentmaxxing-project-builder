"use client";

import { useEffect, useState } from "react";
import { Check, ExternalLink, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { x402Client } from "@x402/core/client";
import { registerExactEvmScheme } from "@x402/evm/exact/client";
import type { ClientEvmSigner } from "@x402/evm";
import { decodePaymentResponseHeader, wrapFetchWithPayment } from "@x402/fetch";
import type { Address, EIP1193Provider } from "viem";

declare global {
  interface Window {
    ethereum?: EIP1193Provider;
  }
}

const BASE_SEPOLIA_ID = 84532;
const BASE_SEPOLIA_HEX = "0x14a34";

type Risk = { area: string; risk: string; detail: string; mitigation: string };
type RiskReport = {
  project: string;
  assessmentType: string;
  risks: Risk[];
  note?: string;
};
type Settlement = { txHash: string | null };

export function ProjectRiskPayment() {
  const [address, setAddress] = useState<Address | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [project, setProject] = useState("MERN attendance tracker for college students");
  const [connecting, setConnecting] = useState(false);
  const [paying, setPaying] = useState(false);
  const [report, setReport] = useState<RiskReport | null>(null);
  const [settlement, setSettlement] = useState<Settlement | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const provider = window.ethereum;
    if (!provider) return;
    let active = true;
    const sync = async () => {
      try {
        const accounts = await provider.request({ method: "eth_accounts" }) as Address[];
        const chain = await provider.request({ method: "eth_chainId" }) as string;
        if (active) {
          setAddress(accounts[0] ?? null);
          setChainId(Number.parseInt(chain, 16));
        }
      } catch {
        // Keep the wallet disconnected if the provider is unavailable.
      }
    };
    const onAccountsChanged = (accounts: Address[]) => setAddress(accounts[0] ?? null);
    const onChainChanged = (chain: string) => setChainId(Number.parseInt(chain, 16));
    provider.on("accountsChanged", onAccountsChanged);
    provider.on("chainChanged", onChainChanged);
    void sync();
    return () => {
      active = false;
      provider.removeListener("accountsChanged", onAccountsChanged);
      provider.removeListener("chainChanged", onChainChanged);
    };
  }, []);

  async function connectWallet() {
    const provider = window.ethereum;
    if (!provider) {
      setError("MetaMask was not detected. Install or enable a browser wallet first.");
      return;
    }
    setConnecting(true);
    setError(null);
    try {
      const accounts = await provider.request({ method: "eth_requestAccounts" }) as Address[];
      const chain = await provider.request({ method: "eth_chainId" }) as string;
      setAddress(accounts[0] ?? null);
      setChainId(Number.parseInt(chain, 16));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not connect wallet.");
    } finally {
      setConnecting(false);
    }
  }

  async function switchNetwork() {
    const provider = window.ethereum;
    if (!provider) return;
    try {
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: BASE_SEPOLIA_HEX }],
      });
      const chain = await provider.request({ method: "eth_chainId" }) as string;
      setChainId(Number.parseInt(chain, 16));
      setError(null);
    } catch {
      setError("Switch MetaMask to Base Sepolia (chain ID 84532), then try again.");
    }
  }

  async function assessProject() {
    if (!address || chainId !== BASE_SEPOLIA_ID || !project.trim() || paying) return;
    const provider = window.ethereum;
    if (!provider) return;
    setPaying(true);
    setError(null);
    setReport(null);
    setSettlement(null);

    try {
      const signer: ClientEvmSigner = {
        address,
        async signTypedData(message) {
          return await provider.request({
            method: "eth_signTypedData_v4",
            params: [
              address,
              JSON.stringify(
                {
                  domain: message.domain,
                  types: message.types,
                  primaryType: message.primaryType,
                  message: message.message,
                },
                (_key, value) => typeof value === "bigint" ? value.toString() : value,
              ),
            ],
          }) as `0x${string}`;
        },
      };

      const client = new x402Client();
      registerExactEvmScheme(client, { signer, networks: ["eip155:84532"] });
      client.setSpendControls({ maxAmountPerPayment: "$0.01" });
      const fetchWithPayment = wrapFetchWithPayment(fetch, client);
      const response = await fetchWithPayment(
        `/api/project-risk?project=${encodeURIComponent(project.trim())}`,
      );
      const body = await response.json().catch(() => null) as any;
      if (!response.ok) {
        // x402 may return another 402 after the wallet signature if the facilitator
        // rejects or cannot settle the authorization. Preserve its diagnostic body
        // instead of incorrectly blaming the user's token balance.
        const details =
          (typeof body?.error === "string" && body.error) ||
          (typeof body?.message === "string" && body.message) ||
          (typeof body?.errorReason === "string" && body.errorReason) ||
          (typeof body?.errorMessage === "string" && body.errorMessage) ||
          (typeof body?.details === "string" && body.details) ||
          (typeof body?.code === "string" && body.code) ||
          (body ? JSON.stringify(body) : "");
        if (response.status === 402) {
          throw new Error(
            details
              ? `x402 payment was not settled (HTTP 402): ${details}`
              : "x402 payment was not settled (HTTP 402). Your wallet has enough test USDC; check the facilitator response and payment requirements before retrying.",
          );
        }
        throw new Error(
          details || `Request failed with status ${response.status}.`,
        );
      }

      const header = response.headers.get("PAYMENT-RESPONSE") || response.headers.get("X-PAYMENT-RESPONSE");
      let txHash: string | null = null;
      if (header) {
        const decoded = decodePaymentResponseHeader(header);
        if (!decoded.success) {
          throw new Error(decoded.errorMessage || decoded.errorReason || "The facilitator did not confirm settlement.");
        }
        txHash = decoded.transaction || null;
      }
      setReport(body as RiskReport);
      setSettlement({ txHash });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed. Please try again.");
    } finally {
      setPaying(false);
    }
  }

  const onBaseSepolia = address !== null && chainId === BASE_SEPOLIA_ID;

  return (
    <Card>
      <CardHeader>
        <p className="font-mono text-xs font-medium tracking-[0.06em] uppercase">
          <span className="text-primary">04</span>
          <span className="ml-3 text-muted-foreground">Paid project-risk report</span>
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">
          Connect MetaMask and pay through x402 to request a preliminary risk report. Base Sepolia test USDC only.
        </p>
        <div className="flex flex-col gap-2">
          <label htmlFor="risk-project" className="text-xs font-medium uppercase text-muted-foreground">Project</label>
          <Input id="risk-project" value={project} onChange={(event) => setProject(event.target.value)} placeholder="Describe your project" />
        </div>
        {!address ? (
          <Button className="w-fit font-mono uppercase" onClick={connectWallet} disabled={connecting}>
            <Wallet /> {connecting ? "Connecting..." : "Connect MetaMask"}
          </Button>
        ) : !onBaseSepolia ? (
          <Button variant="outline" className="w-fit font-mono uppercase" onClick={switchNetwork}>
            Switch to Base Sepolia
          </Button>
        ) : (
          <Button className="w-fit font-mono uppercase" onClick={assessProject} disabled={paying || !project.trim()}>
            {paying ? "Paying & assessing..." : "Pay $0.01 test USDC"}
          </Button>
        )}
        {address && <p className="break-all font-mono text-xs text-muted-foreground">Wallet: {address}</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}
        {report && (
          <div className="flex flex-col gap-3 border-t pt-3">
            <p className="flex items-center gap-2 text-sm font-medium text-primary"><Check className="size-4" /> Report returned after x402 payment</p>
            <p className="font-medium">{report.project}</p>
            {report.risks?.map((risk) => (
              <div key={risk.area} className="border p-3">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <p className="font-medium">{risk.area}</p>
                  <span className={cn("font-mono text-xs uppercase", risk.risk === "High" ? "text-destructive" : "text-muted-foreground")}>{risk.risk}</span>
                </div>
                <p className="text-sm text-muted-foreground">{risk.detail}</p>
                <p className="mt-2 text-sm"><strong>Mitigation:</strong> {risk.mitigation}</p>
              </div>
            ))}
            {report.note && <p className="text-xs text-muted-foreground">{report.note}</p>}
            {settlement?.txHash ? (
              <a className="flex w-fit items-center gap-1 text-xs text-primary underline underline-offset-4" href={`https://sepolia.basescan.org/tx/${settlement.txHash}`} target="_blank" rel="noreferrer">
                View settlement on BaseScan <ExternalLink className="size-3" />
              </a>
            ) : (
              <p className="text-xs text-muted-foreground">The report was returned, but no settlement hash was included in the response.</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
