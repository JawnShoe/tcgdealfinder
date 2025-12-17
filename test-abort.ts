console.log("Testing AbortSignal.timeout...");
try {
  const signal = AbortSignal.timeout(5000);
  console.log("AbortSignal.timeout is supported");
} catch (error) {
  console.log("AbortSignal.timeout is NOT supported:", error.message);
}
