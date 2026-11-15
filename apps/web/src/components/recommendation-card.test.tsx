import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RecommendationCard } from "@/components/recommendation-card";

const item = {
  id: "00000000-0000-0000-0000-000000000001",
  street_name: "Avinguda del Cid",
  latitude: 39.47,
  longitude: -0.4,
  distance_meters: 180,
  evidence_count: 12,
  strategy: "heuristic_v0" as const,
  ranking_score: 0.75,
  availability_probability: null,
  availability_status: "unknown" as const,
  confidence: "unvalidated" as const,
  explanation: "A 180 m del destino y respaldada por 12 geometrías del inventario municipal.",
  data_source: "valencia_arcgis_197",
  imported_at: null
};

describe("RecommendationCard", () => {
  it("muestra evidencia sin afirmar disponibilidad", () => {
    render(<RecommendationCard item={item} index={0} selected={false} onSelect={() => undefined} />);
    expect(screen.getByText("Avinguda del Cid")).toBeInTheDocument();
    expect(screen.getByText(/12 geometrías/)).toBeInTheDocument();
    expect(screen.queryByText(/disponible/i)).not.toBeInTheDocument();
  });

  it("permite seleccionar la zona", () => {
    const onSelect = vi.fn();
    render(<RecommendationCard item={item} index={0} selected={false} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("button", { name: /Avinguda del Cid/i }));
    expect(onSelect).toHaveBeenCalledOnce();
  });
});
