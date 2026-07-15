import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

function LandingPage() {
  const navigate = useNavigate()

  async function handleGetStarted() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      navigate('/')
    } else {
      navigate('/login')
    }
  }

  const features = [
    { icon: '🛒', title: 'Shared grocery lists', desc: 'Create lists together. Both members see updates in real time.' },
    { icon: '💰', title: 'Track every rupee', desc: 'Enter prices as you shop. See exactly where money goes.' },
    { icon: '📅', title: 'Fixed costs sorted', desc: 'Rent, WiFi, electricity — never forget what\'s due this month.' },
    { icon: '📊', title: 'Spend analytics', desc: 'Weekly and monthly charts. Know if you\'re spending too much.' },
    { icon: '🔔', title: 'Push notifications', desc: 'Get notified when your partner starts or completes a list.' },
    { icon: '🏠', title: 'Built for Indian homes', desc: 'Hindi item names, ₹ currency, designed for how Indian couples shop.' },
  ]

  return (
    <div style={styles.page}>

      {/* Nav */}
      <div style={styles.nav}>
        <span style={styles.navLogo}>🏠 Zennix</span>
        <button style={styles.navBtn} onClick={handleGetStarted}>
          Get started →
        </button>
      </div>

      {/* Hero */}
      <div style={styles.hero}>
        <div style={styles.heroBadge}>Free for households · No credit card</div>
        <h1 style={styles.heroTitle}>
          Manage your home expenses,<br />
          <span style={styles.heroAccent}>together.</span>
        </h1>
        <p style={styles.heroSub}>
          Zennix is a shared expense tracker for couples and households.
          Grocery lists, fixed costs, spend history — all in one place,
          synced with your partner in real time.
        </p>
        <div style={styles.heroActions}>
          <button style={styles.heroCTA} onClick={handleGetStarted}>
            Start for free
          </button>
          <p style={styles.heroNote}>Works on Android & iOS · Installs like an app</p>
        </div>

        {/* Phone mockup */}
        <div style={styles.mockupWrap}>
          <div style={styles.mockup}>
            <div style={styles.mockupScreen}>
              {/* Mini home screen preview */}
              <div style={styles.mockupHeader}>
                <span style={styles.mockupGreeting}>Good morning, Sachin 👋</span>
                <span style={styles.mockupSub}>What needs to be done today?</span>
              </div>
              <div style={styles.mockupCard}>
                <span style={styles.mockupLabel}>THIS WEEK'S SPEND</span>
                <span style={styles.mockupAmount}>₹2,350</span>
                <span style={styles.mockupChange}>↓ 12% vs last week</span>
              </div>
              <div style={styles.mockupListCard}>
                <span style={styles.mockupActive}>● ACTIVE LIST</span>
                <span style={styles.mockupItems}>🛒 27 items</span>
                <div style={styles.mockupBtn}>Open list →</div>
              </div>
              <div style={styles.mockupNav}>
                <span style={{ ...styles.mockupNavItem, color: '#4f46e5' }}>🏠 Home</span>
                <span style={styles.mockupNavItem}>📅 Fixed</span>
                <span style={styles.mockupNavItem}>📊 Spend</span>
                <span style={styles.mockupNavItem}>🛒 History</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features */}
      <div style={styles.features}>
        <h2 style={styles.featuresTitle}>Everything your household needs</h2>
        <div style={styles.featureGrid}>
          {features.map((f, i) => (
            <div key={i} style={styles.featureCard}>
              <span style={styles.featureIcon}>{f.icon}</span>
              <h3 style={styles.featureCardTitle}>{f.title}</h3>
              <p style={styles.featureCardDesc}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div style={styles.howItWorks}>
        <h2 style={styles.featuresTitle}>Up and running in 2 minutes</h2>
        <div style={styles.steps}>
          {[
            { num: '1', text: 'Sign in with Google' },
            { num: '2', text: 'Create your household & invite your partner via WhatsApp' },
            { num: '3', text: 'Start your first grocery list together' },
          ].map((step, i) => (
            <div key={i} style={styles.step}>
              <div style={styles.stepNum}>{step.num}</div>
              <p style={styles.stepText}>{step.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA bottom */}
      <div style={styles.ctaBottom}>
        <h2 style={styles.ctaTitle}>Ready to get started?</h2>
        <p style={styles.ctaSub}>Free for your first household. Always.</p>
        <button style={styles.heroCTA} onClick={handleGetStarted}>
          Create your household →
        </button>
      </div>

      {/* Footer */}
      <div style={styles.footer}>
        <span style={styles.footerLogo}>🏠 Zennix</span>
        <span style={styles.footerText}>Made with ❤️ for Indian households</span>
      </div>

    </div>
  )
}

const styles = {
  page: { minHeight: '100vh', backgroundColor: '#fff', fontFamily: '"Inter", sans-serif' },

  // Nav
  nav: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', borderBottom: '1px solid #f3f4f6', position: 'sticky', top: 0, background: '#fff', zIndex: 10 },
  navLogo: { fontSize: '1.1rem', fontWeight: '800', color: '#4f46e5' },
  navBtn: { padding: '0.5rem 1.25rem', fontSize: '0.875rem', fontWeight: '700', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '999px', cursor: 'pointer' },

  // Hero
  hero: { padding: '3rem 1.5rem 2rem', maxWidth: '480px', margin: '0 auto', textAlign: 'center' },
  heroBadge: { display: 'inline-block', background: '#ede9fe', color: '#4f46e5', fontSize: '0.75rem', fontWeight: '700', padding: '0.3rem 0.85rem', borderRadius: '999px', marginBottom: '1.25rem' },
  heroTitle: { fontSize: '2rem', fontWeight: '800', color: '#111', lineHeight: '1.2', margin: '0 0 1rem' },
  heroAccent: { color: '#4f46e5' },
  heroSub: { fontSize: '0.95rem', color: '#6b7280', lineHeight: '1.7', margin: '0 0 1.75rem' },
  heroActions: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', marginBottom: '2.5rem' },
  heroCTA: { padding: '0.9rem 2.5rem', fontSize: '1rem', fontWeight: '700', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '999px', cursor: 'pointer', boxShadow: '0 4px 16px rgba(79,70,229,0.35)' },
  heroNote: { fontSize: '0.78rem', color: '#9ca3af', margin: 0 },

  // Phone mockup
  mockupWrap: { display: 'flex', justifyContent: 'center', marginTop: '1rem' },
  mockup: { width: '220px', background: '#111', borderRadius: '28px', padding: '8px', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' },
  mockupScreen: { background: '#f9fafb', borderRadius: '22px', padding: '1rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.6rem', minHeight: '380px' },
  mockupHeader: { display: 'flex', flexDirection: 'column', gap: '0.15rem' },
  mockupGreeting: { fontSize: '0.75rem', fontWeight: '700', color: '#111' },
  mockupSub: { fontSize: '0.6rem', color: '#9ca3af' },
  mockupCard: { background: '#4f46e5', borderRadius: '12px', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.15rem' },
  mockupLabel: { fontSize: '0.5rem', fontWeight: '700', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.05em' },
  mockupAmount: { fontSize: '1.25rem', fontWeight: '800', color: '#fff' },
  mockupChange: { fontSize: '0.55rem', color: 'rgba(255,255,255,0.8)' },
  mockupListCard: { background: '#fff', borderRadius: '10px', padding: '0.6rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' },
  mockupActive: { fontSize: '0.5rem', fontWeight: '700', color: '#16a34a' },
  mockupItems: { fontSize: '0.7rem', fontWeight: '600', color: '#111' },
  mockupBtn: { background: '#4f46e5', color: '#fff', fontSize: '0.55rem', fontWeight: '700', borderRadius: '6px', padding: '0.3rem 0.5rem', textAlign: 'center', marginTop: '0.1rem' },
  mockupNav: { display: 'flex', justifyContent: 'space-between', background: '#fff', borderRadius: '10px', padding: '0.5rem 0.4rem', marginTop: 'auto', boxShadow: '0 -1px 4px rgba(0,0,0,0.05)' },
  mockupNavItem: { fontSize: '0.45rem', color: '#9ca3af', textAlign: 'center', flex: 1 },

  // Features
  features: { padding: '3rem 1.5rem', background: '#f9fafb' },
  featuresTitle: { fontSize: '1.5rem', fontWeight: '800', color: '#111', textAlign: 'center', margin: '0 0 2rem' },
  featureGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', maxWidth: '480px', margin: '0 auto' },
  featureCard: { background: '#fff', borderRadius: '16px', padding: '1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', gap: '0.4rem' },
  featureIcon: { fontSize: '1.5rem' },
  featureCardTitle: { fontSize: '0.875rem', fontWeight: '700', color: '#111', margin: 0 },
  featureCardDesc: { fontSize: '0.78rem', color: '#6b7280', margin: 0, lineHeight: '1.5' },

  // How it works
  howItWorks: { padding: '3rem 1.5rem', maxWidth: '480px', margin: '0 auto' },
  steps: { display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1.5rem' },
  step: { display: 'flex', alignItems: 'flex-start', gap: '1rem' },
  stepNum: { width: '32px', height: '32px', borderRadius: '50%', background: '#4f46e5', color: '#fff', fontSize: '0.875rem', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  stepText: { fontSize: '0.95rem', color: '#374151', margin: 0, lineHeight: '1.6', paddingTop: '0.3rem' },

  // CTA bottom
  ctaBottom: { padding: '3rem 1.5rem', background: '#4f46e5', textAlign: 'center' },
  ctaTitle: { fontSize: '1.5rem', fontWeight: '800', color: '#fff', margin: '0 0 0.5rem' },
  ctaSub: { fontSize: '0.9rem', color: 'rgba(255,255,255,0.8)', margin: '0 0 1.5rem' },

  // Footer
  footer: { padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem', borderTop: '1px solid #f3f4f6' },
  footerLogo: { fontSize: '1rem', fontWeight: '800', color: '#4f46e5' },
  footerText: { fontSize: '0.78rem', color: '#9ca3af' },
}

export default LandingPage