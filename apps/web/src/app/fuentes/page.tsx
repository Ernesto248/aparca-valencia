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
          <h2 className="text-xl font-extrabold text-[var(--ink)]">Predicción de aparcamiento regulado</h2>
          <p className="mt-2">Las capas municipales 254, 253, 252 y 4 publican ocupación prevista para tramos regulados a 1, 6, 12 y 24 horas. La aplicación conserva la clasificación oficial: menos de 60% de ocupación es probabilidad alta de estacionamiento; entre 60% y 80%, media; y por encima de 80%, baja.</p>
          <p className="mt-2">Es una predicción, no una garantía de plaza, y no se extrapola a las zonas no reguladas.</p>
        </section>
        <section>
          <h2 className="text-xl font-extrabold text-[var(--ink)]">Mapa base y búsqueda</h2>
          <p className="mt-2">El mapa y el índice de direcciones se generan a partir de OpenStreetMap. Las teselas se empaquetan con Protomaps/PMTiles y se sirven desde nuestra infraestructura. © colaboradores de OpenStreetMap, bajo ODbL.</p>
        </section>
        <section>
          <h2 className="text-xl font-extrabold text-[var(--ink)]">Metodología</h2>
          <p className="mt-2">Los tramos se ordenan primero por menor ocupación municipal prevista y después por distancia. Las zonas no reguladas permanecen visibles como inventario, pero no reciben una probabilidad.</p>
        </section>
      </div>
    </main>
  );
}
