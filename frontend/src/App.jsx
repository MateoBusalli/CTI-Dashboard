import { useState, useEffect } from 'react'
import { ConfigProvider, Layout, Menu, Typography, Space } from 'antd'
import {
  SearchOutlined,
  DatabaseOutlined,
  PushpinOutlined,
  ClockCircleOutlined,
  UploadOutlined,
} from '@ant-design/icons'
import ctiTheme from './theme'
import SearchPanel from './components/SearchPanel'
import ResultsTable from './components/ResultsTable'
import SourcesPanel from './components/SourcesPanel'
import InvestigationBoard from './components/InvestigationBoard'
import TimelineView from './components/TimelineView'
import ChatTerminal from './components/ChatTerminal'
import { BulkIngestPanel, DeletePanel } from './components/UtilityPanels'
import { searchDocuments } from './api'

const { Sider, Header, Content } = Layout
const { Text } = Typography

export default function App() {
  const [view, setView] = useState('search')
  const [results, setResults] = useState([])
  const [total, setTotal] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [lastParams, setLastParams] = useState(null)
  const [pendingBoardNode, setPendingBoardNode] = useState(null)

  // Auto-load all results on first render
  useEffect(() => {
    handleSearch({ query: '', page: 1, size: 20, sort_by: '_score', sort_order: 'desc' })
  }, []) // eslint-disable-line

  async function handleSearch(params) {
    setLoading(true)
    setError(null)
    setLastParams(params)
    try {
      const data = await searchDocuments(params)
      setResults(data.results)
      setTotal(data.total)
    } catch (e) {
      setError('Search failed. Backend may be unreachable.')
      setResults([])
      setTotal(null)
    } finally {
      setLoading(false)
    }
  }

  function handlePageChange(page) {
    if (!lastParams) return
    handleSearch({ ...lastParams, page })
  }

  function pinToBoard(hit) {
    const src = hit.source || {}
    let nodeType = 'report'
    if (src.indicator_value)            nodeType = 'ioc'
    else if (src.document_type === 'ioc') nodeType = 'ioc'
    else if (src.document_type === 'actor') nodeType = 'actor'
    else if (src.document_type === 'vuln')  nodeType = 'vuln'
    else if (src.document_type === 'campaign') nodeType = 'campaign'
    const node = {
      id: `pin-${hit.id || Date.now()}`,
      type: nodeType,
      position: { x: 80 + Math.random() * 500, y: 80 + Math.random() * 350 },
      data: { ...src },
    }
    setPendingBoardNode(node)
    setView('board')
  }

  const headerTitle = view === 'search'   ? 'Intelligence Search'
    : view === 'sources'  ? 'Data Sources'
    : view === 'timeline' ? 'Timeline'
    : view === 'ingest'   ? 'Bulk Ingest'
    : 'Investigation Board'

  return (
    <ConfigProvider theme={ctiTheme}>
      <Layout style={{ minHeight: '100vh' }}>

        <Sider width={220} style={{ borderRight: '1px solid #1a2e45' }}>
          <div style={{ padding: '18px 16px 14px', borderBottom: '1px solid #1a2e45' }}>
            <Text style={{
              display: 'block',
              color: '#1668dc',
              fontWeight: 700,
              fontSize: 16,
              letterSpacing: 3,
              textTransform: 'uppercase',
            }}>
              CTI
            </Text>
            <Text style={{ color: '#3d5266', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase' }}>
              Intelligence Platform
            </Text>
          </div>

          <Menu
            theme="dark"
            mode="inline"
            defaultSelectedKeys={['search']}
            selectedKeys={[view]}
            onSelect={({ key }) => setView(key)}
            style={{ borderRight: 0, marginTop: 6 }}
            items={[
              {
                key: 'search',
                icon: <SearchOutlined />,
                label: 'Intelligence Search',
              },
              {
                key: 'sources',
                icon: <DatabaseOutlined />,
                label: 'Data Sources',
              },
              {
                key: 'board',
                icon: <PushpinOutlined />,
                label: 'Investigation Board',
              },
              {
                key: 'timeline',
                icon: <ClockCircleOutlined />,
                label: 'Timeline',
              },
              {
                type: 'divider',
              },
              {
                key: 'ingest',
                icon: <UploadOutlined />,
                label: 'Bulk Ingest',
              },

            ]}
          />
        </Sider>

        <Layout>
          <Header style={{
            borderBottom: '1px solid #1a2e45',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <Text style={{ color: '#c4d0e0', fontWeight: 500, fontSize: 13, letterSpacing: 0.5 }}>
              {headerTitle}
            </Text>
            {total !== null && view === 'search' && (
              <Text style={{ color: '#3d5266', fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }}>
                {total} record{total !== 1 ? 's' : ''} matched
              </Text>
            )}
          </Header>

          <Content style={{ padding: view === 'board' ? 0 : 24, overflow: view === 'board' ? 'hidden' : 'auto' }}>
            {view === 'search' && (
              <>
                <SearchPanel onSearch={handleSearch} loading={loading} error={error} />
                <div style={{ paddingBottom: 80 }}>
                <ResultsTable
                  results={results}
                  total={total ?? 0}
                  loading={loading}
                  onPageChange={handlePageChange}
                  onPinToBoard={pinToBoard}
                />
                </div>
              </>
            )}
            {view === 'sources' && <SourcesPanel />}
            {view === 'timeline' && (
              <div style={{ padding: 24, overflow: 'auto', height: 'calc(100vh - 65px)' }}>
                <TimelineView />
              </div>
            )}
            {view === 'ingest' && (
              <div style={{ padding: 24 }}>
                <BulkIngestPanel />
                <div style={{ margin: '40px 0 32px', borderTop: '1px solid #1a2e45' }} />
                <DeletePanel />
              </div>
            )}
            {view === 'board' && (
              <InvestigationBoard
                pendingNode={pendingBoardNode}
                onNodeConsumed={() => setPendingBoardNode(null)}
              />
            )}
          </Content>
        </Layout>

      </Layout>
      <ChatTerminal />
    </ConfigProvider>
  )
}

