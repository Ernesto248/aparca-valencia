"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertCircle, CarFront, Database, Info, LoaderCircle, MapPinned } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { getDataStatus, geocode, getNearby, getRawFeatures, getRecommendations } from "@/lib/api";
import type { Destination, GeocodeCandidate } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RecommendationCard } from "@/components/recommendation-card";
import { SearchPanel } from "@/components/search-panel";
import { cn } from "@/lib/utils";

const ParkingMap = dynamic(() => import("@/components/parking-map"), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center bg-[#dcebee]"><LoaderCircle className="size-8 animate-spin text-[var(--petrol)]" /></div>
});

const RADII = [250, 500, 750, 1000];

export function ParkingApp() {
  const [query, setQuery] = useState("");
  const [candidates, setCandidates] = useState<GeocodeCandidate[]>([]);
  const [destination, setDestination] = useState<Destination | null>(null);
  const [radius, setRadius] = useState(500);
  const [manualMode, setManualMode] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
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
  const recommendationsQuery = useQuery({
    queryKey: ["recommendations", destination?.latitude, destination?.longitude, radius],
    queryFn: ({ signal }) => getRecommendations(destination!.latitude, destination!.longitude, radius, signal),
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
  }, []);

  const locate = () => {
    setLocationError(null);
    if (!navigator.geolocation) {
      setLocationError("Tu navegador no admite geolocalización.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => setDestination({ latitude: coords.latitude, longitude: coords.longitude, label: "Mi ubicación" }),
      () => setLocationError("No se ha podido obtener tu ubicación. Revisa el permiso del navegador."),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 }
    );
  };

  const items = recommendationsQuery.data?.items ?? [];
  const loading = zonesQuery.isFetching || recommendationsQuery.isFetching;
  const apiError = zonesQuery.error ?? recommendationsQuery.error ?? geocodeMutation.error;

  return (
    <main className="relative h-[100dvh] min-h-[560px] overflow-hidden bg-[var(--sand)]">
      <div className="absolute inset-0">
        <ParkingMap
          destination={destination}
          zones={zonesQuery.data}
          rawFeatures={rawQuery.data}
          selectedId={selectedId}
          manualMode={manualMode}
          onManualSelect={manualSelect}
          onZoneSelect={setSelectedId}
          onDetailViewport={setDetailBbox}
        />
      </div>

      <header className="pointer-events-none absolute inset-x-0 top-0 z-10 p-2 sm:p-3 md:p-5">
        <div className="pointer-events-auto mx-auto flex max-w-7xl items-center justify-between rounded-2xl bg-[var(--petrol)]/96 px-3 py-2.5 text-white shadow-xl backdrop-blur sm:px-4 sm:py-3">
          <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/12 sm:size-10"><CarFront className="size-5" /></span>
            <div className="min-w-0"><p className="truncate text-base font-extrabold leading-none sm:text-lg">Aparca València</p><p className="mt-1 hidden truncate text-[11px] text-white/70 min-[360px]:block">Datos abiertos · sin ocupación en tiempo real</p></div>
          </div>
          <div className="hidden items-center gap-4 text-xs md:flex">
            <Link className="hover:underline" href="/fuentes">Fuentes</Link>
            <Link className="hover:underline" href="/privacidad">Privacidad</Link>
          </div>
        </div>
      </header>

      <section className="absolute inset-x-0 bottom-0 z-10 max-h-[72dvh] overscroll-contain overflow-y-auto rounded-t-[28px] bg-[var(--sand)]/98 px-4 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-[0_-12px_40px_rgba(16,55,62,.16)] backdrop-blur md:inset-y-24 md:left-5 md:right-auto md:max-h-none md:w-[390px] md:rounded-3xl md:p-5">
        <div className="mx-auto mb-3 h-1 w-12 rounded-full bg-slate-300 md:hidden" />
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
                <Button key={value} size="sm" variant={radius === value ? "default" : "secondary"} onClick={() => setRadius(value)} className="flex-1 px-2">
                  {value >= 1000 ? "1 km" : `${value} m`}
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
            <div><p className="text-xs font-bold uppercase tracking-[.16em] text-[var(--coral-strong)]">Orden para buscar</p><h2 className="mt-1 text-xl font-extrabold">Zonas documentadas cercanas</h2></div>
            {loading && <LoaderCircle className="size-5 animate-spin text-[var(--petrol)]" />}
          </div>

          <div className="mb-3 flex gap-2 rounded-2xl border border-slate-200 bg-white/80 p-3 text-xs leading-5 text-slate-600">
            <Info className="mt-0.5 size-4 shrink-0 text-[var(--petrol)]" />
            <p><strong className="text-[var(--ink)]">¿Por qué este orden?</strong> Un 75 % depende de la cercanía y un 25 % de la evidencia municipal agrupada. Sirve para decidir por dónde empezar a buscar; no calcula plazas libres.</p>
          </div>

          {!destination && <p className="rounded-2xl bg-white/80 p-4 text-sm leading-6 text-slate-600">Busca una dirección, pulsa en el mapa o comparte tu ubicación para ver zonas cercanas.</p>}
          {destination && !loading && items.length === 0 && !apiError && <p className="rounded-2xl bg-white p-4 text-sm text-slate-600">No hay cobertura municipal en este radio. Prueba a ampliarlo o elige otro punto.</p>}
          <div className="space-y-3">
            {items.map((item, index) => (
              <RecommendationCard key={item.id} item={item} index={index} selected={selectedId === item.id} onSelect={() => setSelectedId(item.id)} />
            ))}
          </div>
        </div>

        <div className="mt-5 rounded-2xl bg-[var(--petrol)] p-4 text-xs leading-5 text-white/85">
          <strong className="text-white">Importante:</strong> mostramos zonas de aparcamiento no regulado según datos municipales. La disponibilidad de plazas no está confirmada. Comprueba siempre la señalización.
        </div>
        <footer className="mt-4 flex justify-between pb-1 text-[11px] text-slate-500 md:hidden">
          <Link href="/fuentes">Fuentes y atribución</Link><Link href="/privacidad">Privacidad</Link>
        </footer>
      </section>

      <div className={cn("pointer-events-none absolute inset-0 z-20 border-4 border-transparent transition", manualMode && "border-[var(--coral)]")} />
    </main>
  );
}
