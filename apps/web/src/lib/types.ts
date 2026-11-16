import type { Geometry } from "geojson";

export type Coordinates = {
  latitude: number;
  longitude: number;
};

export type Destination = Coordinates & {
  label: string;
};

export type GeocodeCandidate = Coordinates & {
  display_name: string;
  type?: string | null;
  importance?: number | null;
};

export type GeoJSONFeature = {
  type: "Feature";
  id?: string | null;
  geometry: Geometry;
  properties: Record<string, unknown>;
};

export type FeatureCollection = {
  type: "FeatureCollection";
  features: GeoJSONFeature[];
  meta: Record<string, unknown>;
};

export type ProbabilityLevel = "high" | "medium" | "low";

export type ParkingPrediction = {
  id: string;
  streetName: string;
  latitude: number;
  longitude: number;
  distanceMeters: number;
  occupancyPercent: number;
  probabilityLevel: ProbabilityLevel;
  horizonHours: 1 | 6 | 12 | 24;
  importedAt: string;
};

export type Recommendation = {
  id: string;
  street_name: string;
  latitude: number;
  longitude: number;
  distance_meters: number;
  evidence_count: number;
  strategy: "heuristic_v0";
  ranking_score: number;
  availability_probability: null;
  availability_status: "unknown";
  confidence: "unvalidated";
  explanation: string;
  data_source: string;
  imported_at?: string | null;
};

export type RecommendationResponse = {
  destination: Coordinates;
  radius_meters: number;
  items: Recommendation[];
  warning: string;
};

export type DataStatus = {
  source: string;
  available: boolean;
  last_successful_sync: string | null;
  records: number;
  zones: number;
  stale: boolean;
  warning: string | null;
};

