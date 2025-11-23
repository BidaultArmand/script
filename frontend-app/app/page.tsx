'use client'

import { useRouter } from 'next/navigation'
import { useState, useRef } from 'react'

export default function LandingPage() {
  const router = useRouter()
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleTranscribe = () => {
    if (audioFile) {
      router.push(`/auth?hasAudio=true&fileName=${encodeURIComponent(audioFile.name)}`)
    }
  }

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setAudioFile(file)
      console.log('✅ File uploaded:', file.name, file.type, `(${(file.size / 1024 / 1024).toFixed(2)} MB)`)
    }
  }

  const handleZoneClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <main className="min-h-screen bg-[#FFF8F0] text-black">
      {/* Header */}
      <header className="relative z-20 py-6 px-8">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img src="/logo.svg" alt="echoCap" className="h-20 w-auto" />
          </div>
          <button
            onClick={() => router.push('/auth')}
            className="px-6 py-2 text-base font-medium text-black hover:text-gray-700 transition-colors"
          >
            Sign in
          </button>
        </div>
      </header>

      {/* Hero Section with Retro Horizontal Gradient */}
      <section className="relative overflow-hidden">
        {/* Horizontal retro gradient background - gradual increasing bands */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(180deg, #FF6B9D 0%, #FF6B9D 8%, #FF8E6D 8%, #FF8E6D 20%, #FFB84D 20%, #FFB84D 38%, #FFD96D 38%, #FFD96D 62%, #FFE8A3 62%, #FFE8A3 85%, #FFF5D6 85%, #FFF5D6 100%)'
          }}
        />

        {/* Content */}
        <div className="relative z-10 max-w-5xl mx-auto px-8 py-24 text-center">
          <h1
            className="text-6xl md:text-7xl lg:text-8xl font-black mb-6 leading-[1.1] tracking-tight font-sans"
          >
            Turn your meetings
            <br />
            into momentum
          </h1>

          <p className="text-xl md:text-2xl mb-12 max-w-2xl mx-auto font-serif">
            The gentle AI that transforms hours of notes into clear next steps
          </p>

          {/* Hero CTA - Upload Audio */}
          <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-[3rem] p-8 md:p-12 border-4 border-black shadow-[8px_8px_0_rgba(0,0,0,1)]">

              {/* Upload Zone */}
              <div className="mb-8">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*"
                  onChange={handleAudioUpload}
                  className="hidden"
                />
                <div
                  onClick={handleZoneClick}
                  className="relative w-full py-12 px-8 border-4 border-dashed border-black rounded-3xl cursor-pointer transition-all hover:bg-[#FFE8A3] hover:border-solid bg-[#FFF8F0]"
                >
                  {audioFile ? (
                    <div className="flex flex-col items-center justify-center gap-4">
                      <div className="w-20 h-20 rounded-full bg-green-500 border-4 border-black flex items-center justify-center">
                        <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-black mb-2">{audioFile.name}</p>
                        <p className="text-lg text-gray-600 mb-2">
                          {(audioFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                        <p className="text-sm text-gray-500">Click to change file</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-4">
                      <div className="w-20 h-20 rounded-full bg-black flex items-center justify-center">
                        <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-black mb-2">Upload Audio File</p>
                        <p className="text-base text-gray-600">
                          Click to browse or drag & drop
                        </p>
                        <p className="text-sm text-gray-500 mt-2">
                          MP3, WAV, M4A, etc.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* CTA Button */}
              <button
                onClick={audioFile ? handleTranscribe : undefined}
                disabled={!audioFile}
                className={`w-full py-5 text-xl font-black rounded-full transition-all border-4 border-black ${
                  audioFile
                    ? 'bg-black text-white hover:scale-105 active:scale-95 shadow-[6px_6px_0_rgba(0,0,0,1)] hover:shadow-[8px_8px_0_rgba(0,0,0,1)]'
                    : 'bg-white text-black cursor-not-allowed opacity-50'
                }`}
              >
                {audioFile ? 'Transcrire & Sign Up →' : 'Upload a file to continue'}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Posters Grid */}
      <section className="py-24 px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            {/* Poster 1 */}
            <div
              className="rounded-[2.5rem] p-12 border-4 border-black shadow-[8px_8px_0_rgba(0,0,0,1)] min-h-[400px] flex flex-col justify-center"
              style={{ background: '#FF6B9D' }}
            >
              <h3
                className="text-4xl md:text-5xl font-black leading-tight font-sans"
              >
                Take your
                <br />
                first step
              </h3>
            </div>

            {/* Poster 2 */}
            <div
              className="rounded-[2.5rem] p-12 border-4 border-black shadow-[8px_8px_0_rgba(0,0,0,1)] min-h-[400px] flex flex-col justify-center"
              style={{ background: '#FFB84D' }}
            >
              <h3
                className="text-4xl md:text-5xl font-black leading-tight font-sans"
              >
                From chaos
                <br />
                in your notes
              </h3>
            </div>

            {/* Poster 3 */}
            <div
              className="rounded-[2.5rem] p-12 border-4 border-black shadow-[8px_8px_0_rgba(0,0,0,1)] min-h-[400px] flex flex-col justify-center"
              style={{ background: '#8FE8D4' }}
            >
              <h3
                className="text-4xl md:text-5xl font-black leading-tight font-sans"
              >
                To clarity
                <br />
                and action
              </h3>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2
            className="text-5xl md:text-6xl font-black mb-6 font-sans"
          >
            Ready to move forward?
          </h2>
          <p className="text-2xl mb-12 font-serif">
            Join others who've turned their meetings into momentum
          </p>
          <button
            onClick={() => router.push('/auth')}
            className="px-12 py-6 text-xl font-black rounded-full text-white transition-all hover:scale-105"
            style={{
              background: 'linear-gradient(135deg, #FF6B9D 0%, #FF8E6D 50%, #FFB84D 100%)',
              boxShadow: '0 8px 0 rgba(255, 107, 157, 0.3), 0 12px 24px rgba(255, 107, 157, 0.2)'
            }}
          >
            Start free today
          </button>
          <p className="text-gray-600 mt-6 font-serif">
            No credit card required • Takes 30 seconds
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-8 border-t-2 border-black/10">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-gray-600 font-serif">
            © 2025 echoCap. Made with care.
          </p>
        </div>
      </footer>
    </main>
  )
}
