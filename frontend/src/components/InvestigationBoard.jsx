import { useState, useEffect, useCallback, useRef } from 'react'
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  addEdge,
  Controls,
  Background,
  MiniMap,
  BackgroundVariant,
  Panel,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Button, Typography, message } from 'antd'
import { SaveOutlined, DeleteOutlined, DownloadOutlined, UploadOutlined } from '@ant-design/icons'
import { IOCNode, ReportNode, NoteNode, ActorNode, VulnNode, CampaignNode } from './board/nodes'

const { Text } = Typography

const nodeTypes = {
  ioc:      IOCNode,
  report:   ReportNode,
  note:     NoteNode,
  actor:    ActorNode,
  vuln:     VulnNode,
  campaign: CampaignNode,
}

const STORAGE_KEY = 'cti-board-v1'

function loadBoard() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) return JSON.parse(saved)
  } catch {}
  return { nodes: [], edges: [] }
}

let _counter = Date.now()
function nextId() {
  return `node-${++_counter}`
}

const DEFAULT_DATA = {
  ioc:      { indicator_type: 'ip', indicator_value: '', confidence: null, source_name: '', tags: [] },
  report:   { document_type: 'report', title: 'New report', content: '', tags: [], source_name: '' },
  note:     { text: '' },
  actor:    { actor_type: 'APT', name: '', country: '', motivation: '' },
  vuln:     { cve_id: '', cvss: null, product: '', status: 'unknown' },
  campaign: { name: '', attribution: '', period: '', tags: [] },
}

