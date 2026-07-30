import type { CSSProperties, ReactNode } from 'react'

const enter = (ms: number) => ({ '--enter-delay': `${ms}ms` }) as CSSProperties

/*
  Every inner page opens the same way the hero does: a small eyebrow, a big
  title with an optional serif accent line and at most one sentence of lead,
  rising in on the shared enter animation.
*/
export function PageHeader({
  eyebrow,
  title,
  accent,
  lead,
}: {
  eyebrow: string
  title: string
  accent?: string
  lead?: ReactNode
}) {
  return (
    <header className="px-6 pt-[calc(var(--header-h)+3rem)] sm:px-8 lg:px-12 lg:pt-[calc(var(--header-h)+4.5rem)]">
      <div className="mx-auto max-w-[1400px]">
        <p className="text-xs uppercase tracking-widest text-white/60" data-enter style={enter(0)}>
          {eyebrow}
        </p>
        <h1
          className="mt-4 text-4xl font-medium leading-[1.05] tracking-[-0.05em] text-white sm:text-5xl lg:text-6xl"
          data-enter
          style={enter(60)}
        >
          {title}
          {accent ? (
            <>
              <br />
              <em className="font-serif italic text-accent">{accent}</em>
            </>
          ) : null}
        </h1>
        {lead ? (
          <p
            className="mt-6 max-w-2xl text-base leading-relaxed text-white/60"
            data-enter
            style={enter(120)}
          >
            {lead}
          </p>
        ) : null}
      </div>
    </header>
  )
}
