// Supabase Edge Function: send-push-both
// Sends a push notification to ALL members of a household (used for reminders)

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
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      }
    })
  }

  try {
    const { household_id, title, body, url } = await req.json()

    if (!household_id || !title) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 })
    }

    // Get ALL members of this household
    const membersRes = await fetch(
      `${SUPABASE_URL}/rest/v1/household_members?household_id=eq.${household_id}&select=user_id`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        }
      }
    )
    const members = await membersRes.json()

    if (!members || members.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), { status: 200 })
    }

    const userIds = members.map((m: { user_id: string }) => m.user_id)

    // Get push subscriptions for all members
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
      return new Response(JSON.stringify({ sent: 0 }), { status: 200 })
    }

    const results = await Promise.allSettled(
      profiles.map(async (profile: { id: string; push_subscription: object }) => {
        try {
          const payload = JSON.stringify({ title, body, data: { url: url || '/fixed-costs' } })
          await webpush.sendNotification(
            profile.push_subscription as webpush.PushSubscription,
            payload
          )
        } catch (err: any) {
          // If subscription expired or invalid, clear it
          if (err.statusCode === 410 || err.statusCode === 404) {
            await fetch(
              `${SUPABASE_URL}/rest/v1/profiles?id=eq.${profile.id}`,
              {
                method: 'PATCH',
                headers: {
                  'apikey': SUPABASE_SERVICE_KEY,
                  'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ push_subscription: null }),
              }
            )
          }
          throw err
        }
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
    console.error('send-push-both error:', err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})
