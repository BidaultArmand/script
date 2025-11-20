'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function NewFeaturePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.replace('/auth')
        return
      }
      setLoading(true)
    }
    checkSession()
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth')
  }

  const handleBackToHome = () => {
    router.push('/')
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#FFF8F0] text-black">
        <p className="text-gray-600 text-sm font-serif">Loading...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#FFF8F0] text-black flex flex-col">
      {/* Header */}
      <header className="border-b-4 border-black bg-white">
        <div className="max-w-7xl mx-auto px-6 py-5 flex justify-between items-center">
          <button
            onClick={handleBackToHome}
            className="flex items-center gap-2 text-black hover:text-gray-700 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            <span className="font-semibold font-sans">Back</span>
          </button>
          <h1 className="text-2xl font-black font-sans">New Feature</h1>
          <button
            onClick={handleLogout}
            className="px-5 py-2.5 text-sm font-bold bg-black text-white border-3 border-black rounded-full hover:scale-105 transition-all"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 items-center justify-center px-6 py-20">
        <div className="max-w-2xl">
          <div className="bg-white rounded-[3rem] p-12 md:p-16 border-4 border-black shadow-[8px_8px_0_rgba(0,0,0,1)] text-center">
            <div className="mb-8">
              <div className="w-24 h-24 mx-auto rounded-full bg-black flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-12 w-12 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
            </div>

            <h2 className="text-5xl font-black mb-6 font-sans">Coming Soon</h2>
            <p className="text-xl text-gray-700 mb-8 font-serif leading-relaxed">
              This exciting new feature is currently under development.
              <br />
              Stay tuned for updates!
            </p>

            <button
              onClick={handleBackToHome}
              className="px-8 py-4 text-lg font-black bg-black text-white border-4 border-black rounded-full hover:scale-105 transition-all shadow-[6px_6px_0_rgba(0,0,0,1)]"
            >
              Back to Home →
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
