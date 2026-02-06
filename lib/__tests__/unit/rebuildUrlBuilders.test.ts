import test from "node:test";
import assert from "node:assert/strict";

import { buildDiscoveryUrl, buildListingUrl } from "@/lib/rebuild/urls";

test("buildDiscoveryUrl omits default sort by default", () => {
  assert.equal(buildDiscoveryUrl({ preset: "newest" }), "/discovery");
});

test("buildDiscoveryUrl can include default sort explicitly", () => {
  assert.equal(
    buildDiscoveryUrl({ preset: "newest", includeDefaultPreset: true }),
    "/discovery?sort=newest"
  );
});

test("buildDiscoveryUrl includes non-default sorts", () => {
  assert.equal(
    buildDiscoveryUrl({ preset: "biggest-discount" }),
    "/discovery?sort=biggest-discount"
  );
  assert.equal(
    buildDiscoveryUrl({ preset: "endingSoon" }),
    "/discovery?sort=endingSoon"
  );
});

test("buildDiscoveryUrl serializes discovery filters", () => {
  assert.equal(
    buildDiscoveryUrl({
      preset: "biggest-discount",
      filters: {
        priceMinCad: 10,
        priceMaxCad: 250,
        condition: "NM",
        language: "EN",
        minConfidence: "medium",
        seller: "acme",
      },
    }),
    "/discovery?sort=biggest-discount&minPriceCad=10&maxPriceCad=250&condition=NM&lang=EN&minConfidence=medium&seller=acme"
  );
});

test("buildDiscoveryUrl serializes pagination", () => {
  assert.equal(
    buildDiscoveryUrl({
      preset: "newest",
      pagination: { page: 2, pageSize: 50 },
    }),
    "/discovery?page=2&pageSize=50"
  );
});

test("buildDiscoveryUrl omits default pagination values", () => {
  assert.equal(
    buildDiscoveryUrl({
      preset: "newest",
      pagination: { page: 1, pageSize: 25 },
    }),
    "/discovery"
  );
});

test("buildDiscoveryUrl normalizes unexpected pageSize", () => {
  assert.equal(
    buildDiscoveryUrl({
      preset: "endingSoon",
      pagination: { page: 2, pageSize: 30 },
    }),
    "/discovery?sort=endingSoon&page=2"
  );
});

test("buildListingUrl encodes the listing id", () => {
  assert.equal(buildListingUrl({ id: "abc" }), "/listing/abc");
  assert.equal(
    buildListingUrl({ id: "abc/def?x=1" }),
    "/listing/abc%2Fdef%3Fx%3D1"
  );
});
