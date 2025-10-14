import axios from 'axios'

const PROD_BASE_URL = import.meta.env.VITE_API_BASE_URL
const API_KEY = import.meta.env.VITE_API_KEY

const baseURL = import.meta.env.DEV ? '/api' : PROD_BASE_URL

export const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': API_KEY,
  },
})

// Remove error logging
api.interceptors.response.use(
  (res) => res,
  (err) => Promise.reject(err)
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
        // Silent
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
    try {
      await api.delete(`/ads/${id}/comments`)
    } catch (err) {
      // Continue
    }
    
    try {
      await api.delete(`/ads/${id}/pictures`)
    } catch (err) {
      // Continue
    }
    
    await api.delete(`/ads/${id}`)
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
  },

  deleteAllComments: async (adId) => {
    const res = await api.delete(`/ads/${adId}/comments`, {
      headers: {
        'x-api-key': API_KEY
      }
    })
    return res.data
  }
}
