async function test() {
  const setId = "swsh12tg";
  const url = `https://api.pokemontcg.io/v2/sets/${setId}`;
  
  console.log(`Fetching: ${url}`);
  const response = await fetch(url);
  console.log(`Status: ${response.status}`);
  
  if (response.ok) {
    const data = await response.json();
    console.log(`\nSet: ${data.data.name}`);
    console.log(`Total cards: ${data.data.total}`);
    console.log(`Printed total: ${data.data.printedTotal}`);
    
    // Try fetching cards
    const cardsUrl = `https://api.pokemontcg.io/v2/cards?q=set.id:${setId}`;
    console.log(`\nFetching cards: ${cardsUrl}`);
    const cardsResponse = await fetch(cardsUrl);
    console.log(`Cards status: ${cardsResponse.status}`);
    
    if (cardsResponse.ok) {
      const cardsData = await cardsResponse.json();
      console.log(`Found ${cardsData.data.length} cards`);
      cardsData.data.slice(0, 5).forEach((card: any) => {
        console.log(`  #${card.number} ${card.name}`);
      });
    }
  } else {
    console.log(await response.text());
  }
}

test().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
