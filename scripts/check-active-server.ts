/**
 * Check which ports have active Next.js servers
 */

async function checkPort(port: number): Promise<boolean> {
  try {
    const response = await fetch(`http://localhost:${port}`, {
      signal: AbortSignal.timeout(2000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function main() {
  console.log("Checking for active Next.js servers...\n");

  const port3000 = await checkPort(3000);
  const port3001 = await checkPort(3001);

  console.log(`Port 3000: ${port3000 ? "✓ ACTIVE" : "✗ Not responding"}`);
  console.log(`Port 3001: ${port3001 ? "✓ ACTIVE" : "✗ Not responding"}`);

  console.log("\n---");
  console.log("ACTION: Check your browser URL bar.");
  console.log("You should see one of:");
  console.log("  - http://localhost:3000");
  console.log("  - http://localhost:3001");
  console.log("\nThen I'll verify that server's database connection.");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
