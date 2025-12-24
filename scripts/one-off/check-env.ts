import "dotenv/config";
const keys = Object.keys(process.env).filter(k => 
  k.includes("DATABASE") || k.includes("EBAY") || k.includes("TCG") || k.includes("POKEMON")
);
console.log("Current environment variables:");
keys.forEach(k => console.log(`  ${k}: ${process.env[k] ? "SET" : "NOT SET"}`));
