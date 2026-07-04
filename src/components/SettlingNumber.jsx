import { useEffect, useRef, useState } from 'react'

// One unified "jiggle then settle" number effect, used for BOTH:
//  (a) the casino-style reveal when a page first opens, and
//  (b) the odometer-style roll whenever the value changes after a save.
// Same animation both times by design — it's the same visual language
// ("this number is alive") whether it's the first paint or a live update.
//
// Phase 1 (~550ms): rapid random jitter around the true value, amplitude
// shrinking toward zero — reads as "counting/rolling."
// Phase 2 (~350ms): eased glide from the last jittered value to the exact
// target — the "settle" moment.
function SettlingNumber({ value, prefix = '₹', decimals = 2, style }) {
  const [display, setDisplay] = useState(value)
  const prevTarget = useRef(value)
  const rafRef = useRef(null)
  const intervalRef = useRef(null)

  useEffect(() => {
    const target = typeof value === 'number' ? value : parseFloat(value) || 0
    prevTarget.current = target

    clearInterval(intervalRef.current)
    cancelAnimationFrame(rafRef.current)

    const jitterStep = 55
    const jitterDuration = 550
    const jitterTicks = Math.max(1, Math.floor(jitterDuration / jitterStep))
    const range = Math.max(target * 0.4, 15)
    let tick = 0

    intervalRef.current = setInterval(() => {
      tick++
      const shrink = 1 - tick / jitterTicks
      const jittered = Math.max(0, target + (Math.random() * 2 - 1) * range * shrink)
      setDisplay(jittered)

      if (tick >= jitterTicks) {
        clearInterval(intervalRef.current)
        const settleDuration = 350
        const settleStart = performance.now()
        const from = jittered
        function animateSettle(now) {
          const elapsed = now - settleStart
          const t = Math.min(1, elapsed / settleDuration)
          const eased = 1 - Math.pow(1 - t, 3) // ease-out cubic
          setDisplay(from + (target - from) * eased)
          if (t < 1) {
            rafRef.current = requestAnimationFrame(animateSettle)
          } else {
            setDisplay(target)
          }
        }
        rafRef.current = requestAnimationFrame(animateSettle)
      }
    }, jitterStep)

    return () => {
      clearInterval(intervalRef.current)
      cancelAnimationFrame(rafRef.current)
    }
    // Re-runs whenever the numeric value actually changes (mount included).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  return <span style={style}>{prefix}{display.toFixed(decimals)}</span>
}

export default SettlingNumber