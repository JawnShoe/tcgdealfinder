import test from "node:test";
import assert from "node:assert/strict";

import { fetchEbaySoldListings } from "../../ebay";

test("fetchEbaySoldListings paginates and dedupes listingId", async () => {
  const originalFetch = global.fetch;

  const originalAppId = process.env.EBAY_APP_ID;
  const originalClientId = process.env.EBAY_CLIENT_ID;
  const originalClientSecret = process.env.EBAY_CLIENT_SECRET;

  process.env.EBAY_APP_ID = "test-app";
  process.env.EBAY_CLIENT_ID = "test-client";
  process.env.EBAY_CLIENT_SECRET = "test-secret";

  let soldSearchCalls = 0;

  global.fetch = (async (input: any) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : String(input?.url ?? "");

    if (url.includes("/services/search/FindingService/v1")) {
      soldSearchCalls += 1;
      const parsed = new URL(url);
      const pageNumber = Number(
        parsed.searchParams.get("paginationInput.pageNumber") ?? "1"
      );

      if (pageNumber === 1) {
        return new Response(
          JSON.stringify({
            findCompletedItemsResponse: [
              {
                ack: ["Success"],
                paginationOutput: [{ totalPages: ["2"] }],
                searchResult: [
                  {
                    item: [
                      {
                        itemId: ["1"],
                        title: ["Item 1"],
                        listingInfo: [{ endTime: ["2025-01-01T00:00:00Z"] }],
                        sellingStatus: [
                          { currentPrice: [{ __value__: "10.00" }] },
                        ],
                      },
                      {
                        itemId: ["2"],
                        title: ["Item 2"],
                        listingInfo: [{ endTime: ["2025-01-02T00:00:00Z"] }],
                        sellingStatus: [
                          { currentPrice: [{ __value__: "20.00" }] },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      if (pageNumber === 2) {
        return new Response(
          JSON.stringify({
            findCompletedItemsResponse: [
              {
                ack: ["Success"],
                paginationOutput: [{ totalPages: ["2"] }],
                searchResult: [
                  {
                    item: [
                      {
                        itemId: ["2"],
                        title: ["Item 2 duplicate"],
                        listingInfo: [{ endTime: ["2025-01-02T00:00:00Z"] }],
                        sellingStatus: [
                          { currentPrice: [{ __value__: "20.00" }] },
                        ],
                      },
                      {
                        itemId: ["3"],
                        title: ["Item 3"],
                        listingInfo: [{ endTime: ["2025-01-03T00:00:00Z"] }],
                        sellingStatus: [
                          { currentPrice: [{ __value__: "30.00" }] },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      return new Response(JSON.stringify({ findCompletedItemsResponse: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    throw new Error(`Unexpected fetch URL in test: ${url}`);
  }) as any;

  try {
    const results = await fetchEbaySoldListings("test query", "EBAY_US", {
      limit: 2,
      maxPages: 10,
    });

    assert.equal(soldSearchCalls, 2);
    assert.equal(results.length, 3);
    assert.deepEqual(
      results.map((r) => r.listingId),
      ["1", "2", "3"]
    );
  } finally {
    global.fetch = originalFetch;

    if (originalAppId === undefined) delete process.env.EBAY_APP_ID;
    else process.env.EBAY_APP_ID = originalAppId;

    if (originalClientId === undefined) delete process.env.EBAY_CLIENT_ID;
    else process.env.EBAY_CLIENT_ID = originalClientId;

    if (originalClientSecret === undefined)
      delete process.env.EBAY_CLIENT_SECRET;
    else process.env.EBAY_CLIENT_SECRET = originalClientSecret;
  }
});
