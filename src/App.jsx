import { useEffect, useState } from 'react'
import { Routes, Route, Navigate, Link } from 'react-router-dom'
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
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isBlocked, setIsBlocked] = useState(false)
  const [remainingTime, setRemainingTime] = useState(0)

  const VALID_USERS = (() => {
    try {
      const usersJson = import.meta.env.VITE_USERS
      if (!usersJson) {
        console.warn('VITE_USERS not found in environment variables')
        return []
      }
      const users = JSON.parse(usersJson)
      return Array.isArray(users) ? users : []
    } catch (err) {
      console.error('Failed to parse VITE_USERS:', err)
      return []
    }
  })()

  const MAX_ATTEMPTS = 5
  const BLOCK_DURATION = 5 * 60 * 1000 // 5 minutes in milliseconds
  const STORAGE_KEY = 'login_attempts'

  const getLoginAttempts = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) return { count: 0, blockedUntil: null }
      return JSON.parse(stored)
    } catch {
      return { count: 0, blockedUntil: null }
    }
  }

  const saveLoginAttempts = (data) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }

  const checkIfBlocked = () => {
    const attempts = getLoginAttempts()
    
    if (attempts.blockedUntil) {
      const now = Date.now()
      if (now < attempts.blockedUntil) {
        setIsBlocked(true)
        setRemainingTime(Math.ceil((attempts.blockedUntil - now) / 1000))
        return true
      } else {
        saveLoginAttempts({ count: 0, blockedUntil: null })
        setIsBlocked(false)
        return false
      }
    }
    
    return false
  }

  useEffect(() => {
    checkIfBlocked()
  }, [])

  useEffect(() => {
    if (!isBlocked) return

    const interval = setInterval(() => {
      const attempts = getLoginAttempts()
      if (!attempts.blockedUntil) {
        setIsBlocked(false)
        setRemainingTime(0)
        return
      }

      const now = Date.now()
      const remaining = Math.ceil((attempts.blockedUntil - now) / 1000)
      
      if (remaining <= 0) {
        saveLoginAttempts({ count: 0, blockedUntil: null })
        setIsBlocked(false)
        setRemainingTime(0)
      } else {
        setRemainingTime(remaining)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [isBlocked])

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    
    if (checkIfBlocked()) {
      setError(`Too many failed attempts. Try again in ${formatTime(remainingTime)}`)
      return
    }

    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password')
      return
    }

    setLoading(true)

    setTimeout(() => {
      const user = VALID_USERS.find(
        u => u.name.toLowerCase() === username.toLowerCase() && u.password === password
      )

      if (user) {
        saveLoginAttempts({ count: 0, blockedUntil: null })
        onLogin(user.name)
      } else {
        const attempts = getLoginAttempts()
        const newCount = attempts.count + 1

        if (newCount >= MAX_ATTEMPTS) {
          const blockedUntil = Date.now() + BLOCK_DURATION
          saveLoginAttempts({ count: newCount, blockedUntil })
          setIsBlocked(true)
          setRemainingTime(BLOCK_DURATION / 1000)
          setError(`Too many failed attempts. Access blocked for 5 minutes.`)
        } else {
          saveLoginAttempts({ count: newCount, blockedUntil: null })
          setError(`Invalid username or password (${newCount}/${MAX_ATTEMPTS} attempts)`)
        }
      }
      setLoading(false)
    }, 500)
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
              disabled={loading || isBlocked}
              required
            />
          </div>
          <div className="mb-6">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your password"
              disabled={loading || isBlocked}
              required
            />
          </div>
          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
              {error}
            </div>
          )}
          {isBlocked && remainingTime > 0 && (
            <div className="mb-4 p-3 bg-orange-100 text-orange-700 rounded-md text-sm font-semibold text-center">
              🔒 Blocked for {formatTime(remainingTime)}
            </div>
          )}
          <button
            type="submit"
            disabled={loading || isBlocked}
            className={`w-full py-2 px-4 rounded-md transition flex items-center justify-center gap-2 ${
              loading || isBlocked
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {loading && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            )}
            {loading ? 'Logging in...' : isBlocked ? 'Access Blocked' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default App
