// Debug script to audit CA listing 177383271547
import { fetchEbayItemDetail } from "../lib/ebay";

const LISTING_ID = "177383271547";
const MARKET = "EBAY_CA";

async function main() {
  console.log(`\n========== AUDIT: CA Listing ${LISTING_ID} ==========\n`);

  try {
    const detail = await fetchEbayItemDetail(LISTING_ID, MARKET);

    if (!detail) {
      console.error("❌ Failed to fetch listing detail");
      return;
    }

    console.log("Full API Response:");
    console.log(JSON.stringify(detail, null, 2));

    // @ts-ignore - accessing any fields that might exist
    const price = detail.price;
    const shippingOptions = detail.shippingOptions;
    const convertedPrice = detail.convertedPrice;
    const convertedCurrentPrice = detail.convertedCurrentPrice;

    console.log("\n========== PRICE FIELDS ==========");
    console.log("price:", JSON.stringify(price, null, 2));
    console.log("convertedPrice:", JSON.stringify(convertedPrice, null, 2));
    console.log(
      "convertedCurrentPrice:",
      JSON.stringify(convertedCurrentPrice, null, 2)
    );

    console.log("\n========== SHIPPING FIELDS ==========");
    console.log("shippingOptions:", JSON.stringify(shippingOptions, null, 2));
  } catch (error) {
    console.error("Error:", error);
  }
}

main();
