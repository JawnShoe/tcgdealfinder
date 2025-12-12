import { query } from "../lib/db";
import { SUPPORTED_MARKETS } from "../lib/markets";

type CardSeed = {
  name: string;
  setName: string;
  cardNumber: string;
  conditionBucket: string;
  searchQuery: string;
  market: string;
};

const baseSeeds: Omit<CardSeed, "market">[] = [
  {
    name: "Umbreon VMAX Alt Art",
    setName: "Evolving Skies",
    cardNumber: "215/203",
    conditionBucket: "raw_nm",
    searchQuery: "Pokemon Umbreon VMAX 215/203 -proxy -lot -bundle",
  },
  {
    name: "Umbreon VMAX Alt Art",
    setName: "Evolving Skies",
    cardNumber: "215/203",
    conditionBucket: "psa_10",
    searchQuery: "Umbreon VMAX 215/203 PSA 10 -proxy -lot -bundle",
    market: "EBAY_US",
  },
  {
    name: "Charizard VMAX",
    setName: "Shining Fates",
    cardNumber: "SV107/SV122",
    conditionBucket: "raw_nm",
    searchQuery: "Pokemon Charizard VMAX SV107/SV122 -proxy -lot -bundle",
    market: "EBAY_US",
  },
  {
    name: "Lugia V Alt Art",
    setName: "Silver Tempest",
    cardNumber: "186/195",
    conditionBucket: "raw_nm",
    searchQuery: "Pokemon Lugia V 186/195 -proxy -lot -bundle",
    market: "EBAY_US",
  },
  {
    name: "Giratina V Alt Art",
    setName: "Lost Origin",
    cardNumber: "186/196",
    conditionBucket: "raw_nm",
    searchQuery: "Pokemon Giratina V 186/196 -proxy -lot -bundle",
    market: "EBAY_US",
  },
];

const seeds: CardSeed[] = baseSeeds.flatMap((seed) =>
  SUPPORTED_MARKETS.map((market) => ({
    ...seed,
    market,
  })),
);

async function upsertCard(seed: CardSeed) {
  const insertResult = await query<{ id: number }>(
    `
    INSERT INTO cards (name, set_name, card_number, condition_bucket)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (name, set_name, card_number, condition_bucket)
    DO UPDATE SET updated_at = NOW()
    RETURNING id;
  `,
    [seed.name, seed.setName, seed.cardNumber, seed.conditionBucket],
  );

  if (insertResult.rowCount && insertResult.rows[0]) {
    return insertResult.rows[0].id;
  }

  const existing = await query<{ id: number }>(
    `
    SELECT id FROM cards
    WHERE name = $1 AND set_name = $2 AND card_number = $3 AND condition_bucket = $4
  `,
    [seed.name, seed.setName, seed.cardNumber, seed.conditionBucket],
  );

  if (!existing.rows[0]) {
    throw new Error(`Failed to find or insert card: ${seed.name}`);
  }

  return existing.rows[0].id;
}

async function addSearchConfig(cardId: number, seed: CardSeed) {
  await query(
    `
    INSERT INTO card_search_config (card_id, search_query, market, is_active)
    VALUES ($1, $2, $3, TRUE)
    ON CONFLICT (card_id, search_query, market) DO NOTHING;
  `,
    [cardId, seed.searchQuery, seed.market],
  );
}

async function main() {
  for (const seed of seeds) {
    const cardId = await upsertCard(seed);
    await addSearchConfig(cardId, seed);
    console.log(`Seeded card: ${seed.name} (${seed.conditionBucket})`);
  }
}

main().catch((err) => {
  console.error("Failed to seed cards:", err);
});
