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
      <main className="min-h-screen flex items-center justify-center bg-[#FFF8F0] text-black">
        <p className="text-gray-600 text-sm font-serif">Loading...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#FFF8F0] text-black">
      {/* Header */}
      <header className="py-2 px-4 border-b-4 border-black bg-white">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.location.href = '/'}
              className="hover:opacity-80 transition-opacity"
            >
              <img src="/logo.svg" alt="echoCap" className="h-20 w-auto" />
            </button>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setPreferencesOpen(true)}
              className="px-5 py-2.5 text-sm font-bold bg-white text-black border-3 border-black rounded-full hover:bg-[#FFE8A3] transition-all"
            >
              Settings
            </button>
            <button
              onClick={handleLogout}
              className="px-5 py-2.5 text-sm font-bold bg-black text-white border-3 border-black rounded-full hover:scale-105 transition-all"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Upload Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-black mb-6 font-sans">Upload Audio</h2>

          <div className="bg-white rounded-[3rem] p-8 border-4 border-black shadow-[8px_8px_0_rgba(0,0,0,1)]">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
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
