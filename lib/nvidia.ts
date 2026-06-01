import { getEnv } from "./env";
export const NVIDIA_ALLOWED_MODELS = [
  "meta/llama-4-maverick-17b-128e-instruct",
  "minimaxai/minimax-m2.7",
  "stepfun-ai/step-3.7-flash",
  "mistralai/mistral-nemotron",
  "mistralai/mistral-large-3-675b-instruct-2512",
  "bytedance/seed-oss-36b-instruct",
  "z-ai/glm-5.1"
] as const;

export type NvidiaAllowedModel = (typeof NVIDIA_ALLOWED_MODELS)[number];

export function isAllowedNvidiaModel(model: string): model is NvidiaAllowedModel {
  return (NVIDIA_ALLOWED_MODELS as readonly string[]).includes(model);
}

/** Default model used when no explicit model is requested */
export const DEFAULT_MODEL: NvidiaAllowedModel = "z-ai/glm-5.1";

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
