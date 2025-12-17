import "dotenv/config";

const API_BASE = "https://api.pokemontcg.io/v2";

async function testEndpoint(url: string, name: string) {
  const apiKey = process.env.POKEMONTCG_IO_API_KEY;
  const start = Date.now();
  
  try {
    const headers: Record<string, string> = {};
    if (apiKey) {
      headers["X-Api-Key"] = apiKey;
    }
    
    const response = await fetch(url, { headers });
    const latency = Date.now() - start;
    
    console.log(`${name}:`);
    console.log(`  Status: ${response.status}`);
    console.log(`  Latency: ${latency}ms`);
    
    if (!response.ok) {
      const text = await response.text();
      console.log(`  Error: ${text.substring(0, 200)}...`);
      return false;
    }
    
    const data = await response.json();
    console.log(`  Success: ${data.data?.length || 0} results`);
    return true;
  } catch (error) {
    const latency = Date.now() - start;
    console.log(`${name}:`);
    console.log(`  Status: ERROR`);
    console.log(`  Latency: ${latency}ms`);
    console.log(`  Error: ${error.message}`);
    return false;
  }
}

async function testAPI() {
  console.log("=== API HEALTH CHECK ===\n");
  
  const test1 = await testEndpoint(`${API_BASE}/sets?page=1&pageSize=1`, "Test 1: /sets");
  console.log();
  
  const test2 = await testEndpoint(`${API_BASE}/cards?page=1&pageSize=1`, "Test 2: /cards");
  console.log();
  
  if (test1 && test2) {
    console.log(" API is healthy");
  } else {
    console.log("  API has issues");
  }
}

testAPI().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
