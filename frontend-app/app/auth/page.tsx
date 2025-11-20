'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'

export default function AuthPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isSignup, setIsSignup] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    console.log('✅ Connexion réussie', data)
    router.replace('/dashboard')
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    console.log('✅ Inscription réussie', data)
    router.replace('/dashboard')
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-[#FFF8F0] text-black px-6">
      {/* Back to home link */}
      <button
        onClick={() => router.push('/')}
        className="absolute top-8 left-8 flex items-center gap-2 text-black hover:text-gray-700 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back
      </button>

      {/* Auth Card */}
      <div className="w-full max-w-md">
        <div className="bg-white rounded-[3rem] p-8 md:p-12 border-4 border-black shadow-[8px_8px_0_rgba(0,0,0,1)]">

          {/* Logo/Brand */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="relative w-10 h-10">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 relative">
                  <div className="absolute top-1/2 left-1/2 w-1 h-8 bg-black transform -translate-x-1/2 -translate-y-1/2 rotate-0" />
                  <div className="absolute top-1/2 left-1/2 w-1 h-8 bg-black transform -translate-x-1/2 -translate-y-1/2 rotate-45" />
                  <div className="absolute top-1/2 left-1/2 w-8 h-1 bg-black transform -translate-x-1/2 -translate-y-1/2" />
                  <div className="absolute top-1/2 left-1/2 w-8 h-1 bg-black transform -translate-x-1/2 -translate-y-1/2 rotate-45" />
                </div>
              </div>
            </div>
            <span className="text-2xl font-black font-sans">NotesAI</span>
          </div>

          <h1 className="text-3xl font-black text-center mb-2 font-sans">
            {isSignup ? 'Create Account' : 'Welcome Back'}
          </h1>
          <p className="text-center text-gray-600 mb-8 font-serif">
            {isSignup ? 'Sign up to start transcribing' : 'Sign in to your account'}
          </p>

          <form className="flex flex-col gap-4" onSubmit={isSignup ? handleSignup : handleLogin}>
            <div>
              <label className="block text-sm font-semibold mb-2 font-sans">Email</label>
              <input
                className="w-full p-4 rounded-2xl bg-[#FFF8F0] border-3 border-black focus:outline-none focus:ring-4 focus:ring-gray-300 font-serif"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 font-sans">Password</label>
              <input
                className="w-full p-4 rounded-2xl bg-[#FFF8F0] border-3 border-black focus:outline-none focus:ring-4 focus:ring-gray-300 font-serif"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                required
              />
            </div>

            {error && (
              <div className="p-4 bg-red-50 border-2 border-red-500 rounded-2xl">
                <p className="text-red-700 text-sm font-semibold">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 text-lg font-black rounded-full bg-black text-white border-4 border-black hover:scale-105 active:scale-95 transition-all shadow-[6px_6px_0_rgba(0,0,0,1)] hover:shadow-[8px_8px_0_rgba(0,0,0,1)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Loading...' : isSignup ? 'Sign Up →' : 'Sign In →'}
            </button>
          </form>

          {/* Toggle between login/signup */}
          <div className="mt-6 text-center">
            <button
              onClick={() => setIsSignup(!isSignup)}
              className="text-sm text-gray-600 hover:text-black transition-colors font-serif"
            >
              {isSignup ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
