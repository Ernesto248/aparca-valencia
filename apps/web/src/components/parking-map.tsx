"use client";

import { layers, namedFlavor } from "@protomaps/basemaps";
import * as maplibregl from "maplibre-gl";
import type { GeoJSONSource, Map as MapLibreMap, MapMouseEvent, StyleSpecification } from "maplibre-gl";
import { Protocol } from "pmtiles";
import { useEffect, useRef } from "react";
import type { FeatureCollection as GeoJSONFeatureCollection } from "geojson";
import type { Destination, FeatureCollection } from "@/lib/types";

maplibregl.setWorkerUrl(
  new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).toString()
);

const EMPTY: FeatureCollection = { type: "FeatureCollection", features: [], meta: {} };
let protocolRegistered = false;

type Props = {
  destination: Destination | null;
  zones?: FeatureCollection;
  rawFeatures?: FeatureCollection;
  selectedId: string | null;
  manualMode: boolean;
  onManualSelect: (longitude: number, latitude: number) => void;
  onZoneSelect: (id: string) => void;
  onDetailViewport: (bbox: string | null) => void;
};

function withIds(collection: FeatureCollection): GeoJSONFeatureCollection {
  return {
    type: "FeatureCollection",
    features: collection.features.map((feature) => ({
      ...feature,
      properties: { ...feature.properties, id: feature.id }
    }))
  } as GeoJSONFeatureCollection;
}

function createStyle(): StyleSpecification {
  const tilesUrl = process.env.NEXT_PUBLIC_PM_TILES_URL ?? "http://localhost:8080/maps/valencia.pmtiles";
  const assetsUrl = process.env.NEXT_PUBLIC_MAP_ASSETS_URL ?? "http://localhost:8080/maps";
  return {
    version: 8,
    glyphs: `${assetsUrl}/fonts/{fontstack}/{range}.pbf`,
    sprite: `${assetsUrl}/sprites/light`,
    sources: {
      protomaps: {
        type: "vector",
        url: `pmtiles://${tilesUrl}`,
        attribution: '<a href="https://www.openstreetmap.org/copyright">© OpenStreetMap</a> · Protomaps'
      }
    },
    layers: layers("protomaps", namedFlavor("light"), { lang: "es" })
  } as StyleSpecification;
}

export default function ParkingMap({
  destination,
  zones = EMPTY,
  rawFeatures = EMPTY,
  selectedId,
  manualMode,
  onManualSelect,
  onZoneSelect,
  onDetailViewport
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const manualModeRef = useRef(manualMode);
  const callbacksRef = useRef({ onManualSelect, onZoneSelect, onDetailViewport });
  const dataRef = useRef({ destination, zones, rawFeatures, selectedId });

  useEffect(() => {
    dataRef.current = { destination, zones, rawFeatures, selectedId };
  }, [destination, zones, rawFeatures, selectedId]);

  useEffect(() => {
    manualModeRef.current = manualMode;
    callbacksRef.current = { onManualSelect, onZoneSelect, onDetailViewport };
  }, [manualMode, onManualSelect, onZoneSelect, onDetailViewport]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    if (!protocolRegistered) {
      const protocol = new Protocol();
      maplibregl.addProtocol("pmtiles", protocol.tile);
      protocolRegistered = true;
    }
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: createStyle(),
      center: [-0.3763, 39.4699],
      zoom: 12.2,
      minZoom: 10,
      maxZoom: 19,
      attributionControl: { compact: true }
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");

    map.on("load", () => {
      const current = dataRef.current;
      map.addSource("zones", { type: "geojson", data: withIds(current.zones) });
      map.addLayer({
        id: "zones-shadow",
        type: "line",
        source: "zones",
        paint: { "line-color": "#ffffff", "line-width": 8, "line-opacity": 0.8 }
      });
      map.addLayer({
        id: "zones",
        type: "line",
        source: "zones",
        paint: { "line-color": "#167085", "line-width": 4, "line-opacity": 0.88 }
      });
      map.addLayer({
        id: "zone-selected",
        type: "line",
        source: "zones",
        filter: ["==", ["get", "id"], current.selectedId ?? ""],
        paint: { "line-color": "#e86f51", "line-width": 7 }
      });
      map.addSource("raw-features", { type: "geojson", data: withIds(current.rawFeatures) });
      map.addLayer({
        id: "raw-features",
        type: "line",
        source: "raw-features",
        minzoom: 16,
        paint: { "line-color": "#10373e", "line-width": 2.2, "line-opacity": 0.9 }
      });
      map.addSource("destination", {
        type: "geojson",
        data: current.destination
          ? {
              type: "Feature",
              geometry: {
                type: "Point",
                coordinates: [current.destination.longitude, current.destination.latitude]
              },
              properties: {}
            }
          : withIds(EMPTY)
      });
      map.addLayer({
        id: "destination-halo",
        type: "circle",
        source: "destination",
        paint: { "circle-radius": 13, "circle-color": "#ffffff", "circle-opacity": 0.92 }
      });
      if (current.destination) {
        map.flyTo({
          center: [current.destination.longitude, current.destination.latitude],
          zoom: 15,
          essential: true
        });
      }
      map.addLayer({
        id: "destination",
        type: "circle",
        source: "destination",
        paint: { "circle-radius": 8, "circle-color": "#e86f51", "circle-stroke-width": 2, "circle-stroke-color": "#10373e" }
      });
    });

    map.on("click", (event: MapMouseEvent) => {
      if (manualModeRef.current) {
        callbacksRef.current.onManualSelect(event.lngLat.lng, event.lngLat.lat);
        return;
      }
      const features = map.queryRenderedFeatures(event.point, { layers: ["zones", "zone-selected"] });
      const id = features[0]?.properties?.id as string | undefined;
      if (id) callbacksRef.current.onZoneSelect(id);
    });

    map.on("mouseenter", "zones", () => { map.getCanvas().style.cursor = "pointer"; });
    map.on("mouseleave", "zones", () => { map.getCanvas().style.cursor = ""; });
    const reportViewport = () => {
      if (map.getZoom() < 16) {
        callbacksRef.current.onDetailViewport(null);
        return;
      }
      const bounds = map.getBounds();
      callbacksRef.current.onDetailViewport(
        [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()]
          .map((value) => value.toFixed(6))
          .join(",")
      );
    };
    map.on("moveend", reportViewport);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.isStyleLoaded()) return;
    (map.getSource("zones") as GeoJSONSource | undefined)?.setData(withIds(zones));
    if (destination) {
      (map.getSource("destination") as GeoJSONSource | undefined)?.setData({
        type: "Feature",
        geometry: { type: "Point", coordinates: [destination.longitude, destination.latitude] },
        properties: {}
      });
      map.flyTo({ center: [destination.longitude, destination.latitude], zoom: 15, essential: true });
    }
  }, [destination, zones]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.isStyleLoaded()) return;
    (map.getSource("raw-features") as GeoJSONSource | undefined)?.setData(withIds(rawFeatures));
  }, [rawFeatures]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.getLayer("zone-selected")) return;
    map.setFilter("zone-selected", ["==", ["get", "id"], selectedId ?? ""]);
  }, [selectedId]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full"
      aria-label="Mapa de zonas de aparcamiento no regulado"
    />
  );
}
