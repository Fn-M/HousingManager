import { useState, useMemo, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import DatePicker, { registerLocale } from 'react-datepicker'
import "react-datepicker/dist/react-datepicker.css"
import { FaEuroSign, FaHome, FaBed, FaBolt, FaSort, FaSortUp, FaSortDown, FaTimes } from 'react-icons/fa'
import { Ads } from './services/api'
import { enGB } from 'date-fns/locale'
import AddPropertyModal from './AddPropertyModal'
registerLocale('en-GB', enGB)


const SortableHeader = ({ children, sortKey, sortConfig, setSortConfig }) => {
  const isSorted = sortConfig.key === sortKey
  const direction = isSorted ? sortConfig.direction : null

  const handleClick = () => {
    let newDirection = 'ascending'
    if (isSorted && sortConfig.direction === 'ascending') {
      newDirection = 'descending'
    }
    setSortConfig({ key: sortKey, direction: newDirection })
  }

  return (
    <th
      onClick={handleClick}
      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
    >
      <div className="flex items-center gap-2">
        {children}
        {isSorted ? (
          direction === 'ascending' ? <FaSortUp /> : <FaSortDown />
        ) : (
          <FaSort className="text-gray-300" />
        )}
      </div>
    </th>
  )
}

const MultiSelectFilter = ({ options, selected, onChange, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false)
  const filterRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    // Adiciona o listener quando o componente monta
    document.addEventListener('mousedown', handleClickOutside)
    // Remove o listener quando o componente desmonta
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, []) // O array vazio garante que o efeito só corre na montagem e desmontagem

  const handleSelect = (option) => {
    const newSelected = selected.includes(option)
      ? selected.filter(item => item !== option)
      : [...selected, option]
    onChange(newSelected)
  }

  return (
    <div className="relative" ref={filterRef}>
      <button onClick={() => setIsOpen(!isOpen)} className="w-full sm:w-64 p-2 border rounded-md text-left bg-white">
        {selected.length > 0 ? `${selected.length} cities selected` : placeholder}
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-full sm:w-64 bg-white border rounded-md shadow-lg z-10 max-h-60 overflow-y-auto">
          {options.map(option => (
            <label key={option} className="flex items-center gap-2 p-2 hover:bg-gray-100 cursor-pointer">
              <input
                type="checkbox"
                checked={selected.includes(option)}
                onChange={() => handleSelect(option)}
              />
              {option}
            </label>
          ))}
        </div>
      )}
    </div>
  )
}


