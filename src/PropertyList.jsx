import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'

export default function PropertyList({ properties, loading, error, onUpdate }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('price')
  const [sortOrder, setSortOrder] = useState('asc')
  const [statusFilter, setStatusFilter] = useState('')

  const filteredAndSortedProperties = useMemo(() => {
    let filtered = properties.filter(property => {
      const matchesSearch = !searchTerm || 
        property.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        property.location?.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesStatus = !statusFilter || property.status === statusFilter
      
      return matchesSearch && matchesStatus
    })

    return filtered.sort((a, b) => {
      let aValue = a[sortBy]
      let bValue = b[sortBy]
      
      if (sortBy === 'price' || sortBy === 'space' || sortBy === 'terrain') {
        aValue = parseFloat(aValue) || 0
        bValue = parseFloat(bValue) || 0
      }
      
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase()
        bValue = bValue?.toLowerCase() || ''
      }
      
      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
      }
    })
  }, [properties, searchTerm, sortBy, sortOrder, statusFilter])

  const getStatusColor = (status) => {
    const colors = {
      'view-booked': 'bg-purple-100 text-purple-800',
      'offer-made': 'bg-yellow-100 text-yellow-800',
      'viewed': 'bg-green-100 text-green-800',
      'interested': 'bg-blue-100 text-blue-800',
      'rejected': 'bg-red-100 text-red-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const getStatusLabel = (status) => {
    const labels = {
      'view-booked': 'View booked',
      'offer-made': 'Offer made',
      'viewed': 'Viewed',
      'interested': 'Interested',
      'rejected': 'Rejected'
    }
    return labels[status] || status
  }

  const uniqueStatuses = [...new Set(properties.map(p => p.status).filter(Boolean))]

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading properties...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <strong>Error:</strong> {error}
        </div>
        <button 
          onClick={onUpdate}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name or location..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Sort by</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="price">Price</option>
              <option value="name">Name</option>
              <option value="location">Location</option>
              <option value="space">Living Area</option>
              <option value="terrain">Plot Area</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Order</label>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Statuses</option>
              {uniqueStatuses.map(status => (
                <option key={status} value={status}>{getStatusLabel(status)}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Results Summary */}
      <div className="mb-6">
        <p className="text-gray-600">
          Showing {filteredAndSortedProperties.length} of {properties.length} properties
        </p>
      </div>

      {/* Properties Grid */}
      {filteredAndSortedProperties.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No properties found matching your criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAndSortedProperties.map((property) => (
            <div key={property.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
              {property.Picture && (
                <img
                  src={property.Picture}
                  alt={property.name}
                  className="w-full h-48 object-cover"
                />
              )}
              
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-semibold text-gray-800 line-clamp-2">
                    {property.name}
                  </h3>
                  {property.status && (
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(property.status)}`}>
                      {getStatusLabel(property.status)}
                    </span>
                  )}
                </div>
                
                <p className="text-gray-600 text-sm mb-2">{property.location}</p>
                
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xl font-bold text-blue-600">
                    €{property.price?.toLocaleString()}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 mb-4">
                  {property.space && (
                    <div>
                      <span className="font-medium">Living:</span> {property.space}m²
                    </div>
                  )}
                  {property.terrain && (
                    <div>
                      <span className="font-medium">Plot:</span> {property.terrain}m²
                    </div>
                  )}
                  {property.rooms && (
                    <div>
                      <span className="font-medium">Rooms:</span> {property.rooms}
                    </div>
                  )}
                  {property.energyClass && (
                    <div>
                      <span className="font-medium">Energy:</span> {property.energyClass}
                    </div>
                  )}
                </div>
                
                <Link
                  to={`/details/${property.id}`}
                  className="block w-full text-center bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition"
                >
                  View Details
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}