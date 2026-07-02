import type { NewTopic } from "./db/schema";

export const SEED_TOPICS: Omit<NewTopic, "id" | "createdAt" | "active">[] = [
  {
    name: "LLMs & language models",
    arxivCategories: ["cs.CL", "cs.LG", "cs.AI"],
    keywords: ["language model", "transformer", "RLHF", "reasoning", "chain of thought"],
  },
  {
    name: "Agentic AI & tool use",
    arxivCategories: ["cs.AI", "cs.LG", "cs.CL"],
    keywords: ["agent", "tool use", "planning", "MCP", "function calling"],
  },
  {
    name: "ML systems & inference infra",
    arxivCategories: ["cs.DC", "cs.LG", "cs.PF"],
    keywords: ["inference", "serving", "kv cache", "efficient", "throughput", "latency"],
  },
  {
    name: "Interpretability & alignment",
    arxivCategories: ["cs.LG", "cs.AI"],
    keywords: ["interpretability", "alignment", "safety", "mechanistic", "sae"],
  },
  {
    name: "Quantum computing",
    arxivCategories: ["quant-ph", "cs.ET"],
    keywords: ["qubit", "quantum algorithm", "error correction", "quantum advantage"],
  },
  {
    name: "Robotics",
    arxivCategories: ["cs.RO", "cs.LG"],
    keywords: ["manipulation", "imitation learning", "robot", "policy", "dexterous"],
  },
  {
    name: "Foundation models",
    arxivCategories: ["cs.LG", "cs.CV", "cs.CL"],
    keywords: ["foundation model", "pretraining", "scaling laws", "emergent"],
  },
  {
    name: "World models",
    arxivCategories: ["cs.LG", "cs.AI", "cs.RO"],
    keywords: ["world model", "model-based", "latent dynamics", "video prediction"],
  },
];
