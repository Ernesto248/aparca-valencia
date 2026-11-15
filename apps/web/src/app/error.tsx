"use client";

import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="grid min-h-screen place-items-center p-6">
      <div className="max-w-md text-center">
        <p className="text-sm font-bold uppercase tracking-[.2em] text-[var(--coral)]">Error temporal</p>
        <h1 className="mt-3 text-3xl font-bold">No hemos podido cargar el mapa</h1>
        <p className="my-5 text-slate-600">Revisa tu conexión o vuelve a intentarlo en unos segundos.</p>
        <Button onClick={reset}>Reintentar</Button>
      </div>
    </main>
  );
}
