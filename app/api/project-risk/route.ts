import { verifyPayment } from "@/agent/wallet";

const PRICE = "0.01";
const ASSET = "USDC";
const PAY_TO = "0x000000000000000000000000000000000000dEaD";

export async function GET(req: Request) {
  const project = new URL(req.url).searchParams.get("project")?.trim();

  if (!project) {
    return Response.json(
      { error: "Missing project name. Provide a project query parameter." },
      { status: 400 },
    );
  }

  const payment = await verifyPayment(req.headers.get("X-PAYMENT"));

  if (
    !payment ||
    payment.to !== PAY_TO ||
    Number(payment.amount) < Number(PRICE) ||
    payment.asset !== ASSET
  ) {
    return Response.json(
      {
        error: "Payment Required",
        price: PRICE,
        asset: ASSET,
        payTo: PAY_TO,
      },
      { status: 402 },
    );
  }

  return Response.json({
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
    paidBy: payment.from,
    payment: {
      amount: `${PRICE} ${ASSET}`,
      verified: true,
      settlement: "Signed demo payment; no on-chain transfer",
    },
  });
}
