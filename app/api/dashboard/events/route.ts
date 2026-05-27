export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { getEnv } from "@/lib/env";

const FINNHUB_KEY = getEnv('FINNHUB_API_KEY');

function toNumber(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function toDateString(date: Date) {
  return date.toISOString().slice(0, 10);
}

async function fetchJson(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  const text = await res.text();
  let data: any = null;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  if (!res.ok) {
    throw new Error(`Request failed (${res.status}): ${typeof data === "string" ? data : "JSON"}`);
  }
  return data;
}

export async function GET() {
  if (!FINNHUB_KEY) {
    return NextResponse.json({ error: "FINNHUB_API_KEY not configured." }, { status: 500 });
  }

  const now = new Date();
  const from = toDateString(now);
  const to = toDateString(new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000));

  const asOf = new Date().toISOString();

  try {
    const [economicRaw, earningsRaw] = await Promise.all([
      fetchJson(
        `https://finnhub.io/api/v1/calendar/economic?from=${from}&to=${to}&token=${encodeURIComponent(
          FINNHUB_KEY
        )}`,
        { cache: "no-store" }
      ).catch(() => ({ economicCalendar: [] })),
      fetchJson(
        `https://finnhub.io/api/v1/calendar/earnings?from=${from}&to=${to}&international=false&token=${encodeURIComponent(
          FINNHUB_KEY
        )}`,
        { cache: "no-store" }
      ).catch(() => ({ earningsCalendar: [] })),
    ]);

    const economic = (economicRaw?.economicCalendar ?? [])
      .map((e: any) => ({
        time: typeof e?.time === "string" ? e.time : null,
        event: typeof e?.event === "string" ? e.event : null,
        country: typeof e?.country === "string" ? e.country : null,
        impact: typeof e?.impact === "string" ? e.impact : null,
        estimate: toNumber(e?.estimate),
        prev: toNumber(e?.prev),
        actual: toNumber(e?.actual),
        unit: typeof e?.unit === "string" ? e.unit : null,
      }))
      .filter((e: any) => !!e.event && !!e.time)
      .sort((a: any, b: any) => (a.time < b.time ? -1 : a.time > b.time ? 1 : 0))
      .slice(0, 8);

    const earnings = (earningsRaw?.earningsCalendar ?? [])
      .map((e: any) => ({
        date: typeof e?.date === "string" ? e.date : null,
        symbol: typeof e?.symbol === "string" ? e.symbol : null,
        hour: typeof e?.hour === "string" ? e.hour : null,
        epsEstimate: toNumber(e?.epsEstimate),
        revenueEstimate: toNumber(e?.revenueEstimate),
        year: typeof e?.year === "number" ? e.year : null,
        quarter: typeof e?.quarter === "number" ? e.quarter : null,
      }))
      .filter((e: any) => !!e.symbol && !!e.date)
      .sort((a: any, b: any) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
      .slice(0, 8);

    return NextResponse.json({ asOf, range: { from, to }, economic, earnings });
  } catch (error) {
    return NextResponse.json(
      { asOf, range: { from, to }, economic: [], earnings: [], error: error instanceof Error ? error.message : "Failed to load events." },
      { status: 502 }
    );
  }
}

