import { useEffect, useState, useRef, useMemo } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { Ads } from './services/api'

export default function PropertyDetails({ onUpdate }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [property, setProperty] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [comments, setComments] = useState([])
  const [showDialog, setShowDialog] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [commentError, setCommentError] = useState('')
  const [showReplyDialog, setShowReplyDialog] = useState(false)
  const [replyTo, setReplyTo] = useState(null)
  const [replyText, setReplyText] = useState('')
  const [replyError, setReplyError] = useState('')
  const [collapsed, setCollapsed] = useState({})
  const [editingStatus, setEditingStatus] = useState(false)
  const [statusValue, setStatusValue] = useState('')
  const newCommentRef = useRef(null)
  const [pictures, setPictures] = useState([])
  const [deletingPictureId, setDeletingPictureId] = useState(null)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const data = await Ads.get(id)
        setProperty(data)
        setStatusValue(data.Status || data.status || '')

        const pics = await Ads.getPictures(id)
        setPictures(pics)

        const commentsData = await Ads.getComments(id)
        setComments(Array.isArray(commentsData) ? commentsData : [])
      } catch (err) {
        setError(err.message || 'Failed to load property details')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [id])

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

  const handleStatusSave = async () => {
    try {
      const updatedAd = {
        ...property,
        Status: statusValue,
        status: statusValue
      }
      await Ads.update(id, updatedAd)
      setProperty(updatedAd)
      setEditingStatus(false)
      
      if (onUpdate) {
        onUpdate(updatedAd)
      }
    } catch (err) {
      alert('Failed to update status: ' + err.message)
    }
  }

  const handleDeleteProperty = async () => {
    if (!window.confirm('Are you sure you want to delete this property? This action cannot be undone.')) {
      return
    }

    try {
      setIsDeleting(true)
      
      if (pictures.length > 0) {
        await Ads.deleteAllPictures(id)
      }
      
      await Ads.delete(id)
      
      navigate('/', { replace: true })
      window.location.reload()
    } catch (err) {
      alert('Failed to delete property: ' + err.message)
      setIsDeleting(false)
    }
  }

  const handleAddComment = async (e) => {
    e.preventDefault()
    setCommentError('')
    if (!newComment.trim()) {
      setCommentError('Comment cannot be empty')
      return
    }
    try {
      const comment = { text: newComment, timestamp: new Date().toISOString() }
      await Ads.addComment(id, comment)
      const updatedComments = await Ads.getComments(id)
      setComments(Array.isArray(updatedComments) ? updatedComments : [])
      setNewComment('')
      setShowDialog(false)
    } catch (err) {
      setCommentError(err.message || 'Failed to add comment')
    }
  }

  const handleReply = async (e) => {
    e.preventDefault()
    setReplyError('')
    if (!replyText.trim()) {
      setReplyError('Reply cannot be empty')
      return
    }
    try {
      const reply = {
        text: replyText,
        timestamp: new Date().toISOString(),
        parentId: replyTo.CommentId
      }
      await Ads.addComment(id, reply)
      const updatedComments = await Ads.getComments(id)
      setComments(Array.isArray(updatedComments) ? updatedComments : [])
      setReplyText('')
      setShowReplyDialog(false)
      setReplyTo(null)
    } catch (err) {
      setReplyError(err.message || 'Failed to add reply')
    }
  }

  const toggleCollapse = (commentId) => {
    setCollapsed(prev => ({ ...prev, [commentId]: !prev[commentId] }))
  }

  const handleDeletePicture = async (pictureId) => {
    if (!window.confirm('Are you sure you want to delete this picture?')) return
    try {
      setDeletingPictureId(pictureId)
      await Ads.deletePicture(id, pictureId)
      setPictures(prev => prev.filter(p => p.PictureId !== pictureId))
      if (currentImageIndex >= sortedPictures.length - 1) {
        setCurrentImageIndex(Math.max(0, sortedPictures.length - 2))
      }
    } catch (err) {
      alert('Failed to delete picture: ' + err.message)
    } finally {
      setDeletingPictureId(null)
    }
  }

  const handlePrevImage = () => {
    setCurrentImageIndex((prev) => (prev === 0 ? sortedPictures.length - 1 : prev - 1))
  }

  const handleNextImage = () => {
    setCurrentImageIndex((prev) => (prev === sortedPictures.length - 1 ? 0 : prev + 1))
  }

  const toggleExpand = () => {
    setIsExpanded(!isExpanded)
  }

  const buildCommentTree = (comments) => {
    const map = {}
    const roots = []
    comments.forEach(c => { map[c.CommentId] = { ...c, children: [] } })
    comments.forEach(c => {
      if (c.ParentId && map[c.ParentId]) {
        map[c.ParentId].children.push(map[c.CommentId])
      } else {
        roots.push(map[c.CommentId])
      }
    })
    return roots
  }

  const renderComment = (comment, level = 0) => {
    const isCollapsed = collapsed[comment.CommentId]
    const hasChildren = comment.children && comment.children.length > 0
    return (
      <div key={comment.CommentId} style={{ marginLeft: level * 20 + 'px' }} className="mb-4 border-l-2 border-gray-300 pl-4">
        <div className="bg-gray-50 p-3 rounded shadow-sm">
          <p className="text-sm text-gray-800">{comment.Text}</p>
          <p className="text-xs text-gray-500 mt-1">{new Date(comment.Timestamp).toLocaleString()}</p>
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => { setReplyTo(comment); setShowReplyDialog(true) }}
              className="text-xs text-blue-600 hover:underline"
            >
              Reply
            </button>
            {hasChildren && (
              <button
                onClick={() => toggleCollapse(comment.CommentId)}
                className="text-xs text-gray-600 hover:underline"
              >
                {isCollapsed ? 'Show replies' : 'Hide replies'}
              </button>
            )}
          </div>
        </div>
        {hasChildren && !isCollapsed && (
          <div className="mt-2">
            {comment.children.map(child => renderComment(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="text-xl text-gray-600">Loading...</div></div>
  if (error) return <div className="flex items-center justify-center min-h-screen"><div className="text-xl text-red-600">Error: {error}</div></div>
  if (!property) return <div className="flex items-center justify-center min-h-screen"><div className="text-xl text-gray-600">Property not found</div></div>

  const commentTree = buildCommentTree(comments)

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-blue-600 text-white p-4 shadow-md">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <h1 className="text-3xl font-bold">Property Details</h1>
          <Link to="/" className="px-4 py-2 bg-white text-blue-600 rounded hover:bg-gray-100 transition">
            ← Back
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
        <div className="bg-white rounded-lg shadow p-8">
          <div className="flex items-start justify-between mb-4">
            <h2 className="text-2xl font-bold text-blue-700">{property.name}</h2>
            <button
              onClick={handleDeleteProperty}
              disabled={isDeleting}
              className="px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
              title="Delete property"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {isDeleting ? 'Deleting...' : 'Delete Property'}
            </button>
          </div>

          {sortedPictures.length > 0 && (
            <div className="mb-6 relative group">
              <div className={`relative ${isExpanded ? 'fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center' : ''}`}>
                <div className={`relative ${isExpanded ? 'max-w-5xl max-h-screen' : 'w-full h-96'}`}>
                  <img
                    src={sortedPictures[currentImageIndex].PictureUrl}
                    alt={`Property ${currentImageIndex + 1}`}
                    className={`${isExpanded ? 'max-w-full max-h-screen object-contain' : 'w-full h-96 object-cover rounded-lg shadow-lg'}`}
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
                    title={isExpanded ? 'Exit fullscreen' : 'View fullscreen'}
                  >
                    {isExpanded ? '✕' : '⛶'}
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
              </div>

              <div className="flex gap-2 mt-4 overflow-x-auto">
                {sortedPictures.map((pic, idx) => (
                  <img
                    key={pic.PictureId}
                    src={pic.PictureUrl}
                    alt={`Thumbnail ${idx + 1}`}
                    onClick={() => setCurrentImageIndex(idx)}
                    className={`w-20 h-20 object-cover rounded cursor-pointer ${idx === currentImageIndex ? 'ring-4 ring-blue-500' : 'opacity-60 hover:opacity-100'}`}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <span className="text-gray-600">Location:</span>
              <p className="font-semibold">{property.location}</p>
            </div>
            <div>
              <span className="text-gray-600">Price:</span>
              <p className="font-semibold text-green-600">€ {property.price?.toLocaleString?.('nl-NL') || property.price}</p>
            </div>
            <div>
              <span className="text-gray-600">Living Space:</span>
              <p className="font-semibold">{property.space} m²</p>
            </div>
            <div>
              <span className="text-gray-600">Plot Area:</span>
              <p className="font-semibold">{property.terrain} m²</p>
            </div>
            <div>
              <span className="text-gray-600">Rooms:</span>
              <p className="font-semibold">{property.rooms}</p>
            </div>
            <div>
              <span className="text-gray-600">Energy Class:</span>
              <p className="font-semibold">{property.energyClass}</p>
            </div>
            <div className="col-span-2">
              <span className="text-gray-600">Link:</span>
              <p className="font-semibold">
                {property.link ? (
                  <a href={property.link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all">
                    {property.link}
                  </a>
                ) : (
                  'N/A'
                )}
              </p>
            </div>
            <div className="col-span-2">
              <span className="text-gray-600">Status:</span>
              {editingStatus ? (
                <div className="flex gap-2 mt-2">
                  <input
                    type="text"
                    value={statusValue}
                    onChange={(e) => setStatusValue(e.target.value)}
                    className="border border-gray-300 rounded px-2 py-1 flex-1"
                  />
                  <button onClick={handleStatusSave} className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">
                    Save
                  </button>
                  <button onClick={() => { setEditingStatus(false); setStatusValue(property.Status || property.status || '') }} className="px-3 py-1 bg-gray-300 rounded hover:bg-gray-400">
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 mt-2">
                  <p className="font-semibold">{property.Status || property.status || '-'}</p>
                  <button onClick={() => setEditingStatus(true)} className="text-blue-600 hover:underline text-sm">
                    Edit
                  </button>
                </div>
              )}
            </div>
          </div>

          {property.description && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Description</h3>
              <p className="text-gray-600">{property.description}</p>
            </div>
          )}

          <div className="border-t pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-700">Comments ({comments.length})</h3>
              <button
                onClick={() => setShowDialog(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
              >
                Add Comment
              </button>
            </div>
            {commentTree.length === 0 ? (
              <p className="text-gray-500">No comments yet.</p>
            ) : (
              <div>
                {commentTree.map(comment => renderComment(comment))}
              </div>
            )}
          </div>
        </div>

        {showDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-96 shadow-lg">
              <h2 className="text-xl font-bold mb-4">Add Comment</h2>
              <form onSubmit={handleAddComment}>
                <textarea
                  ref={newCommentRef}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Write your comment..."
                  className="w-full border border-gray-300 rounded p-2 mb-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  rows="4"
                />
                {commentError && <p className="text-red-600 text-sm mb-2">{commentError}</p>}
                <div className="flex gap-2">
                  <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex-1">
                    Submit
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowDialog(false); setNewComment(''); setCommentError('') }}
                    className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 flex-1"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showReplyDialog && replyTo && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-96 shadow-lg">
              <h2 className="text-xl font-bold mb-4">Reply to Comment</h2>
              <div className="bg-gray-50 p-3 rounded mb-4">
                <p className="text-sm text-gray-800">{replyTo.Text}</p>
                <p className="text-xs text-gray-500 mt-1">{new Date(replyTo.Timestamp).toLocaleString()}</p>
              </div>
              <form onSubmit={handleReply}>
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Write your reply..."
                  className="w-full border border-gray-300 rounded p-2 mb-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  rows="4"
                />
                {replyError && <p className="text-red-600 text-sm mb-2">{replyError}</p>}
                <div className="flex gap-2">
                  <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex-1">
                    Submit
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowReplyDialog(false); setReplyText(''); setReplyError(''); setReplyTo(null) }}
                    className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 flex-1"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
