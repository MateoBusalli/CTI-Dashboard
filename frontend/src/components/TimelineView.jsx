import { useEffect, useState } from 'react'
import { Timeline, Tag, Typography, Spin, Empty, Select, Space } from 'antd'
import { ClockCircleOutlined } from '@ant-design/icons'
import { searchDocuments } from '../api'

const { Text } = Typography

const TYPE_COLORS = {
  report:   '#1668dc',
  ioc:      '#e74c3c',
  alert:    '#e67e22',
  news:     '#2ecc71',
  advisory: '#9b59b6',
  other:    '#4a5568',
}

const DOT_COLOR = {
  report:   'blue',
  ioc:      'red',
  alert:    'orange',
  news:     'green',
  advisory: 'purple',
  other:    'gray',
}

function fmt(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function TimelineView() {
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const SIZE = 50

  async function load(p = 1, dtype = typeFilter) {
    setLoading(true)
    try {
      const res = await searchDocuments({
        query: '',
        document_type: dtype || undefined,
        page: p, size: SIZE,
        sort_by: 'ingested_at', sort_order: 'desc',
      })
      setTotal(res.total)
      setDocs(prev => p === 1 ? res.results : [...prev, ...res.results])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(1) }, []) // eslint-disable-line

  function changeFilter(val) {
    setTypeFilter(val)
    setPage(1)
    load(1, val)
  }

  function loadMore() {
    const next = page + 1
    setPage(next)
    load(next)
  }

  const items = docs.map(hit => {
    const s = hit.source
    const color = TYPE_COLORS[s.document_type] || '#4a5568'
    return {
      dot: <ClockCircleOutlined style={{ color }} />,
      children: (
        <div style={{
          background: '#0b1520',
          border: `1px solid ${color}22`,
          borderLeft: `3px solid ${color}`,
          borderRadius: 3,
          padding: '8px 12px',
          marginBottom: 4,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Tag style={{
              background: color + '18', borderColor: color + '44', color,
              fontSize: 9, letterSpacing: 1, fontWeight: 700, borderRadius: 2, margin: 0,
            }}>
              {s.document_type?.toUpperCase()}
            </Tag>
            <Text style={{ color: '#3d5266', fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }}>
              {fmt(s.ingested_at || s.published_at)}
            </Text>
            {s.source_name && (
              <Text style={{ color: '#2e4a62', fontSize: 10 }}>{s.source_name}</Text>
            )}
          </div>
          <Text style={{ color: '#c4d0e0', fontSize: 13, fontWeight: 500, display: 'block' }}>
            {s.title || s.indicator_value || 'Untitled'}
          </Text>
          {s.indicator_value && (
            <Text style={{ color: '#e8a838', fontSize: 11, fontFamily: "'JetBrains Mono', monospace", display: 'block', marginTop: 2 }}>
              {s.indicator_type?.toUpperCase()} · {s.indicator_value}
            </Text>
          )}
          {s.content && (
            <Text style={{ color: '#3a5570', fontSize: 11, display: 'block', marginTop: 3, lineHeight: 1.5 }}>
              {s.content.slice(0, 140)}{s.content.length > 140 ? '…' : ''}
            </Text>
          )}
          {(s.tags || []).length > 0 && (
            <Space size={4} style={{ marginTop: 6, flexWrap: 'wrap' }}>
              {s.tags.slice(0, 6).map(t => (
                <Tag key={t} style={{
                  background: '#0c1d30', borderColor: '#1a3550', color: '#3a6a9a',
                  fontSize: 9, borderRadius: 2, margin: 0,
                }}>{t}</Tag>
              ))}
            </Space>
          )}
        </div>
      ),
    }
  })

  return (
    <div style={{ maxWidth: 780, margin: '0 auto', padding: '4px 0 40px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <Text style={{ color: '#3d5266', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' }}>
          Filter type
        </Text>
        <Select
          allowClear
          placeholder="All types"
          style={{ width: 160 }}
          value={typeFilter}
          onChange={changeFilter}
          options={['report','ioc','alert','news','advisory','other'].map(t => ({ value: t, label: t.toUpperCase() }))}
        />
        <Text style={{ color: '#3d5266', fontSize: 11, marginLeft: 'auto', fontFamily: "'JetBrains Mono', monospace" }}>
          {total} records
        </Text>
      </div>

      {loading && docs.length === 0
        ? <Spin style={{ display: 'block', textAlign: 'center', marginTop: 60 }} />
        : docs.length === 0
          ? <Empty description={<Text style={{ color: '#3d5266' }}>No data. Ingest some intelligence first.</Text>} />
          : (
            <>
              <Timeline items={items} />
              {docs.length < total && (
                <div style={{ textAlign: 'center', marginTop: 16 }}>
                  <button
                    onClick={loadMore}
                    disabled={loading}
                    style={{
                      background: '#0b1520', border: '1px solid #1a2e45', color: '#3d5266',
                      padding: '6px 18px', borderRadius: 3, cursor: 'pointer', fontSize: 12,
                    }}
                  >
                    {loading ? 'Loading…' : `Load more (${docs.length}/${total})`}
                  </button>
                </div>
              )}
            </>
          )
      }
    </div>
  )
}
