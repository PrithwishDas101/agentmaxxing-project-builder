import { NextRequest, NextResponse } from "next/server";
import { withX402 } from "@x402/next";
import { getProjectRiskRoutes, getProjectRiskResourceServer } from "@/lib/x402-server";

export const dynamic = "force-dynamic";

async function reportHandler(request: NextRequest) {
  const project = request.nextUrl.searchParams.get("project")?.trim();
  if (!project) {
    return NextResponse.json(
      { error: "Missing project name. Provide a project query parameter." },
      { status: 400 },
    );
  }

  return NextResponse.json({
    project,
    assessmentType: "Preliminary project risk assessment",
    risks: [
      {
        area: "Scope",
        risk: "High",
        detail: "Adding too many features to the first release could delay delivery.",
        mitigation: "Define a small MVP and prioritize essential functionality.",
      },
      {
        area: "Security",
        risk: "Medium",
        detail: "Poor input validation or exposed credentials could compromise the application.",
        mitigation: "Validate inputs, protect secrets, and review authentication and authorization.",
      },
      {
        area: "Reliability",
        risk: "Medium",
        detail: "External API failures or unexpected responses could interrupt core features.",
        mitigation: "Add error handling, timeouts, and tests for failure scenarios.",
      },
    ],
    note: "This is a preliminary template-based assessment, not a source-code audit.",
    payment: { verified: true, protocol: "x402", network: "Base Sepolia" },
  });
}

function notConfigured() {
  return NextResponse.json(
    {
      code: "not_configured",
      error: "x402 payments are not configured. Set X402_PAY_TO to a Base Sepolia receiving address you control.",
    },
    { status: 503 },
  );
}

let cachedGet: ((request: NextRequest) => Promise<Response>) | null = null;

export async function GET(request: NextRequest) {
  const routes = getProjectRiskRoutes();
  if (!routes) {
    cachedGet = null;
    return notConfigured();
  }

  cachedGet ??= withX402(reportHandler, routes, getProjectRiskResourceServer());
  return cachedGet(request);
}
