type Callback = () => void

/**
 * One IntersectionObserver for the whole page instead of one per element.
 * Each target fires once and is then dropped.
 */
let observer: IntersectionObserver | null = null
const targets = new Map<Element, Callback>()

function getObserver() {
  if (observer) return observer
  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        const cb = targets.get(entry.target)
        targets.delete(entry.target)
        observer?.unobserve(entry.target)
        cb?.()
      }
    },
    { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
  )
  return observer
}

export function observeOnce(el: Element, cb: Callback) {
  targets.set(el, cb)
  getObserver().observe(el)
  return () => {
    targets.delete(el)
    observer?.unobserve(el)
  }
}
