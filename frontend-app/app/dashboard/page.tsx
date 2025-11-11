'use client'

import AudioUploader from '@/components/AudioUploader'
import ResumesLibrary from '@/components/ResumesLibrary'
import PreferencesModal from '@/components/PreferencesModal'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function DashboardPage() {
  const [ready, setReady] = useState(false)
  const [preferencesOpen, setPreferencesOpen] = useState(false)
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

  const handleSummaryGenerated = () => {
    // Trigger refresh of ResumesLibrary
    window.location.reload()
  }

  if (!ready) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <p className="text-slate-400 text-sm">Chargement…</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Meeting Notes</h1>
          <div className="flex gap-3">
            <button
              onClick={() => setPreferencesOpen(true)}
              className="px-4 py-2 text-sm bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
            >
              Preferences
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Upload Section */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-2">Upload Audio</h2>
          <p className="text-slate-400 mb-6">
            Upload an audio file to transcribe and generate a summary.
          </p>
          <div className="flex justify-center">
            <AudioUploader onSummaryGenerated={handleSummaryGenerated} />
          </div>
        </section>

        {/* Divider */}
        <div className="border-t border-slate-800 my-12" />

        {/* Resumes Library Section */}
        <section>
          <ResumesLibrary />
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
