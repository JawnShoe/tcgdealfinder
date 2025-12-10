import { query } from "../lib/db";

type ListingPreview = {
  id: number;
  title: string;
  total_price_cad: number;
  url: string;
};

async function main() {
  console.log("Fetching latest 5 listings...");

  const result = await query<ListingPreview>(
    `
      SELECT id, title, total_price_cad, url
      FROM listings
      ORDER BY created_at DESC
      LIMIT 5;
    `,
  );

  if (result.rows.length === 0) {
    console.log("No listings found in the database.");
    return;
  }

  console.table(
    result.rows.map((row) => ({
      id: row.id,
      title: row.title,
      total_price_cad: row.total_price_cad,
      url: row.url,
    })),
  );
}

main().catch((err) => {
  console.error("Failed to debug listings:", err);
  process.exitCode = 1;
});
