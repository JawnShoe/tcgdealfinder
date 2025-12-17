/**
 * Market flag SVG component for all supported eBay markets.
 * Displays country flag icons for US, CA, GB, and AU marketplaces.
 */

interface MarketFlagProps {
  market: string | null | undefined;
}

export function MarketFlag({ market }: MarketFlagProps): JSX.Element {
  const normalized = market?.toUpperCase() ?? "EBAY_US";
  
  if (normalized === "EBAY_US" || normalized === "US") {
    return (
      <svg width="20" height="14" viewBox="0 0 20 14" className="inline-block">
        <rect width="20" height="14" fill="#B22234" />
        <rect y="1.08" width="20" height="1.08" fill="white" />
        <rect y="3.23" width="20" height="1.08" fill="white" />
        <rect y="5.38" width="20" height="1.08" fill="white" />
        <rect y="7.54" width="20" height="1.08" fill="white" />
        <rect y="9.69" width="20" height="1.08" fill="white" />
        <rect y="11.85" width="20" height="1.08" fill="white" />
        <rect width="8" height="7" fill="#3C3B6E" />
      </svg>
    );
  }
  
  if (normalized === "EBAY_CA" || normalized === "CA") {
    return (
      <svg width="20" height="14" viewBox="0 0 20 14" className="inline-block">
        <rect width="20" height="14" fill="white" />
        <rect width="5" height="14" fill="#FF0000" />
        <rect x="15" width="5" height="14" fill="#FF0000" />
        <path d="M10 3 L10.5 5 L12 4.5 L10.8 6 L12.5 6.5 L10.5 7 L11 9 L10 7.5 L9 9 L9.5 7 L7.5 6.5 L9.2 6 L8 4.5 L9.5 5 Z" fill="#FF0000" />
      </svg>
    );
  }
  
  if (normalized === "EBAY_GB" || normalized === "GB" || normalized === "UK" || normalized === "EBAY_UK") {
    return (
      <svg width="20" height="14" viewBox="0 0 20 14" className="inline-block">
        <rect width="20" height="14" fill="#012169" />
        <path d="M0 0 L20 14 M20 0 L0 14" stroke="white" strokeWidth="2.8" />
        <path d="M0 0 L20 14 M20 0 L0 14" stroke="#C8102E" strokeWidth="1.7" />
        <path d="M10 0 L10 14 M0 7 L20 7" stroke="white" strokeWidth="4.7" />
        <path d="M10 0 L10 14 M0 7 L20 7" stroke="#C8102E" strokeWidth="2.8" />
      </svg>
    );
  }
  
  if (normalized === "EBAY_AU" || normalized === "AU") {
    return (
      <svg width="20" height="14" viewBox="0 0 20 14" className="inline-block">
        <rect width="20" height="14" fill="#00008B" />
        <rect width="8" height="7" fill="#00008B" />
        <path d="M0 0 L8 7 M8 0 L0 7" stroke="white" strokeWidth="1.4" />
        <path d="M0 0 L8 7 M8 0 L0 7" stroke="#C8102E" strokeWidth="0.8" />
        <path d="M4 0 L4 7 M0 3.5 L8 3.5" stroke="white" strokeWidth="2.3" />
        <path d="M4 0 L4 7 M0 3.5 L8 3.5" stroke="#C8102E" strokeWidth="1.4" />
        <circle cx="15" cy="10.5" r="0.8" fill="white" />
        <circle cx="13" cy="8" r="0.6" fill="white" />
        <circle cx="16" cy="7" r="0.7" fill="white" />
        <circle cx="18" cy="9" r="0.5" fill="white" />
        <circle cx="14" cy="3" r="0.9" fill="white" />
      </svg>
    );
  }
  
  // Default fallback: US flag (should never happen with clean data)
  return (
    <svg width="20" height="14" viewBox="0 0 20 14" className="inline-block">
      <rect width="20" height="14" fill="#B22234" />
      <rect y="1.08" width="20" height="1.08" fill="white" />
      <rect y="3.23" width="20" height="1.08" fill="white" />
      <rect y="5.38" width="20" height="1.08" fill="white" />
      <rect y="7.54" width="20" height="1.08" fill="white" />
      <rect y="9.69" width="20" height="1.08" fill="white" />
      <rect y="11.85" width="20" height="1.08" fill="white" />
      <rect width="8" height="7" fill="#3C3B6E" />
    </svg>
  );
}
