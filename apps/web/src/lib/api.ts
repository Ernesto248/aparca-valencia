import { z } from "zod";
import type {
  DataStatus,
  FeatureCollection,
  GeocodeCandidate,
  RecommendationResponse
} from "@/lib/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const geocodeSchema = z.array(
  z.object({
    display_name: z.string(),
    latitude: z.number(),
    longitude: z.number(),
    type: z.string().nullable().optional(),
    importance: z.number().nullable().optional()
  })
);

async function request<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    signal,
    headers: { Accept: "application/json" }
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(body?.detail ?? `Error HTTP ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export async function geocode(query: string, signal?: AbortSignal): Promise<GeocodeCandidate[]> {
  const payload = await request<unknown>(
    `/api/v1/geocode?q=${encodeURIComponent(query)}&limit=5`,
    signal
  );
  return geocodeSchema.parse(payload);
}

export function getNearby(
  latitude: number,
  longitude: number,
  radius: number,
  signal?: AbortSignal
) {
  return request<FeatureCollection>(
    `/api/v1/parking/nearby?latitude=${latitude}&longitude=${longitude}&radius_meters=${radius}&limit=500`,
    signal
  );
}

export function getRecommendations(
  latitude: number,
  longitude: number,
  radius: number,
  signal?: AbortSignal
) {
  return request<RecommendationResponse>(
    `/api/v1/parking/recommendations?latitude=${latitude}&longitude=${longitude}&radius_meters=${radius}&limit=12`,
    signal
  );
}

export function getPredictions(
  latitude: number,
  longitude: number,
  radius: number,
  horizonHours: number,
  signal?: AbortSignal
) {
  return request<FeatureCollection>(
    `/api/v1/parking/predictions?latitude=${latitude}&longitude=${longitude}&radius_meters=${radius}&horizon_hours=${horizonHours}&limit=100`,
    signal
  );
}

export function getRawFeatures(bbox: string, signal?: AbortSignal) {
  return request<FeatureCollection>(
    `/api/v1/parking/features?bbox=${encodeURIComponent(bbox)}&limit=5000`,
    signal
  );
}

export function getDataStatus(signal?: AbortSignal) {
  return request<DataStatus>("/api/v1/data/status", signal);
}