export default function PropertyList({ properties, loading, error, onUpdate }) {
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'ascending' })
  const [editingDateForId, setEditingDateForId] = useState(null)
  const [tempDate, setTempDate] = useState(null)
  const [selectedCities, setSelectedCities] = useState([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const navigate = useNavigate()

  const uniqueCities = useMemo(() => {
    const cities = new Set(
      properties
        .map(p => p.location?.split(' ').pop())
        .filter(Boolean)
    )
    return Array.from(cities).sort()
  }, [properties])

  const filteredAndSortedProperties = useMemo(() => {
    let filteredItems = [...properties]

    if (selectedCities.length > 0) {
      filteredItems = filteredItems.filter(p => {
        const city = p.location?.split(' ').pop()
        return city && selectedCities.includes(city)
      })
    }

    if (sortConfig.key) {
      filteredItems.sort((a, b) => {
        let aValue = a[sortConfig.key]
        let bValue = b[sortConfig.key]

        if (sortConfig.key === 'viewDate') {
          aValue = a.viewDate ? new Date(a.viewDate).getTime() : Infinity
          bValue = b.viewDate ? new Date(b.viewDate).getTime() : Infinity
        }

        if (sortConfig.key === 'energyClass') {
          const getEnergyScore = (energyClass) => {
            if (!energyClass || typeof energyClass !== 'string') return Infinity
            
            const normalized = energyClass.toUpperCase().trim()
            const letter = normalized.charAt(0)
            const pluses = (normalized.match(/\+/g) || []).length
            
            const letterScores = { G: 7, F: 6, E: 5, D: 4, C: 3, B: 2, A: 1 }
            
            if (!(letter in letterScores)) return Infinity
            
            // Lower score is better. Each '+' makes it better.
            return letterScores[letter] - (pluses * 0.1)
          }

          aValue = getEnergyScore(a.energyClass)
          bValue = getEnergyScore(b.energyClass)
        }

        if (aValue < bValue) {
          return sortConfig.direction === 'ascending' ? -1 : 1
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'ascending' ? 1 : -1
        }
        return 0
      })
    }
    return filteredItems
  }, [properties, sortConfig, selectedCities])

  const handleRowClick = (id) => {
    navigate(`/details/${id}`)
  }

  const handleDateChange = async (propertyId, date) => {
    try {
      const property = properties.find(p => p.id === propertyId);
      const updatePayload = {
        viewDate: date ? date.toISOString() : null
      };

      // If setting a date, automatically set status to 'view-booked'
      if (date) {
        updatePayload.status = 'view-booked';
      } 
      // If clearing the date and current status is 'view-booked', clear the status
      else if (property && (property.status === 'view-booked' || property.Status === 'view-booked')) {
        updatePayload.status = '';
      }

      await Ads.update(propertyId, updatePayload);
      setEditingDateForId(null);
      if (onUpdate) {
        onUpdate(); // Refetch all properties to get the latest data
      }
    } catch (err) {
      console.error("Failed to update view date:", err);
      alert("Failed to update view date.");
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Set Date'
    return new Date(dateString).toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) return <div className="p-6 text-center">Loading properties...</div>
  if (error) return <div className="p-6 text-center text-red-500">Error: {error}</div>

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      <AddPropertyModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={onUpdate}
      />
      <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
        <MultiSelectFilter
          options={uniqueCities}
          selected={selectedCities}
          onChange={setSelectedCities}
          placeholder="Filter by City"
        />
        <button
          onClick={() => setIsModalOpen(true)}
          className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Add New Property
        </button>
      </div>

      <div className="overflow-x-auto shadow-md rounded-lg">
        <table className="min-w-full divide-y divide-gray-200 bg-white">
          <thead className="bg-gray-50">
            <tr>
              <th className="w-28"></th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
              <SortableHeader sortKey="location" sortConfig={sortConfig} setSortConfig={setSortConfig}>
                City
              </SortableHeader>
              <SortableHeader sortKey="price" sortConfig={sortConfig} setSortConfig={setSortConfig}>
                <FaEuroSign title="Price" />
              </SortableHeader>
              <SortableHeader sortKey="space" sortConfig={sortConfig} setSortConfig={setSortConfig}>
                <FaHome title="Living Space" />
              </SortableHeader>
              <SortableHeader sortKey="rooms" sortConfig={sortConfig} setSortConfig={setSortConfig}>
                <FaBed title="Bedrooms" />
              </SortableHeader>
              <SortableHeader sortKey="energyClass" sortConfig={sortConfig} setSortConfig={setSortConfig}>
                <FaBolt title="Energy Class" />
              </SortableHeader>
              <SortableHeader sortKey="viewDate" sortConfig={sortConfig} setSortConfig={setSortConfig}>
                View Date
              </SortableHeader>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredAndSortedProperties.map((prop) => (
              <tr
                key={prop.id}
                onClick={() => handleRowClick(prop.id)}
                className="hover:bg-gray-50 cursor-pointer"
              >
                <td className="p-2" onClick={(e) => e.stopPropagation()}>
                  <Link to={`/details/${prop.id}`}>
                    <img
                      src={prop.firstPhoto}
                      alt={prop.name}
                      className="w-28 h-20 object-cover rounded-md"
                    />
                  </Link>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <a
                    href={prop.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-sm font-medium text-blue-600 hover:underline"
                  >
                    {prop.name}
                  </a>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                  {prop.location ? prop.location.split(' ').pop() : 'N/A'}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                  {prop.price ? `€${prop.price.toLocaleString()}` : 'N/A'}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                  {prop.space ? `${prop.space} m²` : 'N/A'}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                  {prop.rooms || 'N/A'}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                  {prop.energyClass || 'N/A'}
                </td>
                <td
                  className="px-4 py-4 whitespace-nowrap text-sm text-gray-700"
                  onClick={(e) => e.stopPropagation()}
                >
                  {editingDateForId === prop.id ? (
                    <div className="flex items-start gap-2">
                      <DatePicker
                        selected={tempDate}
                        onChange={(date) => setTempDate(date)}
                        showTimeSelect
                        isClearable
                        shouldCloseOnSelect={false}
                        dateFormat="Pp"
                        className="w-48 p-1 border rounded-md"
                        autoFocus
                        locale="en-GB" // Use 24-hour format
                        timeFormat="HH:mm" // Explicitly set 24-hour format
                        timeIntervals={15} // Set 15-minute intervals
                      />
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => handleDateChange(prop.id, tempDate)}
                          className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingDateForId(null)}
                          className="px-2 py-1 text-xs bg-gray-400 text-white rounded hover:bg-gray-500"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setTempDate(prop.viewDate ? new Date(prop.viewDate) : null)
                        setEditingDateForId(prop.id)
                      }}
                      className="text-blue-600 hover:underline"
                    >
                      {formatDate(prop.viewDate)}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}