export default function InvestigationBoard({ pendingNode, onNodeConsumed }) {
  const saved = loadBoard()
  const [nodes, setNodes, onNodesChange] = useNodesState(saved.nodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(saved.edges)
  const importRef = useRef(null)

  // Consume nodes pinned from search panel
  useEffect(() => {
    if (!pendingNode) return
    setNodes(nds => {
      if (nds.find(n => n.id === pendingNode.id)) return nds
      return [...nds, pendingNode]
    })
    onNodeConsumed()
  }, [pendingNode]) // eslint-disable-line

  const onConnect = useCallback(
    (params) => setEdges(eds => addEdge({
      ...params,
      style: { stroke: '#c0392b', strokeWidth: 1.5 },
    }, eds)),
    [setEdges],
  )

  // Drop a Note on a card → parent-child relationship (note follows card)
  const onNodeDragStop = useCallback((_, draggedNode) => {
    if (draggedNode.type !== 'note') return

    // Compute absolute position (position is parent-relative when parentId is set)
    let absX = draggedNode.position.x
    let absY = draggedNode.position.y
    if (draggedNode.parentId) {
      const par = nodes.find(n => n.id === draggedNode.parentId)
      if (par) { absX += par.position.x; absY += par.position.y }
    }

    const nW = draggedNode.measured?.width  || 200
    const nH = draggedNode.measured?.height || 120

    // Find the most-overlapping non-note node
    let target = null, best = 0
    for (const n of nodes) {
      if (n.id === draggedNode.id || n.type === 'note') continue
      const tW = n.measured?.width  || 220
      const tH = n.measured?.height || 100
      const ox = Math.max(0, Math.min(absX + nW, n.position.x + tW) - Math.max(absX, n.position.x))
      const oy = Math.max(0, Math.min(absY + nH, n.position.y + tH) - Math.max(absY, n.position.y))
      const area = ox * oy
      if (area > best) { best = area; target = n }
    }

    if (target) {
      // Stack notes below each other if multiple are attached
      const siblings = nodes.filter(n => n.parentId === target.id && n.id !== draggedNode.id)
      const noteH = draggedNode.measured?.height || 120
      const relY = (target.measured?.height || 100) + 8 + siblings.length * (noteH + 6)

      setNodes(nds => {
        const without = nds.filter(n => n.id !== draggedNode.id)
        // ReactFlow requires child to come after parent in array
        const pIdx = without.findIndex(n => n.id === target.id)
        const updated = {
          ...draggedNode,
          parentId: target.id,
          position: { x: 0, y: relY },
          data: { ...draggedNode.data, attached: true },
        }
        const result = [...without]
        result.splice(Math.max(pIdx + 1, 0), 0, updated)
        return result
      })
      // Remove any old attachment edge (no visual line needed  proximity implies the link)
      setEdges(eds => eds.filter(e => !(e.data?.isAttachment && e.target === draggedNode.id)))
    } else if (draggedNode.parentId) {
      // Dragged off any card → detach
      setNodes(nds => nds.map(n =>
        n.id === draggedNode.id
          ? { ...n, parentId: undefined, position: { x: absX, y: absY }, data: { ...n.data, attached: false } }
          : n
      ))
      setEdges(eds => eds.filter(e => !(e.data?.isAttachment && e.target === draggedNode.id)))
    }
  }, [nodes, setNodes, setEdges])

  function addNode(type) {
    setNodes(nds => [...nds, {
      id: nextId(),
      type,
      position: { x: 100 + Math.random() * 400, y: 80 + Math.random() * 280 },
      data: { ...DEFAULT_DATA[type] },
    }])
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ nodes, edges }))
    message.success({ content: 'Board saved', duration: 2 })
  }

  function exportBoard() {
    const blob = new Blob([JSON.stringify({ nodes, edges }, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `cti-board-${new Date().toISOString().slice(0,10)}.json`
    a.click()
  }

  function importBoard(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result)
        if (!Array.isArray(data.nodes) || !Array.isArray(data.edges)) {
          message.error('Invalid board file format')
          return
        }
        setNodes(data.nodes)
        setEdges(data.edges)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
        message.success({ content: `Imported ${data.nodes.length} nodes`, duration: 2 })
      } catch {
        message.error('Failed to parse board file')
      } finally {
        e.target.value = ''
      }
    }
    reader.readAsText(file)
  }

  function clearBoard() {
    setNodes([])
    setEdges([])
    localStorage.removeItem(STORAGE_KEY)
  }

  const miniMapColor = (n) => {
    if (n.type === 'ioc')      return '#e74c3c'
    if (n.type === 'report')   return '#1668dc'
    if (n.type === 'note')     return '#b8860b'
    if (n.type === 'actor')    return '#e67e22'
    if (n.type === 'vuln')     return '#e74c3c'
    if (n.type === 'campaign') return '#16a085'
    return '#4a5568'
  }

  return (
    <div style={{ height: 'calc(100vh - 65px)' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStop={onNodeDragStop}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ minZoom: 0.4, maxZoom: 1.5, padding: 0.2 }}
        style={{ background: '#070b10' }}
        proOptions={{ hideAttribution: true }}
        deleteKeyCode="Delete"
      >
        <Background variant={BackgroundVariant.Dots} color="#1a3a5c" gap={28} size={1.5} />

        <Controls
          style={{ background: '#0d1520', border: '1px solid #1a2e45', borderRadius: 3 }}
          showInteractive={false}
        />

        <MiniMap
          nodeColor={miniMapColor}
          maskColor="rgba(7,11,16,0.75)"
          style={{ background: '#0d1520', border: '1px solid #1a2e45' }}
        />

        <Panel position="top-left">
          <div style={{
            background: '#060a0f',
            border: '1px solid #1a2e45',
            borderRadius: 3,
            padding: '8px 12px',
            display: 'flex',
            gap: 8,
            alignItems: 'center',
          }}>
            <Text style={{ color: '#3d5266', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', marginRight: 4 }}>
              Add
            </Text>
            {[
              { type: 'ioc',      label: 'IOC',      color: '#e74c3c', mono: true },
              { type: 'report',   label: 'Report',   color: '#1668dc' },
              { type: 'actor',    label: 'Actor',    color: '#e67e22' },
              { type: 'vuln',     label: 'Vuln',     color: '#e74c3c' },
              { type: 'campaign', label: 'Campaign', color: '#16a085' },
              { type: 'note',     label: 'Note',     color: '#e8a838' },
            ].map(n => (
              <Button
                key={n.type}
                size="small"
                onClick={() => addNode(n.type)}
                style={{ fontSize: 11, fontFamily: n.mono ? "'JetBrains Mono',monospace" : undefined }}
              >
                <span style={{ color: n.color, marginRight: 3 }}>●</span>{n.label}
              </Button>
            ))}

            <div style={{ width: 1, height: 16, background: '#1a2e45', margin: '0 4px' }} />

            <Button size="small" type="primary" icon={<SaveOutlined />} onClick={save}>
              Save
            </Button>
            <Button size="small" icon={<DownloadOutlined />} onClick={exportBoard} style={{ color: '#3d5266', borderColor: '#1a2e45' }}>
              Export
            </Button>
            <Button size="small" icon={<UploadOutlined />} onClick={() => importRef.current?.click()} style={{ color: '#3d5266', borderColor: '#1a2e45' }}>
              Import
            </Button>
            <input ref={importRef} type="file" accept=".json" style={{ display: 'none' }} onChange={importBoard} />
            <Button size="small" danger icon={<DeleteOutlined />} onClick={clearBoard}>
              Clear
            </Button>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  )
}
