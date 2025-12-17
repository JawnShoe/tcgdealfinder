/**
 * Seller display utilities
 * Single source of truth for seller name rendering across all components.
 */

type SellerInfo = {
  username: string | null | undefined;
  storeName?: string | null | undefined;
  feedbackCount?: number | null | undefined;
  feedbackPercent?: number | null | undefined;
};

export type SellerDisplayData = {
  /**
   * The primary display name to show in UI
   * Always use this for visible seller text
   */
  displayName: string;
  
  /**
   * Whether this seller has a store name different from username
   */
  hasStoreName: boolean;
  
  /**
   * Tooltip data for hover/tap interactions
   */
  tooltip: {
    title: string;
    rows: Array<{ label: string; value: string | number }>;
  };
};

export function normalizeSellerStoreName(
  name?: string | null,
): string | null {
  if (!name) {
    return null;
  }
  const trimmed = name.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Global display rule: sellerDisplayName = sellerStoreName ?? sellerUsername
 * 
 * Returns the name to display in UI (store name if available, else username)
 * and tooltip data for transparency.
 */
export function getSellerDisplayData(seller: SellerInfo): SellerDisplayData {
  const username = seller.username?.trim() || null;
  const storeName = normalizeSellerStoreName(seller.storeName);
  
  // Display priority: store name > username > placeholder
  const displayName = storeName || username || "Unknown";
  const hasStoreName = !!(storeName && username && storeName.toLowerCase() !== username.toLowerCase());
  
  // Build tooltip rows
  const tooltipRows: Array<{ label: string; value: string | number }> = [];
  
  // Only show store name row if it's different from username
  if (hasStoreName && storeName) {
    tooltipRows.push({ label: "Store", value: storeName });
  }
  
  // Show account/username if available AND if there's either:
  // - A different store name being shown, OR
  // - Feedback data to supplement
  const hasFeedbackData = 
    (seller.feedbackPercent != null && seller.feedbackPercent > 0) ||
    (seller.feedbackCount != null && seller.feedbackCount > 0);
  
  if (username && (hasStoreName || hasFeedbackData)) {
    tooltipRows.push({ label: "Account", value: username });
  }
  
  // Optional feedback data
  if (seller.feedbackPercent != null && seller.feedbackPercent > 0) {
    tooltipRows.push({ 
      label: "Feedback", 
      value: `${seller.feedbackPercent}%` 
    });
  }
  
  if (seller.feedbackCount != null && seller.feedbackCount > 0) {
    tooltipRows.push({ 
      label: "Sales", 
      value: seller.feedbackCount 
    });
  }
  
  return {
    displayName,
    hasStoreName,
    tooltip: {
      title: "Seller (eBay)",
      rows: tooltipRows,
    },
  };
}

/**
 * Quick helper to get just the display name
 * Use this when you only need the name text (not tooltip data)
 */
export function getSellerDisplayName(seller: SellerInfo): string {
  return getSellerDisplayData(seller).displayName;
}

/**
 * Format seller info for aria-label or title attribute
 */
export function getSellerAriaLabel(seller: SellerInfo): string {
  const data = getSellerDisplayData(seller);
  const parts = data.tooltip.rows.map(row => `${row.label}: ${row.value}`);
  return `${data.tooltip.title} - ${parts.join(", ")}`;
}

type SellerNameCarrier = {
  sellerStoreName?: string | null;
  sellerUsername?: string | null;
};

const STORE_NAME_WARN_THRESHOLD = 0.25;

export function warnIfStoreNamesMissing(
  items: SellerNameCarrier[],
  context: string,
): void {
  if (process.env.NODE_ENV === "production" || items.length === 0) {
    return;
  }
  const missing = items.filter(
    (item) => !item.sellerStoreName && item.sellerUsername,
  ).length;
  const ratio = missing / items.length;
  if (ratio > STORE_NAME_WARN_THRESHOLD) {
    console.warn(
      `[seller-store-name] ${context}: ${missing}/${items.length} listings missing seller_store_name`,
    );
  }
}
