import { useState, useCallback } from 'react'
import { playSaveSound } from '../lib/soundEngine'

// Shared "save felt good" micro-interaction, reused by grocery Done,
// Fixed Cost payment, and Quick Log saves — one component, three call
// sites, per the roadmap. Call fire(amount) AFTER a save has already
// succeeded — never before — so this can never delay the real write.
// The whole effect runs under 700ms, well within the ~400ms-of-added-
// perceived-delay budget since it's fire-and-forget, not awaited.
export function useSaveDelight() {
  const [flying, setFlying] = useState(null) // { amount, id } | null

  const fire = useCallback((amount) => {
    playSaveSound()
    const id = Date.now()
    setFlying({ amount, id })
    setTimeout(() => {
      setFlying(f => (f && f.id === id ? null : f))
    }, 700)
  }, [])

  const Overlay = flying ? (
    <SaveDelightOverlay key={flying.id} amount={flying.amount} />
  ) : null

  return { fire, Overlay }
}

function SaveDelightOverlay({ amount }) {
  return (
    <>
      <style>{`
        @keyframes zennixSaveFly {
          0%   { transform: translate(-50%, 0) scale(1);        opacity: 1;   }
          65%  { transform: translate(-50%, -130px) scale(0.75); opacity: 0.95; }
          100% { transform: translate(-50%, -170px) scale(0.4);  opacity: 0;   }
        }
      `}</style>
      <div style={overlayStyles.pill}>
        +₹{parseFloat(amount || 0).toFixed(0)}
      </div>
    </>
  )
}

const overlayStyles = {
  pill: {
    position: 'fixed',
    left: '50%',
    bottom: '110px',
    background: '#4f46e5',
    color: '#fff',
    fontWeight: 800,
    fontSize: '1rem',
    padding: '0.5rem 1.1rem',
    borderRadius: '999px',
    boxShadow: '0 4px 16px rgba(79,70,229,0.4)',
    zIndex: 300,
    pointerEvents: 'none',
    animation: 'zennixSaveFly 0.65s ease-out forwards',
  },
}