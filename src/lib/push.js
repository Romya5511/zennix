// src/lib/push.js
// Helper to call the send-push Supabase Edge Function

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

export async function sendPush({ householdId, senderId, title, body, url = '/' }) {
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        household_id: householdId,
        sender_id: senderId,
        title,
        body,
        url,
      }),
    })
  } catch (err) {
    // Push is best-effort — never block the UI on failure
    console.error('Push send error:', err)
  }
}
