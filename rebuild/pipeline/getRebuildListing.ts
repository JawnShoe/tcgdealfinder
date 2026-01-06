export type RebuildListingResult = {
  listing: {
    id: string;
    title: string;
    price: string;
    currency: string;
    priceDelta: string;
    condition: string;
    availability: string;
    seller: string;
    url?: string;
  };
  trust: {
    confidence: string;
    source: string;
    fetchedAtISO: string;
    dataAge: string;
  };
  transparency: {
    sources: string[];
    computedAtISO: string;
    inputs: string[];
    pipelineVersion: string;
  };
};

type GetRebuildListingInput = {
  id: string;
};

const rebuildStub = {
  price: "199.00",
  currency: "USD",
  priceDelta: "-12%",
  condition: "NM",
  availability: "In stock",
  seller: "Rebuild Seller",
  source: "rebuild-stub-v0",
  fetchedAtISO: "2026-01-05T12:00:00Z",
  computedAtISO: "2026-01-05T12:00:00Z",
  confidence: "72 / 100",
  dataAge: "5m",
  pipelineVersion: "v0-stub",
  inputs: [
    "Price below recent median for the same condition.",
    "Seller meets baseline trust thresholds.",
    "Listing includes clear condition and direct outbound link.",
  ],
};

export async function getRebuildListing({
  id,
}: GetRebuildListingInput): Promise<RebuildListingResult> {
  return {
    listing: {
      id,
      title: `Rebuild Listing ${id}`,
      price: rebuildStub.price,
      currency: rebuildStub.currency,
      priceDelta: rebuildStub.priceDelta,
      condition: rebuildStub.condition,
      availability: rebuildStub.availability,
      seller: rebuildStub.seller,
    },
    trust: {
      confidence: rebuildStub.confidence,
      source: rebuildStub.source,
      fetchedAtISO: rebuildStub.fetchedAtISO,
      dataAge: rebuildStub.dataAge,
    },
    transparency: {
      sources: [rebuildStub.source],
      computedAtISO: rebuildStub.computedAtISO,
      inputs: rebuildStub.inputs,
      pipelineVersion: rebuildStub.pipelineVersion,
    },
  };
}
