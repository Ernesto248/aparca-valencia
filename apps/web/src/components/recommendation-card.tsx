import { ExternalLink, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Recommendation } from "@/lib/types";

export function RecommendationCard({
  item,
  index,
  selected,
  onSelect
}: {
  item: Recommendation;
  index: number;
  selected: boolean;
  onSelect: () => void;
}) {
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
              <h3 className="font-extrabold text-[var(--ink)]">{item.street_name}</h3>
              <span className="whitespace-nowrap text-sm font-bold text-[var(--coral-strong)]">
                {Math.round(item.distance_meters)} m
              </span>
            </div>
            <p className="mt-1 text-sm leading-5 text-slate-600">{item.explanation}</p>
          </div>
        </div>
      </button>
      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
        <span className="flex items-center gap-1 text-xs text-slate-500">
          <MapPin className="size-3.5" /> Fuente municipal
        </span>
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
