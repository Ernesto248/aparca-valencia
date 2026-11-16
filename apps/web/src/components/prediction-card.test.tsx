import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PredictionCard } from "@/components/prediction-card";

const item = {
  id: "00000000-0000-0000-0000-000000000001",
  streetName: "Carrer de Xàtiva",
  latitude: 39.468,
  longitude: -0.377,
  distanceMeters: 160,
  occupancyPercent: 42,
  probabilityLevel: "high" as const,
  horizonHours: 1 as const,
  importedAt: "2026-11-16T08:00:00Z"
};

describe("PredictionCard", () => {
  it("explica la predicción municipal sin inventar una probabilidad numérica", () => {
    render(<PredictionCard item={item} index={0} selected={false} onSelect={() => undefined} />);
    expect(screen.getByText("Carrer de Xàtiva")).toBeInTheDocument();
    expect(screen.getByText(/Ocupación prevista:/)).toHaveTextContent("42%");
    expect(screen.getByText("Probabilidad alta")).toBeInTheDocument();
    expect(screen.getByText(/Margen libre estimado: 58%/)).toBeInTheDocument();
  });

  it("permite resaltar el tramo", () => {
    const onSelect = vi.fn();
    render(<PredictionCard item={item} index={0} selected={false} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("button", { name: "Ver tramo" }));
    expect(onSelect).toHaveBeenCalledOnce();
  });
});
