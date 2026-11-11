import { getEnv } from "./env";

export const NVIDIA_API_URL =
  getEnv('NVIDIA_API_URL') ?? "https://integrate.api.nvidia.com/v1/chat/completions";

export const NVIDIA_ALLOWED_MODELS = [
  "nvidia/nemotron-3-ultra-550b-a55b",
  "nvidia/nemotron-3.5-lightning-30b-a3b"
] as const;

export type NvidiaAllowedModel = (typeof NVIDIA_ALLOWED_MODELS)[number];

export function isAllowedNvidiaModel(model: string): model is NvidiaAllowedModel {
  return (NVIDIA_ALLOWED_MODELS as readonly string[]).includes(model);
}

/** Default model used when no explicit model is requested */
export const DEFAULT_MODEL: NvidiaAllowedModel = "nvidia/nemotron-3-ultra-550b-a55b";

export function resolveNvidiaModel(requested: unknown) {
  const fromRequest = typeof requested === "string" ? requested : undefined;
  const fromEnv = getEnv('NVIDIA_DEFAULT_MODEL');

  const candidate = fromRequest ?? fromEnv ?? DEFAULT_MODEL;

  if (!isAllowedNvidiaModel(candidate)) {
    throw new Error(
      `Model not allowed. Allowed: ${NVIDIA_ALLOWED_MODELS.join(", ")}`
    );
  }
  return candidate;
}
