import { getEnv } from "./env";
export const NVIDIA_ALLOWED_MODELS = [
  "stepfun-ai/step-3.7-flash",
  "meta/llama-3.3-70b-instruct",
  "meta/llama-3.1-8b-instruct",
  "mistralai/mistral-nemotron",
  "mistralai/mistral-large-2-instruct",
  "google/gemma-2-27b-it"
] as const;

export type NvidiaAllowedModel = (typeof NVIDIA_ALLOWED_MODELS)[number];

export function isAllowedNvidiaModel(model: string): model is NvidiaAllowedModel {
  return (NVIDIA_ALLOWED_MODELS as readonly string[]).includes(model);
}

/** Default model used when no explicit model is requested */
export const DEFAULT_MODEL: NvidiaAllowedModel = "stepfun-ai/step-3.7-flash";

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
