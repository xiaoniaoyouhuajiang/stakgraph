export type ProviderName = "anthropic" | "openai";

export interface Provider {
  name: ProviderName;
  model: string;
  computer_use_model: string;
  api_key_env_var_name: string;
}

const CLAUDE = "claude-sonnet-4-20250514";

export const PROVIDER_MODELS: Record<ProviderName, Provider> = {
  anthropic: {
    name: "anthropic",
    model: CLAUDE,
    computer_use_model: CLAUDE,
    api_key_env_var_name: "ANTHROPIC_API_KEY",
  },
  openai: {
    name: "openai",
    model: "gpt-4o",
    computer_use_model: "computer-use-preview",
    api_key_env_var_name: "OPENAI_API_KEY",
  },
};

export function getProvider(arg?: "anthropic" | "openai"): Provider {
  let provider = PROVIDER_MODELS["openai"];
  if (arg === "anthropic" || process.env.LLM_PROVIDER === "anthropic") {
    provider = PROVIDER_MODELS["anthropic"];
  }
  return provider;
}
