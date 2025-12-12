/**
 * Centralized table column layout configuration.
 * Defines widths and display rules for table columns across variants.
 * Ensures consistent column rendering across homepage, /newest, card detail, etc.
 */

export type ColumnKey =
  | "card"
  | "total"
  | "historic"
  | "discount"
  | "score"
  | "confidence"
  | "seller"
  | "market"
  | "ends"
  | "admin";

export type TableVariant = "default" | "newest";

export interface ColumnDefinition {
  key: ColumnKey;
  /** Width in pixels or Tailwind width class (e.g., "w-[320px]") */
  width: string;
  /** Minimum width; prevents column from shrinking below this */
  minWidth: string;
  /** Whether text in this column can wrap */
  canWrap: boolean;
  /** Text alignment */
  textAlign: "left" | "right" | "center";
  /** Whether column is flex-shrink-0 (prevents shrinking) */
  noShrink: boolean;
}

export interface ColumnLayoutMap {
  [key in ColumnKey]?: ColumnDefinition;
}

export interface TableLayoutConfig {
  [variant in TableVariant]?: {
    columns: ColumnLayoutMap;
    /** Total minimum width when all columns are displayed */
    totalMinWidth: string;
  };
}

/**
 * Core column definitions shared across variants
 * (only variant-specific overrides in the layout configs below)
 */
const CORE_COLUMNS: Record<ColumnKey, Partial<ColumnDefinition>> = {
  card: {
    textAlign: "left",
    canWrap: false,
    noShrink: false,
  },
  total: {
    textAlign: "right",
    canWrap: false,
    noShrink: true,
  },
  historic: {
    textAlign: "right",
    canWrap: false,
    noShrink: true,
  },
  discount: {
    textAlign: "right",
    canWrap: false,
    noShrink: true,
  },
  score: {
    textAlign: "right",
    canWrap: false,
    noShrink: true,
  },
  confidence: {
    textAlign: "left",
    canWrap: false,
    noShrink: true,
  },
  seller: {
    textAlign: "left",
    canWrap: true,
    noShrink: false,
  },
  market: {
    textAlign: "left",
    canWrap: true,
    noShrink: false,
  },
  ends: {
    textAlign: "left",
    canWrap: false,
    noShrink: true,
  },
  admin: {
    textAlign: "left",
    canWrap: false,
    noShrink: true,
  },
};

/**
 * Default layout (homepage, top-deals, card detail, ending-soon)
 * Card: 320px min (includes thumbnail + text)
 * Total/Historic: 120px fixed
 * Price metrics: flexible but not wrapped
 * Seller: ~120px, can wrap
 * Market: ~150px, can wrap
 * Ends: 96px fixed
 */
