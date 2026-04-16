export function Input({ label, id, className = '', ...props }) {
  const inputId = id ?? props.name
  return (
    <label className={`flex flex-col gap-1 text-sm ${className}`} htmlFor={inputId}>
      {label ? <span className="text-zinc-400">{label}</span> : null}
      <input
        id={inputId}
        className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none ring-emerald-500/40 placeholder:text-zinc-600 focus:border-emerald-500/60 focus:ring-2"
        {...props}
      />
    </label>
  )
}
