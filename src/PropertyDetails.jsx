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

  const user = useMemo(() => {
    const match = document.cookie.match(/user=([^;]+)/)
    return match ? decodeURIComponent(match[1]) : null
  }, [])

  const statusTags = ['View booked', 'View', 'Offer made']

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const data = await Ads.get(id)
        console.log('🏠 Property data:', data)
        console.log('📸 Picture:', data.Picture)
        console.log('💰 Price:', data.price)
        console.log('📏 Space:', data.space)
        setProperty(data)
        setStatusValue(data.Status || data.status || '')

        const pics = await Ads.getPictures(id)
        console.log('📷 Pictures:', pics)
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
    console.log('🔍 sortedPictures - property:', property)
    console.log('🔍 sortedPictures - pictures:', pictures)
    
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
    
    // Pega a Picture do property (mesma que aparece na tabela)
    const firstPhoto = property?.Picture?.trim()
    console.log('🖼️ firstPhoto:', firstPhoto)
    
    if (firstPhoto) {
      console.log('✅ Picture encontrada:', firstPhoto)
      
      // Remove a Picture da lista se já existir nas otherPhotos
      const filteredSorted = sorted.filter(pic => pic.PictureUrl !== firstPhoto)
      
      // Adiciona Picture como primeira imagem (não pode ser apagada)
      const result = [
        { 
          PictureUrl: firstPhoto, 
          PictureId: 'first', 
          isFirstPhoto: true 
        }, 
        ...filteredSorted
      ]
      console.log('📸 Carrossel final:', result)
      return result
    }
    
    // Se Picture estiver vazia, apenas retorna as otherPhotos ordenadas
    console.log('⚠️ Picture está vazia, mostrando apenas otherPhotos')
    return sorted
  }, [pictures, property])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (sortedPictures.length === 0) return
      if (e.key === 'ArrowLeft') {
        setCurrentImageIndex((prev) => (prev > 0 ? prev - 1 : sortedPictures.length - 1))
      } else if (e.key === 'ArrowRight') {
        setCurrentImageIndex((prev) => (prev < sortedPictures.length - 1 ? prev + 1 : 0))
      } else if (e.key === 'Escape' && isExpanded) {
        setIsExpanded(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [sortedPictures.length, isExpanded])

  useEffect(() => {
    if (showDialog && newCommentRef.current) {
      newCommentRef.current.focus()
    }
  }, [showDialog])

  const handleDeleteCurrentPicture = async () => {
    if (sortedPictures.length === 0) return
    const currentPicture = sortedPictures[currentImageIndex]
    
    // Não permite apagar a firstPhoto
    if (currentPicture.isFirstPhoto) {
      alert('Cannot delete the main property photo')
      return
    }
    
    if (!window.confirm('Are you sure you want to delete this picture?')) return

    try {
      setDeletingPictureId(currentPicture.PictureId)
      await Ads.deletePicture(id, currentPicture.PictureId)
      setPictures(pictures.filter(p => p.PictureId !== currentPicture.PictureId))
      
      if (currentImageIndex >= sortedPictures.length - 1) {
        setCurrentImageIndex(Math.max(0, sortedPictures.length - 2))
      }
    } catch (err) {
      alert('Failed to delete picture: ' + err.message)
    } finally {
      setDeletingPictureId(null)
    }
  }

  const threadedComments = useMemo(() => {
    const map = {}
    const roots = []
    comments.forEach(c => {
      map[c.CommentId] = { ...c, replies: [] }
    })
    comments.forEach(c => {
      const parentId = c.ParentCommentId || c.parentCommentId
      if (parentId && map[parentId]) {
        map[parentId].replies.push(map[c.CommentId])
      } else {
        roots.push(map[c.CommentId])
      }
    })
    return roots
  }, [comments])

  const renderCommentThread = (commentsArray, depth = 0) => {
    return commentsArray.map(c => (
      <div key={c.CommentId} className={`${depth > 0 ? 'ml-6 mt-2 border-l-2 border-blue-200 pl-4 bg-blue-50 rounded-r' : 'mb-4'}`}>
        <div className="text-xs text-gray-500 mb-1">
          <strong>{c.CreatedBy}</strong> • {new Date(c.CreatedAt).toLocaleString()}
        </div>
        <div className="text-gray-700 mb-2">{c.Description}</div>
        <div className="flex gap-2 text-xs">
          <button onClick={() => { setReplyTo(comments.indexOf(c)); setShowReplyDialog(true); setReplyText(''); setReplyError('') }} className="text-blue-600 hover:underline">Reply</button>
          {c.replies && c.replies.length > 0 && (
            <button onClick={() => setCollapsed({ ...collapsed, [c.CommentId]: !collapsed[c.CommentId] })} className="text-gray-600 hover:underline">
              {collapsed[c.CommentId] ? `Show replies (${c.replies.length})` : `Collapse replies (${c.replies.length})`}
            </button>
          )}
        </div>
        {c.replies && c.replies.length > 0 && !collapsed[c.CommentId] && (
          <div className="mt-2">
            {renderCommentThread(c.replies, depth + 1)}
          </div>
        )}
      </div>
    ))
  }

  if (loading) return <div className="p-8 text-gray-600">Loading…</div>
  if (error) return <div className="p-8 text-red-700">{error}</div>
  if (!property) return <div className="p-8 text-gray-600">No details found.</div>

  const handleDeleteProperty = async () => {
    if (!window.confirm('Are you sure you want to delete this property? This action cannot be undone.')) {
      return
    }

    try {
      setIsDeleting(true)
      
      // Apaga todas as fotos primeiro (exceto a firstPhoto que está no objeto principal)
      if (pictures.length > 0) {
        await Ads.deleteAllPictures(id)
      }
      
      // Apaga o anúncio
      await Ads.delete(id)
      
      // Redireciona para a página principal e força refresh
      navigate('/', { replace: true })
      window.location.reload()
    } catch (err) {
      alert('Failed to delete property: ' + err.message)
      setIsDeleting(false)
    }
  }

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
      
      // Notifica o componente pai para atualizar a tabela
      if (onUpdate) {
        onUpdate(updatedAd)
      }
    } catch (err) {
      alert('Failed to update status: ' + err.message)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-blue-700 border-b shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center">
          <Link to="/" className="text-xl sm:text-2xl font-semibold text-white hover:text-blue-100 transition-colors">
            Housing Manager
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
            <div className="mb-6">
              <div className="relative w-full h-96 bg-gray-100 rounded overflow-hidden cursor-pointer" onClick={() => setIsExpanded(true)}>
                <img 
                  src={sortedPictures[currentImageIndex].PictureUrl} 
                  alt={`Property ${currentImageIndex + 1}`} 
                  className="w-full h-full object-contain"
                />
                {sortedPictures.length > 1 && (
                  <>
                    <button
                      onClick={(e) => { e.stopPropagation(); setCurrentImageIndex((prev) => (prev > 0 ? prev - 1 : sortedPictures.length - 1)) }}
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setCurrentImageIndex((prev) => (prev < sortedPictures.length - 1 ? prev + 1 : 0)) }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteCurrentPicture() }}
                  disabled={deletingPictureId !== null || sortedPictures[currentImageIndex]?.isFirstPhoto}
                  className="absolute top-2 right-2 bg-red-600 text-white p-2 rounded-full hover:bg-red-700 disabled:opacity-50"
                  title={sortedPictures[currentImageIndex]?.isFirstPhoto ? "Cannot delete main photo" : "Delete current picture"}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </button>
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                  {currentImageIndex + 1} / {sortedPictures.length}
                </div>
              </div>
            </div>
          )}

          <ul className="space-y-2">
            <li><strong>ID:</strong> {property.id}</li>
            <li><strong>Location:</strong> {property.location}</li>
            <li><strong>Price:</strong> € {property.price?.toLocaleString?.('nl-NL') || property.price}</li>
            <li><strong>Area:</strong> {property.space} m²</li>
            <li><strong>Land:</strong> {property.terrain} m²</li>
            <li><strong>Bedrooms:</strong> {property.rooms}</li>
            <li><strong>Energy Class:</strong> {property.energyClass}</li>
            <li>
              <strong>Link:</strong>
              {property.link ? (
                <a 
                  href={property.link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="ml-2 inline-flex items-center gap-1 px-3 py-1 rounded bg-blue-600 text-white text-sm hover:bg-blue-700 transition-colors"
                >
                  View Original
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              ) : (
                <span className="ml-2 text-gray-500">-</span>
              )}
            </li>
            <li>
              <strong>Status:</strong> {editingStatus ? (
                <div className="mt-2 flex flex-col gap-2">
                  <div className="flex gap-2 mb-2">
                    {statusTags.map(tag => (
                      <button
                        key={tag}
                        type="button"
                        className={`px-2 py-1 rounded border ${statusValue === tag ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
                        onClick={() => setStatusValue(tag)}
                      >{tag}</button>
                    ))}
                  </div>
                  <input
                    type="text"
                    className="border rounded px-2 py-1 w-full"
                    placeholder="Custom status..."
                    value={statusValue}
                    onChange={e => setStatusValue(e.target.value)}
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-800"
                      onClick={handleStatusSave}
                    >Save</button>
                    <button
                      className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300"
                      onClick={() => { setEditingStatus(false); setStatusValue(property.Status || property.status || '') }}
                    >Cancel</button>
                  </div>
                </div>
              ) : (
                <span className="ml-2">{property.Status || property.status || '-'}</span>
              )}
              {!editingStatus && (
                <button
                  className="ml-4 px-2 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 text-xs"
                  onClick={() => setEditingStatus(true)}
                >Edit</button>
              )}
            </li>
            <li><strong>Description:</strong> {property.description ?? '-'}</li>
          </ul>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mt-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-blue-700">Comments</h3>
            <button onClick={() => setShowDialog(true)} className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-xl font-bold hover:bg-blue-800">+</button>
          </div>
          {threadedComments.length === 0 ? (
            <div className="text-gray-500">No comments yet.</div>
          ) : (
            renderCommentThread(threadedComments)
          )}
        </div>

        {showDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm">
              <h4 className="text-lg font-bold mb-4 text-blue-700">New comment</h4>
              <textarea
                ref={newCommentRef}
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                rows={4}
                className="w-full border rounded p-2 mb-2"
                placeholder="Write your comment..."
              />
              {commentError && <div className="text-red-600 text-sm mb-2">{commentError}</div>}
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowDialog(false)} className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300">Cancel</button>
                <button onClick={async () => {
                  if (!newComment.trim()) {
                    setCommentError('Comment cannot be empty')
                    return
                  }
                  try {
                    const commentObj = { adId: id, createdBy: user, description: newComment.trim() }
                    await Ads.addComment(id, commentObj)
                    const updated = await Ads.getComments(id)
                    setComments(Array.isArray(updated) ? updated : [])
                    setNewComment('')
                    setShowDialog(false)
                    setCommentError('')
                  } catch (err) {
                    setCommentError('Failed to add comment: ' + err.message)
                  }
                }} className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-800">Save</button>
              </div>
            </div>
          </div>
        )}

        {showReplyDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm">
              <h4 className="text-lg font-bold mb-4 text-blue-700">Reply to comment</h4>
              <textarea value={replyText} onChange={e => setReplyText(e.target.value)} rows={4} className="w-full border rounded p-2 mb-2" placeholder="Write your reply..." />
              {replyError && <div className="text-red-600 text-sm mb-2">{replyError}</div>}
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowReplyDialog(false)} className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300">Cancel</button>
                <button onClick={async () => {
                  if (!replyText.trim()) {
                    setReplyError('Reply cannot be empty')
                    return
                  }
                  try {
                    const parentCommentId = comments[replyTo]?.CommentId
                    const replyObj = { adId: id, createdBy: user, description: replyText.trim() }
                    if (parentCommentId) replyObj.parentCommentId = parentCommentId
                    await Ads.addComment(id, replyObj)
                    const updated = await Ads.getComments(id)
                    setComments(Array.isArray(updated) ? updated : [])
                    setReplyText('')
                    setShowReplyDialog(false)
                    setReplyError('')
                  } catch (err) {
                    setReplyError('Failed to add reply: ' + err.message)
                  }
                }} className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-800">Save reply</button>
              </div>
            </div>
          </div>
        )}

        {isExpanded && (
          <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
            <button
              onClick={() => setIsExpanded(false)}
              className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 text-white p-2 rounded-full z-10"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <button
              onClick={handleDeleteCurrentPicture}
              disabled={deletingPictureId !== null || sortedPictures[currentImageIndex]?.isFirstPhoto}
              className="absolute top-4 right-16 bg-red-600/80 hover:bg-red-700/90 text-white p-2 rounded-full z-10 disabled:opacity-50"
              title={sortedPictures[currentImageIndex]?.isFirstPhoto ? "Cannot delete main photo" : "Delete current picture"}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </button>
            <img 
              src={sortedPictures[currentImageIndex].PictureUrl} 
              alt={`Property ${currentImageIndex + 1}`} 
              className="max-w-full max-h-full object-contain"
            />
            {sortedPictures.length > 1 && (
              <>
                <button
                  onClick={() => setCurrentImageIndex((prev) => (prev > 0 ? prev - 1 : sortedPictures.length - 1))}
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white p-3 rounded-full"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={() => setCurrentImageIndex((prev) => (prev < sortedPictures.length - 1 ? prev + 1 : 0))}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white p-3 rounded-full"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            )}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/20 text-white px-4 py-2 rounded-full text-lg">
              {currentImageIndex + 1} / {sortedPictures.length}
            </div>
          </div>
        )}

        <Link to="/" className="fixed left-8 bottom-8 px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-800 shadow-lg">Back</Link>
      </main>

      <footer className="py-8 text-center text-sm text-gray-500">&copy; {new Date().getFullYear()} Housing Manager</footer>
    </div>
  )
}
