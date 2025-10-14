import { useEffect, useState } from 'react'
import { Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom'
import PropertyList from './PropertyList'
import PropertyDetails from './PropertyDetails'
import { Ads } from './services/api'

function App() {
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    const match = document.cookie.match(/user=([^;]+)/)
    if (match) setUser(decodeURIComponent(match[1]))
    else setUser(null)
    setAuthLoading(false)
  }, [])

  const fetchProperties = async () => {
    try {
      setLoading(true)
      const data = await Ads.list()
      
      const validProperties = data.filter(item => 
        item && 
        typeof item === 'object' && 
        (item.id || item.FundaId)
      ).map(item => ({
        ...item,
        id: item.id || item.FundaId?.toString() || Math.random().toString()
      }))
      
      setProperties(validProperties)
      setError(null)
    } catch (err) {
      setError(err.message || 'Failed to load properties')
      setProperties([])
    } finally {
      setLoading(false)
    }
  }

  const removePropertyLocally = (propertyId) => {
    setProperties(prev => prev.filter(p => p.id !== propertyId && p.FundaId?.toString() !== propertyId))
  }

  useEffect(() => {
    fetchProperties()
  }, [])

  const handleLogin = (username) => {
    document.cookie = `user=${encodeURIComponent(username)}; path=/; max-age=86400`
    setUser(username)
  }

  const handleLogout = () => {
    setUser(null)
    document.cookie = 'user=; Max-Age=0; path=/'
  }

  function Protected({ children }) {
    if (authLoading) {
      return <div className="min-h-screen flex items-center justify-center text-gray-500 text-xl">Checking authentication...</div>
    }
    if (!user) {
      return <Navigate to="/login" replace />
    }
    return children
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {user && (
        <header className="bg-blue-600 text-white p-4 shadow-md">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <Link to="/" className="text-2xl font-bold">Housing Manager</Link>
            <div className="flex items-center gap-4">
              <span>Welcome, {user}!</span>
              <button 
                onClick={handleLogout}
                className="px-3 py-1 bg-blue-700 rounded hover:bg-blue-800"
              >
                Logout
              </button>
            </div>
          </div>
        </header>
      )}

      <Routes>
        <Route 
          path="/login" 
          element={
            user ? <Navigate to="/" replace /> : <LoginForm onLogin={handleLogin} />
          } 
        />
        <Route 
          path="/" 
          element={
            <Protected>
              <PropertyList 
                properties={properties}
                loading={loading}
                error={error}
                onUpdate={fetchProperties}
              />
            </Protected>
          } 
        />
        <Route 
          path="/details/:id" 
          element={
            <Protected>
              <PropertyDetails 
                onUpdate={fetchProperties}
                onDelete={removePropertyLocally}
              />
            </Protected>
          } 
        />
      </Routes>
    </div>
  )
}

function LoginForm({ onLogin }) {
  const [username, setUsername] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (username.trim()) {
      onLogin(username.trim())
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-6">Housing Manager</h1>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
              Username
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your username"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition"
          >
            Login
          </button>
        </form>
      </div>
    </div>
  )
}

export default App
