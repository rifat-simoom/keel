interface PlaceholderPageProps {
  title: string
  phase: string
}

export function PlaceholderPage({ title, phase }: PlaceholderPageProps) {
  return (
    <div className="flex h-full items-center justify-center p-20">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
          <span className="text-2xl">🚧</span>
        </div>
        <h2 className="text-lg font-semibold text-slate-700">{title}</h2>
        <p className="mt-1 text-sm text-slate-400">Coming in {phase}</p>
      </div>
    </div>
  )
}
