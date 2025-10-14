import React, { useState, useEffect, useMemo } from 'react'
import { Ads } from './services/api'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import PropertyDetails from './PropertyDetails'
import Login from './Login'

export default function App() {
  const [ads, setAds] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const location = useLocation()
  const [sortBy, setSortBy] = useState(null)
  const [sortOrder, setSortOrder] = useState('asc')

  // Check cookie for authentication on mount
  useEffect(() => {
    const match = document.cookie.match(/user=([^;]+)/)
    if (match) setUser(decodeURIComponent(match[1]))
    else setUser(null)
    setAuthLoading(false)
  }, [])

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await Ads.list()
      setAds(Array.isArray(data) ? data : data.items || [])
    } catch (e) {
      setError(e?.message || 'Failed to load properties')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const columns = useMemo(() => ([
    { key: 'firstPhoto', label: '' },
    { key: 'name', label: 'Name' },
    { key: 'location', label: 'Location' },
    { key: 'price', label: 'Price (€)', sortable: true },
    { key: 'space', label: 'Space (m²)', sortable: true },
    { key: 'terrain', label: 'Terrain (m²)', sortable: true },
    { key: 'rooms', label: 'Rooms', sortable: true },
    { key: 'energyClass', label: 'Energy', sortable: true },
    { key: 'status', label: 'Status' },
  ]), [])

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortOrder('asc')
    }
  }

  const sortedAds = useMemo(() => {
    if (!sortBy) return ads
    return [...ads].sort((a, b) => {
      let valA = a[sortBy]
      let valB = b[sortBy]
      if (valA == null) valA = ''
      if (valB == null) valB = ''
      // Numeric sort for price, space, terrain, rooms
      if (["price","space","terrain","rooms"].includes(sortBy)) {
        valA = Number(valA)
        valB = Number(valB)
      } else {
        valA = String(valA).toLowerCase()
        valB = String(valB).toLowerCase()
      }
      if (valA < valB) return sortOrder === 'asc' ? -1 : 1
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1
      return 0
    })
  }, [ads, sortBy, sortOrder])

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this property? All pictures will also be deleted.')) return
    try {
      // First delete all pictures
      await Ads.deleteAllPictures(id)
      // Then delete the ad
      await Ads.delete(id)
      setAds(ads.filter((a) => a.id !== id))
    } catch (err) {
      alert('Failed to delete property: ' + err.message)
    }
  }

  const handleUpdateProperty = (updatedProperty) => {
    setAds(prevAds => 
      prevAds.map(ad => 
        ad.id === updatedProperty.id ? { ...ad, ...updatedProperty } : ad
      )
    )
  }

  const navigate = useNavigate()

  // Wrapper to protect routes
  function Protected({ children }) {
    if (authLoading) {
  return <div className="min-h-screen flex items-center justify-center text-gray-500 text-xl">Checking authentication…</div>
    }
    if (!user) {
      window.location.href = '/login'
      return null
    }
    return children
  }

  return (
    <Routes>
      <Route path="/login" element={<Login setUser={setUser} />} />
      <Route path="/" element={
        <Protected>
          <div className="min-h-screen bg-gray-50">
            <header className="bg-blue-700 border-b shadow">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-between">
                <h1 className="text-xl sm:text-2xl font-semibold text-white">Housing Manager</h1>
              </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              {loading && (
                <div className="text-gray-600">Loading properties…</div>
              )}
              {error && (
                <div className="text-red-700 bg-red-50 border border-red-200 p-3 rounded">{error}</div>
              )}
              {!loading && !error && (
                <div className="overflow-x-auto bg-white border rounded-lg">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        {columns.map(col => (
                          <th
                            key={col.key}
                            scope="col"
                            className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                              col.sortable ? 'cursor-pointer select-none text-blue-700 hover:text-blue-900' : 'text-gray-500'
                            }`}
                            onClick={col.sortable ? () => handleSort(col.key) : undefined}
                          >
                            {col.label}
                            {col.sortable && (
                              <span className="ml-1 text-blue-700 align-middle">
                                {sortBy === col.key ? (sortOrder === 'asc' ? '▲' : '▼') : '⇅'}
                              </span>
                            )}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {sortedAds.map((p) => (
                        <tr 
                          key={p.id} 
                          onClick={() => navigate(`/details/${p.id}`)}
                          className="hover:bg-gray-50 cursor-pointer"
                        >
                          <td className="px-4 py-3 whitespace-nowrap">
                            {p.firstPhoto ? (
                              <div className="w-32 h-32 overflow-hidden rounded shadow flex-shrink-0">
                                <img src={p.firstPhoto} alt={p.name} className="w-full h-full object-cover" />
                              </div>
                            ) : (
                              <div className="w-32 h-32 bg-gray-200 rounded shadow flex items-center justify-center text-gray-400 text-xs flex-shrink-0">No image</div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900">
                              {p.link ? (
                                <a 
                                  href={p.link} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="text-blue-600 hover:text-blue-800 hover:underline"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {p.name}
                                </a>
                              ) : (
                                <span>{p.name}</span>
                              )}
                            </div>
                            <div className="text-gray-500 text-sm mt-1">{p.id}</div>
                          </td>
                          <td className="px-4 py-3 text-gray-700">{p.location}</td>
                          <td className="px-4 py-3 text-gray-900 font-semibold whitespace-nowrap">€ {p.price?.toLocaleString?.('nl-NL') || p.price}</td>
                          <td className="px-4 py-3">{p.space}</td>
                          <td className="px-4 py-3">{p.terrain}</td>
                          <td className="px-4 py-3">{p.rooms}</td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium border bg-gray-50">
                              {p.energyClass || '-'}
                            </span>
                          </td>
                          <td className="px-4 py-3">{p.Status || p.status || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {ads.length === 0 && (
                    <div className="p-6 text-center text-gray-600">No properties found.</div>
                  )}
                </div>
              )}
            </main>

            <footer className="py-8 text-center text-sm text-gray-500">&copy; {new Date().getFullYear()} Housing Manager</footer>
          </div>
        </Protected>
      } />
      <Route path="/details/:id" element={
        <Protected>
          <PropertyDetails onUpdate={handleUpdateProperty} />
        </Protected>
      } />
    </Routes>
  )
}
