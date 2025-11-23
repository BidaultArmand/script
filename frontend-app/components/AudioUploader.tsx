'use client'

import { useCallback, useRef, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { canGenerateSummary } from '@/lib/subscriptionHelpers'
import PaymentModal from './PaymentModal'

type TranscribeResponse = {
  meeting_id: string
  transcript_id: string
  language?: string
  text?: string
}

interface AudioUploaderProps {
  onProcessingStart?: () => void
  onProcessingProgress?: (progress: number) => void
  onProcessingComplete?: () => void
}

export default function AudioUploader({ onProcessingStart, onProcessingProgress, onProcessingComplete }: AudioUploaderProps) {
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [generatingSummary, setGeneratingSummary] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [summariesCount, setSummariesCount] = useState(0)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const onSelectFile = (f: File) => {
    if (!f) return
    // sécurité simple : types audio uniquement
    if (!f.type.startsWith('audio/')) {
      setMessage("Veuillez sélectionner un fichier audio.")
      return
    }
    setMessage(null)
    setFile(f)
  }

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    const f = e.dataTransfer.files?.[0]
    if (f) onSelectFile(f)
  }, [])

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const onDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleBrowse = () => inputRef.current?.click()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) onSelectFile(f)
  }

  const generateSummary = async (meetingId: string, token: string) => {
    try {
      setGeneratingSummary(true)
      setMessage("Vérification de l'abonnement...")
      onProcessingProgress?.(65) // 65% checking subscription

      // Check if user can generate summary
      const { canGenerate, summariesCount: count } = await canGenerateSummary(token)

      if (!canGenerate) {
        setSummariesCount(count)
        setShowPaymentModal(true)
        setMessage("Transcription terminée ✅ (Passez à Pro pour générer des résumés)")
        setGeneratingSummary(false)
        onProcessingComplete?.()
        return
      }

      setMessage("Génération du résumé...")
      onProcessingProgress?.(70) // 70% after transcription

      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL

      // Get user preferences first
      const prefsRes = await fetch(`${apiBase}/preferences`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      let preferences = {
        default_format: "structured",
        default_language: "en",
        default_detail_level: "medium",
        auto_generate_summary: true,
        include_timestamps: true,
      }

      if (prefsRes.ok) {
        preferences = await prefsRes.json()
      }

      onProcessingProgress?.(80) // 80% preferences loaded

      // Only generate if auto_generate_summary is enabled
      if (!preferences.auto_generate_summary) {
        setMessage("Transcription terminée ✅")
        onProcessingComplete?.()
        return
      }

      // Generate summary
      const summaryRes = await fetch(`${apiBase}/summarize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          meeting_id: meetingId,
          format: preferences.default_format,
          language: preferences.default_language,
          detail_level: preferences.default_detail_level,
          include_timestamps: preferences.include_timestamps,
        }),
      })

      if (summaryRes.ok) {
        setMessage("Transcription et résumé terminés ✅")
        onProcessingProgress?.(100)
        onProcessingComplete?.()
      } else {
        setMessage("Transcription terminée ✅ (erreur lors de la génération du résumé)")
        onProcessingComplete?.()
      }
    } catch (err) {
      console.error("Error generating summary:", err)
      setMessage("Transcription terminée ✅ (erreur lors de la génération du résumé)")
      onProcessingComplete?.()
    } finally {
      setGeneratingSummary(false)
    }
  }

  const handleTranscribe = async () => {
    try {
      if (!file) {
        setMessage("Ajoutez un audio avant de lancer la transcription.")
        return
      }

      // Start processing
      onProcessingStart?.()
      setUploading(true)
      setMessage("Récupération de la session…")
      onProcessingProgress?.(10) // 10% session check

      // 🔑 Récupère le token Supabase pour authentifier l'appel backend
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) {
        setUploading(false)
        setMessage("Vous n'êtes pas connecté.")
        onProcessingComplete?.()
        return
      }

      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL
      if (!apiBase) {
        setUploading(false)
        setMessage("NEXT_PUBLIC_API_BASE_URL est manquant.")
        onProcessingComplete?.()
        return
      }

      const form = new FormData()
      form.append('file', file)

      setMessage("Envoi au serveur…")
      onProcessingProgress?.(20) // 20% uploading

      const res = await fetch(`${apiBase}/transcribe`, {
        method: 'POST',
        headers: {
          // ⚠️ indispensable pour que FastAPI retrouve l'utilisateur
          Authorization: `Bearer ${token}`,
        },
        body: form,
      })

      if (!res.ok) {
        const errText = await res.text()
        throw new Error(errText || `Erreur HTTP ${res.status}`)
      }

      onProcessingProgress?.(60) // 60% transcription complete
      const data: TranscribeResponse = await res.json()
      setMessage("Transcription terminée ✅")
      setUploading(false)

      // Generate summary automatically
      await generateSummary(data.meeting_id, token)
    } catch (err: any) {
      console.error(err)
      setMessage(`Erreur: ${err?.message || "Impossible de lancer la transcription"}`)
      setUploading(false)
      onProcessingComplete?.()
    }
  }

  return (
    <>
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        summariesCount={summariesCount}
      />
      <div className="space-y-4 flex flex-col h-full">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-semibold text-black">Audio Upload</h3>
        </div>

      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        className={[
          'rounded-xl border-2 border-dashed p-8 text-center transition flex-1 flex flex-col justify-center',
          isDragging ? 'border-black bg-white' : 'border-gray-300 bg-white'
        ].join(' ')}
      >
        <input
          ref={inputRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={handleFileChange}
        />
        <p className="text-sm text-gray-700 mb-3">
          Déposez votre fichier audio ici
        </p>
        <button
          onClick={handleBrowse}
          className="px-3 py-2 rounded-xl bg-black text-white text-sm hover:bg-gray-800"
        >
          Parcourir…
        </button>

        {file && (
          <div className="mt-4 text-gray-800 text-sm">
            Fichier sélectionné : <span className="font-medium">{file.name}</span>{' '}
            <span className="text-gray-600">({(file.size/1024/1024).toFixed(2)} Mo)</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleTranscribe}
          disabled={!file || uploading || generatingSummary}
          className={[
            'flex-1 px-4 py-2 rounded-xl text-sm font-medium transition',
            (!file || uploading || generatingSummary)
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-black text-white hover:bg-gray-800'
          ].join(' ')}
        >
          {uploading ? 'Transcription en cours...' : generatingSummary ? 'Génération du résumé...' : 'Lancer la transcription'}
        </button>

        {file && !uploading && !generatingSummary && (
          <button
            onClick={() => { setFile(null); setMessage(null) }}
            className="px-3 py-2 rounded-xl text-sm border border-gray-300 text-black hover:bg-gray-100"
          >
            Réinitialiser
          </button>
        )}
      </div>

      {message && (
        <p className="text-sm text-gray-700">{message}</p>
      )}

      <p className="text-xs text-gray-500">
        Formats acceptés : mp3, m4a, wav, etc. Taille max selon config serveur.
      </p>
      </div>
    </>
  )
}
