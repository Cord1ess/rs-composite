'use client'

import { useEffect, useMemo, useState } from 'react'
import { SECTIONS, TUNE, type TuneValue } from '@/components/globe/tune'
import { sendTune, type TuneValues } from '@/lib/tune-bus'

/*
  The earth tuning surface. A floating button, a panel of every parameter the
  earth system exposes (tune.ts is the schema), live updates through the tune
  bus, and a Copy button that exports exactly what changed as JSON, ready to
  be baked into tune.ts as the new shipped values.

  Dev-only by default; on a deployed build it appears when the URL contains
  "tune" in the query or hash (…/?tune or …/#tune). State persists in
  localStorage so a reload or navigation keeps the working values.
*/

const STORE = 'earth-tune-v1'

const isDefault = (key: string, value: TuneValue) => {
  const d = TUNE[key]
  if (Array.isArray(d) && Array.isArray(value))
    return d.every((c, i) => Math.abs(c - value[i]) < 1e-6)
  return Math.abs((d as number) - (value as number)) < 1e-9
}

const fmt = (v: number) =>
  Math.abs(v) >= 100 ? v.toFixed(0) : Math.abs(v) >= 1 ? v.toFixed(3) : v.toFixed(4)

function loadStored(): TuneValues {
  try {
    const raw = localStorage.getItem(STORE)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as TuneValues
    return Object.fromEntries(Object.entries(parsed).filter(([k]) => k in TUNE))
  } catch {
    return {}
  }
}

/* The gate lives in TunePanel.tsx; by the time this chunk loads, the panel
   is wanted. */
