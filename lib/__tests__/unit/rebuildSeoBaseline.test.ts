import test from "node:test";
import assert from "node:assert/strict";

import type { ListingDomain } from "@/lib/rebuild/data/listingMapper";
import {
  buildDiscoveryCanonicalUrl,
  buildListingCanonicalUrl,
} from "@/lib/rebuild/seo/canonical";
import { buildListingJsonLd } from "@/lib/rebuild/seo/structuredData";
import { deriveTrustAssessment } from "@/lib/rebuild/trust/trustAssessment";

function withSiteUrl(url: string | null, fn: () => void) {
  const original = process.env.NEXT_PUBLIC_SITE_URL;
  if (url) {
    process.env.NEXT_PUBLIC_SITE_URL = url;
  } else {
    delete process.env.NEXT_PUBLIC_SITE_URL;
  }
  try {
    fn();
  } finally {
    if (original) {
      process.env.NEXT_PUBLIC_SITE_URL = original;
    } else {
      delete process.env.NEXT_PUBLIC_SITE_URL;
    }
  }
}

test("discovery canonical strips unknown params and normalizes sort", () => {
  withSiteUrl("https://example.com", () => {
    const canonical = buildDiscoveryCanonicalUrl({
      sort: "biggest-discount",
      foo: "bar",
    });
    assert.equal(
      canonical,
      "https://example.com/rebuild/discovery?sort=biggest-discount"
    );
  });
});

test("discovery canonical omits default sort", () => {
  withSiteUrl("https://example.com", () => {
    const canonical = buildDiscoveryCanonicalUrl({
      sort: "newest",
      q: "charizard",
    });
    assert.equal(canonical, "https://example.com/rebuild/discovery");
  });
});

test("listing JSON-LD includes required fields", () => {
  withSiteUrl("https://example.com", () => {
    const trust: ListingDomain["trust"] = {
      confidence: {
        weight: 0.8,
        label: "high",
        display: "80 / 100",
      },
      source: "EBAY",
      fetchedAtISO: "2026-01-01T00:00:00Z",
      dataAgeLabel: "0m",
    };
    const freshness: ListingDomain["freshness"] = {
      fetchedAtISO: "2026-01-01T00:00:00Z",
      dataAgeLabel: "0m",
      dataAgeSeconds: 0,
    };
    const reliability: ListingDomain["reliability"] = {
      integrityStatus: "OK",
      integrityReason: null,
      shippingKnown: true,
    };
    const riskFlags: ListingDomain["riskFlags"] = [];
    const trustAssessment = deriveTrustAssessment({
      trust,
      freshness,
      reliability,
      riskFlags,
    });
    const listing: ListingDomain = {
      listingId: "rebuild-e2e-1",
      title: "Rebuild E2E Listing",
      url: "https://example.com/rebuild-e2e-1",
      price: {
        amount: 120,
        currency: "USD",
        totalCad: null,
        totalUsd: 120,
        totalNative: 120,
        discountPercent: 12.34,
        display: "120.00 USD",
        deltaDisplay: "12.34%",
      },
      seller: {
        name: "E2E Seller",
        username: "e2e_seller",
        feedbackCount: 250,
        positivePercent: 99.8,
      },
      condition: "NM",
      setName: "Evolving Skies",
      language: "EN",
      availability: "In stock",
      provenance: {
        source: "EBAY",
        listingId: "rebuild-e2e-1",
        market: "EBAY_US",
        fetchedAtISO: "2026-01-01T00:00:00Z",
        snapshotAtISO: "2026-01-01T00:00:00Z",
        ingestedAtISO: "2026-01-01T00:00:00Z",
        updatedAtISO: "2026-01-01T00:00:00Z",
      },
      trust,
      trustAssessment,
      freshness,
      reliability,
      transparency: {
        sources: ["EBAY", "EBAY_US"],
        computedAtISO: "2026-01-01T00:00:00Z",
        inputs: ["deal_confidence_weight from listings."],
        pipelineVersion: "rebuild-db-v1",
      },
      riskFlags: [],
    };

    const jsonLd = buildListingJsonLd(listing);
    assert.equal(jsonLd["@type"], "Product");
    assert.equal(jsonLd["name"], listing.title);
    assert.equal(jsonLd["sku"], listing.listingId);
    assert.equal(jsonLd["url"], buildListingCanonicalUrl(listing.listingId));

    const offers = jsonLd["offers"] as Record<string, unknown>;
    assert.equal(offers["@type"], "Offer");
    assert.equal(offers["priceCurrency"], "USD");
    assert.equal(offers["price"], "120.00");
    assert.equal(offers["url"], listing.url);
  });
});
