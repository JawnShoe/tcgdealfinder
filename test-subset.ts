import { getCardStockImageUrl } from "./lib/stockImages";

async function test() {
  console.log("Testing subset matching...\n");
  
  const charizard = await getCardStockImageUrl({
    name: "Charizard VMAX",
    setName: "Shining Fates",
    cardNumber: "SV107/SV122"
  });
  
  console.log("Charizard VMAX (Shining Fates #SV107/SV122):");
  if (charizard) {
    console.log(`   MATCHED: ${charizard.url}`);
  } else {
    console.log(`   NO MATCH`);
  }
}

test().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
