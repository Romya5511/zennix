// Lightweight, dependency-free sound engine for Save Delight.
// Sounds are SYNTHESIZED at runtime using the Web Audio API — no audio
// files are downloaded or embedded, so there is zero licensing risk.
// The tradeoff: a simple synthesized "tick", not a produced sound effect.
//
// IMPORTANT, HONEST LIMITATION: there is no browser API that lets a
// website read the phone's physical silent/vibrate switch state. iOS and
// Android both intentionally hide this from every website, for privacy —
// this is true everywhere, not a Zennix-specific gap. Because of this,
// "auto-detect silent mode" isn't something a PWA can actually do. The
// explicit Settings toggle below is the real, reliable control — make
// sure users know to use it, since the OS won't silence Web Audio for us
// automatically the way it might silence a video or native app sound.

let audioCtx = null

function getContext() {
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return null
    audioCtx = new AC()
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {})
  }
  return audioCtx
}

const STORAGE_KEY = 'zennix_sound_enabled'

export function getSoundEnabled() {
  const stored = localStorage.getItem(STORAGE_KEY)
  return stored === null ? true : stored === 'true'
}

export function setSoundEnabled(enabled) {
  localStorage.setItem(STORAGE_KEY, String(enabled))
}

// A quick two-tone "coin drop" cue — first tone, then a slightly higher
// second tone ~90ms later, each with a fast attack and exponential decay
// so it reads as a crisp "ding" rather than a harsh beep.
export function playSaveSound() {
  if (!getSoundEnabled()) return
  try {
    const ctx = getContext()
    if (!ctx) return
    const now = ctx.currentTime

    ;[[880, 0], [1318.5, 0.09]].forEach(([freq, delay]) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.0001, now + delay)
      gain.gain.exponentialRampToValueAtTime(0.18, now + delay + 0.015)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.22)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now + delay)
      osc.stop(now + delay + 0.25)
    })
  } catch (e) {
    // Never let a sound failure block or delay the actual save.
    console.warn('Sound playback skipped:', e)
  }
}