// Supabase Edge Function: fixed-cost-reminder
// Called daily at 9AM IST (3:30 AM UTC) via pg_cron
// Sends push notifications to all household members for costs due today

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

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
    // Get today's day of month in IST (UTC+5:30)
    const now = new Date()
    const istOffset = 5.5 * 60 * 60 * 1000
    const istNow = new Date(now.getTime() + istOffset)
    const todayDay = istNow.getUTCDate()

    // Fetch all fixed_costs where reminder_day = today
    const costsRes = await fetch(
      `${SUPABASE_URL}/rest/v1/fixed_costs?reminder_day=eq.${todayDay}&select=id,household_id,description,last_amount`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        }
      }
    )
    const costs = await costsRes.json()

    if (!costs || costs.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No reminders for today', day: todayDay }),
        { status: 200 }
      )
    }

    // Send push to all members for each matching cost
    const results = await Promise.allSettled(
      costs.map(async (cost: {
        id: string
        household_id: string
        description: string
        last_amount: number | null
      }) => {
        const title = `${cost.description} due today`
        const body = cost.last_amount != null
          ? `Last paid ₹${parseFloat(String(cost.last_amount)).toLocaleString('en-IN')}`
          : "Don't forget to log the payment"

        // Call send-push-both for this household
        await fetch(
          `${SUPABASE_URL}/functions/v1/send-push-both`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            },
            body: JSON.stringify({
              household_id: cost.household_id,
              title,
              body,
              url: '/fixed-costs',
            }),
          }
        )
      })
    )

    const sent = results.filter(r => r.status === 'fulfilled').length
    return new Response(
      JSON.stringify({ processed: costs.length, sent, day: todayDay }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      }
    )
  } catch (err) {
    console.error('fixed-cost-reminder error:', err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})
