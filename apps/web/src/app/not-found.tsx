import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center p-6 text-center">
      <div>
        <p className="text-sm font-bold uppercase tracking-[.2em] text-[var(--coral)]">404</p>
        <h1 className="mt-3 text-3xl font-bold">Esta calle no lleva a ninguna página</h1>
        <Link className="mt-6 inline-block font-bold text-[var(--petrol)] underline" href="/">Volver al mapa</Link>
      </div>
    </main>
  );
}
