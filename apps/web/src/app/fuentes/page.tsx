import Link from "next/link";

export default function SourcesPage() {
  return (
    <main className="mx-auto min-h-screen max-w-3xl px-5 py-12 md:py-20">
      <Link className="text-sm font-bold text-[var(--coral-strong)]" href="/">← Volver al mapa</Link>
      <h1 className="mt-6 text-4xl font-extrabold">Fuentes y atribución</h1>
      <div className="mt-8 space-y-8 leading-7 text-slate-700">
        <section>
          <h2 className="text-xl font-extrabold text-[var(--ink)]">Aparcamiento no regulado</h2>
          <p className="mt-2">La aplicación utiliza la capa 197 del Geoportal del Ajuntament de València. Las geometrías indican ubicaciones documentadas, pero no confirman disponibilidad, legalidad en un momento concreto ni capacidad exacta.</p>
          <p className="mt-2">Datos: <a className="underline" href="https://opendata.vlci.valencia.es/es/dataset/aparcaments-no-regulats-aparcamientos-no-regulados" rel="noreferrer" target="_blank">Ajuntament de València</a>, licencia <a className="underline" href="https://creativecommons.org/licenses/by/4.0/deed.es" rel="noreferrer" target="_blank">CC BY 4.0</a>.</p>
        </section>
        <section>
          <h2 className="text-xl font-extrabold text-[var(--ink)]">Mapa base y búsqueda</h2>
          <p className="mt-2">El mapa y el índice de direcciones se generan a partir de OpenStreetMap. Las teselas se empaquetan con Protomaps/PMTiles y se sirven desde nuestra infraestructura. © colaboradores de OpenStreetMap, bajo ODbL.</p>
        </section>
        <section>
          <h2 className="text-xl font-extrabold text-[var(--ink)]">Metodología</h2>
          <p className="mt-2">Las recomendaciones combinan cercanía al destino y cantidad de geometrías municipales agrupadas. La puntuación es relativa, experimental y no es una probabilidad de encontrar plaza.</p>
        </section>
      </div>
    </main>
  );
}
