'use client'

import AudioUploader from '@/components/AudioUploader'
import ResumesLibrary from '@/components/ResumesLibrary'
import PreferencesModal from '@/components/PreferencesModal'
import QuickPreferences from '@/components/QuickPreferences'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function DashboardPage() {
  const [ready, setReady] = useState(false)
  const [preferencesOpen, setPreferencesOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingProgress, setProcessingProgress] = useState(0)
  const resumesLibraryRef = useRef<any>(null)

  useEffect(() => {
    const guard = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        window.location.href = '/auth'
        return
      }
      setReady(true)
    }
    guard()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/auth'
  }

  const handleProcessingStart = () => {
    setIsProcessing(true)
    setProcessingProgress(0)
  }

  const handleProcessingProgress = (progress: number) => {
    setProcessingProgress(progress)
  }

  const handleProcessingComplete = () => {
    setIsProcessing(false)
    setProcessingProgress(100)
    // Trigger refresh of ResumesLibrary
    window.location.reload()
  }

  if (!ready) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-white text-black">
        <p className="text-gray-600 text-sm">Chargement…</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-white text-black">
      {/* Header */}
      <header className="border-b border-gray-200 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              onClick={() => window.location.href = '/'}
              className="flex items-center gap-2 text-gray-700 hover:text-black transition-colors"
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
              Back
            </button>
            <h1 className="text-2xl font-bold">Meeting Notes</h1>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setPreferencesOpen(true)}
              className="px-4 py-2 text-sm bg-black text-white hover:bg-gray-800 rounded-lg transition-colors"
            >
              Advanced Settings
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm bg-black text-white hover:bg-gray-800 rounded-lg transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Upload Section */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-6">Upload Audio</h2>

          <div className="bg-gray-50 rounded-xl p-8 border border-gray-200 shadow-lg">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-20 items-start">
              {/* Left: Audio Uploader */}
              <div className="lg:col-span-2">
                <AudioUploader
                  onProcessingStart={handleProcessingStart}
                  onProcessingProgress={handleProcessingProgress}
                  onProcessingComplete={handleProcessingComplete}
                />
              </div>

              {/* Right: Quick Preferences */}
              <div className="lg:col-span-1">
                <QuickPreferences onPreferencesChange={() => {}} />
              </div>
            </div>
          </div>
        </section>

        {/* Divider */}
        <div className="border-t border-gray-200 my-12" />

        {/* Resumes Library Section */}
        <section>
          <ResumesLibrary
            isProcessing={isProcessing}
            processingProgress={processingProgress}
          />
        </section>
      </div>

      {/* Preferences Modal */}
      <PreferencesModal
        isOpen={preferencesOpen}
        onClose={() => setPreferencesOpen(false)}
      />
    </main>
  )
}
