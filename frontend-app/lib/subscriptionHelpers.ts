import { supabase } from './supabaseClient'

export interface UserSubscription {
  user_id: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  status: 'active' | 'cancelled' | 'past_due' | null
  current_period_end: string | null
  created_at: string
  updated_at: string
}

export async function checkUserSubscription(token: string): Promise<{
  isSubscribed: boolean
  subscription: UserSubscription | null
}> {
  try {
    // Get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return { isSubscribed: false, subscription: null }
    }

    // Check subscription
    const { data, error } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error || !data) {
      return { isSubscribed: false, subscription: null }
    }

    // Check if subscription is active
    const isActive = data.status === 'active' &&
      (!data.current_period_end || new Date(data.current_period_end) > new Date())

    return {
      isSubscribed: isActive,
      subscription: data as UserSubscription
    }
  } catch (error) {
    console.error('Error checking subscription:', error)
    return { isSubscribed: false, subscription: null }
  }
}

export async function countUserSummaries(token: string): Promise<number> {
  try {
    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL

    if (!apiBase) {
      console.error('NEXT_PUBLIC_API_BASE_URL is not set')
      return 0
    }

    const response = await fetch(`${apiBase}/summaries`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      console.error('Failed to fetch summaries count')
      return 0
    }

    const data = await response.json()
    return data.summaries?.length || 0
  } catch (error) {
    console.error('Error counting summaries:', error)
    return 0
  }
}

export async function canGenerateSummary(token: string): Promise<{
  canGenerate: boolean
  summariesCount: number
  isSubscribed: boolean
}> {
  const { isSubscribed } = await checkUserSubscription(token)
  const summariesCount = await countUserSummaries(token)

  // If user is subscribed, they can always generate
  if (isSubscribed) {
    return { canGenerate: true, summariesCount, isSubscribed: true }
  }

  // Free users can only generate 1 summary
  const canGenerate = summariesCount < 1

  return { canGenerate, summariesCount, isSubscribed: false }
}
