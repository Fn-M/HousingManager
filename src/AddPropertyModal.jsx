import { useState } from 'react'
import DatePicker from 'react-datepicker'
import { Ads } from './services/api'

export default function AddPropertyModal({ isOpen, onClose, onSuccess }) {
  const [url, setUrl] = useState('')
  const [viewDate, setViewDate] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const extractFundaId = (fundaUrl) => {
    if (!fundaUrl) return null
    const match = fundaUrl.match(/\/(\d+)\/?$/)
    return match ? match[1] : null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const fundaId = extractFundaId(url)

    if (!fundaId) {
      setError('Invalid Funda URL. Please provide a valid property link.')
      return
    }

    setLoading(true)
    try {
      await Ads.create({
        FundaId: fundaId,
        viewDate: viewDate ? viewDate.toISOString() : null,
      })
      onSuccess() // This will trigger a refetch
      onClose()   // Close the modal
    } catch (err) {
      setError(err.message || 'Failed to add property. It might already exist.')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Add New Property</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="funda-url" className="block text-sm font-medium text-gray-700 mb-1">
              Funda URL
            </label>
            <input
              type="url"
              id="funda-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://www.funda.nl/..."
              required
              disabled={loading}
            />
          </div>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              View Date (Optional)
            </label>
            <DatePicker
              selected={viewDate}
              onChange={(date) => setViewDate(date)}
              showTimeSelect
              isClearable
              dateFormat="Pp"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              locale="en-GB"
              timeFormat="HH:mm"
              timeIntervals={15}
              disabled={loading}
            />
          </div>
          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
              {error}
            </div>
          )}
          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
            >
              {loading ? 'Adding...' : 'Add Property'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}