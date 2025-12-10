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
      }
      console.log(`  Done with ${group.name}.`);
    } catch (error) {
      console.error(`Failed to import group ${group.groupId}:`, error);
    }

    await delay(IMPORT_DELAY_MS);
  }

  console.log("Catalog import complete.");
}

importCatalog().catch((error) => {
  console.error("Fatal error importing catalog:", error);
  process.exitCode = 1;
});
