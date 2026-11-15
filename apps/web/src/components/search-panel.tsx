import { Crosshair, LocateFixed, Search } from "lucide-react";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { GeocodeCandidate } from "@/lib/types";

export function SearchPanel({
  query,
  onQueryChange,
  onSubmit,
  candidates,
  onCandidate,
  searching,
  manualMode,
  onManualMode,
  onLocate
}: {
  query: string;
  onQueryChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
  candidates: GeocodeCandidate[];
  onCandidate: (candidate: GeocodeCandidate) => void;
  searching: boolean;
  manualMode: boolean;
  onManualMode: () => void;
  onLocate: () => void;
}) {
  return (
    <div>
      <form className="flex gap-2" onSubmit={onSubmit}>
        <label className="sr-only" htmlFor="destination-search">Destino en València</label>
        <Input
          id="destination-search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="¿Adónde vas?"
          autoComplete="street-address"
          minLength={2}
          required
        />
        <Button type="submit" size="icon" aria-label="Buscar destino" disabled={searching}>
          <Search className="size-5" />
        </Button>
      </form>
      {candidates.length > 0 && (
        <div className="mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          {candidates.map((candidate) => (
            <button
              key={`${candidate.latitude}-${candidate.longitude}`}
              className="block w-full border-b border-slate-100 px-4 py-3 text-left text-sm last:border-0 hover:bg-slate-50"
              onClick={() => onCandidate(candidate)}
            >
              {candidate.display_name}
            </button>
          ))}
        </div>
      )}
      <div className="mt-3 grid grid-cols-1 gap-2 min-[360px]:grid-cols-2">
        <Button type="button" variant={manualMode ? "coral" : "secondary"} onClick={onManualMode}>
          <Crosshair className="size-4" /> {manualMode ? "Pulsa en el mapa" : "Elegir en mapa"}
        </Button>
        <Button type="button" variant="secondary" onClick={onLocate}>
          <LocateFixed className="size-4" /> Mi ubicación
        </Button>
      </div>
    </div>
  );
}
