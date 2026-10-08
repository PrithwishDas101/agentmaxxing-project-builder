# AgentMaxxing Project Builder

A practical AI agent that turns software ideas into structured, actionable development plans.

Built for Week 1 of the AgentMaxxing program, this project uses Google Gemini's tool/function-calling capabilities to demonstrate a real agent loop: the model receives a request, decides whether a tool is useful, calls it with structured arguments, receives the result, and then produces the final response.

## Live Demo

**[Open the live agent](https://agentmaxxing-project-builder.vercel.app)**

## What It Does

Give the agent a software idea and it can turn it into a development roadmap covering:

- Planning and project setup
- Core development
- Features and user experience
- Testing and refinement
- Deployment

For example:

> "I want to build a MERN attendance tracker for college students."

The agent can call the custom `create_project_plan` tool, provide the project idea and experience level, receive a structured plan, and then turn that tool result into a useful response.

If the request is too vague, the agent can ask for clarification instead of blindly generating a plan.

## Custom Tool

The main custom tool is:

### `create_project_plan`

This tool accepts:

- `idea` — the user's software project idea
- `experience_level` — beginner, intermediate, advanced, etc.

It returns a structured plan with:

- Recommended development approach
- Project phases
- Actionable tasks for each phase

The tool itself provides the reusable planning structure, while Gemini uses the tool result and the conversation context to produce the final, user-facing plan.

## Other Tools

The project also retains the tools provided by the AgentMaxxing starter template:

| Tool | Purpose |
| :--- | :--- |
| `get_weather` | Calls the mock paid weather API using the agent wallet |
| `get_my_wallet` | Reads the agent wallet address and Base Sepolia balance |
| `roll_dice` | Demonstrates a simple non-API tool |
| `create_project_plan` | Creates a structured software development plan |

## How the Agent Works

The core loop lives in `agent/agent.ts`.

1. The user's conversation history and available tools are sent to Gemini.
2. Gemini decides whether it needs a tool.
3. If it requests a tool, the agent finds the matching function and executes it.
4. The tool result is sent back to Gemini as a function response.
5. Gemini uses that result to produce the final answer.
6. The loop can repeat until Gemini returns a normal text response.
7. A five-step limit prevents runaway tool calls.

Conceptually:

```text
User
  ↓
Gemini + Tool Definitions
  ↓
Tool Call? ── No ──→ Final Answer
  │
 Yes
  ↓
Run Tool
  ↓
Tool Result
  ↓
Gemini
  ↓
Final Answer / Another Tool Call
```

## Project Structure

| Path | Purpose |
| :--- | :--- |
| `agent/agent.ts` | Gemini agent loop, system prompt, tool execution |
| `agent/tools.ts` | Tool definitions and implementations |
| `agent/wallet.ts` | Agent wallet and payment helpers |
| `app/page.tsx` | Chat interface and setup UI |
| `app/api/agent/route.ts` | API route that runs the agent |
| `app/api/wallet/route.ts` | Wallet creation and wallet information |
| `app/api/weather/route.ts` | Mock paid weather API |
| `components/ui/` | UI components |
| `.env.example` | Example environment configuration |

## Tech Stack

- **Next.js** — application and API routes
- **React** — user interface
- **TypeScript** — application and agent logic
- **Google Gen AI SDK** — Gemini model and function calling
- **Tailwind CSS** — styling
- **shadcn/ui** — UI components
- **viem** — wallet creation, signing, and Base Sepolia interaction
- **Vercel** — production deployment

## Getting Started

### Prerequisites

- Node.js 20+
- A Gemini API key from Google AI Studio

### 1. Clone the repository

```bash
git clone https://github.com/PrithwishDas101/agentmaxxing-project-builder.git
cd agentmaxxing-project-builder
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file in the project root:

```env
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=your_preferred_gemini_model
WALLET_PRIVATE_KEY=
```

Keep secrets out of Git. Never commit your Gemini API key or wallet private key.

### 4. Start the development server

```bash
npm run dev
```

Open **http://localhost:3000**.

### 5. Try the agent

Useful prompts:

```text
What is an AI agent?
```

```text
Roll a 20 sided dice.
```

```text
Create a project plan for a MERN attendance tracker for college students.
```

The third prompt should trigger `create_project_plan` and show the tool call in the interface.

## Environment Variables

| Variable | Required | Purpose |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | Yes | Authenticates requests to Gemini |
| `GEMINI_MODEL` | No | Selects the Gemini model; the application has a fallback model |
| `WALLET_PRIVATE_KEY` | No | Uses an existing test wallet instead of the generated wallet |

For local development, the wallet can also be generated through the application's setup interface.

## Agent Wallet and Payments

The starter project includes an agent wallet and a mock paid weather API to demonstrate the x402-style payment flow.

The weather flow is:

1. The agent requests the weather endpoint.
2. The endpoint requires payment.
3. The wallet signs the payment message.
4. The request is retried with the payment information.
5. The mock API verifies the payment and returns the weather data.

The payment demonstration uses test data and does not submit real funds to a blockchain.

**Security:** only use the generated wallet for testing. Never send real funds to it and never expose its private key.

## What I Learned

This project was my first hands-on implementation of an agentic workflow.

The main things I experimented with were:

- How an AI agent differs from a normal chatbot
- Gemini function/tool calling
- Designing tool descriptions so the model knows when to use a tool
- Passing structured arguments from Gemini into TypeScript functions
- Returning tool results to the model for a final response
- Writing a system prompt that gives the agent a specific role
- Building a custom software-planning tool instead of relying only on the starter tools
- Understanding the relationship between the model, tools, execution loop, and final response
- Deploying the agent to Vercel and connecting the GitHub repository for automatic deployments

## Week 1 Build

**Project:** Personal AI Project Builder Agent

**Goal:** Turn a software idea into a practical development plan using an AI agent with tool calling.

**Meaningful customization:** Added `create_project_plan` and redesigned the system prompt around software project planning.

**Deployment:** Vercel

**Repository:** [GitHub](https://github.com/PrithwishDas101/agentmaxxing-project-builder)

## License

MIT
