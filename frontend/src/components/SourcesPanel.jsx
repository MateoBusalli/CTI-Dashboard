import { useState, useEffect } from 'react'
import {
  Input,
  InputNumber,
  Button,
  Space,
  Typography,
  Alert,
  Divider,
  Statistic,
  Row,
  Col,
  Select,
  Tag,
} from 'antd'
import { CloudDownloadOutlined, CheckCircleOutlined, PlusOutlined, CloseOutlined } from '@ant-design/icons'
import { fetchOTX, fetchVirusTotal, fetchUrlhaus, fetchThreatFox, fetchMalwareBazaar, fetchFeodo, fetchConfig, fetchCisaKev, fetchCertFr, fetchNvd, fetchRssNews } from '../api'

const { Text, Title } = Typography

const INDICATOR_TYPES = ['ip', 'domain', 'url', 'hash', 'email']

function useAbuseChKey() {
  const [envKeyConfigured, setEnvKeyConfigured] = useState(false)
  useEffect(() => {
    fetchConfig().then(cfg => setEnvKeyConfigured(cfg.abuse_ch_key_configured)).catch(() => {})
  }, [])
  return envKeyConfigured
}

const DOT_COLORS = {
  otx: '#e8a838',
  virustotal: '#1668dc',
}

function FetchResult({ result }) {
  if (!result) return null
  return (
    <>
      <Divider style={{ borderColor: '#1a2e45', margin: '16px 0' }} />
      <Row gutter={16}>
        <Col>
          <Statistic
            title={<Text style={{ color: '#5a6f85', fontSize: 11 }}>Fetched</Text>}
            value={result.fetched}
            valueStyle={{ color: '#c4d0e0', fontSize: 20, fontFamily: "'JetBrains Mono', monospace" }}
          />
        </Col>
        <Col>
          <Statistic
            title={<Text style={{ color: '#5a6f85', fontSize: 11 }}>Indexed</Text>}
            value={result.indexed}
            valueStyle={{ color: '#2ecc71', fontSize: 20, fontFamily: "'JetBrains Mono', monospace" }}
            prefix={<CheckCircleOutlined style={{ fontSize: 13, marginRight: 4 }} />}
          />
        </Col>
        {result.errors?.length > 0 && (
          <Col>
            <Statistic
              title={<Text style={{ color: '#5a6f85', fontSize: 11 }}>Errors</Text>}
              value={result.errors.length}
              valueStyle={{ color: '#e74c3c', fontSize: 20, fontFamily: "'JetBrains Mono', monospace" }}
            />
          </Col>
        )}
      </Row>
    </>
  )
}

