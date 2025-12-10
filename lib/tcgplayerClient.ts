import "server-only";

const API_BASE = "https://api.tcgplayer.com";

export type TcgplayerGroup = {
  groupId: number;
  name: string;
  abbreviation?: string | null;
  publishedOn?: string | null;
};

export type TcgplayerProduct = {
  productId: number;
  groupId: number;
  name: string;
  number?: string | null;
  rarity?: string | null;
  supertype?: string | null;
  subtypes?: string[];
  imageUrl?: string | null;
};

type TokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
};

type ApiListResponse<T> = {
  totalResults?: number;
  results?: T[];
};

let cachedToken: { token: string; expiresAt: number } | null = null;

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set. Please add it to your environment.`);
  }
  return value;
}

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.token;
  }

  const publicKey = getEnv("TCGPLAYER_PUBLIC_KEY");
  const privateKey = getEnv("TCGPLAYER_PRIVATE_KEY");

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: publicKey,
    client_secret: privateKey,
  });

  const response = await fetch(`${API_BASE}/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to obtain TCGplayer token: ${response.status} ${text}`);
  }

  const data = (await response.json()) as TokenResponse;
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return cachedToken.token;
}

async function fetchWithAuth<T>(url: string): Promise<ApiListResponse<T>> {
  const token = await getAccessToken();
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`TCGplayer request failed (${response.status}): ${text}`);
  }

  return (await response.json()) as ApiListResponse<T>;
}

export async function fetchPokemonGroups(): Promise<TcgplayerGroup[]> {
  const results: TcgplayerGroup[] = [];
  const limit = 100;
  let offset = 0;
  while (true) {
    const url = `${API_BASE}/catalog/groups?productLineName=Pokemon&limit=${limit}&offset=${offset}`;
    const data = await fetchWithAuth<TcgplayerGroup>(url);
    const page = data.results ?? [];
    results.push(
      ...page.map((group) => ({
        groupId: Number(group.groupId),
        name: group.name,
        abbreviation: group.abbreviation ?? null,
        publishedOn: group.publishedOn ?? null,
      })),
    );
    if (page.length < limit) {
      break;
    }
    offset += limit;
    if (data.totalResults && offset >= data.totalResults) {
      break;
    }
  }
  return results;
}

type RawProduct = {
  productId: number;
  groupId: number;
  name: string;
  productCategoryName?: string | null;
  imageUrl?: string | null;
  cleanName?: string | null;
  number?: string | null;
  rarity?: string | null;
  extendedData?: { name: string; value: string }[];
};

function mapProduct(product: RawProduct): TcgplayerProduct {
  const extended = new Map<string, string>();
  for (const entry of product.extendedData ?? []) {
    extended.set(entry.name.toLowerCase(), entry.value);
  }
  const supertype = extended.get("card type") ?? extended.get("type") ?? null;
  const subtypeRaw = extended.get("subtype") ?? extended.get("subtypes") ?? null;
  const subtypes = subtypeRaw ? subtypeRaw.split("/").map((value) => value.trim()).filter(Boolean) : undefined;

  return {
    productId: Number(product.productId),
    groupId: Number(product.groupId),
    name: product.name ?? product.cleanName ?? "Unknown product",
    number: product.number ?? extended.get("number") ?? null,
    rarity: product.rarity ?? extended.get("rarity") ?? null,
    supertype,
    subtypes,
    imageUrl: product.imageUrl ?? null,
  };
}

export async function fetchGroupProducts(groupId: number): Promise<TcgplayerProduct[]> {
  const results: TcgplayerProduct[] = [];
  const limit = 500;
  let offset = 0;
  while (true) {
    const url = `${API_BASE}/catalog/products?groupId=${groupId}&offset=${offset}&limit=${limit}&getExtendedFields=true`;
    const data = await fetchWithAuth<RawProduct>(url);
    const page = data.results ?? [];
    results.push(...page.map(mapProduct));
    if (page.length < limit) {
      break;
    }
    offset += limit;
    if (data.totalResults && offset >= data.totalResults) {
      break;
    }
  }
  return results;
}
