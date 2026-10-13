export type Offer = {
  id: string;
  source: string;
  title: string;
  price: number;
  currency: "BRL";
  originalPrice: number | null;
  freeShipping: boolean;
  seller: string | null;
  location: string | null;
  permalink: string;
  thumbnail: string | null;
  updatedAt: string;
};

export type SearchResult = {
  interpretation: { summary: string; keywords: string[] };
  offers: Offer[];
};
