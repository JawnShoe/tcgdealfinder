import { query } from "../lib/db";

async function main() {
  // Deterministic IDs for Playwright: /cards/1
  await query(
    `
      INSERT INTO cards (id, name, set_name, card_number, condition_bucket)
      VALUES (1, 'E2E Converted USD Card', 'E2E Set', '001/001', 'raw_nm')
      ON CONFLICT (id) DO UPDATE
        SET name = EXCLUDED.name,
            set_name = EXCLUDED.set_name,
            card_number = EXCLUDED.card_number,
            condition_bucket = EXCLUDED.condition_bucket,
            updated_at = NOW();
    `
  );

  await query(
    `
      INSERT INTO historical_prices (
        card_id,
        market,
        median_price_cad,
        sample_size,
        last_updated_at
      )
      VALUES (1, 'EBAY_CA', 100.00, 50, NOW())
      ON CONFLICT (card_id, market) DO UPDATE
        SET median_price_cad = EXCLUDED.median_price_cad,
            sample_size = EXCLUDED.sample_size,
            last_updated_at = EXCLUDED.last_updated_at;
    `
  );

  await query(
    `
      INSERT INTO listings (
        card_id,
        source,
        listing_id,
        title,
        url,
        thumbnail_url,
        price_cad,
        shipping_cad,
        total_price_cad,
        shipping_known,
        seller_username,
        seller_feedback_count,
        seller_positive_percent,
        market,
        ends_at,
        historic_price_cad,
        discount_percent,
        match_eligible,
        integrity_status,
        updated_at,

        currency,
        price_native,
        shipping_native,
        total_native,
        fx_rate_to_usd,
        total_usd,
        snapshot_at,
        ingested_at,
        shipping_unknown,
        fx_status,
        fx_timestamp
      )
      VALUES (
        1,
        'EBAY',
        'E2E-LISTING-1',
        'E2E Converted USD Card 001/001',
        'https://example.com/e2e-listing-1',
        NULL,
        80.00,
        0.00,
        80.00,
        TRUE,
        'e2e_seller',
        100,
        99.50,
        'EBAY_CA',
        NOW() + INTERVAL '2 days',
        100.00,
        -20.00,
        TRUE,
        'OK',
        NOW(),

        'CAD',
        80.00,
        0.00,
        80.00,
        0.7400000000,
        59.200000,
        NOW(),
        NOW(),
        FALSE,
        'OK',
        NOW()
      )
      ON CONFLICT (listing_id) DO UPDATE
        SET title = EXCLUDED.title,
            url = EXCLUDED.url,
            price_cad = EXCLUDED.price_cad,
            shipping_cad = EXCLUDED.shipping_cad,
            total_price_cad = EXCLUDED.total_price_cad,
            seller_username = EXCLUDED.seller_username,
            seller_feedback_count = EXCLUDED.seller_feedback_count,
            seller_positive_percent = EXCLUDED.seller_positive_percent,
            market = EXCLUDED.market,
            ends_at = EXCLUDED.ends_at,
            historic_price_cad = EXCLUDED.historic_price_cad,
            discount_percent = EXCLUDED.discount_percent,
            match_eligible = EXCLUDED.match_eligible,
            integrity_status = EXCLUDED.integrity_status,
            updated_at = EXCLUDED.updated_at,
            currency = EXCLUDED.currency,
            price_native = EXCLUDED.price_native,
            shipping_native = EXCLUDED.shipping_native,
            total_native = EXCLUDED.total_native,
            fx_rate_to_usd = EXCLUDED.fx_rate_to_usd,
            total_usd = EXCLUDED.total_usd,
            snapshot_at = EXCLUDED.snapshot_at,
            ingested_at = EXCLUDED.ingested_at,
            shipping_unknown = EXCLUDED.shipping_unknown,
            fx_status = EXCLUDED.fx_status,
            fx_timestamp = EXCLUDED.fx_timestamp;
    `
  );

  console.log("E2E fixtures seeded: /cards/1 + E2E-LISTING-1 (EBAY_CA, CAD)");
}

main().catch((err) => {
  console.error("Failed to seed E2E fixtures:", err);
  process.exit(1);
});
