import "dotenv/config";

import { query } from "../lib/db";

const API_BASE = "https://api.pokemontcg.io/v2";
const IMPORT_DELAY_MS = 500; // Rate limiting (increased for slow API)
const MAX_RETRIES = 5;
const INITIAL_RETRY_DELAY_MS = 2000;
const BATCH_COMMIT_SIZE = 50; // Commit progress every N cards
const EMPTY_SET_RETRY = true; // Retry sets that have 0 cards

type PokemonTCGSet = {
  id: string;
  name: string;
  series: string;
  printedTotal?: number;
  total: number;
  ptcgoCode?: string;
  releaseDate: string;
  updatedAt: string;
  images: {
    symbol?: string;
    logo?: string;
  };
};

type PokemonTCGCard = {
  id: string;
  name: string;
  supertype: string;
  subtypes?: string[];
  hp?: string;
  types?: string[];
  evolvesFrom?: string;
  abilities?: unknown[];
  attacks?: unknown[];
  weaknesses?: unknown[];
  retreatCost?: string[];
  convertedRetreatCost?: number;
  set: {
    id: string;
    name: string;
    series: string;
    printedTotal?: number;
    total: number;
    ptcgoCode?: string;
    releaseDate: string;
  };
  number: string;
  artist?: string;
  rarity?: string;
  flavorText?: string;
  nationalPokedexNumbers?: number[];
  legalities?: Record<string, string>;
  images: {
    small: string;
    large: string;
  };
  tcgplayer?: {
    url?: string;
    updatedAt?: string;
    prices?: Record<string, unknown>;
  };
};

type ApiResponse<T> = {
  data: T[];
  page: number;
  pageSize: number;
  count: number;
  totalCount: number;
};

