// Simple fetch test
const url = "http://localhost:3000/cards/5";

console.log(`Fetching ${url}...`);

fetch(url)
  .then(async (response) => {
    console.log(`Status: ${response.status}`);
    const html = await response.text();

    // Check for brazil shop
    if (html.includes("brazil shop")) {
      console.log("✅ 'brazil shop' FOUND in HTML");
    } else {
      console.log("❌ 'brazil shop' NOT FOUND in HTML");
    }

    // Check for andre17
    if (html.includes("andre17")) {
      console.log("⚠️ 'andre17' still appears in HTML");
    }

    // Find the seller cell context
    const sellerMatch = html.match(/andre17[^<]{0,200}/);
    if (sellerMatch) {
      console.log("\nContext around 'andre17':");
      console.log(sellerMatch[0]);
    }

    process.exit(0);
  })
  .catch((err) => {
    console.error("Fetch error:", err.message);
    process.exit(1);
  });
