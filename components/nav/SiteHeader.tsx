'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/cn'
import { Logo } from '@/components/brand/Logo'
import { Icon } from '@/components/icons/Icon'
import { site } from '@/content/site'
import { navGroups } from './nav-items'
import { pageRevealed } from '@/lib/hero-loader'

/*
  The header: one centred glass pill. Logo on the left, the three site groups
  as buttons with submenus in the middle, Contact us on the right. On phones
  the groups collapse into a Menu button opening the full sheet.

  Performance rules it is built on:

  - Every animation is transform or opacity, nothing that can trigger layout.
    The pill's entrance, its scroll hide and show, the submenu open and close
    and every hover all run on the compositor.
  - The submenu panels are always mounted and toggled with classes, so opening
    one costs zero reconciliation and zero layout, and the close plays as an
    animation instead of a vanish. Closed panels carry inert, so they do not
    exist for the keyboard or a screen reader.
  - One scroll listener, passive and rAF guarded, feeding a hysteresis: the
    pill hides only after 90px of accumulated downward travel past the top
    zone and returns on the first upward nudge, so it can never flicker at a
    boundary or vanish at a random spot. State only changes when the answer
    changes, and React bails out on identical state.
  - The entrance waits for the loading screen's reveal, so the pill drops in
    over a page the visitor can already see.
*/

/** Hide only after this much accumulated downward scroll. */
const HIDE_AFTER = 90
/** Never hide within this distance of the top. */
const TOP_ZONE = 160

