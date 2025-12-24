import { getCardStockImageUrl } from "./lib/stockImages";

async function test() {
  console.log("=== STOCK IMAGE RESOLUTION TEST ===\n");
  
  const tests = [
    { name: "Charizard VMAX", setName: "Shining Fates", cardNumber: "SV107/SV122" },
    { name: "Lugia V Alt Art", setName: "Silver Tempest", cardNumber: "186/195" },
    { name: "Giratina V Alt Art", setName: "Lost Origin", cardNumber: "186/196" }
  ];
  
  for (const card of tests) {
    const result = await getCardStockImageUrl(card);
    
    console.log(`${card.name} (${card.setName} #${card.cardNumber}):`);
    if (result) {
      console.log(`   ${result.url}`);
    } else {
      console.log(`   NO MATCH`);
    }
    console.log();
  }
}

test().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
