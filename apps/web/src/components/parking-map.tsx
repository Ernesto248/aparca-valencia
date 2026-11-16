"use client";

import { layers, namedFlavor } from "@protomaps/basemaps";
import * as maplibregl from "maplibre-gl";
import type { GeoJSONSource, Map as MapLibreMap, MapMouseEvent, StyleSpecification } from "maplibre-gl";
import { Protocol } from "pmtiles";
import { useEffect, useRef } from "react";
import type { FeatureCollection as GeoJSONFeatureCollection, Geometry } from "geojson";
import type { Destination, FeatureCollection } from "@/lib/types";

maplibregl.setWorkerUrl(
  new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).toString()
);

const EMPTY: FeatureCollection = { type: "FeatureCollection", features: [], meta: {} };
let protocolRegistered = false;

type Props = {
  destination: Destination | null;
  zones?: FeatureCollection;
  predictions?: FeatureCollection;
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

function selectedZoneData(
  zones: FeatureCollection,
  predictions: FeatureCollection,
  selectedId: string | null
): GeoJSONFeatureCollection {
  if (!selectedId) return withIds(EMPTY);
  const selected =
    predictions.features.find((feature) => feature.id === selectedId) ??
    zones.features.find((feature) => feature.id === selectedId);
  return withIds({
    type: "FeatureCollection",
    features: selected ? [selected] : [],
    meta: {}
  });
}

function selectedZoneAnchor(
  zones: FeatureCollection,
  predictions: FeatureCollection,
  selectedId: string | null
): GeoJSONFeatureCollection {
  if (!selectedId) return withIds(EMPTY);
  const selected =
    predictions.features.find((feature) => feature.id === selectedId) ??
    zones.features.find((feature) => feature.id === selectedId);
  const bounds = selected ? geometryBounds(selected.geometry) : null;
  if (!bounds) return withIds(EMPTY);
  const center = bounds.getCenter();
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: { type: "Point", coordinates: [center.lng, center.lat] },
        properties: { id: selectedId }
      }
    ]
  };
}

function geometryBounds(geometry: Geometry): maplibregl.LngLatBounds | null {
  const bounds = new maplibregl.LngLatBounds();

  function extendCoordinates(value: unknown) {
    if (!Array.isArray(value)) return;
    if (
      value.length >= 2 &&
      typeof value[0] === "number" &&
      typeof value[1] === "number"
    ) {
      bounds.extend([value[0], value[1]]);
      return;
    }
    value.forEach(extendCoordinates);
  }

  if (geometry.type === "GeometryCollection") {
    geometry.geometries.forEach((item) => {
      const itemBounds = geometryBounds(item);
      if (itemBounds) {
        bounds.extend(itemBounds.getSouthWest());
        bounds.extend(itemBounds.getNorthEast());
      }
    });
  } else {
    extendCoordinates(geometry.coordinates);
  }

  return bounds.isEmpty() ? null : bounds;
}

function focusZone(
  map: MapLibreMap,
  zones: FeatureCollection,
  predictions: FeatureCollection,
  selectedId: string
) {
  const feature =
    predictions.features.find((item) => item.id === selectedId) ??
    zones.features.find((item) => item.id === selectedId);
  if (!feature) return;
  const bounds = geometryBounds(feature.geometry);
  if (!bounds) return;

  const mobile = window.innerWidth < 768;
  map.fitBounds(bounds, {
    padding: mobile
      ? { top: 112, right: 28, bottom: 210, left: 28 }
      : { top: 104, right: 64, bottom: 64, left: 450 },
    maxZoom: 17.5,
    duration: 700,
    essential: true
  });
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
  predictions = EMPTY,
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
  const dataRef = useRef({ destination, zones, predictions, rawFeatures, selectedId });

  useEffect(() => {
    dataRef.current = { destination, zones, predictions, rawFeatures, selectedId };
  }, [destination, zones, predictions, rawFeatures, selectedId]);

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
      map.addSource("selected-zone", {
        type: "geojson",
        data: selectedZoneData(current.zones, current.predictions, current.selectedId)
      });
      map.addSource("selected-zone-anchor", {
        type: "geojson",
        data: selectedZoneAnchor(current.zones, current.predictions, current.selectedId)
      });
      map.addLayer({
        id: "zones-shadow",
        type: "line",
        source: "zones",
        paint: { "line-color": "#ffffff", "line-width": 6, "line-opacity": 0.65 }
      });
      map.addLayer({
        id: "zones",
        type: "line",
        source: "zones",
        paint: { "line-color": "#82979b", "line-width": 2.5, "line-opacity": 0.55 }
      });
      map.addSource("predictions", { type: "geojson", data: withIds(current.predictions) });
      map.addLayer({
        id: "predictions-shadow",
        type: "line",
        source: "predictions",
        paint: { "line-color": "#ffffff", "line-width": 10, "line-opacity": 0.9 }
      });
      map.addLayer({
        id: "predictions",
        type: "line",
        source: "predictions",
        paint: { "line-color": "#10373e", "line-width": 6, "line-opacity": 0.95 }
      });
      map.addLayer({
        id: "zone-selected-shadow",
        type: "line",
        source: "selected-zone",
        paint: { "line-color": "#ffffff", "line-width": 13, "line-opacity": 0.96 }
      });
      map.addLayer({
        id: "zone-selected",
        type: "line",
        source: "selected-zone",
        paint: { "line-color": "#e86f51", "line-width": 8, "line-opacity": 1 }
      });
      map.addLayer({
        id: "zone-selected-anchor",
        type: "circle",
        source: "selected-zone-anchor",
        paint: {
          "circle-radius": 8,
          "circle-color": "#e86f51",
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 4
        }
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
      if (current.selectedId) {
        focusZone(map, current.zones, current.predictions, current.selectedId);
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
      const features = map.queryRenderedFeatures(event.point, {
        layers: ["zone-selected", "predictions"]
      });
      const id = features[0]?.properties?.id as string | undefined;
      if (id) callbacksRef.current.onZoneSelect(id);
    });

    map.on("mouseenter", "predictions", () => { map.getCanvas().style.cursor = "pointer"; });
    map.on("mouseleave", "predictions", () => { map.getCanvas().style.cursor = ""; });
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
    (map.getSource("predictions") as GeoJSONSource | undefined)?.setData(withIds(predictions));
  }, [predictions]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.isStyleLoaded()) return;
    (map.getSource("raw-features") as GeoJSONSource | undefined)?.setData(withIds(rawFeatures));
  }, [rawFeatures]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.getLayer("zone-selected")) return;
    (map.getSource("selected-zone") as GeoJSONSource | undefined)?.setData(
      selectedZoneData(zones, predictions, selectedId)
    );
    (map.getSource("selected-zone-anchor") as GeoJSONSource | undefined)?.setData(
      selectedZoneAnchor(zones, predictions, selectedId)
    );
    if (selectedId) focusZone(map, zones, predictions, selectedId);
  }, [selectedId, zones, predictions]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full"
      aria-label="Mapa de predicción de aparcamiento y zonas municipales"
    />
  );
}