export function SiteHeader() {
  const [shown, setShown] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [openGroup, setOpenGroup] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const closeTimer = useRef(0)
  const panelRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const pathname = usePathname()

  /* Entrance: with the curtain's reveal, plus a failsafe so a broken loader
     can never leave the site without navigation. */
  useEffect(() => {
    let cancelled = false
    const failsafe = window.setTimeout(() => setShown(true), 4000)
    void pageRevealed.then(() => {
      if (cancelled) return
      window.clearTimeout(failsafe)
      setShown(true)
    })
    return () => {
      cancelled = true
      window.clearTimeout(failsafe)
    }
  }, [])

  /* Navigation closes everything. */
  useEffect(() => {
    setOpenGroup(null)
    setSheetOpen(false)
  }, [pathname])

  /* The scroll hysteresis. */
  useEffect(() => {
    let raf = 0
    let last = window.scrollY
    let downwards = 0
    const measure = () => {
      raf = 0
      const y = window.scrollY
      const delta = y - last
      last = y
      setScrolled(y > 24)
      if (y < TOP_ZONE) {
        downwards = 0
        setHidden(false)
        return
      }
      if (delta > 0) {
        downwards += delta
        if (downwards > HIDE_AFTER) setHidden(true)
      } else if (delta < 0) {
        downwards = 0
        setHidden(false)
      }
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(measure)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    measure()
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  /* Escape closes an open submenu. Bound only while one is open. */
  useEffect(() => {
    if (!openGroup) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenGroup(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [openGroup])

  /* The phone sheet's focus trap and scroll lock, unchanged in behaviour. */
  useEffect(() => {
    if (!sheetOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSheetOpen(false)
      if (e.key !== 'Tab') return
      const focusables = panelRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled])',
      )
      if (!focusables?.length) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    panelRef.current?.querySelector<HTMLElement>('a[href]')?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
      triggerRef.current?.focus()
    }
  }, [sheetOpen])

  const openNow = (label: string) => {
    window.clearTimeout(closeTimer.current)
    setOpenGroup(label)
  }
  /* The grace period between leaving a button and its panel. */
  const scheduleClose = () => {
    window.clearTimeout(closeTimer.current)
    closeTimer.current = window.setTimeout(() => setOpenGroup(null), 160)
  }

  /* An open submenu pins the pill on screen, whatever the scroll does. */
  const isHidden = hidden && !openGroup

  return (
    <>
      <header className="pointer-events-none fixed inset-x-0 top-0 z-40 flex justify-center px-4">
        {/* Without JavaScript nothing reveals the pill, so it shows itself. */}
        <noscript>
          <style>{'.site-pill-wrap{transform:none;opacity:1}'}</style>
        </noscript>

        <div
          className={cn(
            'site-pill-wrap pointer-events-auto mt-4 will-change-transform',
            'transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]',
            !shown
              ? '-translate-y-6 opacity-0'
              : isHidden
                ? 'pointer-events-none -translate-y-[150%] opacity-0'
                : 'translate-y-0 opacity-100',
          )}
        >
          {/*
            The pill. Glass built inline rather than with .liquid-glass,
            because that class clips its overflow and the submenus hang below.
          */}
          <div
            className={cn(
              'ring-glass relative flex items-center rounded-full p-1.5 pl-4',
              'shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_10px_30px_rgba(0,0,0,0.35)]',
              'backdrop-blur-[6px] transition-colors duration-300',
              scrolled ? 'bg-[#0a0d0c]/70' : 'bg-white/[0.03]',
            )}
          >
            <Link href="/" className="flex shrink-0 items-center gap-2.5 pr-3 text-white">
              <Logo size={26} />
              <span className="hidden text-lg font-semibold tracking-tighter sm:block">
                {site.name}
              </span>
            </Link>

            <nav aria-label="Primary" className="hidden lg:block">
              <ul className="flex items-center">
                {navGroups.map((group) => {
                  const open = openGroup === group.label
                  return (
                    <li
                      key={group.label}
                      className="relative"
                      onPointerEnter={() => openNow(group.label)}
                      onPointerLeave={scheduleClose}
                      onBlur={(event) => {
                        if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                          setOpenGroup(null)
                        }
                      }}
                    >
                      <button
                        type="button"
                        aria-expanded={open}
                        aria-haspopup="true"
                        onClick={() => (open ? setOpenGroup(null) : openNow(group.label))}
                        className={cn(
                          'flex items-center gap-1.5 rounded-full px-4 py-2 text-sm transition-colors duration-150',
                          open ? 'bg-white/10 text-white' : 'text-white/70 hover:text-white',
                        )}
                      >
                        {group.label}
                        <Icon
                          name="chevron-down"
                          size={14}
                          className={cn(
                            'text-white/50 transition-transform duration-200',
                            open && 'rotate-180',
                          )}
                        />
                      </button>

                      {/*
                        Always mounted, class toggled, inert while closed.
                        Opening is instant because nothing mounts, and closing
                        animates instead of vanishing.
                      */}
                      <div
                        inert={!open}
                        className={cn(
                          'absolute left-1/2 top-full z-10 mt-3 w-72 origin-top rounded-3xl p-2',
                          'ring-glass bg-[#0a0d0c]/80 backdrop-blur-[6px]',
                          'shadow-[inset_0_1px_1px_rgba(255,255,255,0.08),0_18px_40px_rgba(0,0,0,0.45)]',
                          'transition-[transform,opacity] duration-200 ease-out',
                          open
                            ? '-translate-x-1/2 translate-y-0 scale-100 opacity-100'
                            : 'pointer-events-none -translate-x-1/2 -translate-y-1 scale-[0.97] opacity-0',
                        )}
                      >
                        {group.items.map((item) => (
                          <Link
                            key={item.href}
                            href={item.href}
                            aria-current={pathname === item.href ? 'page' : undefined}
                            className="group/item block rounded-2xl px-4 py-3 transition-colors duration-150 hover:bg-white/5"
                          >
                            <span
                              className={cn(
                                'flex items-center justify-between text-sm',
                                pathname === item.href ? 'text-accent' : 'text-white',
                              )}
                            >
                              {item.label}
                              <Icon
                                name="arrow-right"
                                size={14}
                                className="text-white/0 transition-colors duration-150 group-hover/item:text-white/60"
                              />
                            </span>
                            <span className="mt-0.5 block text-xs leading-relaxed text-white/55">
                              {item.note}
                            </span>
                          </Link>
                        ))}
                      </div>
                    </li>
                  )
                })}
              </ul>
            </nav>

            <div className="ml-2 flex shrink-0 items-center gap-1.5">
              <Link
                href="/contact"
                className="hidden items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm text-white transition-[background-color,transform] duration-200 ease-out hover:scale-[1.04] hover:bg-white/20 active:scale-95 sm:inline-flex"
              >
                <Icon name="mail" size={16} />
                Contact us
              </Link>

              <button
                ref={triggerRef}
                type="button"
                onClick={() => setSheetOpen(true)}
                aria-expanded={sheetOpen}
                aria-controls="site-menu"
                className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm text-white transition-[background-color,transform] duration-200 ease-out hover:scale-[1.04] hover:bg-white/20 active:scale-95 lg:hidden"
              >
                <Icon name="menu" size={18} />
                Menu
              </button>
            </div>
          </div>
        </div>
      </header>

      {sheetOpen ? (
        <div
          id="site-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Site menu"
          ref={panelRef}
          className="liquid-glass-strong fixed inset-0 z-50 overflow-y-auto"
        >
          <div className="mx-auto flex min-h-full w-full max-w-[1400px] flex-col px-6 py-5 sm:px-8">
            <div className="flex h-[var(--header-h)] items-center justify-between">
              <span className="text-xl font-semibold tracking-tighter text-white">{site.name}</span>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                className="glass-surface inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm text-white"
              >
                <Icon name="close" size={20} />
                Close
              </button>
            </div>

            <nav className="mt-10 grid flex-1 gap-10">
              {navGroups.map((group) => (
                <div key={group.label}>
                  <p className="text-xs uppercase tracking-widest text-white/50">{group.label}</p>
                  <ul className="mt-5 space-y-4">
                    {group.items.map((item) => (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={() => setSheetOpen(false)}
                          className="group block"
                        >
                          <span className="flex items-center gap-3 text-2xl font-medium tracking-[-0.03em] text-white">
                            {item.label}
                            <Icon name="arrow-right" size={20} className="text-white/50" />
                          </span>
                          <span className="mt-1 block text-sm text-white/60">{item.note}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>

            <div className="mt-12 flex flex-col gap-5 py-8 text-sm text-white/60">
              <a href={`mailto:${site.email}`} className="text-white">
                {site.email}
              </a>
              <Link
                href="/contact"
                onClick={() => setSheetOpen(false)}
                className="glass-surface inline-flex items-center gap-3 self-start rounded-full py-2 pl-6 pr-2 text-sm text-white"
              >
                Contact us
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15">
                  <Icon name="arrow-right" size={16} />
                </span>
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
