import "dotenv/config";

async function testApi() {
  const apiKey = process.env.POKEMONTCG_IO_API_KEY;
  console.log("Testing API connection...");
  console.log("API Key configured:", apiKey ? "YES" : "NO");
  
  if (!apiKey) {
    console.log("ERROR: POKEMONTCG_IO_API_KEY not set");
    process.exit(1);
  }
  
  try {
    const response = await fetch("https://api.pokemontcg.io/v2/sets?pageSize=5", {
      headers: {
        "X-Api-Key": apiKey,
      },
    });
    
    console.log("Response status:", response.status);
    
    if (!response.ok) {
      const text = await response.text();
      console.log("Error response:", text);
      process.exit(1);
    }
    
    const data = await response.json();
    console.log(" API working! Found", data.data.length, "sets in test");
    console.log("Sample set:", data.data[0].name);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

testApi().then(() => process.exit(0));
