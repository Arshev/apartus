import axios from 'axios'

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'

export async function getAvailability(slug, from, to) {
  const response = await axios.get(`${baseURL}/public/properties/${slug}/availability`, {
    params: { from, to },
  })
  return response.data
}

export async function createBooking(slug, data) {
  const response = await axios.post(`${baseURL}/public/properties/${slug}/bookings`, data)
  return response.data
}
