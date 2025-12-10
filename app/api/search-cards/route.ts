
import { NextResponse } from "next/server";

import { searchCards } from "../../../lib/cards";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") ?? "").trim();

  if (query.length < 2) {
    return NextResponse.json([]);
  }

  try {
    const results = await searchCards(query, 10);
    const payload = results.map((card) => ({
      id: card.id,
      name: card.name,
      setName: card.setName,
      cardNumber: card.cardNumber,
    }));
    return NextResponse.json(payload);
  } catch (error) {
    console.error("search-cards error", error);
    return NextResponse.json([], { status: 500 });
  }
}
