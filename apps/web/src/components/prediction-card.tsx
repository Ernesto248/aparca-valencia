import { ExternalLink, MapPinned } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ParkingPrediction, ProbabilityLevel } from "@/lib/types";

const LEVEL_LABEL: Record<ProbabilityLevel, string> = {
  high: "Alta",
  medium: "Media",
  low: "Baja"
};

export function PredictionCard({
  item,
  index,
  selected,
  onSelect
}: {
  item: ParkingPrediction;
  index: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const walkingMinutes = Math.max(1, Math.round(item.distanceMeters / 80));
  const freeMargin = 100 - item.occupancyPercent;
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${item.latitude},${item.longitude}`;

  return (
    <Card className={cn("p-4 transition", selected && "border-[var(--coral)] ring-2 ring-[var(--coral)]/20")}>
      <button className="w-full text-left" onClick={onSelect} aria-pressed={selected}>
        <div className="flex items-start gap-3">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[var(--petrol)] text-sm font-extrabold text-white">
            {index + 1}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-extrabold text-[var(--ink)]">{item.streetName}</h3>
              <span className="whitespace-nowrap text-sm font-bold text-[var(--coral-strong)]">
                ≈ {walkingMinutes} min a pie
              </span>
            </div>
            <p className="mt-1 text-sm leading-5 text-slate-600">
              Ocupación prevista: <strong>{item.occupancyPercent}%</strong>. Margen libre estimado: {freeMargin}%.
            </p>
          </div>
        </div>
      </button>
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
        <span className="rounded-full bg-[var(--petrol-soft)] px-2 py-1 font-bold text-[var(--petrol)]">
          Probabilidad {LEVEL_LABEL[item.probabilityLevel].toLowerCase()}
        </span>
        <span className="rounded-full bg-slate-100 px-2 py-1">Zona regulada · {item.horizonHours} h</span>
        <Button size="sm" variant={selected ? "coral" : "secondary"} className="ml-auto" onClick={onSelect}>
          <MapPinned className="size-3.5" /> {selected ? "Tramo visible" : "Ver tramo"}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => window.open(directions, "_blank", "noopener,noreferrer")}
        >
          Cómo llegar <ExternalLink className="size-3.5" />
        </Button>
      </div>
    </Card>
  );
}
