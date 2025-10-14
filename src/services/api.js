import axios from 'axios'

const PROD_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://byyagzyd94.execute-api.eu-west-1.amazonaws.com/prod'
const API_KEY = import.meta.env.VITE_API_KEY || 'b61nzR5XEC2oGImwKSAwr1P74QNFz9xz3RMJniOc'

// In dev, use the Vite proxy to bypass CORS; in prod, hit the real URL
const baseURL = import.meta.env.DEV ? '/api' : PROD_BASE_URL

export const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': API_KEY,
  },
})

// Log all outgoing requests (redact API key)
api.interceptors.request.use((config) => {
  const redactedHeaders = { ...config.headers }
  const key = redactedHeaders?.['x-api-key'] || redactedHeaders?.common?.['x-api-key']
  if (key) {
    const str = String(key)
    const last4 = str.slice(-4)
    if (redactedHeaders['x-api-key']) redactedHeaders['x-api-key'] = `***${last4}`
    if (redactedHeaders.common && redactedHeaders.common['x-api-key']) redactedHeaders.common['x-api-key'] = `***${last4}`
  }
  return config
})

// Log failed responses
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const res = err.response
    console.warn('[API Error]', {
      method: err.config?.method?.toUpperCase(),
      url: (err.config?.baseURL || '') + (err.config?.url || ''),
      status: res?.status,
      statusText: res?.statusText,
      data: res?.data,
    })
    return Promise.reject(err)
  }
)

function parseBody(data) {
  if (Array.isArray(data)) return data
  if (data == null) return []
  // API Gateway often wraps payload in { body: "...json..." }
  const body = typeof data === 'string' ? data : data.body
  if (typeof body === 'string') {
    try { return JSON.parse(body) } catch { return [] }
  }
  if (Array.isArray(data.items)) return data.items
  return []
}

function normalize(item) {
  if (!item || typeof item !== 'object') return null
  return {
    id: (item.FundaId ?? item.id ?? '').toString(),
    link: item.Url ?? item.link ?? '',
    name: item.Address ?? item.name ?? '',
    location: item.PostCode ?? item.location ?? '',
    price: item.Price ?? item.price ?? null,
    space: item.LivingArea ?? item.space ?? null,
    terrain: item.PlotArea ?? item.terrain ?? null,
    rooms: item.Bedrooms ?? item.rooms ?? null,
    energyClass: item.EnergyLabel ?? item.energyClass ?? '',
    firstPhoto: item.Picture ?? item.firstPhoto ?? '',
    description: item.Description ?? item.description ?? '',
    status: item.Status ?? item.status ?? '',
    // Adicione outros campos extras conforme necessário
    ...item
  }
}

export const Ads = {
  list: async () => {
    const res = await api.get('/ads')
    const raw = parseBody(res.data)
    return raw.map(normalize).filter(Boolean)
  },

  get: async (id) => {
    const res = await api.get(`/ads/${id}`)
    console.log('🔍 RAW API response for GET /ads/${id}:', res.data)
    console.log('🔍 res.data type:', typeof res.data)
    console.log('🔍 res.data.body?:', res.data.body)
    
    // Se a resposta vier wrapped em { body: "{...json...}" }
    let data = res.data
    if (typeof data.body === 'string') {
      try {
        data = JSON.parse(data.body)
        console.log('✅ Parsed body:', data)
      } catch (err) {
        console.error('❌ Failed to parse body:', err)
      }
    }
    
    const normalized = normalize(data)
    console.log('✅ Normalized data:', normalized)
    return normalized
  },

  create: async (ad) => {
    const res = await api.post('/ads', ad)
    return normalize(res.data)
  },

  update: async (id, ad) => {
    const res = await api.put(`/ads/${id}`, ad)
    return normalize(res.data)
  },

  delete: async (id) => {
    const res = await api.delete(`/ads/${id}`, {
      headers: {
        'x-api-key': API_KEY
      }
    })
    return res.data
  },

  getPictures: async (adId) => {
    const res = await api.get(`/ads/${adId}/pictures`)
    return parseBody(res.data)
  },

  deletePicture: async (adId, pictureId) => {
    const res = await api.delete(`/ads/${adId}/pictures/${pictureId}`, {
      headers: {
        'x-api-key': API_KEY
      }
    })
    return res.data
  },

  deleteAllPictures: async (adId) => {
    const pictures = await Ads.getPictures(adId)
    const deletePromises = pictures
      .filter(pic => !pic.isFirstPhoto) // Não apaga a firstPhoto
      .map(pic => Ads.deletePicture(adId, pic.PictureId))
    await Promise.all(deletePromises)
    return true
  },

  getComments: async (adId) => {
    const res = await api.get(`/ads/${adId}/comments`)
    return parseBody(res.data)
  },

  addComment: async (adId, comment) => {
    const res = await api.post(`/ads/${adId}/comments`, comment)
    return res.data
  }
}
