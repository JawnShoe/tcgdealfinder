#!/usr/bin/env tsx
/**
 * Verify pages load and CSS is working
 */

async function testPages() {
  const baseUrl = "http://localhost:3001";
  const pages = [
    "/",
    "/newest",
    "/top-deals",
    "/ending-soon",
    "/rebuild/discovery",
  ];

  console.log("=== PAGE LOAD VERIFICATION ===\n");
  console.log(`Testing against: ${baseUrl}\n`);

  for (const page of pages) {
    try {
      const response = await fetch(`${baseUrl}${page}`);
      const html = await response.text();

      const hasTailwind = html.includes("/_next/static/css/");
      const hasContent = html.length > 1000;
      const status = response.status;

      console.log(`${page}`);
      console.log(`  Status: ${status}`);
      console.log(`  HTML Size: ${html.length} bytes`);
      console.log(`  CSS Link: ${hasTailwind ? "✅ Found" : "❌ Missing"}`);
      console.log(`  Content: ${hasContent ? "✅ Present" : "❌ Empty"}`);

      if (status !== 200) {
        console.log(`  ⚠️  Non-200 response`);
      }

      console.log();
    } catch (err) {
      console.log(`${page}`);
      console.log(
        `  ❌ Error: ${err instanceof Error ? err.message : String(err)}`
      );
      console.log();
    }
  }

  console.log("=== VERIFICATION COMPLETE ===");
}

testPages().catch(console.error);
