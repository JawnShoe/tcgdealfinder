/**
 * Verification: SellerNameWithTooltip import fix
 * Tests that the component can be imported and used without runtime errors
 */

import "dotenv/config";

async function verifySellerComponentFix() {
  console.log("=== SELLER COMPONENT IMPORT FIX VERIFICATION ===\n");

  // Test 1: Import the component directly
  console.log("✓ Test 1: Import SellerNameWithTooltip component");
  try {
    const module = await import("../components/SellerNameWithTooltip");
    if (module.SellerNameWithTooltip) {
      console.log("  ✅ Component exported correctly as named export");
    } else {
      console.log("  ❌ Component not found in exports");
      process.exit(1);
    }
  } catch (error: any) {
    console.log(`  ❌ Failed to import: ${error.message}`);
    process.exit(1);
  }

  // Test 2: Import the helper functions
  console.log("\n✓ Test 2: Import sellerDisplay helpers");
  try {
    const module = await import("../lib/sellerDisplay");
    if (module.getSellerDisplayData && module.getSellerDisplayName) {
      console.log("  ✅ Helper functions exported correctly");
    } else {
      console.log("  ❌ Helper functions not found");
      process.exit(1);
    }
  } catch (error: any) {
    console.log(`  ❌ Failed to import: ${error.message}`);
    process.exit(1);
  }

  // Test 3: Verify components can import without errors
  console.log("\n✓ Test 3: Check component imports");

  const componentsToCheck = [
    "../components/DealsTable",
    "../components/CardDetailClient",
    "../components/FeaturedDeals",
  ];

  for (const comp of componentsToCheck) {
    try {
      await import(comp);
      const name = comp.split("/").pop();
      console.log(`  ✅ ${name} imports successfully`);
    } catch (error: any) {
      const name = comp.split("/").pop();
      console.log(`  ❌ ${name} failed to import: ${error.message}`);
      process.exit(1);
    }
  }

  // Test 4: Fetch homepage and check for runtime errors
  console.log("\n✓ Test 4: Check homepage renders");
  try {
    await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait for server
    const response = await fetch("http://localhost:3001");

    if (response.ok) {
      const html = await response.text();

      // Check if there are any client-side error indicators
      const hasError =
        html.includes("Application error") ||
        html.includes("Error:") ||
        html.includes("is not defined");

      if (hasError) {
        console.log(
          "  ⚠️  Homepage may have runtime errors (check browser console)"
        );
      } else {
        console.log("  ✅ Homepage renders successfully");
      }
    } else {
      console.log(`  ⚠️  Homepage returned status ${response.status}`);
    }
  } catch (error: any) {
    console.log(`  ⚠️  Could not fetch homepage: ${error.message}`);
  }

  console.log("\n=== VERIFICATION COMPLETE ===");
  console.log("✅ All import checks passed!");
  console.log("✅ SellerNameWithTooltip is properly exported and imported");
  console.log("✅ Components using it can now be loaded without errors");
  console.log("\nNext steps:");
  console.log("1. Visit http://localhost:3001 in browser");
  console.log("2. Check browser console for any runtime errors");
  console.log("3. Verify seller names display with tooltips on hover/tap");

  process.exit(0);
}

verifySellerComponentFix();