export default function TunePanelBody() {
  const [open, setOpen] = useState(false)
  const [values, setValues] = useState<TuneValues>({ ...(TUNE as TuneValues) })
  const [copied, setCopied] = useState(false)

  /* Stored-state restore, client-only. */
  useEffect(() => {
    const stored = loadStored()
    if (Object.keys(stored).length) {
      setValues((prev) => ({ ...prev, ...stored }))
      sendTune(stored)
    }
  }, [])

  const changed = useMemo(
    () => Object.fromEntries(Object.entries(values).filter(([k, v]) => !isDefault(k, v))),
    [values],
  )

  const apply = (key: string, value: TuneValue) => {
    setValues((prev) => {
      const next = { ...prev, [key]: value }
      const diff = Object.fromEntries(
        Object.entries(next).filter(([k, v]) => !isDefault(k, v as TuneValue)),
      )
      try {
        localStorage.setItem(STORE, JSON.stringify(diff))
      } catch {
        /* storage full or blocked: live tuning still works */
      }
      return next
    })
    sendTune({ [key]: value } as TuneValues)
  }

  const copy = () => {
    const payload = JSON.stringify(changed, null, 2)
    void navigator.clipboard.writeText(payload).then(() => {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    })
  }

  const reset = () => {
    try {
      localStorage.removeItem(STORE)
    } catch {
      /* ignore */
    }
    setValues({ ...(TUNE as TuneValues) })
    sendTune({ ...(TUNE as TuneValues) })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Earth tuning panel"
        className="fixed bottom-5 right-5 z-[300] flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/70 text-white/80 shadow-lg backdrop-blur transition-colors hover:border-accent/60 hover:text-accent"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M4 8h10M18 8h2M4 16h2M10 16h10" strokeLinecap="round" />
          <circle cx="15.5" cy="8" r="2.2" />
          <circle cx="7.5" cy="16" r="2.2" />
        </svg>
      </button>

      {open ? (
        <div className="fixed bottom-5 left-5 top-5 z-[300] flex w-[350px] flex-col overflow-hidden rounded-2xl border border-white/12 bg-black/85 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
            <p className="mr-auto text-[0.7rem] uppercase tracking-[0.2em] text-white/60">
              Earth tuning
            </p>
            <button
              type="button"
              onClick={reset}
              className="rounded-full border border-white/15 px-3 py-1 text-[0.68rem] text-white/60 transition-colors hover:border-white/40 hover:text-white"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={copy}
              className="rounded-full border border-accent/50 bg-accent/10 px-3 py-1 text-[0.68rem] font-medium text-accent transition-colors hover:bg-accent/20"
            >
              {copied ? 'Copied!' : `Copy (${Object.keys(changed).length})`}
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2 [scrollbar-width:thin]">
            {SECTIONS.map((section) => (
              <details key={section.title} className="group border-b border-white/5 py-1 last:border-0">
                <summary className="cursor-pointer select-none list-none py-2 text-[0.72rem] font-medium uppercase tracking-[0.14em] text-white/70 transition-colors hover:text-accent">
                  <span className="mr-1.5 inline-block text-white/30 transition-transform group-open:rotate-90">
                    ›
                  </span>
                  {section.title}
                </summary>
                <div className="space-y-2.5 pb-3 pl-1">
                  {section.entries.map((entry) => {
                    const value = values[entry.key]
                    const dirty = !isDefault(entry.key, value as TuneValue)
                    if (entry.color) {
                      const rgb = value as [number, number, number]
                      const cmax = entry.cmax ?? 1.2
                      const swatch = `rgb(${rgb
                        .map((c) => Math.round(Math.min(1, Math.max(0, c)) * 255))
                        .join(',')})`
                      return (
                        <div key={entry.key}>
                          <div className="flex items-center gap-2">
                            <span
                              className="h-3 w-3 shrink-0 rounded-full border border-white/20"
                              style={{ background: swatch }}
                            />
                            <span
                              title="Double-click to reset"
                              onDoubleClick={() =>
                                apply(entry.key, [...(TUNE[entry.key] as [number, number, number])])
                              }
                              className={`cursor-pointer select-none text-[0.7rem] ${dirty ? 'text-accent' : 'text-white/55'}`}
                            >
                              {entry.label}
                            </span>
                          </div>
                          <div className="mt-1 space-y-0.5">
                            {(['R', 'G', 'B'] as const).map((ch, i) => (
                              <div key={ch} className="flex items-center gap-2">
                                <span className="w-3 text-[0.6rem] text-white/30">{ch}</span>
                                <input
                                  type="range"
                                  min={0}
                                  max={cmax}
                                  step={0.005}
                                  value={rgb[i]}
                                  onChange={(e) => {
                                    const next = [...rgb] as [number, number, number]
                                    next[i] = Number(e.target.value)
                                    apply(entry.key, next)
                                  }}
                                  className="tune-slider flex-1"
                                />
                                <span className="w-11 text-right text-[0.62rem] tabular-nums text-white/45">
                                  {rgb[i].toFixed(3)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    }
                    const num = value as number
                    return (
                      <div key={entry.key} className="flex items-center gap-2">
                        <span
                          title="Double-click to reset"
                          onDoubleClick={() => apply(entry.key, TUNE[entry.key] as number)}
                          className={`w-[104px] shrink-0 cursor-pointer select-none text-[0.7rem] leading-tight ${
                            dirty ? 'text-accent' : 'text-white/55'
                          }`}
                        >
                          {entry.label}
                        </span>
                        <input
                          type="range"
                          min={entry.min}
                          max={entry.max}
                          step={entry.step}
                          value={num}
                          onChange={(e) => apply(entry.key, Number(e.target.value))}
                          className="tune-slider flex-1"
                        />
                        <input
                          type="number"
                          value={fmt(num)}
                          step={entry.step}
                          onChange={(e) => {
                            const v = Number(e.target.value)
                            if (Number.isFinite(v)) apply(entry.key, v)
                          }}
                          className="w-[58px] rounded border border-white/10 bg-white/5 px-1 py-0.5 text-right text-[0.62rem] tabular-nums text-white/75 outline-none focus:border-accent/60"
                        />
                      </div>
                    )
                  })}
                </div>
              </details>
            ))}
          </div>

          <p className="border-t border-white/10 px-4 py-2 text-[0.6rem] leading-relaxed text-white/35">
            Live on the globe as you drag. Copy exports only what changed; paste it to Claude to
            bake permanently. Values persist in this browser until Reset.
          </p>
        </div>
      ) : null}

      <style>{`
        .tune-slider {
          -webkit-appearance: none;
          appearance: none;
          height: 3px;
          border-radius: 2px;
          background: rgba(255, 255, 255, 0.14);
          outline: none;
        }
        .tune-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 11px;
          height: 11px;
          border-radius: 50%;
          background: rgb(240 184 73);
          border: none;
          cursor: ew-resize;
        }
        .tune-slider::-moz-range-thumb {
          width: 11px;
          height: 11px;
          border-radius: 50%;
          background: rgb(240 184 73);
          border: none;
          cursor: ew-resize;
        }
      `}</style>
    </>
  )
}
