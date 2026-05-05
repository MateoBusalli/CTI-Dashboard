import { useState } from 'react'
import { Input, Select, Space, Row, Col, Slider, Typography, Alert, Button } from 'antd'
import { SearchOutlined, SortAscendingOutlined, SortDescendingOutlined } from '@ant-design/icons'

const { Text } = Typography

const DOC_TYPES = ['report', 'ioc', 'alert', 'news', 'advisory', 'other']

const INDICATOR_TYPES = ['ip', 'domain', 'url', 'hash', 'email', 'cve']

const SORT_OPTIONS = [
  { value: '_score', label: 'Relevance' },
  { value: 'confidence', label: 'Confidence' },
  { value: 'ingested_at', label: 'Date ingested' },
]

export default function SearchPanel({ onSearch, loading, error }) {
  const [query, setQuery] = useState('')
  const [documentType, setDocumentType] = useState(null)
  const [indicatorType, setIndicatorType] = useState(null)
  const [tags, setTags] = useState([])
  const [confidence, setConfidence] = useState([0, 100])
  const [sortBy, setSortBy] = useState('_score')
  const [sortOrder, setSortOrder] = useState('desc')

  function buildParams(overrides = {}) {
    return {
      query,
      document_type: documentType || undefined,
      indicator_type: indicatorType || undefined,
      tags,
      confidence_min: confidence[0] > 0 ? confidence[0] : undefined,
      confidence_max: confidence[1] < 100 ? confidence[1] : undefined,
      sort_by: sortBy,
      sort_order: sortOrder,
      page: 1,
      size: 20,
      ...overrides,
    }
  }

  function submit() {
    onSearch(buildParams())
  }

  function changeSortBy(val) {
    setSortBy(val)
    onSearch(buildParams({ sort_by: val }))
  }

  function toggleSortOrder() {
    const next = sortOrder === 'desc' ? 'asc' : 'desc'
    setSortOrder(next)
    onSearch(buildParams({ sort_order: next }))
  }

  function changeDocType(val) {
    setDocumentType(val)
    onSearch(buildParams({ document_type: val || undefined }))
  }

  function changeIndicatorType(val) {
    setIndicatorType(val)
    onSearch(buildParams({ indicator_type: val || undefined }))
  }

  function changeTags(val) {
    setTags(val)
    onSearch(buildParams({ tags: val }))
  }

  function changeConfidence(val) {
    setConfidence(val)
    onSearch(buildParams({
      confidence_min: val[0] > 0 ? val[0] : undefined,
      confidence_max: val[1] < 100 ? val[1] : undefined,
    }))
  }

  return (
    <div style={{ marginBottom: 20 }}>
      {error && (
        <Alert type="error" message={error} style={{ marginBottom: 12 }} />
      )}

      <Row gutter={[12, 12]}>
        <Col flex="auto">
          <Input.Search
            size="large"
            placeholder="Search indicators, reports, threat actors..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onSearch={submit}
            loading={loading}
            enterButton={<SearchOutlined />}
          />
        </Col>
      </Row>

      <Row gutter={[12, 12]} align="middle" style={{ marginTop: 10 }}>
        <Col>
          <Select
            allowClear
            placeholder="Doc type"
            style={{ width: 140 }}
            value={documentType}
            onChange={changeDocType}
            options={DOC_TYPES.map(t => ({ value: t, label: t.toUpperCase() }))}
          />
        </Col>
        <Col>
          <Select
            allowClear
            placeholder="Indicator type"
            style={{ width: 150 }}
            value={indicatorType}
            onChange={changeIndicatorType}
            options={INDICATOR_TYPES.map(t => ({ value: t, label: t.toUpperCase() }))}
          />
        </Col>
        <Col>
          <Select
            mode="tags"
            placeholder="Tags"
            style={{ width: 200 }}
            value={tags}
            onChange={changeTags}
          />
        </Col>
        <Col>
          <Space.Compact>
            <Select
              style={{ width: 150 }}
              value={sortBy}
              onChange={changeSortBy}
              options={SORT_OPTIONS}
            />
            <Button
              icon={sortOrder === 'desc' ? <SortDescendingOutlined /> : <SortAscendingOutlined />}
              onClick={toggleSortOrder}
              title={sortOrder === 'desc' ? 'Descending' : 'Ascending'}
            />
          </Space.Compact>
        </Col>
        <Col>
          <Space align="center" size={10}>
            <Text style={{ color: '#5a6f85', fontSize: 12, whiteSpace: 'nowrap' }}>
              Confidence {confidence[0]}% - {confidence[1]}%
            </Text>
            <Slider
              range
              min={0}
              max={100}
              value={confidence}
              onChange={setConfidence}
              onChangeComplete={changeConfidence}
              style={{ width: 140 }}
              tooltip={{ formatter: v => `${v}%` }}
            />
          </Space>
        </Col>
      </Row>
    </div>
  )
}
