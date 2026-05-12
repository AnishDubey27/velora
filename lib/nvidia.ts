export const NVIDIA_ALLOWED_MODELS = [
  "google/gemma-3n-e4b-it",
  "google/gemma-3n-e2b-it",
  "mistralai/mistral-nemotron",
  "meta/llama-4-maverick-17b-128e-instruct",
  "nvidia/nemotron-mini-4b-instruct",
  "mistralai/mistral-large-3-675b-instruct-2512",
  "google/gemma-3-27b-it",
  "stepfun-ai/step-3.5-flash",
] as const;

export type NvidiaAllowedModel = (typeof NVIDIA_ALLOWED_MODELS)[number];

export function isAllowedNvidiaModel(model: string): model is NvidiaAllowedModel {
  return (NVIDIA_ALLOWED_MODELS as readonly string[]).includes(model);
}

export function resolveNvidiaModel(requested: unknown) {
  const fromRequest = typeof requested === "string" ? requested : undefined;
  const fromEnv = process.env.NVIDIA_DEFAULT_MODEL;

  const candidate = fromRequest ?? fromEnv ?? NVIDIA_ALLOWED_MODELS[0];
  if (!isAllowedNvidiaModel(candidate)) {
    throw new Error(
      `Model not allowed. Allowed: ${NVIDIA_ALLOWED_MODELS.join(", ")}`
    );
  }
  return candidate;
}

