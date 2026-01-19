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

test("buildListingUrl encodes the listing id", () => {
  assert.equal(buildListingUrl({ id: "abc" }), "/rebuild/listing/abc");
  assert.equal(
    buildListingUrl({ id: "abc/def?x=1" }),
    "/rebuild/listing/abc%2Fdef%3Fx%3D1"
  );
});
