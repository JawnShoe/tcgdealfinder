import "dotenv/config";

const API_BASE = "https://api.pokemontcg.io/v2";

async function testFetch() {
  const apiKey = process.env.POKEMONTCG_IO_API_KEY;
  console.log("API Key present:", !!apiKey);
  
  try {
    console.log("Fetching sets...");
    const response = await fetch(`${API_BASE}/sets?pageSize=250`, {
      headers: {
        "X-Api-Key": apiKey || "",
      },
    });
    
    console.log("Status:", response.status);
    
    if (!response.ok) {
      const text = await response.text();
      console.log("Error:", text);
      process.exit(1);
    }
    
    const data = await response.json();
    console.log("Success! Sets found:", data.data.length);
    console.log("Total count:", data.totalCount);
    console.log("Sample:", data.data[0].name);
  } catch (error) {
    console.error("Fetch error:", error.message);
    process.exit(1);
  }
}

testFetch().then(() => process.exit(0));
