/**
 * YOUR AGENT'S TOOLS
 *
 * A tool is just a function the agent is allowed to call.
 * Gemini reads the `description` to decide WHEN to use it,
 * and `parameters` to know WHAT to pass in.
 *
 * Add your own tool: copy one of the objects below, change it,
 * and save. It shows up in the "Tools" list on the page.
 */
import { getWalletAddress, getWalletBalance, payAndFetch } from "./wallet";

export type Tool = {
  name: string;
  description: string;
  /** JSON Schema describing the inputs. */
  parameters: object;
  /** The code that runs when the agent calls this tool. */
  run: (args: any, ctx: { baseUrl: string }) => Promise<unknown>;
};

export const tools: Tool[] = [
  // ─── 1. A paid API: the agent's wallet signs a payment to unlock it ───
  {
    name: "get_weather",
    description:
      "Get the current weather for a city. Costs 0.01 USDC, paid automatically from the agent's wallet.",
    parameters: {
      type: "object",
      properties: {
        city: { type: "string", description: "City name, e.g. Mumbai" },
      },
      required: ["city"],
    },
    run: async ({ city }, { baseUrl }) => {
      return payAndFetch(
        `${baseUrl}/api/weather?city=${encodeURIComponent(city)}`,
      );
    },
  },

  // ─── 2. Wallet tool: read the agent's own wallet ───
  {
    name: "get_my_wallet",
    description:
      "Get the agent's own wallet address and its ETH balance on Base Sepolia (testnet).",
    parameters: { type: "object", properties: {} },
    run: async () => ({
      address: getWalletAddress(),
      balance: await getWalletBalance(),
      network: "Base Sepolia (testnet)",
    }),
  },

  // ─── 3. A plain tool: no wallet, no API. Try changing this one first! ───
  {
    name: "roll_dice",
    description: "Roll a dice with the given number of sides.",
    parameters: {
      type: "object",
      properties: {
        sides: {
          type: "number",
          description: "How many sides the dice has. Default 6.",
        },
      },
    },
    run: async ({ sides = 6 }) => ({
      rolled: Math.floor(Math.random() * sides) + 1,
      sides,
    }),
  },

  {
    name: "create_project_plan",
    description:
      "Create a practical software development plan from a project idea. Use this when the user wants to plan, organize, or break down a software project into features, milestones, and actionable development tasks.",
    parameters: {
      type: "object",
      properties: {
        idea: {
          type: "string",
          description: "The software project idea provided by the user.",
        },
        experience_level: {
          type: "string",
          description:
            "The user's experience level, such as beginner, intermediate, or advanced. Default is beginner.",
        },
      },
      required: ["idea"],
    },
    run: async ({ idea, experience_level = "beginner" }) => {
      const isBeginner = experience_level.toLowerCase() === "beginner";

      return {
        project: idea,
        experienceLevel: experience_level,

        recommendedApproach: isBeginner
          ? "Start with a small MVP, build the core functionality first, then add advanced features."
          : "Build the core architecture first, then expand with advanced features and optimization.",

        phases: [
          {
            name: "Planning & Setup",
            tasks: [
              "Define the project's main goal",
              "Identify the minimum viable features",
              "Choose an appropriate technology stack",
              "Create the Git repository and project structure",
            ],
          },
          {
            name: "Core Development",
            tasks: [
              "Design the application's main components",
              "Implement the core functionality",
              "Set up required APIs and database models",
              "Connect the frontend and backend",
            ],
          },
          {
            name: "Features & User Experience",
            tasks: [
              "Build the main user-facing features",
              "Add validation and error handling",
              "Improve the interface and user experience",
              "Test important user flows",
            ],
          },
          {
            name: "Testing & Refinement",
            tasks: [
              "Test the core functionality",
              "Fix bugs and edge cases",
              "Improve performance and reliability",
              "Clean up the codebase",
            ],
          },
          {
            name: "Deployment",
            tasks: [
              "Configure production environment variables",
              "Deploy the application",
              "Test the deployed version",
              "Document setup and usage instructions",
            ],
          },
        ],
      };
    },
  },
];
