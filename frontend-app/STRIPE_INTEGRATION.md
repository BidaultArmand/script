# Stripe Integration Guide

This guide explains how to set up and use the Stripe payment integration in echoCap.

## Overview

The application uses a **freemium model**:
- ✅ **Free tier**: 1 free transcription/summary
- 💎 **Pro tier**: Unlimited transcriptions and summaries for €9.99/month

## Setup Instructions

### 1. Install Dependencies

Dependencies are already installed. If needed:
```bash
npm install stripe @stripe/stripe-js
```

### 2. Create Stripe Account

1. Go to [stripe.com](https://stripe.com) and create an account
2. Get your API keys from the Stripe Dashboard
3. Get test keys for development (they start with `pk_test_` and `sk_test_`)

### 3. Set Up Environment Variables

Copy `.env.example` to `.env.local` and fill in your values:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Backend API
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key
STRIPE_SECRET_KEY=sk_test_your_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
```

### 4. Create Database Table

Run the SQL in `supabase-schema.sql` in your Supabase SQL Editor:

1. Go to your Supabase project dashboard
2. Click on "SQL Editor" in the left sidebar
3. Click "New query"
4. Copy and paste the contents of `supabase-schema.sql`
5. Click "Run" to execute

This creates the `user_subscriptions` table with proper policies and triggers.

### 5. Set Up Stripe Webhooks

For **local development** (using Stripe CLI):

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login to Stripe
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

The CLI will output a webhook secret (starts with `whsec_`). Add it to your `.env.local`.

For **production**:

1. Go to Stripe Dashboard → Developers → Webhooks
2. Click "Add endpoint"
3. Enter your webhook URL: `https://yourdomain.com/api/webhooks/stripe`
4. Select events to listen to:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Copy the webhook signing secret and add it to your environment variables

## How It Works

### User Flow

1. **Free User**: Can create 1 summary for free
2. **Limit Reached**: When trying to create a 2nd summary, a payment modal appears
3. **Payment**: User clicks "Upgrade Now" → Redirected to Stripe Checkout
4. **Success**: After payment, user is redirected back to dashboard with Pro access
5. **Unlimited**: Pro users can create unlimited summaries

### Technical Flow

1. **Check Before Generation** (`AudioUploader.tsx`)
   - Before generating a summary, `canGenerateSummary()` is called
   - Checks subscription status and count of existing summaries
   - If limit exceeded, shows `PaymentModal`

2. **Payment Process**
   - User clicks "Upgrade Now" in modal
   - Frontend calls `/api/create-checkout-session`
   - API creates Stripe Checkout session
   - User is redirected to Stripe's hosted checkout page

3. **Webhook Processing**
   - After successful payment, Stripe sends webhook to `/api/webhooks/stripe`
   - Webhook verifies signature and updates `user_subscriptions` table
   - User now has `status: 'active'` in database

4. **Subsequent Checks**
   - `canGenerateSummary()` checks subscription status from database
   - Active subscribers always get `canGenerate: true`

## Files Created/Modified

### New Files
- `app/api/create-checkout-session/route.ts` - Creates Stripe checkout sessions
- `app/api/webhooks/stripe/route.ts` - Handles Stripe webhooks
- `components/PaymentModal.tsx` - Payment upgrade modal UI
- `lib/subscriptionHelpers.ts` - Subscription checking logic
- `supabase-schema.sql` - Database schema for subscriptions
- `.env.example` - Environment variables template
- `STRIPE_INTEGRATION.md` - This documentation

### Modified Files
- `components/AudioUploader.tsx` - Added payment gate before summary generation

## Testing

### Test in Development

1. Use Stripe test cards (see [Stripe Testing](https://stripe.com/docs/testing)):
   - **Success**: `4242 4242 4242 4242`
   - **Decline**: `4000 0000 0000 0002`
   - Use any future expiry date and any CVC

2. Test the flow:
   ```bash
   # Terminal 1: Run Next.js
   npm run dev

   # Terminal 2: Forward Stripe webhooks
   stripe listen --forward-to localhost:3000/api/webhooks/stripe

   # Terminal 3: Run backend API
   cd ../backend
   python run.py
   ```

3. Create an account and generate 1 free summary
4. Try to generate a 2nd summary → Payment modal should appear
5. Complete test payment with card `4242 4242 4242 4242`
6. Verify webhook is received and subscription is created
7. Try generating another summary → Should work without payment prompt

### Verify Database

Check the `user_subscriptions` table in Supabase:
```sql
SELECT * FROM user_subscriptions;
```

You should see your user with `status: 'active'`.

## Pricing Configuration

Current pricing: **€9.99/month**

To change pricing, edit `app/api/create-checkout-session/route.ts`:

```typescript
unit_amount: 999, // Amount in cents (999 = €9.99)
recurring: {
  interval: 'month', // or 'year'
}
```

## Troubleshooting

### "Unauthorized" error
- Check that `SUPABASE_SERVICE_ROLE_KEY` is set correctly
- Verify user is logged in

### "Invalid signature" webhook error
- Make sure `STRIPE_WEBHOOK_SECRET` matches the webhook secret from Stripe
- In development, use the secret from `stripe listen` output
- In production, use the secret from Stripe Dashboard

### Payment modal doesn't appear
- Check browser console for errors
- Verify `NEXT_PUBLIC_API_BASE_URL` is set correctly
- Ensure backend is running and accessible

### Subscription not updating after payment
- Check webhook is configured correctly
- Verify webhook secret is correct
- Check Supabase logs for errors
- Make sure `user_subscriptions` table exists

## Security Notes

⚠️ **Important**:
- Never commit `.env.local` to version control
- Use environment variables for all secrets
- Test keys start with `pk_test_` and `sk_test_`
- Production keys start with `pk_live_` and `sk_live_`
- The webhook secret is different for each endpoint

## Support

For issues with:
- **Stripe**: See [Stripe Documentation](https://stripe.com/docs)
- **Webhooks**: See [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)
- **Testing**: See [Stripe Testing](https://stripe.com/docs/testing)
