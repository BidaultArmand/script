'use client'

import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function DashboardPage() {
  const router = useRouter()
  const [userEmail, setUserEmail] = useState<string | null>(null)

  useEffect(() => {
    const fetchUser = async () => {
      const { data, error } = await supabase.auth.getUser()
      if (error) {
        console.error('Erreur utilisateur:', error)
        router.replace('/auth')
        return
      }
      setUserEmail(data.user?.email ?? null)
    }
    fetchUser()
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.replace('/auth')
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-white">
      <h1 className="text-2xl mb-2 font-semibold">Bienvenue 👋</h1>
      <p className="mb-4 text-slate-400">{userEmail}</p>
      <button
        onClick={handleLogout}
        className="bg-red-600 hover:bg-red-700 p-2 rounded"
      >
        Se déconnecter
      </button>
    </main>
  )
}
