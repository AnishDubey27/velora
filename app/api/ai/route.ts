import { NextResponse } from "next/server";
import { resolveNvidiaModel } from "@/lib/nvidia";

const NVIDIA_API_URL =
  process.env.NVIDIA_API_URL ?? "https://integrate.api.nvidia.com/v1/chat/completions";

function getApiKey() {
  return process.env.NVIDIA_API_KEY ?? "";
}

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export async function POST(request: Request) {
  const apiKey = getApiKey();
  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing NVIDIA_API_KEY." },
      { status: 500 }
    );
  }

  let payload: any;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const model = (() => {
    try {
      return resolveNvidiaModel(payload?.model);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Invalid model." },
        { status: 400 }
      );
    }
  })();
  if (model instanceof NextResponse) return model;

  const messages = Array.isArray(payload?.messages) ? (payload.messages as ChatMessage[]) : null;
  if (!messages || messages.length === 0) {
    return NextResponse.json({ error: "messages[] is required." }, { status: 400 });
  }

  try {
    const res = await fetch(NVIDIA_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: typeof payload?.temperature === "number" ? payload.temperature : 0.2,
        max_tokens: typeof payload?.max_tokens === "number" ? payload.max_tokens : 800,
        stream: false,
      }),
    });

    const text = await res.text();
    let data: any = null;
    try {
      data = JSON.parse(text);
    } catch {
      // pass through raw text
    }

    if (!res.ok) {
      return NextResponse.json(
        { error: "NVIDIA request failed.", status: res.status, details: data ?? text },
        { status: 502 }
      );
    }

    return NextResponse.json(data ?? { raw: text });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Request failed." },
      { status: 502 }
    );
  }
}
