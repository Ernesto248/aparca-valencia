"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertCircle, CarFront, ChevronUp, Database, ExternalLink, Info, LoaderCircle, MapPinned } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { getDataStatus, geocode, getNearby, getPredictions, getRawFeatures } from "@/lib/api";
import type { Destination, GeocodeCandidate, ParkingPrediction, ProbabilityLevel } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PredictionCard } from "@/components/prediction-card";
import { SearchPanel } from "@/components/search-panel";
import { cn } from "@/lib/utils";

const ParkingMap = dynamic(() => import("@/components/parking-map"), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center bg-[#dcebee]"><LoaderCircle className="size-8 animate-spin text-[var(--petrol)]" /></div>
});

const RADII = [250, 500, 750, 1000];
const HORIZONS = [1, 6, 12, 24] as const;

function predictionItems(data: Awaited<ReturnType<typeof getPredictions>> | undefined): ParkingPrediction[] {
  if (!data) return [];
  return data.features.flatMap((feature) => {
    const properties = feature.properties;
    const level = properties.probability_level;
    if (
      !feature.id ||
      typeof properties.street_name !== "string" ||
      typeof properties.latitude !== "number" ||
      typeof properties.longitude !== "number" ||
      typeof properties.distance_meters !== "number" ||
      typeof properties.occupancy_percent !== "number" ||
      typeof properties.horizon_hours !== "number" ||
      typeof properties.imported_at !== "string" ||
      (level !== "high" && level !== "medium" && level !== "low")
    ) {
      return [];
    }
    return [{
      id: feature.id,
      streetName: properties.street_name,
      latitude: properties.latitude,
      longitude: properties.longitude,
      distanceMeters: properties.distance_meters,
      occupancyPercent: properties.occupancy_percent,
      probabilityLevel: level as ProbabilityLevel,
      horizonHours: properties.horizon_hours as 1 | 6 | 12 | 24,
      importedAt: properties.imported_at
    }];
  });
}

