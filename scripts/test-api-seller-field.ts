/**
 * Test API endpoint to see if it returns seller_store_name
 */

async function testApi() {
  console.log("=== API ENDPOINT TEST ===\n");

  // Try to fetch from the actual API endpoint
  // The andre17 listing is for card_id 5, test the listings endpoint
  const endpoints = [
    "http://localhost:3000/api/listings?cardId=5",
    "http://localhost:3001/api/listings?cardId=5",
  ];

  for (const endpoint of endpoints) {
    console.log(`Testing: ${endpoint}\n`);
    
    try {
      const response = await fetch(endpoint, {
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        console.log(`  ✗ Status ${response.status}: ${response.statusText}`);
        continue;
      }

      const data = await response.json();
      console.log(`  ✓ Status ${response.status}`);
      console.log(`  Total deals: ${data.deals?.length || 0}`);

      // Find the andre17 listing
      const andre17Listing = data.deals?.find(
        (d: any) => d.sellerUsername === "andre17"
      );

      if (andre17Listing) {
        console.log("\n  Found andre17 listing:");
        console.log(`    sellerUsername: ${andre17Listing.sellerUsername}`);
        console.log(`    sellerStoreName: ${andre17Listing.sellerStoreName || "(MISSING)"}`);
        console.log(`    listingId: ${andre17Listing.listingId}`);
        
        if (andre17Listing.sellerStoreName === "brazil shop") {
          console.log("\n  ✅ API returns sellerStoreName = 'brazil shop'");
        } else if (!andre17Listing.sellerStoreName) {
          console.log("\n  ❌ API does NOT return sellerStoreName field");
          console.log("  Need to fix API mapping to include this field.");
        } else {
          console.log(`\n  ⚠️  Unexpected value: '${andre17Listing.sellerStoreName}'`);
        }
      } else {
        console.log("\n  ℹ️  andre17 listing not in this page of results");
        console.log("  (Might not be in top deals currently)");
      }

      return; // Success, exit
    } catch (error: any) {
      console.log(`  ✗ Error: ${error.message}`);
    }
  }

  console.log("\n❌ No API endpoints responded successfully");
}

testApi()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Fatal error:", e);
    process.exit(1);
  });