async function fetchWithAuth<T>(url: string, retryCount = 0): Promise<ApiResponse<T>> {
  const apiKey = process.env.POKEMONTCG_IO_API_KEY;
  
  const headers: Record<string, string> = {};
  if (apiKey) {
    headers["X-Api-Key"] = apiKey;
  }
  
  try {
    const response = await fetch(url, { 
      headers,
      signal: AbortSignal.timeout(120000) // 120s timeout (API is very slow)
    });

    // Log URL on non-2xx responses for debugging
    if (!response.ok) {
      const sanitizedUrl = url.replace(/[?&]api[_-]?key=[^&]*/gi, '');
      console.log(`  ⚠️  HTTP ${response.status} for: ${sanitizedUrl}`);
    }
    
    // Retry on 429 (rate limit) or 5xx (server error)
    if (response.status === 429 || response.status >= 500) {
      if (retryCount < MAX_RETRIES) {
        const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, retryCount) + Math.random() * 1000;
        console.log(`  ⚠️  ${response.status} error, retrying in ${Math.round(delay)}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return fetchWithAuth<T>(url, retryCount + 1);
      }
      const text = await response.text();
      throw new Error(`API request failed after ${MAX_RETRIES} retries: ${response.status}`);
    }

    // Don't retry 404 (not found) - it's permanent
    if (response.status === 404) {
      throw new Error(`API request not found (404): ${url.substring(0, 100)}`);
    }
    
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`API request failed: ${response.status} ${text.substring(0, 200)}`);
    }

    return response.json();
  } catch (error) {
    // Retry on network/timeout errors
    if (retryCount < MAX_RETRIES && (error.name === 'TimeoutError' || error.name === 'TypeError')) {
      const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, retryCount) + Math.random() * 1000;
      console.log(`  ⚠️  ${error.name}, retrying in ${Math.round(delay)}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchWithAuth<T>(url, retryCount + 1);
    }
    throw error;
  }
}

async function fetchAllSets(): Promise<PokemonTCGSet[]> {
  try {
    console.log("Fetching all sets...");
    const response = await fetchWithAuth<PokemonTCGSet>(
      `${API_BASE}/sets?pageSize=250`
    );
    console.log(`Found ${response.data.length} sets`);
    return response.data;
  } catch (error) {
    console.error("Error fetching sets:", error.message || error);
    throw error;
  }
}

async function fetchCardsForSet(
  setId: string,
  pageSize: number = 250
): Promise<PokemonTCGCard[]> {
  const allCards: PokemonTCGCard[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    console.log(`    Fetching page ${page}...`);
    const response = await fetchWithAuth<PokemonTCGCard>(
      `${API_BASE}/cards?q=set.id:${setId}&page=${page}&pageSize=${pageSize}`
    );

    allCards.push(...response.data);
    console.log(`    Got ${response.data.length} cards (total: ${allCards.length}/${response.totalCount})`);
    
    hasMore = response.page * response.pageSize < response.totalCount;
    if (hasMore) {
      page++;
      await delay(IMPORT_DELAY_MS);
    }
  }

  return allCards;
}

async function upsertCatalogSet(set: PokemonTCGSet): Promise<number> {
  const releaseDate = set.releaseDate ? new Date(set.releaseDate) : null;
  
  const result = await query<{ id: number }>(
    `
      INSERT INTO catalog_sets (
        pokemontcg_io_set_id,
        name,
        code,
        release_date,
        category,
        updated_at
      )
      VALUES ($1, $2, $3, $4, 'pokemon', NOW())
      ON CONFLICT (pokemontcg_io_set_id) DO UPDATE
        SET
          name = EXCLUDED.name,
          code = EXCLUDED.code,
          release_date = EXCLUDED.release_date,
          updated_at = NOW()
      RETURNING id;
    `,
    [set.id, set.name, set.ptcgoCode ?? null, releaseDate]
  );
  
  return result.rows[0].id;
}

async function upsertCatalogCard(
  catalogSetId: number,
  card: PokemonTCGCard
): Promise<void> {
  await query(
    `
      INSERT INTO catalog_cards (
        catalog_set_id,
        pokemontcg_io_card_id,
        name,
        number,
        rarity,
        supertype,
        subtypes,
        image_url,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      ON CONFLICT (pokemontcg_io_card_id) DO UPDATE
        SET
          catalog_set_id = EXCLUDED.catalog_set_id,
          name = EXCLUDED.name,
          number = EXCLUDED.number,
          rarity = EXCLUDED.rarity,
          supertype = EXCLUDED.supertype,
          subtypes = EXCLUDED.subtypes,
          image_url = EXCLUDED.image_url,
          updated_at = NOW();
    `,
    [
      catalogSetId,
      card.id,
      card.name,
      card.number,
      card.rarity ?? null,
      card.supertype ?? null,
      card.subtypes && card.subtypes.length > 0 ? card.subtypes : null,
      card.images.large, // Prefer large image
    ]
  );
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getImportProgress(): Promise<{ lastSetIndex: number; totalSets: number }> {
  // Check which sets already exist to resume from last position
  const result = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM catalog_sets`
  );
  return {
    lastSetIndex: parseInt(result.rows[0].count, 10),
    totalSets: 0 // Will be updated after fetching sets
  };
}

async function importCatalog(): Promise<void> {
  console.log("Starting PokémonTCG.io catalog import...\n");
  
  // Check for empty sets that need reimport
  const emptyResult = await query<{ name: string; pokemontcg_io_set_id: string }>(
    `SELECT cs.name, cs.pokemontcg_io_set_id 
     FROM catalog_sets cs
     LEFT JOIN catalog_cards cc ON cc.catalog_set_id = cs.id
     GROUP BY cs.id
     HAVING COUNT(cc.id) = 0`
  );
  
  if (EMPTY_SET_RETRY && emptyResult.rows.length > 0) {
    console.log(`Found ${emptyResult.rows.length} empty sets to retry\n`);
    
    let totalCards = 0;
    let cardsWithImages = 0;
    
    for (const emptySet of emptyResult.rows) {
      try {
        console.log(`Retrying: ${emptySet.name} (${emptySet.pokemontcg_io_set_id})`);
        
        // Get catalog set ID
        const setResult = await query<{ id: number }>(
          `SELECT id FROM catalog_sets WHERE pokemontcg_io_set_id = $1`,
          [emptySet.pokemontcg_io_set_id]
        );
        const catalogSetId = setResult.rows[0].id;
        
        const cards = await fetchCardsForSet(emptySet.pokemontcg_io_set_id);
        console.log(`  Found ${cards.length} cards...`);
        
        let batchCount = 0;
        for (const card of cards) {
          await upsertCatalogCard(catalogSetId, card);
          totalCards++;
          batchCount++;
          if (card.images.large) {
            cardsWithImages++;
          }
          
          if (batchCount % BATCH_COMMIT_SIZE === 0) {
            console.log(`    Progress: ${batchCount}/${cards.length} cards`);
          }
        }
        
        console.log(`  ✓ Completed: ${cards.length} cards imported\n`);
        await delay(IMPORT_DELAY_MS);
      } catch (error) {
        console.error(`  ✗ Failed to import ${emptySet.name}:`, error);
      }
    }
    
    console.log(`\nEmpty set retry complete:`);
    console.log(`  Total cards imported: ${totalCards}`);
    console.log(`  Cards with images: ${cardsWithImages}\n`);
    return;
  }
  
  const progress = await getImportProgress();
  console.log(`Current progress: ${progress.lastSetIndex} sets already imported\n`);
  
  const sets = await fetchAllSets();
  
  let totalCards = 0;
  let cardsWithImages = 0;
  let setsProcessed = 0;

  // Resume from where we left off
  const startIndex = progress.lastSetIndex;
  
  for (let index = startIndex; index < sets.length; index++) {
    const set = sets[index];
    try {
      console.log(
        `(${index + 1}/${sets.length}) Processing set: ${set.name} (${set.id})`
      );
      
      const catalogSetId = await upsertCatalogSet(set);

      const cards = await fetchCardsForSet(set.id);
      console.log(`  Importing ${cards.length} cards...`);
      
      let batchCount = 0;
      for (const card of cards) {
        await upsertCatalogCard(catalogSetId, card);
        totalCards++;
        batchCount++;
        if (card.images.large) {
          cardsWithImages++;
        }
        
        // Log progress every batch
        if (batchCount % BATCH_COMMIT_SIZE === 0) {
          console.log(`    Progress: ${batchCount}/${cards.length} cards`);
        }
      }
      
      setsProcessed++;
      console.log(`  ✓ Completed ${set.name} (${cards.length} cards)`);
      console.log(`  📊 Running totals: ${setsProcessed} sets, ${totalCards} cards, ${cardsWithImages} with images`);
    } catch (error) {
      console.error(`  ✗ Failed to import set ${set.id}:`, error.message);
      console.log(`  Continuing with next set...`);
    }

    await delay(IMPORT_DELAY_MS);
  }

  console.log("\n=== IMPORT COMPLETE ===");
  console.log(`Sets processed this run: ${setsProcessed}`);
  console.log(`Cards imported this run: ${totalCards}`);
  console.log(`Cards with image_url this run: ${cardsWithImages}`);
  
  // Get final counts from DB
  const finalSets = await query(`SELECT COUNT(*) as count FROM catalog_sets`);
  const finalCards = await query(`SELECT COUNT(*) as count FROM catalog_cards`);
  const finalWithImages = await query(`SELECT COUNT(*) as count FROM catalog_cards WHERE image_url IS NOT NULL`);
  
  console.log(`\nTotal in database:`);
  console.log(`  Sets: ${finalSets.rows[0].count}`);
  console.log(`  Cards: ${finalCards.rows[0].count}`);
  console.log(`  Cards with images: ${finalWithImages.rows[0].count}`);

  // Verify known cards can be resolved
  await verifyKnownCards();
}

async function verifyKnownCards(): Promise<void> {
  console.log("\n=== VERIFYING KNOWN CARDS ===");
  
  // First check what cards we have in our app's cards table
  const appCards = await query<{ name: string; set_name: string; card_number: string | null }>(
    `
      SELECT DISTINCT name, set_name, card_number
      FROM cards
      WHERE card_number IS NOT NULL
      ORDER BY name
      LIMIT 10
    `
  );
  
  console.log(`\nSample cards from app's cards table (${appCards.rows.length}):`);
  for (const card of appCards.rows) {
    console.log(`  - ${card.name} | ${card.set_name} | #${card.card_number}`);
  }

  const testCards = [
    { name: "Giratina V", setName: "Lost Origin", number: "186" },
    { name: "Lugia V", setName: "Silver Tempest", number: "186" },
    { name: "Charizard VMAX", setName: "Shining Fates", number: "SV107" },
  ];

  console.log("\nTesting stock image resolution:");
  for (const card of testCards) {
    const result = await query<{ image_url: string; card_name: string; card_number: string }>(
      `
        SELECT cc.name as card_name, cc.number as card_number, cc.image_url
        FROM catalog_cards cc
        JOIN catalog_sets cs ON cs.id = cc.catalog_set_id
        WHERE cs.name ILIKE $1
          AND cc.name ILIKE $2
          AND cc.number = $3
          AND cc.image_url IS NOT NULL
        LIMIT 1
      `,
      [card.setName, `${card.name}%`, card.number]
    );

    if (result.rows.length > 0) {
      console.log(`✅ ${card.name} (${card.setName} #${card.number})`);
      console.log(`   Found: ${result.rows[0].card_name} #${result.rows[0].card_number}`);
      console.log(`   Image: ${result.rows[0].image_url}`);
    } else {
      console.log(`❌ ${card.name} (${card.setName} #${card.number}): NOT FOUND`);
    }
  }
}

importCatalog().catch((error) => {
  console.error("Fatal error importing catalog:", error);
  process.exitCode = 1;
});
