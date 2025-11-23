'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

interface PaymentModalProps {
  isOpen: boolean
  onClose: () => void
  summariesCount: number
}

export default function PaymentModal({ isOpen, onClose, summariesCount }: PaymentModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleUpgrade = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      if (!token) {
        setError('Not authenticated')
        return
      }

      // Create Stripe checkout session
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create checkout session')
      }

      const { url } = await response.json()

      // Redirect to Stripe checkout
      if (url) {
        window.location.href = url
      }
    } catch (err: any) {
      console.error('Error creating checkout session:', err)
      setError(err.message || 'Failed to start checkout')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-[3rem] p-8 md:p-12 max-w-lg w-full border-4 border-black shadow-[8px_8px_0_rgba(0,0,0,1)]">
        <div className="text-center">
          {/* Icon */}
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-[#FFB84D] border-4 border-black flex items-center justify-center">
            <svg className="w-10 h-10 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>

          <h2 className="text-3xl font-black mb-4 font-sans">Upgrade to Pro</h2>

          <p className="text-lg text-gray-700 mb-6 font-serif">
            You've used your free transcription!
            <br />
            <span className="font-semibold">({summariesCount}/1 free scripts used)</span>
          </p>

          <div className="bg-[#FFF8F0] rounded-2xl p-6 mb-8 border-3 border-black">
            <div className="text-left space-y-3">
              <div className="flex items-center gap-3">
                <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="font-semibold font-sans">Unlimited transcriptions</span>
              </div>
              <div className="flex items-center gap-3">
                <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="font-semibold font-sans">Unlimited AI summaries</span>
              </div>
              <div className="flex items-center gap-3">
                <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="font-semibold font-sans">Priority support</span>
              </div>
              <div className="flex items-center gap-3">
                <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="font-semibold font-sans">Advanced formatting options</span>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t-2 border-black">
              <div className="text-center">
                <div className="text-4xl font-black font-sans mb-2">9.99€<span className="text-lg font-normal">/month</span></div>
                <p className="text-sm text-gray-600 font-serif">Cancel anytime</p>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border-2 border-red-500 rounded-2xl">
              <p className="text-red-700 text-sm font-semibold">{error}</p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-4 text-lg font-bold rounded-full bg-white text-black border-4 border-black hover:bg-gray-100 transition-all disabled:opacity-50"
            >
              Maybe later
            </button>
            <button
              onClick={handleUpgrade}
              disabled={loading}
              className="flex-1 py-4 text-lg font-black rounded-full bg-black text-white border-4 border-black hover:scale-105 active:scale-95 transition-all shadow-[6px_6px_0_rgba(0,0,0,1)] hover:shadow-[8px_8px_0_rgba(0,0,0,1)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Loading...' : 'Upgrade Now →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
