import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

function Home() {
  const navigate = useNavigate()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    async function checkHousehold() {
      // Get the currently logged-in user
      const { data: { user } } = await supabase.auth.getUser()

      // First, make sure their profile exists in our profiles table
      await supabase.from('profiles').upsert({
        id: user.id,
        full_name: user.user_metadata.full_name,
        avatar_url: user.user_metadata.avatar_url,
      }, { onConflict: 'id' })

      // Now check if they're already in a household
      const { data: membership } = await supabase
        .from('household_members')
        .select('household_id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (membership) {
        // They have a household → go to dashboard
        navigate('/dashboard')
      } else {
        // No household yet → go to setup
        navigate('/setup')
      }
    }

    checkHousehold()
  }, [])

  return (
    <p style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      Setting things up...
    </p>
  )
}

export default Home