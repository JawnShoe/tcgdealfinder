import { getEbayRateLimits } from "../lib/ebay";

async function main() {
  await getEbayRateLimits();
}

main().catch((err) => {
  console.error("ebay:rates script failed:", err);
  process.exitCode = 1;
});
