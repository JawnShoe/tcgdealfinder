import "dotenv/config";
if (process.env.POKEMONTCG_IO_API_KEY) {
  console.log(" POKEMONTCG_IO_API_KEY is configured");
  console.log("   Length:", process.env.POKEMONTCG_IO_API_KEY.length);
} else {
  console.log(" POKEMONTCG_IO_API_KEY is NOT SET");
  console.log("   Please add it to .env.local");
}
