import axios from 'axios'

export async function searchDocuments(params) {
  const res = await axios.post('/search', params)
  return res.data
}

export async function fetchOTX(params) {
  const res = await axios.post('/fetch/otx', params)
  return res.data
}

export async function fetchVirusTotal(params) {
  const res = await axios.post('/fetch/virustotal', params)
  return res.data
}

export async function fetchUrlhaus(params) {
  const res = await axios.post('/fetch/urlhaus', params)
  return res.data
}

export async function fetchThreatFox(params) {
  const res = await axios.post('/fetch/threatfox', params)
  return res.data
}

export async function fetchMalwareBazaar(params) {
  const res = await axios.post('/fetch/malwarebazaar', params)
  return res.data
}

export async function fetchFeodo(params) {
  const res = await axios.post('/fetch/feodotracker', params)
  return res.data
}

export async function fetchCisaKev(params) {
  const res = await axios.post('/fetch/cisa-kev', params)
  return res.data
}

export async function fetchCertFr(params) {
  const res = await axios.post('/fetch/cert-fr', params)
  return res.data
}

export async function fetchNvd(params) {
  const res = await axios.post('/fetch/nvd', params)
  return res.data
}

export async function fetchRssNews(params) {
  const res = await axios.post('/fetch/rss-news', params)
  return res.data
}

export async function fetchConfig() {
  const res = await axios.get('/config')
  return res.data
}

export async function enrichIndicator(type, value) {
  const res = await axios.get(`/enrich/${type}/${encodeURIComponent(value)}`)
  return res.data
}

export async function deleteDocuments(params) {
  const res = await axios.delete('/documents', { data: params })
  return res.data
}
