import { getCardStockImageUrl } from "./lib/stockImages";

async function test() {
  const tests = [
    { name: "Charizard VMAX", setName: "Shining Fates", cardNumber: "SV107/SV122" },
    { name: "Lugia V Alt Art", setName: "Silver Tempest", cardNumber: "186/195" },
    { name: "Giratina V Alt Art", setName: "Lost Origin", cardNumber: "186/196" }
  ];

  for (const card of tests) {
    console.log(`\nTesting: ${card.name} (${card.setName} #${card.cardNumber})`);
    const result = await getCardStockImageUrl(card);
    if (result) {
      console.log(`   MATCHED: ${result.url}`);
    } else {
      console.log(`   NO MATCH`);
    }
  }
}

test().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
