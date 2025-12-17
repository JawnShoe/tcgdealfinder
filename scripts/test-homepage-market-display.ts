import "dotenv/config";

async function testHomepage() {
  console.log("=== TESTING HOMEPAGE FOR MARKET DISPLAY ===\n");
  
  try {
    const response = await fetch("http://localhost:3001");
    const html = await response.text();
    
    console.log(`✅ Homepage loaded: Status ${response.status}`);
    console.log(`   Content length: ${html.length} bytes`);
    
    // Check for market data
    const hasUS = html.includes("EBAY_US") || html.includes('"US"');
    const hasCA = html.includes("EBAY_CA") || html.includes('"CA"');
    const hasGB = html.includes("EBAY_GB") || html.includes('"GB"') || html.includes('"UK"');
    const hasAU = html.includes("EBAY_AU") || html.includes('"AU"');
    
    console.log(`\nMarket codes present:`);
    console.log(`  ${hasUS ? '✅' : '❌'} US market data`);
    console.log(`  ${hasCA ? '✅' : '❌'} CA market data`);
    console.log(`  ${hasGB ? '✅' : '❌'} GB market data`);
    console.log(`  ${hasAU ? '✅' : '❌'} AU market data`);
    
    // Check for ?? (should NOT be present)
    const questionMarkCount = (html.match(/\?\?/g) || []).length;
    console.log(`\n${questionMarkCount === 0 ? '✅' : '❌'} Question marks (??): ${questionMarkCount} found`);
    
    if (questionMarkCount > 0) {
      console.log('\n⚠️  PROBLEM: ?? still appearing in HTML!');
      // Find context around ??
      const matches = html.matchAll(/(.{50}\?\?.{50})/g);
      for (const match of matches) {
        console.log(`   Context: ...${match[1]}...`);
      }
    }
    
    // Check for hydration errors in console logs
    const hasHydrationError = html.includes('Hydration') || html.includes('hydration');
    console.log(`\n${!hasHydrationError ? '✅' : '⚠️ '} Hydration warnings: ${hasHydrationError ? 'May be present (check browser console)' : 'Not detected in HTML'}`);
    
  } catch (error: any) {
    console.error(`❌ Error testing homepage: ${error.message}`);
    process.exit(1);
  }
  
  process.exit(0);
}

testHomepage();
