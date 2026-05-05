import { useState, useEffect, useRef } from 'react'
import { Button, Input, Typography, Tag, Space, Badge, Empty, Tooltip, Select, Alert, Modal, InputNumber, Divider } from 'antd'
import { PlusOutlined, DeleteOutlined, BellOutlined, PlayCircleOutlined, InboxOutlined, CheckCircleOutlined, CloseCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons'
import axios from 'axios'
import { searchDocuments, deleteDocuments } from '../api'

const { Text, Title } = Typography

// ALERTSPANEL
const ALERTS_KEY = 'cti-alerts-v1'
const DOC_TYPES = ['report', 'ioc', 'alert', 'news', 'advisory', 'other']

function loadAlerts() {
  try { return JSON.parse(localStorage.getItem(ALERTS_KEY) || '[]') } catch { return [] }
}
function saveAlerts(alerts) {
  localStorage.setItem(ALERTS_KEY, JSON.stringify(alerts))
}

export function AlertsPanel() {
  const [alerts, setAlerts] = useState(loadAlerts)
  const [name, setName] = useState('')
  const [query, setQuery] = useState('')
  const [docType, setDocType] = useState(null)
  const [running, setRunning] = useState({})
  const [results, setResults] = useState({})

  function persist(updated) {
    setAlerts(updated)
    saveAlerts(updated)
  }

  function addAlert() {
    if (!name.trim()) return
    const alert = {
      id: Date.now().toString(),
      name: name.trim(),
      query: query.trim(),
      document_type: docType || undefined,
      created_at: new Date().toISOString(),
      last_run: null,
      last_count: null,
      new_since: null,
    }
    persist([...alerts, alert])
    setName('')
    setQuery('')
    setDocType(null)
  }

  function deleteAlert(id) {
    persist(alerts.filter(a => a.id !== id))
    const { [id]: _, ...rest } = results
    setResults(rest)
  }

  async function runAlert(alert) {
    setRunning(r => ({ ...r, [alert.id]: true }))
    try {
      const res = await searchDocuments({
        query: alert.query || '',
        document_type: alert.document_type || undefined,
        page: 1, size: 20,
        sort_by: 'ingested_at', sort_order: 'desc',
      })
      const newCount = res.total
      const prevCount = alert.last_count ?? newCount
      const diff = Math.max(0, newCount - prevCount)
      const updated = alerts.map(a =>
        a.id === alert.id
          ? { ...a, last_run: new Date().toISOString(), last_count: newCount, new_since: diff }
          : a
      )
      persist(updated)
      setResults(r => ({ ...r, [alert.id]: res.results.slice(0, 5) }))
    } finally {
      setRunning(r => ({ ...r, [alert.id]: false }))
    }
  }

  useEffect(() => {
    alerts.forEach(a => runAlert(a))
  }, []) // eslint-disable-line

  function fmtDate(iso) {
    if (!iso) return 'never'
    return new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div style={{ maxWidth: 820, margin: '0 auto' }}>
      <Title level={5} style={{ color: '#c4d0e0', marginBottom: 4 }}>Alert Rules</Title>
      <Text style={{ color: '#3d5266', fontSize: 12, display: 'block', marginBottom: 20 }}>
        Saved searches that auto-run and highlight new results since last check.
      </Text>

      <div style={{
        background: '#060a0f', border: '1px solid #1a2e45', borderRadius: 3,
        padding: '16px', marginBottom: 24,
      }}>
        <Text style={{ color: '#3d5266', fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', display: 'block', marginBottom: 10 }}>
          New Alert
        </Text>
        <Space wrap>
          <Input
            placeholder="Alert name"
            value={name}
            onChange={e => setName(e.target.value)}
            style={{ width: 200 }}
          />
          <Input
            placeholder="Search query (or leave empty)"
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{ width: 260 }}
          />
          <Select
            allowClear
            placeholder="Doc type (optional)"
            style={{ width: 160 }}
            value={docType}
            onChange={setDocType}
            options={DOC_TYPES.map(t => ({ value: t, label: t.toUpperCase() }))}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={addAlert} disabled={!name.trim()}>
            Add
          </Button>
        </Space>
      </div>

      {alerts.length === 0
        ? <Empty description={<Text style={{ color: '#3d5266' }}>No alert rules. Create one above.</Text>} />
        : alerts.map(alert => {
          const isNew = alert.new_since > 0
          const hits = results[alert.id] || []
          return (
            <div key={alert.id} style={{
              background: '#0b1520',
              border: `1px solid ${isNew ? '#e67e2244' : '#192840'}`,
              borderLeft: `3px solid ${isNew ? '#e67e22' : '#1668dc'}`,
              borderRadius: 3,
              padding: '12px 14px',
              marginBottom: 12,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <BellOutlined style={{ color: isNew ? '#e67e22' : '#3d5266' }} />
                <Text style={{ color: '#c4d0e0', fontWeight: 600, fontSize: 13 }}>{alert.name}</Text>
                {alert.query && (
                  <Tag style={{ background: '#0c1d30', borderColor: '#1a3550', color: '#4a9eff', fontSize: 10 }}>
                    "{alert.query}"
                  </Tag>
                )}
                {alert.document_type && (
                  <Tag style={{ background: '#0c1d30', borderColor: '#1a3550', color: '#3d5266', fontSize: 10 }}>
                    {alert.document_type.toUpperCase()}
                  </Tag>
                )}
                {isNew && (
                  <Badge count={alert.new_since} style={{ backgroundColor: '#e67e22' }} />
                )}
                <div style={{ flex: 1 }} />
                <Text style={{ color: '#3d5266', fontSize: 10 }}>
                  Last run: {fmtDate(alert.last_run)}
                </Text>
                <Text style={{ color: '#3d5266', fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }}>
                  {alert.last_count != null ? `${alert.last_count} records` : 'no runs yet'}
                </Text>
                <Tooltip title="Run now">
                  <Button
                    size="small"
                    icon={<PlayCircleOutlined />}
                    loading={running[alert.id]}
                    onClick={() => runAlert(alert)}
                    style={{ color: '#3d5266', borderColor: '#1a2e45' }}
                  />
                </Tooltip>
                <Tooltip title="Delete">
                  <Button size="small" danger icon={<DeleteOutlined />} onClick={() => deleteAlert(alert.id)} />
                </Tooltip>
              </div>
              {hits.length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {hits.map(hit => (
                    <div key={hit.id} style={{
                      background: '#070b10', border: '1px solid #1a2e45', borderRadius: 3,
                      padding: '4px 8px', fontSize: 11, maxWidth: 300,
                    }}>
                      <Text style={{ color: '#c4d0e0', fontSize: 11 }} ellipsis>
                        {hit.source?.title || hit.source?.indicator_value || 'Untitled'}
                      </Text>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })
      }
    </div>
  )
}

// BULKINGESTPANEL
function parseCsv(text) {
  const lines = text.trim().split('\n')
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''))
    const obj = {}
    headers.forEach((h, i) => { if (values[i] !== undefined) obj[h] = values[i] })
    return obj
  }).filter(d => d.content || d.indicator_value)
}

async function ingestDocuments(docs) {
  const safe = docs.map(d => ({
    content: d.content || d.indicator_value || d.title || '',
    source_name: d.source_name || 'Bulk Import',
    document_type: d.document_type || 'other',
    title: d.title || undefined,
    indicator_type: d.indicator_type || undefined,
    indicator_value: d.indicator_value || undefined,
    confidence: d.confidence != null ? parseInt(d.confidence, 10) : undefined,
    tags: Array.isArray(d.tags) ? d.tags : (d.tags ? d.tags.split(';').map(t => t.trim()).filter(Boolean) : []),
  }))
  const res = await axios.post('/ingest', { documents: safe })
  return res.data
}

export function BulkIngestPanel() {
  const [dragOver, setDragOver] = useState(false)
  const [status, setStatus] = useState(null)
  const [result, setResult] = useState(null)
  const [preview, setPreview] = useState(null)
  const [error, setError] = useState(null)
  const fileRef = useRef()

  async function handleFile(file) {
    setStatus('parsing')
    setError(null)
    setResult(null)
    setPreview(null)
    try {
      const text = await file.text()
      let docs = []
      if (file.name.endsWith('.csv')) {
        docs = parseCsv(text)
      } else {
        const parsed = JSON.parse(text)
        docs = Array.isArray(parsed) ? parsed : (parsed.documents || [parsed])
      }
      if (!docs.length) throw new Error('No valid documents found in file')
      setPreview({ count: docs.length, types: [...new Set(docs.map(d => d.document_type || 'other'))] })
      setStatus('ingesting')
      const data = await ingestDocuments(docs)
      setResult(data)
      setStatus('done')
    } catch (e) {
      setError(e?.response?.data?.detail ? JSON.stringify(e.response.data.detail) : e.message)
      setStatus('error')
    }
  }

  function onDrop(e) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function reset() {
    setStatus(null)
    setResult(null)
    setPreview(null)
    setError(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <Title level={5} style={{ color: '#c4d0e0', marginBottom: 4 }}>Bulk Ingest</Title>
      <Text style={{ color: '#3d5266', fontSize: 12, display: 'block', marginBottom: 20 }}>
        Drop a <code style={{ color: '#e8a838' }}>.json</code> (array of docs) or <code style={{ color: '#e8a838' }}>.csv</code> file.
        CSV must have headers: <code style={{ color: '#4a9eff', fontSize: 11 }}>content, source_name, document_type, title, indicator_type, indicator_value, confidence, tags</code>
      </Text>

      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => fileRef.current?.click()}
        style={{
          border: `2px dashed ${dragOver ? '#1668dc' : '#1a2e45'}`,
          borderRadius: 6,
          padding: '40px 20px',
          textAlign: 'center',
          cursor: 'pointer',
          background: dragOver ? '#0c1d30' : '#070b10',
          transition: 'all 0.15s',
          marginBottom: 20,
        }}
      >
        <InboxOutlined style={{ fontSize: 36, color: dragOver ? '#1668dc' : '#3d5266', display: 'block', marginBottom: 10 }} />
        <Text style={{ color: '#5a6f85', fontSize: 13 }}>
          Drag & drop a JSON or CSV file here, or <span style={{ color: '#1668dc' }}>click to browse</span>
        </Text>
        <input
          ref={fileRef}
          type="file"
          accept=".json,.csv"
          style={{ display: 'none' }}
          onChange={e => { if (e.target.files[0]) handleFile(e.target.files[0]) }}
        />
      </div>

      {status === 'parsing' && (
        <Alert message="Parsing file…" type="info" showIcon style={{ marginBottom: 12 }} />
      )}
      {status === 'ingesting' && preview && (
        <Alert
          message={`Ingesting ${preview.count} documents…`}
          description={<Space>{preview.types.map(t => <Tag key={t}>{t}</Tag>)}</Space>}
          type="info" showIcon style={{ marginBottom: 12 }}
        />
      )}
      {status === 'done' && result && (
        <Alert
          icon={<CheckCircleOutlined />}
          type="success"
          message={`Done  ${result.indexed} indexed, ${result.saved_to_store} saved`}
          description={result.errors?.length ? `Warnings: ${result.errors.slice(0, 3).join('; ')}` : undefined}
          showIcon
          style={{ marginBottom: 12 }}
          action={<Button size="small" onClick={reset}>Import another</Button>}
        />
      )}
      {status === 'error' && (
        <Alert
          icon={<CloseCircleOutlined />}
          type="error"
          message="Import failed"
          description={error}
          showIcon
          style={{ marginBottom: 12 }}
          action={<Button size="small" onClick={reset}>Try again</Button>}
        />
      )}

      <div style={{ marginTop: 24, background: '#060a0f', border: '1px solid #1a2e45', borderRadius: 3, padding: '14px 16px' }}>
        <Text style={{ color: '#3d5266', fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
          JSON format example
        </Text>
        <pre style={{ color: '#5a7a9a', fontSize: 10, margin: 0, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.7 }}>
{`[
  {
    "document_type": "ioc",
    "content": "Malicious IP observed in honeypot",
    "source_name": "My Feed",
    "indicator_type": "ip",
    "indicator_value": "192.0.2.1",
    "confidence": 85,
    "tags": ["ransomware", "c2"]
  }
]`}
        </pre>
      </div>
    </div>
  )
}

// DELETEPANEL
const DELETE_TYPES = ['ioc', 'report', 'alert', 'news', 'advisory', 'other']

export function DeletePanel() {
  const [docType, setDocType] = useState(null)
  const [mode, setMode] = useState('all')
  const [n, setN] = useState(100)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  function buildLabel() {
    const scope = docType ? docType.toUpperCase() : 'ALL'
    if (mode === 'last_n') return `last ${n} ${scope} documents`
    return `all ${scope} documents`
  }

  async function doDelete() {
    setConfirmOpen(false)
    setLoading(true)
    setResult(null)
    try {
      const res = await deleteDocuments({
        document_type: docType || undefined,
        mode,
        n: mode === 'last_n' ? n : undefined,
      })
      setResult({ success: true, deleted: res.deleted })
    } catch (e) {
      setResult({ success: false, error: e?.response?.data?.detail || e.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <Title level={5} style={{ color: '#e74c3c', marginBottom: 4 }}>Delete Documents</Title>
      <Text style={{ color: '#3d5266', fontSize: 12, display: 'block', marginBottom: 20 }}>
        Remove documents from the index. Useful to clean duplicates ingested before deduplication was active, or to reset a source.
      </Text>

      <div style={{
        background: '#0d0608', border: '1px solid #3a1515', borderRadius: 3,
        padding: '20px', marginBottom: 20,
      }}>
        <Space wrap size={12} align="end">
          <div>
            <Text style={{ color: '#3d5266', fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
              Document type
            </Text>
            <Select
              allowClear
              placeholder="All types"
              style={{ width: 160 }}
              value={docType}
              onChange={setDocType}
              options={DELETE_TYPES.map(t => ({ value: t, label: t.toUpperCase() }))}
            />
          </div>

          <div>
            <Text style={{ color: '#3d5266', fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
              Mode
            </Text>
            <Select
              style={{ width: 160 }}
              value={mode}
              onChange={setMode}
              options={[
                { value: 'all',    label: 'Delete all' },
                { value: 'last_n', label: 'Delete last N' },
              ]}
            />
          </div>

          {mode === 'last_n' && (
            <div>
              <Text style={{ color: '#3d5266', fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                Count (N)
              </Text>
              <InputNumber
                min={1}
                max={10000}
                value={n}
                onChange={val => setN(val)}
                style={{ width: 120 }}
              />
            </div>
          )}

          <Button
            danger
            icon={<DeleteOutlined />}
            loading={loading}
            onClick={() => setConfirmOpen(true)}
            style={{ marginBottom: 1 }}
          >
            Delete {buildLabel()}
          </Button>
        </Space>
      </div>

      <Modal
        open={confirmOpen}
        onCancel={() => setConfirmOpen(false)}
        onOk={doDelete}
        okText="Delete"
        okButtonProps={{ danger: true }}
        cancelText="Cancel"
        title={
          <span style={{ color: '#e74c3c' }}>
            <ExclamationCircleOutlined style={{ marginRight: 8 }} />
            Confirm deletion
          </span>
        }
      >
        <p style={{ color: '#c4d0e0' }}>
          This will permanently delete{' '}
          <strong style={{ color: '#e74c3c' }}>{buildLabel()}</strong>{' '}
          from the index. This cannot be undone.
        </p>
      </Modal>

      {result?.success && (
        <Alert
          icon={<CheckCircleOutlined />}
          type="success"
          message={`${result.deleted} document${result.deleted !== 1 ? 's' : ''} deleted`}
          showIcon
          closable
          onClose={() => setResult(null)}
        />
      )}
      {result?.success === false && (
        <Alert
          icon={<CloseCircleOutlined />}
          type="error"
          message="Deletion failed"
          description={result.error}
          showIcon
          closable
          onClose={() => setResult(null)}
        />
      )}
    </div>
  )
}
