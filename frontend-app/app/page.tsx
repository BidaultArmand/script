'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function HomePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkSession = async () => {
      console.log('➡️ Vérification de la session...')
      const { data, error } = await supabase.auth.getSession()

      if (error) {
        console.error('❌ Erreur Supabase:', error)
        router.replace('/auth')
        return
      }

      if (!data?.session) {
        console.log('🔓 Pas de session → /auth')
        router.replace('/auth')
        return
      }

      console.log('🔒 Session trouvée, affichage de la landing page')
      setLoading(false)
    }

    checkSession()
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth')
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white text-black">
        <p className="text-gray-600 text-sm">Chargement...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 text-black">
      {/* Header with Logout */}
      <header className="absolute top-0 right-0 p-6">
        <button
          onClick={handleLogout}
          className="px-4 py-2 text-sm text-gray-700 hover:text-black transition-colors"
        >
          Logout
        </button>
      </header>

      {/* Main Content - Centered Buttons */}
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="w-full max-w-4xl">
          <h1 className="text-4xl font-bold text-center mb-4 text-black">
            Welcome to Meeting Notes
          </h1>
          <p className="text-center text-gray-600 mb-16">
            Choose a feature to get started
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Button 1: Summary Generation (existing feature) */}
            <button
              onClick={() => router.push('/dashboard')}
              className="group relative bg-white rounded-2xl p-8 transition-all duration-300 hover:scale-105 shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_20px_60px_rgb(0,0,0,0.2)]"
            >
              <div className="flex flex-col items-center justify-center h-full">
                <div className="mb-4 text-black">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-16 w-16"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold mb-2 text-black">
                  Summary Generation
                </h2>
                <p className="text-gray-600 text-center">
                  Upload audio files and generate AI-powered meeting summaries
                </p>
              </div>
            </button>

            {/* Button 2: New Feature (placeholder) */}
            <button
              onClick={() => router.push('/new-feature')}
              className="group relative bg-white rounded-2xl p-8 transition-all duration-300 hover:scale-105 shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_20px_60px_rgb(0,0,0,0.2)]"
            >
              <div className="flex flex-col items-center justify-center h-full">
                <div className="mb-4 text-black">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-16 w-16"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold mb-2 text-black">
                  New Feature
                </h2>
                <p className="text-gray-600 text-center">
                  Coming soon - Exciting new functionality
                </p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
