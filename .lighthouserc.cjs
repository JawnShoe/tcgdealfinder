module.exports = {
  ci: {
    collect: {
      url: ["http://127.0.0.1:3000/"],
      numberOfRuns: 2,
      startServerCommand:
        "node -e \"require('node:fs').rmSync('.next', { recursive: true, force: true })\" && npm run build && npm run start -- --hostname 127.0.0.1 --port 3000",
      startServerReadyPattern: "http://127\\.0\\.0\\.1:3000",
      startServerReadyTimeout: 120000,
      settings: {
        onlyCategories: ["performance"],
        formFactor: "desktop",
        throttlingMethod: "devtools",
        screenEmulation: {
          mobile: false,
        },
      },
    },
    assert: {
      assertions: {
        "categories:performance": ["error", { minScore: 0.6 }],
        "first-contentful-paint": ["error", { maxNumericValue: 3000 }],
        "largest-contentful-paint": ["error", { maxNumericValue: 4000 }],
        "total-blocking-time": ["error", { maxNumericValue: 600 }],
      },
    },
    upload: {
      target: "filesystem",
      outputDir: "./lhci-report",
    },
  },
};
