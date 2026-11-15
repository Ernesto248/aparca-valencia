import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="mx-auto min-h-screen max-w-3xl px-5 py-12 md:py-20">
      <Link className="text-sm font-bold text-[var(--coral-strong)]" href="/">← Volver al mapa</Link>
      <h1 className="mt-6 text-4xl font-extrabold">Privacidad</h1>
      <div className="mt-8 space-y-6 leading-7 text-slate-700">
        <p>Aparca València no crea cuentas, no guarda historiales GPS y no almacena de forma persistente la ubicación precisa del usuario.</p>
        <p>La ubicación del dispositivo solo se solicita después de pulsar “Mi ubicación”. Las búsquedas y coordenadas se usan para responder a la petición y se excluyen de los logs de aplicación.</p>
        <p>Vercel Web Analytics recoge métricas agregadas de páginas sin cookies. La aplicación elimina los parámetros de consulta antes de enviar una visita y no registra eventos personalizados con direcciones o coordenadas.</p>
        <p>Los servicios cartográficos y de geocodificación están autohospedados para evitar enviar búsquedas a proveedores públicos externos durante el uso normal de producción.</p>
      </div>
    </main>
  );
}
