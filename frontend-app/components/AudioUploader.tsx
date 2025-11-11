'use client'

import { useCallback, useRef, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type TranscribeResponse = {
  meeting_id: string
  transcript_id: string
  language?: string
  text?: string
}

interface AudioUploaderProps {
  onSummaryGenerated?: () => void
}

export default function AudioUploader({ onSummaryGenerated }: AudioUploaderProps) {
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [generatingSummary, setGeneratingSummary] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const onSelectFile = (f: File) => {
    if (!f) return
    // sécurité simple : types audio uniquement
    if (!f.type.startsWith('audio/')) {
      setMessage('Veuillez sélectionner un fichier audio.')
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
      setMessage('Génération du résumé...')

      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL

      // Get user preferences first
      const prefsRes = await fetch(`${apiBase}/preferences`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      let preferences = {
        default_format: 'structured',
        default_language: 'en',
        default_detail_level: 'medium',
        auto_generate_summary: true,
        include_timestamps: true,
      }

      if (prefsRes.ok) {
        preferences = await prefsRes.json()
      }

      // Only generate if auto_generate_summary is enabled
      if (!preferences.auto_generate_summary) {
        setMessage('Transcription terminée ✅')
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
        setMessage('Transcription et résumé terminés ✅')
        onSummaryGenerated?.()
      } else {
        setMessage('Transcription terminée ✅ (erreur lors de la génération du résumé)')
      }
    } catch (err) {
      console.error('Error generating summary:', err)
      setMessage('Transcription terminée ✅ (erreur lors de la génération du résumé)')
    } finally {
      setGeneratingSummary(false)
    }
  }

  const handleTranscribe = async () => {
    try {
      if (!file) {
        setMessage('Ajoutez un audio avant de lancer la transcription.')
        return
      }
      setUploading(true)
      setMessage('Récupération de la session…')

      // 🔑 Récupère le token Supabase pour authentifier l’appel backend
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) {
        setUploading(false)
        setMessage('Vous n’êtes pas connecté.')
        return
      }

      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL
      if (!apiBase) {
        setUploading(false)
        setMessage('NEXT_PUBLIC_API_BASE_URL est manquant.')
        return
      }

      const form = new FormData()
      form.append('file', file)

      setMessage('Envoi au serveur…')

      const res = await fetch(`${apiBase}/transcribe`, {
        method: 'POST',
        headers: {
          // ⚠️ indispensable pour que FastAPI retrouve l’utilisateur
          Authorization: `Bearer ${token}`,
        },
        body: form,
      })

      if (!res.ok) {
        const errText = await res.text()
        throw new Error(errText || `Erreur HTTP ${res.status}`)
      }

      const data: TranscribeResponse = await res.json()
      setMessage(`Transcription terminée ✅`)
      setUploading(false)

      // Generate summary automatically
      await generateSummary(data.meeting_id, token)
    } catch (err: any) {
      console.error(err)
      setMessage(`Erreur: ${err?.message || 'Impossible de lancer la transcription'}`)
      setUploading(false)
    }
  }

  return (
    <div className="max-w-xl w-full space-y-4">
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        className={[
          'rounded-2xl border-2 border-dashed p-8 text-center transition',
          isDragging ? 'border-indigo-400 bg-slate-800/50' : 'border-slate-700 bg-slate-800/30'
        ].join(' ')}
      >
        <input
          ref={inputRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={handleFileChange}
        />
        <p className="text-sm text-slate-300 mb-3">
          Déposez votre fichier audio ici
        </p>
        <button
          onClick={handleBrowse}
          className="px-3 py-2 rounded-xl bg-slate-100 text-slate-900 text-sm hover:opacity-90"
        >
          Parcourir…
        </button>

        {file && (
          <div className="mt-4 text-slate-200 text-sm">
            Fichier sélectionné : <span className="font-medium">{file.name}</span>{' '}
            <span className="text-slate-400">({(file.size/1024/1024).toFixed(2)} Mo)</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleTranscribe}
          disabled={!file || uploading || generatingSummary}
          className={[
            'px-4 py-2 rounded-xl text-sm font-medium transition',
            (!file || uploading || generatingSummary)
              ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
              : 'bg-indigo-500 hover:bg-indigo-600 text-white'
          ].join(' ')}
        >
          {uploading ? 'Transcription en cours...' : generatingSummary ? 'Génération du résumé...' : 'Lancer la transcription'}
        </button>

        {file && !uploading && !generatingSummary && (
          <button
            onClick={() => { setFile(null); setMessage(null) }}
            className="px-3 py-2 rounded-xl text-sm border border-slate-600 text-slate-200 hover:bg-slate-800"
          >
            Réinitialiser
          </button>
        )}
      </div>

      {message && (
        <p className="text-sm text-slate-300">{message}</p>
      )}

      <p className="text-xs text-slate-500">
        Formats acceptés : mp3, m4a, wav, etc. Taille max selon config serveur.
      </p>
    </div>
  )
}
