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

      if (data?.session) {
        console.log('🔒 Session trouvée → /dashboard')
        router.replace('/dashboard')
      } else {
        console.log('🔓 Pas de session → /auth')
        router.replace('/auth')
      }

      setLoading(false)
    }

    checkSession()
  }, [router])

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
      <p className="text-slate-400 text-sm">
        {loading ? 'Chargement...' : 'Redirection...'}
      </p>
    </main>
  )
}
