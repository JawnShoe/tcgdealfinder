/**
 * Market flag SVG component for US or CA.
 * Displays country flag icons for eBay marketplaces.
 */

interface MarketFlagProps {
  market: string | null | undefined;
}

export function MarketFlag({ market }: MarketFlagProps): JSX.Element | null {
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
  
  return null;
}
