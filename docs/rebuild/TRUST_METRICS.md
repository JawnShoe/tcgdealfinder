# Trust Metrics

## Freshness SLOs

- Price/availability data age <= X minutes from source update.
  - X: TBD (initial target: 15m).
  - CI assertion: max(data_age_minutes) <= X at render.
- Seller feedback age <= Y hours from source update.
  - Y: TBD (initial target: 24h).
  - CI assertion: max(seller_feedback_age_hours) <= Y.

## Reliability SLOs

- Input failure rate < 0.1%.
  - Failure = missing critical fields OR parsing errors that change meaning OR invalid normalization (currency, condition, quantity).
  - CI assertion: failure_rate = failures / total_inputs < 0.1% per ingestion run.

## Confidence Score (SSR-only)

- Composite score 0-100 computed server-side only.
- Factor families: freshness, source reputation, price stability, seller signals, rules-based risk flags.
- Deterministic: same inputs => same output.
  - CI assertion: hash(inputs) yields identical score.
- Explainability: every confidence value must be reproducible with same inputs.
- Required provenance fields at render: fetched_at, source, parser_version, confidence_inputs_hash, data_age_minutes.