export function ParkingApp() {
  const [query, setQuery] = useState("");
  const [candidates, setCandidates] = useState<GeocodeCandidate[]>([]);
  const [destination, setDestination] = useState<Destination | null>(null);
  const [radius, setRadius] = useState(500);
  const [horizon, setHorizon] = useState<(typeof HORIZONS)[number]>(1);
  const [manualMode, setManualMode] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mapFocus, setMapFocus] = useState(false);
  const [detailBbox, setDetailBbox] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const geocodeAbortRef = useRef<AbortController | null>(null);

  const geocodeMutation = useMutation({
    mutationFn: ({ value }: { value: string }) => {
      geocodeAbortRef.current?.abort();
      const controller = new AbortController();
      geocodeAbortRef.current = controller;
      return geocode(value, controller.signal);
    },
    onSuccess: (results) => {
      setCandidates(results);
      if (results.length === 1) selectCandidate(results[0]);
    }
  });

  useEffect(() => () => geocodeAbortRef.current?.abort(), []);

  const statusQuery = useQuery({ queryKey: ["data-status"], queryFn: ({ signal }) => getDataStatus(signal) });
  const zonesQuery = useQuery({
    queryKey: ["nearby", destination?.latitude, destination?.longitude, radius],
    queryFn: ({ signal }) => getNearby(destination!.latitude, destination!.longitude, radius, signal),
    enabled: Boolean(destination)
  });
  const predictionsQuery = useQuery({
    queryKey: ["predictions", destination?.latitude, destination?.longitude, radius, horizon],
    queryFn: ({ signal }) => getPredictions(destination!.latitude, destination!.longitude, radius, horizon, signal),
    enabled: Boolean(destination)
  });
  const rawQuery = useQuery({
    queryKey: ["raw-features", detailBbox],
    queryFn: ({ signal }) => getRawFeatures(detailBbox!, signal),
    enabled: Boolean(detailBbox),
    staleTime: 10_000
  });

  function selectCandidate(candidate: GeocodeCandidate) {
    setDestination({
      latitude: candidate.latitude,
      longitude: candidate.longitude,
      label: candidate.display_name
    });
    setCandidates([]);
    setSelectedId(null);
    setMapFocus(false);
  }

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    if (query.trim().length >= 2) {
      setCandidates([]);
      geocodeMutation.mutate({ value: query.trim() });
    }
  }

  const manualSelect = useCallback((longitude: number, latitude: number) => {
    setDestination({ latitude, longitude, label: "Destino elegido en el mapa" });
    setManualMode(false);
    setSelectedId(null);
    setMapFocus(false);
  }, []);

  const locate = () => {
    setLocationError(null);
    if (!navigator.geolocation) {
      setLocationError("Tu navegador no admite geolocalización.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setDestination({ latitude: coords.latitude, longitude: coords.longitude, label: "Mi ubicación" });
        setSelectedId(null);
        setMapFocus(false);
      },
      () => setLocationError("No se ha podido obtener tu ubicación. Revisa el permiso del navegador."),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 }
    );
  };

  const items = predictionItems(predictionsQuery.data);
  const selectedItem = items.find((item) => item.id === selectedId) ?? null;
  const loading = zonesQuery.isFetching || predictionsQuery.isFetching;
  const apiError = zonesQuery.error ?? predictionsQuery.error ?? geocodeMutation.error;

  const selectRecommendation = useCallback((id: string) => {
    setSelectedId(id);
    setMapFocus(true);
  }, []);

  const changeRadius = (value: number) => {
    setRadius(value);
    setSelectedId(null);
    setMapFocus(false);
  };

  return (
    <main className="relative h-[100dvh] min-h-[560px] overflow-hidden bg-[var(--sand)]">
      <div className="absolute inset-0">
        <ParkingMap
          destination={destination}
          zones={zonesQuery.data}
          predictions={predictionsQuery.data}
          rawFeatures={rawQuery.data}
          selectedId={selectedId}
          manualMode={manualMode}
          onManualSelect={manualSelect}
          onZoneSelect={selectRecommendation}
          onDetailViewport={setDetailBbox}
        />
      </div>

      <header className="pointer-events-none absolute inset-x-0 top-0 z-10 p-2 sm:p-3 md:p-5">
        <div className="pointer-events-auto mx-auto flex max-w-7xl items-center justify-between rounded-2xl bg-[var(--petrol)]/96 px-3 py-2.5 text-white shadow-xl backdrop-blur sm:px-4 sm:py-3">
          <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/12 sm:size-10"><CarFront className="size-5" /></span>
            <div className="min-w-0"><p className="truncate text-base font-extrabold leading-none sm:text-lg">Aparca València</p><p className="mt-1 hidden truncate text-[11px] text-white/70 min-[360px]:block">Predicción municipal · datos abiertos</p></div>
          </div>
          <div className="hidden items-center gap-4 text-xs md:flex">
            <Link className="hover:underline" href="/fuentes">Fuentes</Link>
            <Link className="hover:underline" href="/privacidad">Privacidad</Link>
          </div>
        </div>
      </header>

      <section className={cn(
        "absolute inset-x-0 bottom-0 z-10 overscroll-contain overflow-y-auto rounded-t-[28px] bg-[var(--sand)]/98 px-4 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-[0_-12px_40px_rgba(16,55,62,.16)] backdrop-blur md:inset-y-24 md:left-5 md:right-auto md:max-h-none md:w-[390px] md:rounded-3xl md:p-5",
        mapFocus && selectedItem ? "max-h-[190px]" : "max-h-[72dvh]"
      )}>
        <div className="mx-auto mb-3 h-1 w-12 rounded-full bg-slate-300 md:hidden" />
        {mapFocus && selectedItem && (
          <div className="animate-rise md:hidden" aria-live="polite">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[.14em] text-[var(--coral-strong)]">Tramo previsto resaltado</p>
                <h2 className="mt-1 truncate text-lg font-extrabold">{selectedItem.streetName}</h2>
                <p className="mt-1 text-xs text-slate-600">Ocupación prevista {selectedItem.occupancyPercent}% · a {Math.round(selectedItem.distanceMeters)} m</p>
              </div>
              <Button size="sm" variant="secondary" onClick={() => setMapFocus(false)}>
                <ChevronUp className="size-4" /> Ver lista
              </Button>
            </div>
            <a
              className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-[var(--petrol)]"
              href={`https://www.google.com/maps/dir/?api=1&destination=${selectedItem.latitude},${selectedItem.longitude}`}
              target="_blank"
              rel="noreferrer"
            >
              Cómo llegar <ExternalLink className="size-4" />
            </a>
          </div>
        )}

        <div className={cn(mapFocus && selectedItem && "hidden md:block")}>
          <SearchPanel
          query={query}
          onQueryChange={setQuery}
          onSubmit={submitSearch}
          candidates={candidates}
          onCandidate={selectCandidate}
          searching={geocodeMutation.isPending}
          manualMode={manualMode}
          onManualMode={() => setManualMode((value) => !value)}
          onLocate={locate}
          />

        {destination && (
          <div className="mt-4 animate-rise">
            <div className="flex items-center gap-2 text-sm font-bold text-[var(--petrol)]">
              <MapPinned className="size-4" /><span className="truncate">{destination.label}</span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 min-[390px]:grid-cols-4 md:grid-cols-4" aria-label="Radio de búsqueda">
              {RADII.map((value) => (
                <Button key={value} size="sm" variant={radius === value ? "default" : "secondary"} onClick={() => changeRadius(value)} className="flex-1 px-2">
                  {value >= 1000 ? "1 km" : `${value} m`}
                </Button>
              ))}
            </div>
            <div className="mt-2 grid grid-cols-4 gap-2" aria-label="Momento de llegada">
              {HORIZONS.map((value) => (
                <Button
                  key={value}
                  size="sm"
                  variant={horizon === value ? "coral" : "secondary"}
                  onClick={() => {
                    setHorizon(value);
                    setSelectedId(null);
                    setMapFocus(false);
                  }}
                  className="px-2"
                >
                  +{value} h
                </Button>
              ))}
            </div>
          </div>
        )}

        {(locationError || apiError) && (
          <Card role="alert" className="mt-4 flex gap-3 border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <AlertCircle className="size-5 shrink-0" />
            <p>{locationError ?? (apiError instanceof Error ? apiError.message : "Fallo temporal del backend")}</p>
          </Card>
        )}

        {statusQuery.data?.stale && (
          <Card role="status" className="mt-4 flex gap-3 border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <Database className="size-5 shrink-0" /><p>{statusQuery.data.warning}</p>
          </Card>
        )}

        <div className="mt-5">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div><p className="text-xs font-bold uppercase tracking-[.16em] text-[var(--coral-strong)]">Predicción municipal · +{horizon} h</p><h2 className="mt-1 text-xl font-extrabold">Dónde es más probable aparcar</h2></div>
            {loading && <LoaderCircle className="size-5 animate-spin text-[var(--petrol)]" />}
          </div>

          <div className="mb-3 flex gap-2 rounded-2xl border border-slate-200 bg-white/80 p-3 text-xs leading-5 text-slate-600">
            <Info className="mt-0.5 size-4 shrink-0 text-[var(--petrol)]" />
            <p><strong className="text-[var(--ink)]">¿Por qué este orden?</strong> Primero va la menor ocupación prevista por el Ayuntamiento; la distancia solo desempata. Menos de 60% es probabilidad alta, 60–80% media y más de 80% baja.</p>
          </div>

          {!destination && <p className="rounded-2xl bg-white/80 p-4 text-sm leading-6 text-slate-600">Busca una dirección, pulsa en el mapa o comparte tu ubicación para ver zonas cercanas.</p>}
          {destination && !loading && items.length === 0 && !apiError && <p className="rounded-2xl bg-white p-4 text-sm leading-6 text-slate-600">No hay predicción municipal de aparcamiento regulado en este radio. Las líneas grises del mapa son zonas libres documentadas, pero no tienen datos de ocupación.</p>}
          <div className="space-y-3">
            {items.map((item, index) => (
              <PredictionCard key={item.id} item={item} index={index} selected={selectedId === item.id} onSelect={() => selectRecommendation(item.id)} />
            ))}
          </div>
        </div>

        <div className="mt-5 rounded-2xl bg-[var(--petrol)] p-4 text-xs leading-5 text-white/85">
          <strong className="text-white">Importante:</strong> la predicción se aplica solo a tramos regulados y no garantiza una plaza. Las zonas libres se muestran como inventario, sin estimación de ocupación. Comprueba siempre la señalización.
        </div>
        <footer className="mt-4 flex justify-between pb-1 text-[11px] text-slate-500 md:hidden">
          <Link href="/fuentes">Fuentes y atribución</Link><Link href="/privacidad">Privacidad</Link>
        </footer>
        </div>
      </section>

      <div className={cn("pointer-events-none absolute inset-0 z-20 border-4 border-transparent transition", manualMode && "border-[var(--coral)]")} />
    </main>
  );
}
