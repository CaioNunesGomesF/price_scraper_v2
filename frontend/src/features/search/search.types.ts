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
  rating?: number | null;
  reviewCount?: number | null;
  reviewHighlights?: string[];
  priority?: number;
};

export type SearchInterpretation = {
  summary: string;
  keywords?: string[];
  targetProduct?: string;
  maxPrice?: number | null;
  categories?: string[];
  features?: string[];
  priorities?: string[];
  tip?: string | null;
};


export type SearchResult = {
  id?: string | null;
  prompt?: string;
  interpretation: SearchInterpretation;
  offers: Offer[];
  createdAt?: string;
};

export type ChatTurn = {
  id: string;
  prompt: string;
  result: SearchResult | null;
  loading: boolean;
  error: string;
};

export type ChatSession = {
  id: string;
  prompt: string;
  interpretation: SearchInterpretation;
  offers: Offer[];
  createdAt: string;
};

export type ComparisonHighlight = {
  offerId: string;
  label: string;
  text: string;
};

export type ComparisonAnalysis = {
  summary: string;
  recommendation: string;
  priceInsight: string;
  bestOfferId: string | null;
  highlights: ComparisonHighlight[];
};

