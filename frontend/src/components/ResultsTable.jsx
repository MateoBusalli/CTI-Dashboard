import { Table, Tag, Typography, Space, Button, Tooltip, Drawer, Spin, Descriptions } from 'antd'
import { PushpinOutlined, DownloadOutlined, SearchOutlined as EnrichIcon } from '@ant-design/icons'
import { useState } from 'react'
import { enrichIndicator } from '../api'

const { Text } = Typography

function exportCsv(results) {
  const headers = ['score','document_type','title','indicator_type','indicator_value','confidence','source_name','tags']
  const rows = results.map(hit => {
    const s = hit.source || {}
    return [
      hit.score?.toFixed(2) ?? '',
      s.document_type ?? '',
      (s.title ?? '').replace(/,/g, ' '),
      s.indicator_type ?? '',
      s.indicator_value ?? '',
      s.confidence ?? '',
      s.source_name ?? '',
      (s.tags || []).join(';'),
    ]
  })
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `cti-export-${new Date().toISOString().slice(0,10)}.csv`
  a.click()
}

const TYPE_COLORS = {
  report: '#1668dc',
  ioc: '#c0392b',
  alert: '#d68910',
  news: '#1e8449',
  advisory: '#7d3c98',
  other: '#4a5568',
}

function DocTypeTag({ value }) {
  const color = TYPE_COLORS[value] || '#4a5568'
  return (
    <Tag
      style={{
        borderRadius: 2,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: 0.8,
        background: `${color}22`,
        borderColor: `${color}66`,
        color,
        margin: 0,
      }}
    >
      {value?.toUpperCase()}
    </Tag>
  )
}