export const DEFAULT_LAYOUT: TableLayoutConfig = {
  default: {
    columns: {
      card: {
        key: "card",
        width: "w-[320px]",
        minWidth: "320px",
        textAlign: "left",
        canWrap: false,
        noShrink: false,
      },
      total: {
        key: "total",
        width: "w-[120px]",
        minWidth: "120px",
        textAlign: "right",
        canWrap: false,
        noShrink: true,
      },
      historic: {
        key: "historic",
        width: "w-[120px]",
        minWidth: "120px",
        textAlign: "right",
        canWrap: false,
        noShrink: true,
      },
      discount: {
        key: "discount",
        width: "w-[110px]",
        minWidth: "110px",
        textAlign: "right",
        canWrap: false,
        noShrink: true,
      },
      score: {
        key: "score",
        width: "w-[100px]",
        minWidth: "100px",
        textAlign: "right",
        canWrap: false,
        noShrink: true,
      },
      confidence: {
        key: "confidence",
        width: "w-[120px]",
        minWidth: "120px",
        textAlign: "left",
        canWrap: false,
        noShrink: true,
      },
      seller: {
        key: "seller",
        width: "w-[130px]",
        minWidth: "80px",
        textAlign: "left",
        canWrap: true,
        noShrink: false,
      },
      market: {
        key: "market",
        width: "w-[120px]",
        minWidth: "80px",
        textAlign: "left",
        canWrap: true,
        noShrink: false,
      },
      ends: {
        key: "ends",
        width: "w-[96px]",
        minWidth: "96px",
        textAlign: "left",
        canWrap: false,
        noShrink: true,
      },
      admin: {
        key: "admin",
        width: "w-[100px]",
        minWidth: "100px",
        textAlign: "left",
        canWrap: false,
        noShrink: true,
      },
    },
    totalMinWidth: "1541px", // sum of all fixed widths
  },
  newest: {
    columns: {
      card: {
        key: "card",
        width: "w-[320px]",
        minWidth: "320px",
        textAlign: "left",
        canWrap: false,
        noShrink: false,
      },
      total: {
        key: "total",
        width: "w-[120px]",
        minWidth: "120px",
        textAlign: "right",
        canWrap: false,
        noShrink: true,
      },
      historic: {
        key: "historic",
        width: "w-[120px]",
        minWidth: "120px",
        textAlign: "right",
        canWrap: false,
        noShrink: true,
      },
      discount: {
        key: "discount",
        width: "w-[100px]",
        minWidth: "100px",
        textAlign: "right",
        canWrap: false,
        noShrink: true,
      },
      score: {
        key: "score",
        width: "w-[90px]",
        minWidth: "90px",
        textAlign: "right",
        canWrap: false,
        noShrink: true,
      },
      confidence: {
        key: "confidence",
        width: "w-[100px]",
        minWidth: "100px",
        textAlign: "left",
        canWrap: false,
        noShrink: true,
      },
      seller: {
        key: "seller",
        width: "w-[100px]",
        minWidth: "70px",
        textAlign: "left",
        canWrap: true,
        noShrink: false,
      },
      market: {
        key: "market",
        width: "w-auto",
        minWidth: "0",
        textAlign: "left",
        canWrap: true,
        noShrink: false,
      },
      ends: {
        key: "ends",
        width: "w-[96px]",
        minWidth: "96px",
        textAlign: "left",
        canWrap: false,
        noShrink: true,
      },
    },
    totalMinWidth: "1416px",
  },
};

/**
 * Get column definition for a specific variant
 * @param variant - Table variant
 * @param columnKey - Column to retrieve
 * @returns Column definition or undefined if not found
 */
export function getColumnDefinition(
  variant: TableVariant,
  columnKey: ColumnKey,
): ColumnDefinition | undefined {
  const layoutConfig = DEFAULT_LAYOUT[variant];
  if (!layoutConfig) return undefined;
  return layoutConfig.columns[columnKey];
}

/**
 * Get column width classes for both header and body cells
 * @param variant - Table variant
 * @param columnKey - Column to retrieve
 * @returns Object with width, minWidth, and Tailwind classes
 */
export function getColumnClasses(
  variant: TableVariant,
  columnKey: ColumnKey,
): { width: string; minWidth: string; classes: string } {
  const col = getColumnDefinition(variant, columnKey);
  if (!col) {
    return { width: "", minWidth: "", classes: "" };
  }

  const classes = [col.width];

  if (col.noShrink) {
    classes.push("flex-none");
  }

  return {
    width: col.width,
    minWidth: col.minWidth,
    classes: classes.join(" "),
  };
}

/**
 * Get text alignment class for a column
 * @param columnKey - Column to align
 * @returns Tailwind text-align class
 */
export function getColumnTextAlignment(columnKey: ColumnKey): string {
  const textAlign = CORE_COLUMNS[columnKey]?.textAlign ?? "left";
  if (textAlign === "right") return "text-right";
  if (textAlign === "center") return "text-center";
  return "text-left";
}

/**
 * Get all column keys for a variant in display order
 * @param variant - Table variant
 * @returns Ordered array of column keys
 */
export function getVariantColumnKeys(variant: TableVariant): ColumnKey[] {
  const layoutConfig = DEFAULT_LAYOUT[variant];
  if (!layoutConfig) return [];
  return Object.keys(layoutConfig.columns) as ColumnKey[];
}
