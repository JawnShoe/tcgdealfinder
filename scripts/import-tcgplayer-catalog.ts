import "dotenv/config";

import { query } from "../lib/db";
import {
  fetchGroupProducts,
  fetchPokemonGroups,
  type TcgplayerGroup,
  type TcgplayerProduct,
} from "../lib/tcgplayerClient";

const IMPORT_DELAY_MS = 250;

async function upsertCatalogSet(group: TcgplayerGroup): Promise<number> {
  const releaseDate = group.publishedOn ? new Date(group.publishedOn) : null;
  const result = await query<{ id: number }>(
    `
      INSERT INTO catalog_sets (
        tcgplayer_group_id,
        name,
        code,
        release_date,
        category,
        updated_at
      )
      VALUES ($1, $2, $3, $4, 'pokemon', NOW())
      ON CONFLICT (tcgplayer_group_id) DO UPDATE
        SET
          name = EXCLUDED.name,
          code = EXCLUDED.code,
          release_date = EXCLUDED.release_date,
          updated_at = NOW()
      RETURNING id;
    `,
    [group.groupId, group.name, group.abbreviation ?? null, releaseDate],
  );
  return result.rows[0].id;
}

async function upsertCatalogCard(
  catalogSetId: number,
  product: TcgplayerProduct,
): Promise<void> {
  await query(
    `
      INSERT INTO catalog_cards (
        catalog_set_id,
        tcgplayer_product_id,
        name,
        number,
        rarity,
        supertype,
        subtypes,
        image_url,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      ON CONFLICT (tcgplayer_product_id) DO UPDATE
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
      product.productId,
      product.name,
      product.number ?? null,
      product.rarity ?? null,
      product.supertype ?? null,
      product.subtypes && product.subtypes.length > 0 ? product.subtypes : null,
      product.imageUrl ?? null,
    ],
  );
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function importCatalog(): Promise<void> {
  console.log("Fetching Pokémon groups from TCGplayer...");
  const groups = await fetchPokemonGroups();
  console.log(`Found ${groups.length} groups. Starting import...`);

  let totalCards = 0;
  let cardsWithImages = 0;

  for (const [index, group] of groups.entries()) {
    try {
      const catalogSetId = await upsertCatalogSet(group);
      console.log(
        `(${index + 1}/${groups.length}) Upserting set: ${group.name} (group ${group.groupId})`,
      );

      const products = await fetchGroupProducts(group.groupId);
      console.log(`  Found ${products.length} products. Importing...`);
      for (const product of products) {
        await upsertCatalogCard(catalogSetId, product);
        totalCards++;
        if (product.imageUrl) {
          cardsWithImages++;
        }
      }
      console.log(`  Done with ${group.name}.`);
    } catch (error) {
      console.error(`Failed to import group ${group.groupId}:`, error);
    }

    await delay(IMPORT_DELAY_MS);
  }

  console.log("\n=== IMPORT COMPLETE ===");
  console.log(`Sets imported: ${groups.length}`);
  console.log(`Cards imported: ${totalCards}`);
  console.log(`Cards with image_url: ${cardsWithImages}`);
  console.log(`Image coverage: ${totalCards > 0 ? ((cardsWithImages / totalCards) * 100).toFixed(1) : 0}%`);

  // Verify known cards can be resolved
  await verifyKnownCards();
}

async function verifyKnownCards(): Promise<void> {
  console.log("\n=== VERIFYING KNOWN CARDS ===");
  
  const testCards = [
    { name: "Giratina V", setName: "Lost Origin", number: "186" },
    { name: "Lugia V", setName: "Silver Tempest", number: "186" },
    { name: "Charizard VMAX", setName: "Shining Fates", number: "SV107" },
  ];

  for (const card of testCards) {
    const result = await query<{ image_url: string; card_name: string }>(
      `
        SELECT cc.name as card_name, cc.image_url
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
      console.log(`✅ ${card.name} (${card.setName} #${card.number}): ${result.rows[0].card_name}`);
      console.log(`   ${result.rows[0].image_url}`);
    } else {
      console.log(`❌ ${card.name} (${card.setName} #${card.number}): NOT FOUND`);
    }
  }
}

importCatalog().catch((error) => {
  console.error("Fatal error importing catalog:", error);
  process.exitCode = 1;
});