function Confidence({ value, docType }) {
  // News: confidence is a static per-feed label  not meaningful per article
  if (docType === 'news') {
    return null
  }
  if (value === null || value === undefined) {
    return <Text style={{ color: '#3d5266' }}>N/A</Text>
  }
  // IOC and vulnerability: full traffic-light (per-indicator / CVSS-derived)
  if (docType === 'ioc' || docType === 'vulnerability') {
    const color = value >= 75 ? '#2ecc71' : value >= 40 ? '#f39c12' : '#e74c3c'
    return (
      <Text style={{ color, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
        {value}
      </Text>
    )
  }
  // Report / advisory / other: subdued  source authority estimate, not per-article
  return (
    <Text style={{ color: '#5a6f85', fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
      {value}
    </Text>
  )
}

const columns = [
  {
    title: 'SCORE',
    dataIndex: 'score',
    width: 72,
    sorter: (a, b) => (a.score ?? 0) - (b.score ?? 0),
    render: v => v != null ? (
      <Text style={{ color: '#1668dc', fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
        {v.toFixed(2)}
      </Text>
    ) : null,
  },
  {
    title: 'TYPE',
    dataIndex: ['source', 'document_type'],
    width: 100,
    sorter: (a, b) => (a.source?.document_type || '').localeCompare(b.source?.document_type || ''),
    render: v => <DocTypeTag value={v} />,
  },
  {
    title: 'TITLE / CONTENT',
    dataIndex: ['source', 'title'],
    render: (title, row) => (
      <Space direction="vertical" size={2} style={{ maxWidth: 380 }}>
        <Text style={{ color: '#c4d0e0', fontSize: 13 }}>
          {title || <Text style={{ color: '#3d5266' }}>Untitled</Text>}
        </Text>
        {row.source.content && (
          <Text
            style={{ color: '#5a6f85', fontSize: 11, lineHeight: 1.4 }}
            ellipsis={{ tooltip: row.source.content }}
          >
            {row.source.content.slice(0, 130)}
          </Text>
        )}
      </Space>
    ),
  },
  {
    title: 'INDICATOR',
    width: 240,
    render: (_, row) => {
      const { indicator_type, indicator_value } = row.source
      if (!indicator_value) return null
      return (
        <Space direction="vertical" size={1}>
          <Text style={{ color: '#3d5266', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }}>
            {indicator_type}
          </Text>
          <Text
            copyable
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              color: '#e8a838',
              wordBreak: 'break-all',
            }}
          >
            {indicator_value}
          </Text>
        </Space>
      )
    },
  },  {
    title: 'TAGS',
    dataIndex: ['source', 'tags'],
    width: 180,
    render: tags => (
      <Space size={4} wrap>
        {tags?.map(t => (
          <Tag
            key={t}
            style={{
              borderRadius: 2,
              fontSize: 10,
              margin: 0,
              background: '#0c1d30',
              borderColor: '#1a3550',
              color: '#4a9eff',
            }}
          >
            {t}
          </Tag>
        ))}
      </Space>
    ),
  },
  {
    title: 'CONF.',
    dataIndex: ['source', 'confidence'],
    width: 65,
    sorter: (a, b) => (a.source?.confidence ?? -1) - (b.source?.confidence ?? -1),
    render: (v, row) => <Confidence value={v} docType={row.source?.document_type} />,
  },
  {
    title: 'SOURCE',
    dataIndex: ['source', 'source_name'],
    width: 130,
    sorter: (a, b) => (a.source?.source_name || '').localeCompare(b.source?.source_name || ''),
    render: v => (
      <Text style={{ color: '#5a6f85', fontSize: 12 }}>{v}</Text>
    ),
  },
]

function buildColumns(onPinToBoard, onEnrich) {
  const cols = [...columns]
  if (onEnrich) {
    // Insert enrich button next to indicator column
    cols.push({
      title: '',
      key: 'enrich',
      width: 36,
      render: (_, row) => {
        const { indicator_type, indicator_value } = row.source
        if (!indicator_value || !['ip','domain','url'].includes(indicator_type)) return null
        return (
          <Tooltip title={`Enrich ${indicator_type}`}>
            <Button
              type="text" size="small"
              icon={<EnrichIcon />}
              onClick={() => onEnrich(row)}
              style={{ color: '#3d5266' }}
            />
          </Tooltip>
        )
      },
    })
  }
  if (onPinToBoard) {
    cols.push({
      title: '',
      key: 'pin',
      width: 40,
      render: (_, row) => (
        <Tooltip title="Pin to Investigation Board">
          <Button
            type="text"
            size="small"
            icon={<PushpinOutlined />}
            onClick={() => onPinToBoard(row)}
            style={{ color: '#3d5266' }}
          />
        </Tooltip>
      ),
    })
  }
  return cols
}

export default function ResultsTable({ results, total, loading, onPageChange, onPinToBoard }) {
  const [enrichData, setEnrichData] = useState(null)
  const [enrichLoading, setEnrichLoading] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)

  async function handleEnrich(row) {
    const { indicator_type, indicator_value } = row.source
    setDrawerOpen(true)
    setEnrichLoading(true)
    setEnrichData(null)
    try {
      const data = await enrichIndicator(indicator_type, indicator_value)
      setEnrichData(data)
    } finally {
      setEnrichLoading(false)
    }
  }

  return (
    <>
      {results.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
          <Button
            size="small"
            icon={<DownloadOutlined />}
            onClick={() => exportCsv(results)}
            style={{ color: '#3d5266', borderColor: '#1a2e45' }}
          >
            Export CSV
          </Button>
        </div>
      )}
      <Table
        dataSource={results}
        columns={buildColumns(onPinToBoard, handleEnrich)}
        rowKey="id"
        loading={loading}
        size="small"
        scroll={{ x: 1000 }}
        locale={{ emptyText: 'No results. Run a search above to load intelligence data.' }}
        pagination={{
          total,
          pageSize: 20,
          showSizeChanger: false,
          showTotal: t => (
            <Text style={{ color: '#5a6f85', fontSize: 12 }}>{t} records</Text>
          ),
          onChange: onPageChange,
        }}
      />

      <Drawer
        title={
          <Text style={{ color: '#c4d0e0' }}>
            Enrichment: <span style={{ color: '#e8a838', fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
              {enrichData?.indicator_value}
            </span>
          </Text>
        }
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={440}
        styles={{ body: { background: '#070b10' }, header: { background: '#0b1520', borderColor: '#1a2e45' } }}
      >
        {enrichLoading
          ? <Spin style={{ display: 'block', margin: '40px auto' }} />
          : enrichData && (
            <Descriptions
              column={1}
              size="small"
              styles={{ label: { color: '#3d5266', fontSize: 11 }, content: { color: '#c4d0e0', fontSize: 12, fontFamily: enrichData.indicator_type === 'ip' ? "'JetBrains Mono', monospace" : undefined } }}
            >
              {enrichData.country && <Descriptions.Item label="Country">{enrichData.country} ({enrichData.country_code})</Descriptions.Item>}
              {enrichData.city && <Descriptions.Item label="City">{enrichData.city}</Descriptions.Item>}
              {enrichData.isp && <Descriptions.Item label="ISP">{enrichData.isp}</Descriptions.Item>}
              {enrichData.org && <Descriptions.Item label="Org">{enrichData.org}</Descriptions.Item>}
              {enrichData.asn && <Descriptions.Item label="ASN">{enrichData.asn}</Descriptions.Item>}
              {enrichData.reverse_dns && <Descriptions.Item label="Reverse DNS">{enrichData.reverse_dns}</Descriptions.Item>}
              {enrichData.hostname && <Descriptions.Item label="Hostname">{enrichData.hostname}</Descriptions.Item>}
              {enrichData.dns_a_records?.length > 0 && (
                <Descriptions.Item label="DNS A">
                  {enrichData.dns_a_records.join(', ')}
                </Descriptions.Item>
              )}
              {enrichData.dns_mx_records?.length > 0 && (
                <Descriptions.Item label="DNS MX">
                  {enrichData.dns_mx_records.join(', ')}
                </Descriptions.Item>
              )}
              {enrichData.error && <Descriptions.Item label="Error" style={{ color: '#e74c3c' }}>{enrichData.error}</Descriptions.Item>}
            </Descriptions>
          )
        }
      </Drawer>
    </>
  )
}
