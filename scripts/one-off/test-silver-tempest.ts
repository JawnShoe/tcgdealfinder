import "dotenv/config";

async function testSilverTempest() {
  const API_BASE = "https://api.pokemontcg.io/v2";
  const apiKey = process.env.POKEMONTCG_IO_API_KEY;
  
  const headers: Record<string, string> = {};
  if (apiKey) {
    headers["X-Api-Key"] = apiKey;
  }
  
  // Search for Silver Tempest set
  const setsResponse = await fetch(`${API_BASE}/sets?q=name:"Silver Tempest"`, { headers });
  const setsData = await setsResponse.json();
  
  console.log("Silver Tempest set search:");
  console.log(`  Status: ${setsResponse.status}`);
  console.log(`  Results: ${setsData.data?.length || 0}`);
  
  if (setsData.data && setsData.data.length > 0) {
    const set = setsData.data[0];
    console.log(`  Found: ${set.name} (${set.id})`);
    console.log(`  Total cards: ${set.total}`);
    
    // Try to fetch cards
    const cardsUrl = `${API_BASE}/cards?q=set.id:${set.id}&pageSize=1`;
    console.log(`\nTesting cards endpoint: ${cardsUrl}`);
    
    const cardsResponse = await fetch(cardsUrl, { headers });
    console.log(`  Status: ${cardsResponse.status}`);
    
    if (cardsResponse.ok) {
      const cardsData = await cardsResponse.json();
      console.log(`  Total cards available: ${cardsData.totalCount}`);
      console.log(`  Sample: ${cardsData.data[0]?.name}`);
    } else {
      const text = await cardsResponse.text();
      console.log(`  Error: ${text.substring(0, 200)}`);
    }
  } else {
    console.log("  Not found!");
  }
}

testSilverTempest().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
