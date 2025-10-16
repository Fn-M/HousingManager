import axios from 'axios'

const PROD_BASE_URL = import.meta.env.VITE_API_BASE_URL
const API_KEY = import.meta.env.VITE_API_KEY

const api = axios.create({
  baseURL: PROD_BASE_URL
})

// Adiciona um interceptor que injeta a API key em cada requisição
api.interceptors.request.use(
  (config) => {
    if (!API_KEY) {
      console.error('VITE_API_KEY is not defined. Please check your .env file and restart the server.')
    }
    config.headers['x-api-key'] = API_KEY
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

function parseBody(data) {
  if (data == null) return null;

  if (Array.isArray(data)) return data;

  if (data.items && Array.isArray(data.items)) return data.items;

  if (data.body && typeof data.body === 'string') {
    try {
      return JSON.parse(data.body);
    } catch {
      return null;
    }
  }
  
  if (typeof data === 'string') {
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  if (typeof data === 'object' && !Array.isArray(data)) {
    return data;
  }

  return null;
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
    viewDate: item.ViewDate ?? item.viewDate ?? null,
    ...item
  }
}

export const Ads = {
  list: async () => {
    const res = await api.get('/ads')
    const raw = parseBody(res.data)
    return Array.isArray(raw) ? raw.map(normalize).filter(Boolean) : []
  },

  get: async (id) => {
    const res = await api.get(`/ads/${id}`)
    
    const rawData = parseBody(res.data)
    
    const item = Array.isArray(rawData) ? rawData[0] : rawData;

    if (!item) {
      throw new Error(`Property with ID ${id} not found`)
    }
    
    return normalize(item)
  },

  create: async (ad) => {
    if (!ad || !ad.FundaId) {
      throw new Error('FundaId is required to create a new property.')
    }
    
    // Constrói o payload correto que o Lambda espera
    const payload = {
      id: ad.FundaId,
      viewDate: ad.viewDate,
      link: ad.url // Adiciona o URL no campo 'link'
    };

    // Envia o payload com a chave "id" em vez de "FundaId"
    const res = await api.post('/ads', payload)
    return parseBody(res.data)
  },

  update: async (id, ad) => {
    const res = await api.put(`/ads/${id}`, ad)
    return parseBody(res.data)
  },

  getPictures: async (id) => {
    const res = await api.get(`/pictures/${id}`)
    return parseBody(res.data)
  },

  deletePicture: async (id, pictureId) => {
    const res = await api.delete(`/pictures/${id}/${pictureId}`)
    return parseBody(res.data)
  },

  setFirstPicture: async (id, pictureId) => {
    const res = await api.put(`/pictures/${id}/${pictureId}`)
    return parseBody(res.data)
  }
}
