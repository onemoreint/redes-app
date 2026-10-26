/** Firma del autor, visible al pie de la app. */
export function Firma({ compacta = false }: { compacta?: boolean }) {
  return (
    <div className={compacta ? 'text-[11px] leading-relaxed text-stone-500' : 'text-xs leading-relaxed text-stone-500'}>
      <p>
        Desarrollado por <span className="font-medium text-stone-700">José Lugo</span>
      </p>
      <p>
        <a className="hover:text-marca-700 hover:underline" href="https://wa.me/573126387467" target="_blank" rel="noopener noreferrer">
          +57 312 638 7467
        </a>
        {' · '}
        <a className="hover:text-marca-700 hover:underline" href="mailto:jose.lugocdv@gmail.com">
          jose.lugocdv@gmail.com
        </a>
      </p>
    </div>
  )
}
