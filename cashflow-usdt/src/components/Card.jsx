export function Card({ title, children, className = '' }) {
  return (
    <section
      className={`rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 shadow-sm ${className}`}
    >
      {title ? (
        <h2 className="mb-3 text-sm font-medium tracking-wide text-zinc-400">{title}</h2>
      ) : null}
      {children}
    </section>
  )
}
