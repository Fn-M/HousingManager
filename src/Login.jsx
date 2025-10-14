import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const USERS = [
  { name: 'Fábio', password: 'fabio123' },
  { name: 'Melissa', password: 'melissa123' }
]


export default function Login({ setUser }) {
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = (e) => {
    e.preventDefault()
    const user = USERS.find(u => u.name === name && u.password === password)
    if (user) {
      setError('')
      document.cookie = `user=${encodeURIComponent(user.name)}; path=/; max-age=86400`
      if (setUser) setUser(user.name)
      navigate('/')
    } else {
  setError('Incorrect username or password.')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-blue-700 text-center">Login</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500" required />
          </div>
          {error && <div className="text-red-600 text-sm text-center">{error}</div>}
          <button type="submit" className="w-full py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700 font-semibold">Entrar</button>
        </form>
      </div>
    </div>
  )
}
