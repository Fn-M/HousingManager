import { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { Ads } from './services/api'
import DatePicker from 'react-datepicker'
import "react-datepicker/dist/react-datepicker.css"
import { FaPencilAlt } from 'react-icons/fa'

export default function PropertyDetails({ onUpdate, onDelete }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [property, setProperty] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  const [comments, setComments] = useState([])
  const [showDialog, setShowDialog] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [commentError, setCommentError] = useState('')
  const [addingComment, setAddingComment] = useState(false)
  
  const [replyTo, setReplyTo] = useState(null)
  const [showReplyDialog, setShowReplyDialog] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [replyError, setReplyError] = useState('')
  const [addingReply, setAddingReply] = useState(false)
  
  const [collapsed, setCollapsed] = useState({})
  const [editingStatus, setEditingStatus] = useState(false)
  const [statusValue, setStatusValue] = useState('')
  const [customStatus, setCustomStatus] = useState('')
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [savingStatus, setSavingStatus] = useState(false)
  const [editingViewDate, setEditingViewDate] = useState(false)
  const [tempDate, setTempDate] = useState(null) // Temporary state for date editing
  const [savingViewDate, setSavingViewDate] = useState(false)
  const newCommentRef = useRef(null)
  const [pictures, setPictures] = useState([])
  const [deletingPictureId, setDeletingPictureId] = useState(null)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const isMountedRef = useRef(true)

  const predefinedStatuses = [
    { value: 'view-booked', label: 'View booked', color: 'bg-purple-100 text-purple-800' },
    { value: 'offer-made', label: 'Offer made', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'viewed', label: 'Viewed', color: 'bg-green-100 text-green-800' },
    { value: 'interested', label: 'Interested', color: 'bg-blue-100 text-blue-800' },
    { value: 'rejected', label: 'Rejected', color: 'bg-red-100 text-red-800' }
  ]

  const getStatusColor = (status) => {
    const predefined = predefinedStatuses.find(s => s.value === status)
    if (predefined) return predefined.color
    return 'bg-gray-100 text-gray-800'
  }

  const getStatusLabel = (status) => {
    const predefined = predefinedStatuses.find(s => s.value === status)
    return predefined ? predefined.label : status
  }

  const getUserFromCookie = () => {
    const cookies = document.cookie.split(';')
    const userCookie = cookies.find(c => c.trim().startsWith('user='))
    return userCookie ? decodeURIComponent(userCookie.split('=')[1]) : 'Anonymous'
  }

  const sortedPictures = useMemo(() => {
    const sorted = [...pictures].sort((a, b) => {
      const getLastThreeNumbers = (url) => {
        const matches = url.match(/\d+/g)
        if (!matches || matches.length < 3) return [0, 0, 0]
        const len = matches.length
        return [
          parseInt(matches[len - 3], 10),
          parseInt(matches[len - 2], 10),
          parseInt(matches[len - 1], 10)
        ]
      }
      
      const [numA_a, numB_a, numC_a] = getLastThreeNumbers(a.PictureUrl)
      const [numA_b, numB_b, numC_b] = getLastThreeNumbers(b.PictureUrl)
      
      if (numA_a !== numA_b) return numA_a - numA_b
      if (numB_a !== numB_b) return numB_a - numB_b
      return numC_a - numC_b
    })
    
    const firstPhoto = property?.Picture?.trim()
    
    if (firstPhoto) {
      const filteredSorted = sorted.filter(pic => pic.PictureUrl !== firstPhoto)
      
      return [
        { 
          PictureUrl: firstPhoto, 
          PictureId: 'first', 
          isFirstPhoto: true 
        }, 
        ...filteredSorted
      ]
    }
    
    return sorted
  }, [pictures, property])

  const handlePrevImage = useCallback(() => {
    setCurrentImageIndex((prev) => (prev === 0 ? sortedPictures.length - 1 : prev - 1))
  }, [sortedPictures.length])

  const handleNextImage = useCallback(() => {
    setCurrentImageIndex((prev) => (prev === sortedPictures.length - 1 ? 0 : prev + 1))
  }, [sortedPictures.length])

  useEffect(() => {
    isMountedRef.current = true
    
    const fetchData = async () => {
      if (isDeleting) return
      
      try {
        setLoading(true)
        const data = await Ads.get(id)
        
        if (!isMountedRef.current) return
        
        setProperty(data)
        setStatusValue(data.Status || data.status || '')

        const pics = await Ads.getPictures(id)
        if (!isMountedRef.current) return
        setPictures(pics)

        const commentsData = await Ads.getComments(id)
        if (!isMountedRef.current) return
        setComments(Array.isArray(commentsData) ? commentsData : [])
      } catch (err) {
        if (!isMountedRef.current) return
        setError(err.message || 'Failed to load property details')
      } finally {
        if (isMountedRef.current) {
          setLoading(false)
        }
      }
    }
    
    fetchData()
    
    return () => {
      isMountedRef.current = false
    }
  }, [id, isDeleting])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') {
        handlePrevImage()
      } else if (e.key === 'ArrowRight') {
        handleNextImage()
      } else if (e.key === 'Escape' && isExpanded) {
        setIsExpanded(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handlePrevImage, handleNextImage, isExpanded])

  useEffect(() => {
    if (showDialog && newCommentRef.current) {
      newCommentRef.current.focus()
    }
  }, [showDialog])

  const handleSaveStatus = async () => {
    try {
      const finalStatus = showCustomInput ? customStatus.trim() : statusValue
      
      if (!finalStatus) {
        alert('Please select or enter a status')
        return
      }

      setSavingStatus(true)
      
      await Ads.update(id, { status: finalStatus })
      setProperty({ ...property, status: finalStatus })
      setStatusValue(finalStatus)
      setEditingStatus(false)
      setShowCustomInput(false)
      setCustomStatus('')
      if (onUpdate) onUpdate()
    } catch (err) {
      alert('Failed to update status: ' + err.message)
    } finally {
      setSavingStatus(false)
    }
  }

  const handleCancelStatus = () => {
    setEditingStatus(false)
    setShowCustomInput(false)
    setCustomStatus('')
    setStatusValue(property?.status || '')
  }

  const handleSaveViewDate = async (date) => {
    setSavingViewDate(true)
    try {
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

      await Ads.update(id, updatePayload);
      
      // Manually update local state to reflect changes immediately
      setProperty(prev => ({ 
        ...prev, 
        viewDate: updatePayload.viewDate,
        ...(updatePayload.status !== undefined && { status: updatePayload.status })
      }));
      
      if (updatePayload.status !== undefined) {
        setStatusValue(updatePayload.status);
      }

      setEditingViewDate(false);
      if (onUpdate) onUpdate();

    } catch (err) {
      alert('Failed to update view date: ' + err.message)
    } finally {
      setSavingViewDate(false)
    }
  }

  const handleAddComment = async () => {
    if (!commentText.trim()) {
      setCommentError('Comment cannot be empty')
      return
    }

    if (addingComment) return

    try {
      setAddingComment(true)
      setCommentError('')
      
      const commentData = {
        description: commentText.trim(),
        createdBy: getUserFromCookie(),
        timestamp: new Date().toISOString()
      }
      
      await Ads.addComment(id, commentData)
      
      const updatedComments = await Ads.getComments(id)
      
      setComments(Array.isArray(updatedComments) ? updatedComments : [])
      
      setCommentText('')
      setShowDialog(false)
    } catch (err) {
      setCommentError(err.message || 'Failed to add comment')
    } finally {
      setAddingComment(false)
    }
  }

  const handleAddReply = async () => {
    if (!replyText.trim()) {
      setReplyError('Reply cannot be empty')
      return
    }

    if (addingReply) return

    try {
      setAddingReply(true)
      setReplyError('')
      
      const replyData = {
        description: replyText.trim(),
        parentCommentId: replyTo.CommentId,
        createdBy: getUserFromCookie(),
        timestamp: new Date().toISOString()
      }
      
      await Ads.addComment(id, replyData)
      
      const updatedComments = await Ads.getComments(id)
      
      setComments(Array.isArray(updatedComments) ? updatedComments : [])
      
      setReplyText('')
      setShowReplyDialog(false)
      setReplyTo(null)
    } catch (err) {
      setReplyError(err.message || 'Failed to add reply')
    } finally {
      setAddingReply(false)
    }
  }

  const handleDeletePicture = async (pictureId) => {
    if (!window.confirm('Are you sure you want to delete this picture?')) return

    try {
      setDeletingPictureId(pictureId)
      await Ads.deletePicture(id, pictureId)
      
      const updatedPictures = await Ads.getPictures(id)
      setPictures(updatedPictures)
      
      if (currentImageIndex >= updatedPictures.length) {
        setCurrentImageIndex(Math.max(0, updatedPictures.length - 1))
      }
    } catch (err) {
      alert('Failed to delete picture: ' + err.message)
    } finally {
      setDeletingPictureId(null)
    }
  }

  const handleDeleteProperty = async () => {
    if (!window.confirm('Are you sure you want to delete this property?')) {
      return
    }

    try {
      setIsDeleting(true)
      
      if (onDelete) {
        onDelete(id)
      }
      
      navigate('/', { replace: true })
      
      Ads.delete(id).catch(err => {
        console.error('Failed to delete property:', err)
        if (onUpdate) {
          onUpdate()
        }
      })
      
    } catch (err) {
      alert('Failed to delete property: ' + err.message)
      setIsDeleting(false)
    }
  }

  const toggleExpand = () => {
    setIsExpanded(!isExpanded)
  }

  const toggleCollapse = (commentId) => {
    setCollapsed(prev => ({
      ...prev,
      [commentId]: !prev[commentId]
    }))
  }

  const formatDate = (dateString, includeTime = true) => {
    if (!dateString) return 'Not set'
    try {
      const options = {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }
      if (includeTime) {
        options.hour = '2-digit'
        options.minute = '2-digit'
      }
      return new Date(dateString).toLocaleDateString('en-GB', options)
    } catch {
      return dateString
    }
  }

  const renderComments = (parentCommentId = null, level = 0) => {
    const levelComments = comments.filter(comment => 
      comment.ParentCommentId === parentCommentId
    )
    
    if (levelComments.length === 0) return null
    
    return levelComments.map(comment => {
      const directReplies = comments.filter(c => c.ParentCommentId === comment.CommentId)
      const isCollapsed = collapsed[comment.CommentId]
      
      return (
        <div 
          key={comment.CommentId} 
          className={`${level > 0 ? 'ml-6 mt-3 border-l-2 border-blue-200 pl-4' : 'mb-4'}`}
        >
          <div className={`${level === 0 ? 'bg-gray-50' : 'bg-gray-100'} rounded-lg p-4`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-800">{comment.CreatedBy || 'Anonymous'}</span>
                <span className="text-sm text-gray-500">{formatDate(comment.CreatedAt)}</span>
                {directReplies.length > 0 && (
                  <button
                    onClick={() => toggleCollapse(comment.CommentId)}
                    className="text-blue-600 text-sm hover:underline ml-2 flex items-center gap-1"
                  >
                    {isCollapsed ? '▶' : '▼'} 
                    {directReplies.length} {directReplies.length === 1 ? 'reply' : 'replies'}
                  </button>
                )}
              </div>
              <button
                onClick={() => {
                  setReplyTo(comment)
                  setShowReplyDialog(true)
                }}
                className="text-blue-600 text-sm hover:underline"
              >
                Reply
              </button>
            </div>
            <p className="text-gray-700 whitespace-pre-wrap">{comment.Description}</p>
          </div>
          
          {!isCollapsed && directReplies.length > 0 && (
            <div className="mt-2">
              {renderComments(comment.CommentId, level + 1)}
            </div>
          )}
        </div>
      )
    })
  }

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>
  if (error) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-red-600">{error}</div>

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-blue-600 text-white p-4 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-3xl font-bold">Property Details</h1>
          <Link to="/" className="px-4 py-2 bg-white text-blue-600 rounded hover:bg-gray-100 transition">
            ← Back to List
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        {property && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-3xl font-bold text-gray-800">{property.name}</h2>
              
              {property.link && (
                <a
                  href={property.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition flex items-center gap-2"
                >
                  Original Link
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              )}
            </div>

            {sortedPictures.length > 0 && (
              <div className="mb-6 relative group">
                {isExpanded && (
                  <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
                    <div className="relative w-full h-full flex items-center justify-center p-4">
                      <img
                        src={sortedPictures[currentImageIndex].PictureUrl}
                        alt={`Property ${currentImageIndex + 1}`}
                        className="max-w-full max-h-full object-contain"
                      />
                      
                      <button
                        onClick={handlePrevImage}
                        className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-70 text-white p-4 rounded-full hover:bg-opacity-90 text-3xl w-14 h-14 flex items-center justify-center"
                      >
                        ‹
                      </button>
                      <button
                        onClick={handleNextImage}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-70 text-white p-4 rounded-full hover:bg-opacity-90 text-3xl w-14 h-14 flex items-center justify-center"
                      >
                        ›
                      </button>

                      <button
                        onClick={toggleExpand}
                        className="absolute top-4 right-4 bg-black bg-opacity-70 text-white p-3 rounded-full hover:bg-opacity-90 text-2xl w-12 h-12 flex items-center justify-center"
                        title="Exit fullscreen"
                      >
                        ✕
                      </button>

                      {!sortedPictures[currentImageIndex].isFirstPhoto && (
                        <button
                          onClick={() => handleDeletePicture(sortedPictures[currentImageIndex].PictureId)}
                          disabled={deletingPictureId === sortedPictures[currentImageIndex].PictureId}
                          className="absolute bottom-4 right-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50"
                        >
                          {deletingPictureId === sortedPictures[currentImageIndex].PictureId ? 'Deleting...' : 'Delete Photo'}
                        </button>
                      )}

                      <div className="absolute bottom-4 left-4 bg-black bg-opacity-70 text-white px-4 py-2 rounded text-lg">
                        {currentImageIndex + 1} / {sortedPictures.length}
                      </div>
                    </div>
                  </div>
                )}

                {!isExpanded && (
                  <div className="relative w-full h-96 bg-gray-100 rounded-lg shadow-lg">
                    <img
                      src={sortedPictures[currentImageIndex].PictureUrl}
                      alt={`Property ${currentImageIndex + 1}`}
                      className="w-full h-full object-contain rounded-lg"
                    />
                    
                    <button
                      onClick={handlePrevImage}
                      className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75"
                    >
                      ‹
                    </button>
                    <button
                      onClick={handleNextImage}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75"
                    >
                      ›
                    </button>

                    <button
                      onClick={toggleExpand}
                      className="absolute top-2 right-2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75"
                      title="View fullscreen"
                    >
                      ⛶
                    </button>

                    {!sortedPictures[currentImageIndex].isFirstPhoto && (
                      <button
                        onClick={() => handleDeletePicture(sortedPictures[currentImageIndex].PictureId)}
                        disabled={deletingPictureId === sortedPictures[currentImageIndex].PictureId}
                        className="absolute bottom-2 right-2 bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 disabled:opacity-50"
                      >
                        {deletingPictureId === sortedPictures[currentImageIndex].PictureId ? 'Deleting...' : 'Delete Photo'}
                      </button>
                    )}

                    <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-3 py-1 rounded">
                      {currentImageIndex + 1} / {sortedPictures.length}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
                  {sortedPictures.map((pic, idx) => (
                    <img
                      key={pic.PictureId}
                      src={pic.PictureUrl}
                      alt={`Thumbnail ${idx + 1}`}
                      onClick={() => setCurrentImageIndex(idx)}
                      className={`w-24 h-24 object-contain bg-gray-100 rounded cursor-pointer ${idx === currentImageIndex ? 'ring-4 ring-blue-500' : 'opacity-70 hover:opacity-100'}`}
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <p className="text-sm text-gray-500">Location</p>
                <p className="text-lg font-semibold">{property.location || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Price</p>
                <p className="text-lg font-semibold">€{property.price?.toLocaleString() || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Living Area</p>
                <p className="text-lg font-semibold">{property.space ? `${property.space} m²` : 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Plot Area</p>
                <p className="text-lg font-semibold">{property.terrain ? `${property.terrain} m²` : 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Rooms</p>
                <p className="text-lg font-semibold">{property.rooms || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Energy Class</p>
                <p className="text-lg font-semibold">{property.energyClass || 'N/A'}</p>
              </div>
              
              <div className="md:col-span-2">
                <p className="text-sm text-gray-500 mb-2">View Date</p>
                {editingViewDate ? (
                  <div className="flex items-start gap-4">
                    <DatePicker
                      selected={tempDate}
                      onChange={(date) => setTempDate(date)}
                      showTimeSelect
                      isClearable
                      shouldCloseOnSelect={false}
                      dateFormat="Pp"
                      className="px-3 py-2 border rounded w-full max-w-xs"
                      disabled={savingViewDate}
                      inline
                    />
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => handleSaveViewDate(tempDate)}
                        disabled={savingViewDate}
                        className={`px-4 py-2 rounded flex items-center justify-center gap-2 ${
                          savingViewDate
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-green-600 hover:bg-green-700 text-white'
                        }`}
                      >
                        {savingViewDate ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={() => setEditingViewDate(false)}
                        disabled={savingViewDate}
                        className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2 items-center">
                    <span className="px-3 py-1 rounded-full text-sm font-semibold bg-gray-100 text-gray-800">
                      {formatDate(property.viewDate)}
                    </span>
                    <button 
                      onClick={() => {
                        setTempDate(property.viewDate ? new Date(property.viewDate) : null)
                        setEditingViewDate(true)
                      }} 
                      className="p-2 text-gray-500 rounded-full hover:bg-gray-200 hover:text-gray-700 transition"
                      title={property.viewDate ? 'Edit Date' : 'Set Date'}
                    >
                      <FaPencilAlt />
                    </button>
                  </div>
                )}
              </div>

              <div className="md:col-span-2">
                <p className="text-sm text-gray-500 mb-2">Status</p>
                {editingStatus ? (
                  <div className="flex flex-col gap-3">
                    <div className="flex gap-2 flex-wrap">
                      {predefinedStatuses.map((status) => (
                        <button
                          key={status.value}
                          onClick={() => {
                            setStatusValue(status.value)
                            setShowCustomInput(false)
                          }}
                          disabled={savingStatus}
                          className={`px-3 py-1 rounded-full text-sm font-semibold border-2 transition ${
                            statusValue === status.value && !showCustomInput
                              ? status.color + ' border-gray-800'
                              : status.color + ' border-transparent opacity-60 hover:opacity-100'
                          } ${savingStatus ? 'cursor-not-allowed opacity-50' : ''}`}
                        >
                          {status.label}
                        </button>
                      ))}
                      <button
                        onClick={() => {
                          setShowCustomInput(true)
                          setStatusValue('')
                        }}
                        disabled={savingStatus}
                        className={`px-3 py-1 rounded-full text-sm font-semibold border-2 transition ${
                          showCustomInput
                            ? 'bg-gray-200 text-gray-800 border-gray-800'
                            : 'bg-gray-100 text-gray-600 border-transparent hover:bg-gray-200'
                        } ${savingStatus ? 'cursor-not-allowed opacity-50' : ''}`}
                      >
                        + Custom
                      </button>
                    </div>
                    
                    {showCustomInput && (
                      <input
                        type="text"
                        value={customStatus}
                        onChange={(e) => setCustomStatus(e.target.value)}
                        placeholder="Enter custom status..."
                        className="px-3 py-2 border rounded w-full max-w-md"
                        disabled={savingStatus}
                        autoFocus
                      />
                    )}
                    
                    <div className="flex gap-2">
                      <button 
                        onClick={handleSaveStatus} 
                        disabled={savingStatus}
                        className={`px-4 py-2 rounded flex items-center gap-2 ${
                          savingStatus
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-green-600 hover:bg-green-700 text-white'
                        }`}
                      >
                        {savingStatus && (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        )}
                        {savingStatus ? 'Saving...' : 'Save'}
                      </button>
                      <button 
                        onClick={handleCancelStatus} 
                        disabled={savingStatus}
                        className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2 items-center">
                    {statusValue ? (
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(statusValue)}`}>
                        {getStatusLabel(statusValue)}
                      </span>
                    ) : (
                      <span className="text-gray-400">No status</span>
                    )}
                    <button 
                      onClick={() => setEditingStatus(true)} 
                      className="p-2 text-gray-500 rounded-full hover:bg-gray-200 hover:text-gray-700 transition"
                      title={statusValue ? 'Edit Status' : 'Add Status'}
                    >
                      <FaPencilAlt />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {property.description && (
              <div className="mb-6">
                <h3 className="text-xl font-semibold mb-3">Description</h3>
                <p className="text-gray-700 whitespace-pre-wrap">{property.description}</p>
              </div>
            )}

            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold">Comments ({comments.length})</h3>
                <button
                  onClick={() => setShowDialog(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Add Comment
                </button>
              </div>

              {comments.length > 0 ? (
                <div>{renderComments(null, 0)}</div>
              ) : (
                <p className="text-gray-500 text-center py-8">No comments yet. Be the first to add one!</p>
              )}
            </div>

            {showDialog && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                  <h3 className="text-xl font-semibold mb-4">Add Comment</h3>
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Write your comment..."
                    className="w-full p-3 border border-gray-300 rounded-md mb-4 min-h-[100px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={addingComment}
                  />
                  {commentError && (
                    <p className="text-red-600 text-sm mb-4">{commentError}</p>
                  )}
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => {
                        setShowDialog(false)
                        setCommentText('')
                        setCommentError('')
                      }}
                      className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                      disabled={addingComment}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddComment}
                      disabled={addingComment}
                      className={`px-4 py-2 rounded flex items-center gap-2 ${
                        addingComment 
                          ? 'bg-gray-400 cursor-not-allowed' 
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
                      {addingComment && (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      )}
                      {addingComment ? 'Adding...' : 'Add Comment'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {showReplyDialog && replyTo && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                  <h3 className="text-xl font-semibold mb-2">Reply to {replyTo.CreatedBy}</h3>
                  <p className="text-sm text-gray-600 mb-4 italic">{replyTo.Description}</p>
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Write your reply..."
                    className="w-full p-3 border border-gray-300 rounded-md mb-4 min-h-[100px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={addingReply}
                  />
                  {replyError && (
                    <p className="text-red-600 text-sm mb-4">{replyError}</p>
                  )}
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => {
                        setShowReplyDialog(false)
                        setReplyText('')
                        setReplyError('')
                        setReplyTo(null)
                      }}
                      className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                      disabled={addingReply}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddReply}
                      disabled={addingReply}
                      className={`px-4 py-2 rounded flex items-center gap-2 ${
                        addingReply 
                          ? 'bg-gray-400 cursor-not-allowed' 
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
                      {addingReply && (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      )}
                      {addingReply ? 'Replying...' : 'Reply'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-8 pt-6 border-t border-gray-200">
              <button
                onClick={handleDeleteProperty}
                disabled={isDeleting}
                className={`px-6 py-3 rounded-lg flex items-center gap-2 ${
                  isDeleting
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-red-600 hover:bg-red-700 text-white'
                }`}
              >
                {isDeleting && (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                )}
                {isDeleting ? 'Deleting Property...' : 'Delete Property'}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
