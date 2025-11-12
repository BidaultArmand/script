'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'

export default function AuthPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    console.log('✅ Connexion réussie', data)
    router.replace('/dashboard')
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    console.log('✅ Inscription réussie', data)
    router.replace('/dashboard')
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-white text-black">
      <h1 className="text-2xl mb-4 font-semibold">Connexion</h1>
      <form className="flex flex-col gap-3 w-64">
        <input
          className="p-2 rounded bg-white border border-gray-300 text-black"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
        />
        <input
          className="p-2 rounded bg-white border border-gray-300 text-black"
          placeholder="Mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
        />
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button
          onClick={handleLogin}
          disabled={loading}
          className="bg-black hover:bg-gray-800 p-2 rounded font-semibold text-white"
        >
          {loading ? 'Connexion...' : 'Se connecter'}
        </button>
        <button
          onClick={handleSignup}
          disabled={loading}
          className="bg-black hover:bg-gray-800 p-2 rounded font-semibold text-white"
        >
          {loading ? 'Inscription...' : "S'inscrire"}
        </button>
      </form>
    </main>
  )
}
