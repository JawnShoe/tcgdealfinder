import { NextResponse, type NextRequest } from "next/server";

import {
  ANON_ID_COOKIE,
  createAnonId,
  isValidAnonId,
  setAnonIdCookie,
} from "../../../lib/anonId";
import {
  deleteWatchlistEntry,
  fetchWatchlistCards,
  upsertWatchlistEntry,
} from "../../../lib/watchlistDb";

function parseCardId(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.floor(value);
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return Math.floor(parsed);
    }
  }
  return null;
}

async function readJsonBody(request: NextRequest): Promise<any> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const cookieAnonId = request.cookies.get(ANON_ID_COOKIE)?.value ?? null;
  const existingAnonId = isValidAnonId(cookieAnonId) ? cookieAnonId : null;
  const ownerId = existingAnonId ?? createAnonId();

  const items = await fetchWatchlistCards(ownerId);
  const response = NextResponse.json({ items });
  if (!existingAnonId) {
    setAnonIdCookie(response, ownerId);
  }
  return response;
}

export async function POST(request: NextRequest) {
  const body = await readJsonBody(request);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const cardId = parseCardId(body.cardId);
  if (!cardId || cardId <= 0) {
    return NextResponse.json(
      { error: "cardId must be a positive integer" },
      { status: 400 }
    );
  }

  const cookieAnonId = request.cookies.get(ANON_ID_COOKIE)?.value ?? null;
  const existingAnonId = isValidAnonId(cookieAnonId) ? cookieAnonId : null;
  const ownerId = existingAnonId ?? createAnonId();

  try {
    await upsertWatchlistEntry(ownerId, cardId);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to add watchlist entry";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const response = NextResponse.json({ ok: true, watched: true });
  if (!existingAnonId) {
    setAnonIdCookie(response, ownerId);
  }
  return response;
}

export async function DELETE(request: NextRequest) {
  const body = await readJsonBody(request);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const cardId = parseCardId(body.cardId);
  if (!cardId || cardId <= 0) {
    return NextResponse.json(
      { error: "cardId must be a positive integer" },
      { status: 400 }
    );
  }

  const cookieAnonId = request.cookies.get(ANON_ID_COOKIE)?.value ?? null;
  const existingAnonId = isValidAnonId(cookieAnonId) ? cookieAnonId : null;
  const ownerId = existingAnonId ?? createAnonId();

  try {
    await deleteWatchlistEntry(ownerId, cardId);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to remove watchlist entry";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const response = NextResponse.json({ ok: true, watched: false });
  if (!existingAnonId) {
    setAnonIdCookie(response, ownerId);
  }
  return response;
}