function SourceCard({ color, title, subtitle, children }) {
  return (
    <div
      style={{
        background: '#0d1520',
        border: '1px solid #1a2e45',
        borderRadius: 3,
        padding: 16,
        marginBottom: 12,
      }}
    >
      <Space align="center" style={{ marginBottom: 14 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
        <Text style={{ color: '#c4d0e0', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', fontSize: 12 }}>
          {title}
        </Text>
        <Text style={{ color: '#3d5266', fontSize: 11 }}>{subtitle}</Text>
      </Space>
      {children}
    </div>
  )
}

function SectionLabel({ label }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <Text style={{
        color: '#3d5266', fontSize: 9, letterSpacing: 2,
        textTransform: 'uppercase', fontWeight: 700,
        display: 'block', paddingBottom: 5,
        borderBottom: '1px solid #1a2e45',
      }}>
        {label}
      </Text>
    </div>
  )
}

function OTXCard() {
  const [apiKey, setApiKey] = useState('')
  const [limit, setLimit] = useState(50)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  async function handle() {
    setLoading(true); setError(null); setResult(null)
    try {
      setResult(await fetchOTX({ api_key: apiKey || undefined, limit }))
    } catch (e) {
      setError(e?.response?.data?.detail || 'Fetch failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SourceCard color={DOT_COLORS.otx} title="OTX AlienVault" subtitle="otx.alienvault.com">
      <Text style={{ color: '#5a6f85', fontSize: 12, display: 'block', marginBottom: 14 }}>
        Pulls subscribed pulses. Each indicator becomes an IOC document.
        Leave key empty to use <code style={{ color: '#4a9eff', fontSize: 11 }}>.env</code>.
      </Text>
      <Space direction="vertical" size={10} style={{ width: '100%' }}>
        <Input.Password
          placeholder="OTX API key (or use .env)"
          value={apiKey}
          onChange={e => setApiKey(e.target.value)}
          style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}
        />
        <Space>
          <Text style={{ color: '#5a6f85', fontSize: 12 }}>Pulse limit</Text>
          <InputNumber min={1} max={200} value={limit} onChange={setLimit} style={{ width: 80 }} />
        </Space>
        <Button type="primary" icon={<CloudDownloadOutlined />} loading={loading} onClick={handle}>
          Fetch pulses
        </Button>
      </Space>
      {error && <Alert type="error" message={error} style={{ marginTop: 14 }} />}
      <FetchResult result={result} />
    </SourceCard>
  )
}

function VTCard() {
  const [apiKey, setApiKey] = useState('')
  const [indicators, setIndicators] = useState([{ value: '', type: 'ip' }])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  function updateIndicator(index, field, val) {
    const next = [...indicators]
    next[index] = { ...next[index], [field]: val }
    setIndicators(next)
  }

  function addRow() {
    setIndicators([...indicators, { value: '', type: 'ip' }])
  }

  function removeRow(index) {
    setIndicators(indicators.filter((_, i) => i !== index))
  }

  async function handle() {
    const valid = indicators.filter(i => i.value.trim())
    if (!valid.length) { setError('Add at least one indicator.'); return }
    setLoading(true); setError(null); setResult(null)
    try {
      setResult(await fetchVirusTotal({ api_key: apiKey || undefined, indicators: valid }))
    } catch (e) {
      setError(e?.response?.data?.detail || 'Fetch failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SourceCard color={DOT_COLORS.virustotal} title="VirusTotal" subtitle="virustotal.com">
      <Text style={{ color: '#5a6f85', fontSize: 12, display: 'block', marginBottom: 14 }}>
        Looks up indicators (IP, domain, hash, URL) and ingests analysis results.
        Leave key empty to use <code style={{ color: '#4a9eff', fontSize: 11 }}>.env</code>.
      </Text>
      <Space direction="vertical" size={10} style={{ width: '100%' }}>
        <Input.Password
          placeholder="VT API key (or use .env)"
          value={apiKey}
          onChange={e => setApiKey(e.target.value)}
          style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}
        />
        <Space direction="vertical" size={6} style={{ width: '100%' }}>
          {indicators.map((ind, i) => (
            <Space key={i} size={6}>
              <Select
                value={ind.type}
                onChange={v => updateIndicator(i, 'type', v)}
                style={{ width: 90 }}
                options={INDICATOR_TYPES.map(t => ({ value: t, label: t.toUpperCase() }))}
                size="small"
              />
              <Input
                placeholder="Indicator value"
                value={ind.value}
                onChange={e => updateIndicator(i, 'value', e.target.value)}
                style={{ width: 260, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}
                size="small"
              />
              {indicators.length > 1 && (
                <CloseOutlined
                  onClick={() => removeRow(i)}
                  style={{ color: '#3d5266', cursor: 'pointer' }}
                />
              )}
            </Space>
          ))}
        </Space>
        <Space>
          <Button size="small" icon={<PlusOutlined />} onClick={addRow} type="dashed">
            Add indicator
          </Button>
          <Button type="primary" icon={<CloudDownloadOutlined />} loading={loading} onClick={handle}>
            Lookup and ingest
          </Button>
        </Space>
      </Space>
      {error && <Alert type="error" message={error} style={{ marginTop: 14 }} />}
      <FetchResult result={result} />
    </SourceCard>
  )
}

// REUSABLE HOOK FOR SIMPLE SOURCES
function useFetcher(fetchFn) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  async function run(params) {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      setResult(await fetchFn(params))
    } catch (e) {
      setError(e?.response?.data?.detail || 'Fetch failed.')
    } finally {
      setLoading(false)
    }
  }

  return { loading, result, error, run }
}

// URLHAUS
function UrlhausCard({ sharedKey, envKeyConfigured }) {
  const [limit, setLimit] = useState(200)
  const { loading, result, error, run } = useFetcher(fetchUrlhaus)
  const hasKey = envKeyConfigured || sharedKey.trim()

  return (
    <SourceCard color="#f39c12" title="URLhaus" subtitle="malicious URLs">
      <Space direction="vertical" size={6} style={{ width: '100%' }}>
        <InputNumber min={50} max={500} value={limit} onChange={v => setLimit(v)}
          addonBefore="Limit" size="small" style={{ width: '100%' }} />
        <Button type="primary" size="small" block icon={<CloudDownloadOutlined />}
          loading={loading} disabled={!hasKey}
          onClick={() => run({ limit, auth_key: sharedKey.trim() || undefined })}>
          Fetch
        </Button>
      </Space>
      {error && <Alert type="error" message={error} style={{ marginTop: 10 }} />}
      <FetchResult result={result} />
    </SourceCard>
  )
}

// THREATFOX
function ThreatFoxCard({ sharedKey, envKeyConfigured }) {
  const [days, setDays] = useState(3)
  const [limit, setLimit] = useState(200)
  const { loading, result, error, run } = useFetcher(fetchThreatFox)
  const hasKey = envKeyConfigured || sharedKey.trim()

  return (
    <SourceCard color="#e74c3c" title="ThreatFox" subtitle="IOCs + malware family">
      <Space direction="vertical" size={6} style={{ width: '100%' }}>
        <InputNumber min={1} max={7} value={days} onChange={v => setDays(v)}
          addonBefore="Days" size="small" style={{ width: '100%' }} />
        <InputNumber min={50} max={500} value={limit} onChange={v => setLimit(v)}
          addonBefore="Limit" size="small" style={{ width: '100%' }} />
        <Button type="primary" size="small" block icon={<CloudDownloadOutlined />}
          loading={loading} disabled={!hasKey}
          onClick={() => run({ days, limit, auth_key: sharedKey.trim() || undefined })}>
          Fetch
        </Button>
      </Space>
      {error && <Alert type="error" message={error} style={{ marginTop: 10 }} />}
      <FetchResult result={result} />
    </SourceCard>
  )
}

// MALWAREBAZAAR
function MalwareBazaarCard({ sharedKey, envKeyConfigured }) {
  const [limit, setLimit] = useState(100)
  const { loading, result, error, run } = useFetcher(fetchMalwareBazaar)
  const hasKey = envKeyConfigured || sharedKey.trim()

  return (
    <SourceCard color="#9b59b6" title="MalwareBazaar" subtitle="malware hashes">
      <Space direction="vertical" size={6} style={{ width: '100%' }}>
        <InputNumber min={10} max={500} value={limit} onChange={v => setLimit(v)}
          addonBefore="Limit" size="small" style={{ width: '100%' }} />
        <Button type="primary" size="small" block icon={<CloudDownloadOutlined />}
          loading={loading} disabled={!hasKey}
          onClick={() => run({ limit, auth_key: sharedKey.trim() || undefined })}>
          Fetch
        </Button>
      </Space>
      {error && <Alert type="error" message={error} style={{ marginTop: 10 }} />}
      <FetchResult result={result} />
    </SourceCard>
  )
}

// FEODO TRACKER
function FeodoCard() {
  const [limit, setLimit] = useState(300)
  const { loading, result, error, run } = useFetcher(fetchFeodo)

  return (
    <SourceCard color="#1abc9c" title="Feodo Tracker" subtitle="C2 IPs · no key">
      <Space direction="vertical" size={6} style={{ width: '100%' }}>
        <InputNumber min={50} max={500} value={limit} onChange={v => setLimit(v)}
          addonBefore="Limit" size="small" style={{ width: '100%' }} />
        <Button type="primary" size="small" block icon={<CloudDownloadOutlined />}
          loading={loading} onClick={() => run({ limit })}>
          Fetch
        </Button>
      </Space>
      {error && <Alert type="error" message={error} style={{ marginTop: 10 }} />}
      <FetchResult result={result} />
    </SourceCard>
  )
}

// CISA KEV
function CisaKevCard() {
  const [limit, setLimit] = useState(200)
  const { loading, result, error, run } = useFetcher(fetchCisaKev)

  return (
    <SourceCard color="#c0392b" title="CISA KEV" subtitle="cisa.gov · No key required">
      <Text style={{ color: '#5a6f85', fontSize: 12, display: 'block', marginBottom: 10 }}>
        CISA's Known Exploited Vulnerabilities catalog. CVEs actively exploited in the wild (Advisory type).
      </Text>
      <Space>
        <InputNumber
          min={50} max={1000} value={limit} onChange={v => setLimit(v)}
          addonBefore="Limit" size="small" style={{ width: 140 }}
        />
        <Button type="primary" size="small" icon={<CloudDownloadOutlined />} loading={loading} onClick={() => run({ limit })}>
          Fetch
        </Button>
      </Space>
      {error && <Alert type="error" message={error} style={{ marginTop: 14 }} />}
      <FetchResult result={result} />
    </SourceCard>
  )
}

// CERT-FR / ANSSI
function CertFrCard() {
  const [limit, setLimit] = useState(50)
  const [feedType, setFeedType] = useState('alerte')
  const { loading, result, error, run } = useFetcher(fetchCertFr)

  return (
    <SourceCard color="#2980b9" title="CERT-FR / ANSSI" subtitle="cert.ssi.gouv.fr · No key required">
      <Text style={{ color: '#5a6f85', fontSize: 12, display: 'block', marginBottom: 10 }}>
        French national CERT advisories. Security alerts and notices (Advisory type).
      </Text>
      <Space>
        <Select
          value={feedType}
          onChange={setFeedType}
          size="small"
          style={{ width: 120 }}
          options={[
            { value: 'alerte', label: 'Alertes' },
            { value: 'avis', label: 'Avis' },
          ]}
        />
        <InputNumber
          min={10} max={200} value={limit} onChange={v => setLimit(v)}
          addonBefore="Limit" size="small" style={{ width: 140 }}
        />
        <Button type="primary" size="small" icon={<CloudDownloadOutlined />} loading={loading} onClick={() => run({ limit, feed_type: feedType })}>
          Fetch
        </Button>
      </Space>
      {error && <Alert type="error" message={error} style={{ marginTop: 14 }} />}
      <FetchResult result={result} />
    </SourceCard>
  )
}

// NVD / NIST
function NvdCard() {
  const [limit, setLimit] = useState(50)
  const [days, setDays] = useState(7)
  const [apiKey, setApiKey] = useState('')
  const { loading, result, error, run } = useFetcher(fetchNvd)

  return (
    <SourceCard color="#27ae60" title="NVD / NIST" subtitle="nvd.nist.gov · Optional key">
      <Text style={{ color: '#5a6f85', fontSize: 12, display: 'block', marginBottom: 10 }}>
        National Vulnerability Database. Recent CVEs with CVSS scores (Advisory type).
        Optional key for higher rate limits: <a href="https://nvd.nist.gov/developers/request-an-api-key" target="_blank" rel="noreferrer" style={{ color: '#4a9eff' }}>nvd.nist.gov</a>
      </Text>
      <Space direction="vertical" size={8} style={{ width: '100%' }}>
        <Input.Password
          placeholder="NVD API key (optional)"
          value={apiKey}
          onChange={e => setApiKey(e.target.value)}
          size="small"
          style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}
        />
        <Space>
          <InputNumber
            min={1} max={30} value={days} onChange={v => setDays(v)}
            addonBefore="Days" size="small" style={{ width: 120 }}
          />
          <InputNumber
            min={10} max={200} value={limit} onChange={v => setLimit(v)}
            addonBefore="Limit" size="small" style={{ width: 140 }}
          />
          <Button type="primary" size="small" icon={<CloudDownloadOutlined />} loading={loading} onClick={() => run({ limit, days, api_key: apiKey.trim() || undefined })}>
            Fetch
          </Button>
        </Space>
      </Space>
      {error && <Alert type="error" message={error} style={{ marginTop: 14 }} />}
      <FetchResult result={result} />
    </SourceCard>
  )
}

// ABUSE.CH GROUPED SECTION
function AbuseChSection() {
  const envKeyConfigured = useAbuseChKey()
  const [sharedKey, setSharedKey] = useState('')

  return (
    <div style={{ background: '#0a1118', border: '1px solid #1a2e45', borderRadius: 3, padding: '12px 16px', marginBottom: 12 }}>
      <Space align="center" style={{ marginBottom: 10 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f39c12' }} />
        <Text style={{ color: '#c4d0e0', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', fontSize: 12 }}>
          Abuse.ch
        </Text>
        <Text style={{ color: '#3d5266', fontSize: 11 }}>URLhaus · ThreatFox · MalwareBazaar · Feodo</Text>
      </Space>
      <div style={{ marginBottom: 10 }}>
        <Input.Password
          placeholder={envKeyConfigured ? 'Override env key (optional)' : 'Shared Auth-Key for all Abuse.ch sources'}
          value={sharedKey}
          onChange={e => setSharedKey(e.target.value)}
          style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}
        />
        {!envKeyConfigured && (
          <Text style={{ color: '#3d5266', fontSize: 11, display: 'block', marginTop: 4 }}>
            Free key: <a href="https://auth.abuse.ch/" target="_blank" rel="noreferrer" style={{ color: '#4a9eff' }}>auth.abuse.ch</a>
          </Text>
        )}
      </div>
      <Row gutter={[8, 8]}>
        <Col span={12}><UrlhausCard sharedKey={sharedKey} envKeyConfigured={envKeyConfigured} /></Col>
        <Col span={12}><ThreatFoxCard sharedKey={sharedKey} envKeyConfigured={envKeyConfigured} /></Col>
        <Col span={12}><MalwareBazaarCard sharedKey={sharedKey} envKeyConfigured={envKeyConfigured} /></Col>
        <Col span={12}><FeodoCard /></Col>
      </Row>
    </div>
  )
}

// RSS NEWS & REPORTS
const RSS_FEED_OPTIONS = [
  { value: 'bleepingcomputer', label: 'BleepingComputer' },
  { value: 'thehackernews',    label: 'The Hacker News'  },
  { value: 'sans_isc',         label: 'SANS ISC Diary'   },
  { value: 'krebs',            label: 'Krebs on Security'},
  { value: 'securelist',       label: 'Securelist (Kaspersky)' },
]

function RssNewsCard() {
  const [selectedFeeds, setSelectedFeeds] = useState(['bleepingcomputer', 'thehackernews', 'sans_isc'])
  const [limitPerFeed, setLimitPerFeed] = useState(15)
  const { loading, result, error, run } = useFetcher(fetchRssNews)

  return (
    <SourceCard color="#2ecc71" title="RSS News & Reports" subtitle="No key required">
      <Text style={{ color: '#5a6f85', fontSize: 12, display: 'block', marginBottom: 10 }}>
        Security news and analysis from public RSS feeds. Produces <em style={{ color: '#1e8449' }}>news</em> and <em style={{ color: '#1668dc' }}>report</em> type documents.
      </Text>
      <Space direction="vertical" size={8} style={{ width: '100%' }}>
        <Select
          mode="multiple"
          style={{ width: '100%' }}
          value={selectedFeeds}
          onChange={setSelectedFeeds}
          options={RSS_FEED_OPTIONS}
          size="small"
          placeholder="Select feeds"
        />
        <Space>
          <InputNumber
            min={5} max={50} value={limitPerFeed} onChange={v => setLimitPerFeed(v)}
            addonBefore="Per feed" size="small" style={{ width: 150 }}
          />
          <Button
            type="primary" size="small" icon={<CloudDownloadOutlined />}
            loading={loading} disabled={selectedFeeds.length === 0}
            onClick={() => run({ feed_keys: selectedFeeds, limit_per_feed: limitPerFeed })}
          >
            Fetch
          </Button>
        </Space>
      </Space>
      {error && <Alert type="error" message={error} style={{ marginTop: 14 }} />}
      <FetchResult result={result} />
    </SourceCard>
  )
}

export default function SourcesPanel() {
  return (
    <Row gutter={[24, 0]} align="top">
      {/* Left column: IOC / Indicator sources */}
      <Col xs={24} xl={12}>
        <SectionLabel label="IOC & Indicator Intelligence" />
        <OTXCard />
        <VTCard />
        <AbuseChSection />
      </Col>

      {/* Right column: Advisory / News sources */}
      <Col xs={24} xl={12}>
        <SectionLabel label="Advisories & Vulnerabilities" />
        <CisaKevCard />
        <CertFrCard />
        <NvdCard />
        <SectionLabel label="News & Reports" />
        <RssNewsCard />
      </Col>
    </Row>
  )
}
