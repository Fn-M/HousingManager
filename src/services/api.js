import axios from 'axios'

const PROD_BASE_URL = import.meta.env.VITE_API_BASE_URL
const API_KEY = import.meta.env.VITE_API_KEY

console.log('🔍 API Configuration:')
console.log('- Base URL:', PROD_BASE_URL)
console.log('- API Key:', API_KEY ? '✅ Set' : '❌ Missing')
console.log('- Environment:', import.meta.env.DEV ? 'Development' : 'Production')

// In dev, use the Vite proxy to bypass CORS; in prod, hit the real URL
const baseURL = import.meta.env.DEV ? '/api' : PROD_BASE_URL

export const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': API_KEY,
  },
})

// Log all requests
api.interceptors.request.use(
  (config) => {
    console.log('📤 Request:', config.method?.toUpperCase(), config.url)
    return config
  },
  (err) => {
    console.error('❌ Request Error:', err)
    return Promise.reject(err)
  }
)

// Log failed responses
api.interceptors.response.use(
  (res) => {
    console.log('📥 Response:', res.status, res.config.url)
    return res
  },
  (err) => {
    console.error('❌ API Error:', {
      status: err.response?.status,
      statusText: err.response?.statusText,
      data: err.response?.data,
      headers: err.response?.headers,
      url: err.config?.url,
      method: err.config?.method,
    })
    return Promise.reject(err)
  }
)

function parseBody(data) {
  if (Array.isArray(data)) return data
  if (data == null) return []
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
    
    let data = res.data
    if (typeof data.body === 'string') {
      try {
        data = JSON.parse(data.body)
      } catch (err) {
        console.error('Failed to parse response body:', err)
      }
    }
    
    if (Array.isArray(data)) {
      const found = data.find(item => String(item.FundaId) === String(id))
      if (!found) {
        throw new Error(`Property with ID ${id} not found`)
      }
      data = found
    }
    
    return normalize(data)
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
      .filter(pic => !pic.isFirstPhoto)
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
