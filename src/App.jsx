import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'

function App() {
  const [status, setStatus] = useState('Connecting...')

  useEffect(() => {
    async function testConnection() {
      const { data, error } = await supabase.from('profiles').select('*')
      if (error) {
        setStatus('❌ Error: ' + error.message)
      } else {
        setStatus('✅ Supabase connected! Tables are ready.')
      }
    }
    testConnection()
  }, [])

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Zennix 🏠</h1>
      <p>{status}</p>
    </div>
  )
}

export default App