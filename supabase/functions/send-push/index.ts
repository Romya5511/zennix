// Supabase Edge Function: send-push
// Called from React app after each trigger action
// Sends a web push notification to the other household member

import webpush from 'npm:web-push@3.6.7'

const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

webpush.setVapidDetails(
  'mailto:support@zennix.app',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
)

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      }
    })
  }

  try {
    const { household_id, sender_id, title, body, url } = await req.json()

    if (!household_id || !sender_id || !title) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 })
    }

    // Get all household members except the sender
    const membersRes = await fetch(
      `${SUPABASE_URL}/rest/v1/household_members?household_id=eq.${household_id}&user_id=neq.${sender_id}&select=user_id`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        }
      }
    )
    const members = await membersRes.json()

    if (!members || members.length === 0) {
      // Solo household — skip silently
      return new Response(JSON.stringify({ sent: 0 }), { status: 200 })
    }

    const userIds = members.map((m: { user_id: string }) => m.user_id)

    // Get push subscriptions for those members
    const profilesRes = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?id=in.(${userIds.join(',')})&push_subscription=not.is.null&select=id,push_subscription`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        }
      }
    )
    const profiles = await profilesRes.json()

    if (!profiles || profiles.length === 0) {
      // No subscriptions — skip silently
      return new Response(JSON.stringify({ sent: 0 }), { status: 200 })
    }

    // Send push to each member with a subscription
    const results = await Promise.allSettled(
      profiles.map(async (profile: { id: string; push_subscription: object }) => {
        const subscription = profile.push_subscription
        const payload = JSON.stringify({ title, body, data: { url: url || '/' } })
        await webpush.sendNotification(subscription as webpush.PushSubscription, payload)
      })
    )

    const sent = results.filter(r => r.status === 'fulfilled').length
    return new Response(
      JSON.stringify({ sent }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      }
    )
  } catch (err) {
    console.error('send-push error:', err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})
