import { useState, useRef } from 'react'
import { Handle, Position, useReactFlow } from '@xyflow/react'

// SHARED UTILITIES
export function GripHandle({ note = false }) {
  return <div className={`node-grip${note ? ' node-grip--note' : ''}`} />
}

export const MONO = { fontFamily: "'JetBrains Mono', monospace" }

export const LABEL = {
  fontSize: 8,
  letterSpacing: 1.5,
  textTransform: 'uppercase',
  fontWeight: 600,
  marginBottom: 2,
}

export function TypeBadge({ label, color }) {
  return (
    <span style={{
      background: color + '18',
      border: `1px solid ${color}44`,
      color,
      fontSize: 9,
      letterSpacing: 1.5,
      textTransform: 'uppercase',
      borderRadius: 3,
      padding: '2px 7px',
      fontWeight: 700,
      flexShrink: 0,
    }}>
      {label}
    </span>
  )
}

export function DeleteButton({ id }) {
  const { deleteElements } = useReactFlow()
  const [pending, setPending] = useState(false)
  const timer = useRef(null)

  function handleClick(e) {
    e.stopPropagation()
    if (!pending) {
      setPending(true)
      timer.current = setTimeout(() => setPending(false), 2000)
    } else {
      clearTimeout(timer.current)
      deleteElements({ nodes: [{ id }] })
    }
  }

  return (
    <button
      className="nodrag"
      onClick={handleClick}
      title={pending ? 'Click again to confirm' : 'Delete node'}
      style={{
        background: pending ? '#e74c3c22' : 'transparent',
        border: `1px solid ${pending ? '#e74c3c66' : '#1a2e45'}`,
        borderRadius: 3,
        color: pending ? '#e74c3c' : '#2a3a4a',
        cursor: 'pointer',
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: pending ? 0.5 : 0,
        padding: '2px 6px',
        transition: 'all 0.15s',
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}
    >
      {pending ? 'Confirm?' : '✕'}
    </button>
  )
}

// ACTORNODE
const ACTOR_COLOR = '#e67e22'
const ACTOR_TYPES = ['APT', 'Criminal', 'Hacktivist', 'Nation-State', 'Insider', 'Unknown']

export function ActorNode({ data, id, selected }) {
  const { updateNodeData } = useReactFlow()

  return (
    <div style={{ position: 'relative', paddingTop: 4 }}>
      <GripHandle />
      <Handle type="target" position={Position.Left} style={{ background: ACTOR_COLOR }} />
      <div style={{
        background: '#0e0c08',
        border: `1px solid ${selected ? ACTOR_COLOR + '55' : '#2a1e00'}`,
        borderLeft: `3px solid ${ACTOR_COLOR}`,
        borderRadius: 3,
        minWidth: 230,
        maxWidth: 300,
        overflow: 'hidden',
        boxShadow: selected
          ? `0 0 0 1px ${ACTOR_COLOR}22, 0 6px 24px rgba(0,0,0,0.6)`
          : '0 2px 10px rgba(0,0,0,0.4)',
        transition: 'box-shadow 0.15s, border-color 0.15s',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '7px 10px', borderBottom: '1px solid #2a1e00',
        }}>
          <span style={{
            background: ACTOR_COLOR + '18', border: `1px solid ${ACTOR_COLOR}44`, color: ACTOR_COLOR,
            fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase',
            borderRadius: 3, padding: '2px 7px', fontWeight: 700,
          }}>Actor</span>
          <select
            className="nodrag"
            value={data.actor_type || 'APT'}
            onChange={e => updateNodeData(id, { actor_type: e.target.value })}
            style={{
              background: 'transparent', border: '1px solid #3a2a00',
              color: '#7a5a30', fontSize: 9, borderRadius: 3,
              padding: '2px 4px', cursor: 'pointer',
            }}
          >
            {ACTOR_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <div style={{ flex: 1 }} />
          <DeleteButton id={id} />
        </div>
        <div style={{ padding: '9px 10px 6px' }}>
          <input
            className="nodrag"
            value={data.name || ''}
            onChange={e => updateNodeData(id, { name: e.target.value })}
            placeholder="Actor / group name"
            style={{
              background: 'transparent', border: 'none',
              color: '#e8c070', fontSize: 15, fontWeight: 700,
              width: '100%', outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          padding: '5px 10px 8px', borderTop: '1px solid #2a1e00',
        }}>
          <div>
            <div style={{ ...LABEL, color: '#4a3010' }}>Country</div>
            <input
              className="nodrag"
              value={data.country || ''}
              onChange={e => updateNodeData(id, { country: e.target.value })}
              placeholder="Unknown"
              style={{ background: 'transparent', border: 'none', color: '#7a5a30', fontSize: 10, width: '100%', outline: 'none' }}
            />
          </div>
          <div style={{ paddingLeft: 8, borderLeft: '1px solid #2a1e00' }}>
            <div style={{ ...LABEL, color: '#4a3010' }}>Motivation</div>
            <input
              className="nodrag"
              value={data.motivation || ''}
              onChange={e => updateNodeData(id, { motivation: e.target.value })}
              placeholder="Financial"
              style={{ background: 'transparent', border: 'none', color: '#7a5a30', fontSize: 10, width: '100%', outline: 'none' }}
            />
          </div>
        </div>
      </div>
      <Handle type="source" position={Position.Right} style={{ background: ACTOR_COLOR }} />
    </div>
  )
}

// CAMPAIGNNODE
const CAMPAIGN_COLOR = '#16a085'

export function CampaignNode({ data, id, selected }) {
  const { updateNodeData } = useReactFlow()

  return (
    <div style={{ position: 'relative', paddingTop: 4 }}>
      <GripHandle />
      <Handle type="target" position={Position.Left} style={{ background: CAMPAIGN_COLOR }} />
      <div style={{
        background: '#080e0d',
        border: `1px solid ${selected ? CAMPAIGN_COLOR + '55' : '#0c2820'}`,
        borderTop: `3px solid ${CAMPAIGN_COLOR}`,
        borderRadius: 3,
        minWidth: 250,
        maxWidth: 320,
        overflow: 'hidden',
        boxShadow: selected
          ? `0 0 0 1px ${CAMPAIGN_COLOR}22, 0 6px 24px rgba(0,0,0,0.6)`
          : '0 2px 10px rgba(0,0,0,0.4)',
        transition: 'box-shadow 0.15s, border-color 0.15s',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '7px 10px', borderBottom: '1px solid #0c2820',
        }}>
          <span style={{
            background: CAMPAIGN_COLOR + '18', border: `1px solid ${CAMPAIGN_COLOR}44`, color: CAMPAIGN_COLOR,
            fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase',
            borderRadius: 3, padding: '2px 7px', fontWeight: 700,
          }}>Campaign</span>
          <div style={{ flex: 1 }} />
          <DeleteButton id={id} />
        </div>
        <div style={{ padding: '9px 10px 6px' }}>
          <input
            className="nodrag"
            value={data.name || ''}
            onChange={e => updateNodeData(id, { name: e.target.value })}
            placeholder="Campaign name"
            style={{
              background: 'transparent', border: 'none',
              color: '#5cd4b8', fontSize: 15, fontWeight: 700,
              width: '100%', outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          padding: '5px 10px 8px', borderTop: '1px solid #0c2820',
        }}>
          <div>
            <div style={{ ...LABEL, color: '#0c3028' }}>Attribution</div>
            <input
              className="nodrag"
              value={data.attribution || ''}
              onChange={e => updateNodeData(id, { attribution: e.target.value })}
              placeholder="Unknown actor"
              style={{ background: 'transparent', border: 'none', color: '#2a7060', fontSize: 10, width: '100%', outline: 'none' }}
            />
          </div>
          <div style={{ paddingLeft: 8, borderLeft: '1px solid #0c2820' }}>
            <div style={{ ...LABEL, color: '#0c3028' }}>Period</div>
            <input
              className="nodrag"
              value={data.period || ''}
              onChange={e => updateNodeData(id, { period: e.target.value })}
              placeholder="2024-01 → now"
              style={{ background: 'transparent', border: 'none', color: '#2a7060', fontSize: 10, width: '100%', outline: 'none' }}
            />
          </div>
        </div>
        {(data.tags || []).length > 0 && (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', padding: '0 10px 8px' }}>
            {(data.tags || []).slice(0, 5).map(t => (
              <span key={t} style={{
                background: CAMPAIGN_COLOR + '12', border: `1px solid ${CAMPAIGN_COLOR}30`,
                color: '#2a7060', borderRadius: 3, fontSize: 9, padding: '1px 5px',
              }}>{t}</span>
            ))}
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Right} style={{ background: CAMPAIGN_COLOR }} />
    </div>
  )
}

// IOCNODE
const IOC_TYPE_COLORS = {
  ip:     '#e74c3c',
  domain: '#1668dc',
  hash:   '#e8a838',
  url:    '#9b59b6',
  email:  '#2ecc71',
}
const IOC_TYPES = ['ip', 'domain', 'hash', 'url', 'email']

function ConfBar({ value }) {
  if (value == null) return null
  const color = value >= 80 ? '#2ecc71' : value >= 50 ? '#e8a838' : '#e74c3c'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
      <div style={{ flex: 1, height: 2, background: '#1a2e45', borderRadius: 99 }}>
        <div style={{ width: `${value}%`, height: '100%', background: color, borderRadius: 99, transition: 'width 0.3s' }} />
      </div>
      <span style={{ ...MONO, color: '#3d5266', fontSize: 9 }}>{value}%</span>
    </div>
  )
}

export function IOCNode({ data, id, selected }) {
  const { updateNodeData } = useReactFlow()
  const color = IOC_TYPE_COLORS[data.indicator_type] || '#4a5568'
  const tags = (data.tags || []).slice(0, 4)

  return (
    <div style={{ position: 'relative', paddingTop: 4 }}>
      <GripHandle />
      <Handle type="target" position={Position.Left} style={{ background: color }} />
      <div style={{
        background: '#0b1520',
        border: `1px solid ${selected ? color + '55' : '#192840'}`,
        borderLeft: `3px solid ${color}`,
        borderRadius: 3,
        minWidth: 230,
        maxWidth: 300,
        overflow: 'hidden',
        boxShadow: selected
          ? `0 0 0 1px ${color}22, 0 6px 24px rgba(0,0,0,0.6)`
          : '0 2px 10px rgba(0,0,0,0.4)',
        transition: 'box-shadow 0.15s, border-color 0.15s',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '7px 10px', borderBottom: '1px solid #192840', flexWrap: 'wrap',
        }}>
          <select
            className="nodrag"
            value={data.indicator_type || 'ip'}
            onChange={e => updateNodeData(id, { indicator_type: e.target.value })}
            style={{
              ...MONO,
              background: color + '18', border: `1px solid ${color}44`, color,
              fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase',
              borderRadius: 3, padding: '2px 6px', cursor: 'pointer', fontWeight: 700,
            }}
          >
            {IOC_TYPES.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
          </select>
          {tags.map(t => (
            <span key={t} style={{
              background: '#0c1d30', border: '1px solid #1a3550',
              color: '#3a6a9a', borderRadius: 3, fontSize: 9, padding: '1px 5px',
            }}>{t}</span>
          ))}
          <div style={{ flex: 1 }} />
          <DeleteButton id={id} />
        </div>
        <div style={{ padding: '9px 10px 8px' }}>
          <input
            className="nodrag"
            value={data.indicator_value || ''}
            onChange={e => updateNodeData(id, { indicator_value: e.target.value })}
            placeholder="indicator value"
            spellCheck={false}
            style={{
              ...MONO, background: 'transparent', border: 'none',
              color: '#d4b84a', fontSize: 13, width: '100%', outline: 'none', boxSizing: 'border-box',
            }}
          />
          <ConfBar value={data.confidence} />
        </div>
        <div style={{ padding: '5px 10px 7px', borderTop: '1px solid #192840' }}>
          <input
            className="nodrag"
            value={data.source_name || ''}
            onChange={e => updateNodeData(id, { source_name: e.target.value })}
            placeholder="source"
            style={{ background: 'transparent', border: 'none', color: '#2e4a62', fontSize: 10, width: '100%', outline: 'none' }}
          />
        </div>
      </div>
      <Handle type="source" position={Position.Right} style={{ background: color }} />
    </div>
  )
}

// NOTENODE
export function NoteNode({ data, id, selected }) {
  const { updateNodeData } = useReactFlow()
  const attached = !!data.attached

  return (
    <div style={{ position: 'relative', paddingTop: 4 }}>
      <GripHandle note />
      <Handle
        id="top"
        type="target"
        position={Position.Top}
        style={{ background: '#e8a838', width: 1, height: 1, opacity: 0, pointerEvents: 'none', top: 4 }}
      />
      <div style={{
        background: 'linear-gradient(160deg, #1e1700 0%, #141000 100%)',
        border: `1px solid ${selected ? '#e8a838' : attached ? '#3a2c00' : '#252000'}`,
        borderTop: `2px solid ${attached ? '#e8a838' : '#2e2400'}`,
        borderRadius: 3,
        padding: '8px 10px 10px',
        minWidth: 200,
        boxShadow: selected
          ? '0 0 0 1px rgba(232,168,56,0.25), 0 6px 20px rgba(0,0,0,0.7)'
          : '0 3px 12px rgba(0,0,0,0.5)',
        transition: 'border-color 0.2s, box-shadow 0.2s',
      }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
          <DeleteButton id={id} />
        </div>
        <textarea
          className="nodrag nopan"
          value={data.text || ''}
          onChange={e => updateNodeData(id, { text: e.target.value })}
          placeholder={attached ? 'Note…' : 'Note  drop on a card to attach'}
          rows={4}
          style={{
            background: 'transparent', border: 'none',
            color: '#c4a040', fontFamily: "'Inter', sans-serif",
            fontSize: 12, lineHeight: 1.6, resize: 'none',
            width: '100%', outline: 'none', cursor: 'text',
          }}
        />
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: '#e8a838', opacity: 0.5 }}
      />
    </div>
  )
}

// REPORTNODE
const DOC_COLORS = {
  report:   '#1668dc',
  alert:    '#e74c3c',
  advisory: '#e67e22',
  analysis: '#9b59b6',
  intel:    '#16a085',
}
const DOC_TYPES = ['report', 'alert', 'advisory', 'analysis', 'intel']

export function ReportNode({ data, id, selected }) {
  const { updateNodeData } = useReactFlow()
  const color = DOC_COLORS[data.document_type] || '#1668dc'
  const tags = (data.tags || []).slice(0, 5)

  return (
    <div style={{ position: 'relative', paddingTop: 4 }}>
      <GripHandle />
      <Handle type="target" position={Position.Left} style={{ background: color }} />
      <div style={{
        background: '#0b1520',
        border: `1px solid ${selected ? color + '55' : '#192840'}`,
        borderTop: `3px solid ${color}`,
        borderRadius: 3,
        minWidth: 250,
        maxWidth: 320,
        overflow: 'hidden',
        boxShadow: selected
          ? `0 0 0 1px ${color}22, 0 6px 24px rgba(0,0,0,0.6)`
          : '0 2px 10px rgba(0,0,0,0.4)',
        transition: 'box-shadow 0.15s, border-color 0.15s',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '7px 10px', borderBottom: '1px solid #192840',
        }}>
          <select
            className="nodrag"
            value={data.document_type || 'report'}
            onChange={e => updateNodeData(id, { document_type: e.target.value })}
            style={{
              background: color + '18', border: `1px solid ${color}44`, color,
              fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase',
              borderRadius: 3, padding: '2px 6px', cursor: 'pointer', fontWeight: 700,
            }}
          >
            {DOC_TYPES.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
          </select>
          <div style={{ flex: 1 }} />
          {data.source_name && (
            <span style={{ color: '#2e4a62', fontSize: 9, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {data.source_name}
            </span>
          )}
          <DeleteButton id={id} />
        </div>
        <div style={{ padding: '9px 10px 6px' }}>
          <input
            className="nodrag"
            value={data.title || ''}
            onChange={e => updateNodeData(id, { title: e.target.value })}
            placeholder="Title"
            style={{
              background: 'transparent', border: 'none',
              color: '#c4d0e0', fontSize: 14, fontWeight: 600,
              width: '100%', outline: 'none', boxSizing: 'border-box',
            }}
          />
          {data.content && (
            <div style={{ color: '#3a5570', fontSize: 11, marginTop: 5, lineHeight: 1.55 }}>
              {data.content.length > 110 ? data.content.slice(0, 110) + '…' : data.content}
            </div>
          )}
        </div>
        {tags.length > 0 && (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', padding: '0 10px 8px' }}>
            {tags.map(t => (
              <span key={t} style={{
                background: '#0c1d30', border: '1px solid #1a3550',
                color: '#3a6a9a', borderRadius: 3, fontSize: 9, padding: '1px 5px',
              }}>{t}</span>
            ))}
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Right} style={{ background: color }} />
    </div>
  )
}

// VULNNODE
const STATUSES = ['unknown', 'unpatched', 'patched', 'exploited']
const STATUS_COLORS = {
  unknown:   '#3d5266',
  unpatched: '#e8a838',
  patched:   '#2ecc71',
  exploited: '#e74c3c',
}

function cvssColor(s) {
  if (s == null || s === '') return '#3d5266'
  const v = parseFloat(s)
  if (v >= 9.0) return '#e74c3c'
  if (v >= 7.0) return '#e67e22'
  if (v >= 4.0) return '#e8a838'
  return '#2ecc71'
}

function cvssLabel(s) {
  if (s == null || s === '') return null
  const v = parseFloat(s)
  if (v >= 9.0) return 'CRITICAL'
  if (v >= 7.0) return 'HIGH'
  if (v >= 4.0) return 'MEDIUM'
  return 'LOW'
}

export function VulnNode({ data, id, selected }) {
  const { updateNodeData } = useReactFlow()
  const color = cvssColor(data.cvss)
  const label = cvssLabel(data.cvss)
  const score = data.cvss != null && data.cvss !== '' ? parseFloat(data.cvss) : null
  const statusColor = STATUS_COLORS[data.status] || '#3d5266'

  return (
    <div style={{ position: 'relative', paddingTop: 4 }}>
      <GripHandle />
      <Handle type="target" position={Position.Left} style={{ background: color }} />
      <div style={{
        background: '#100a0a',
        border: `1px solid ${selected ? color + '55' : '#2a1010'}`,
        borderLeft: `3px solid ${color}`,
        borderRadius: 3,
        minWidth: 240,
        maxWidth: 310,
        overflow: 'hidden',
        boxShadow: selected
          ? `0 0 0 1px ${color}22, 0 6px 24px rgba(0,0,0,0.6)`
          : '0 2px 10px rgba(0,0,0,0.4)',
        transition: 'box-shadow 0.15s, border-color 0.15s',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '7px 10px', borderBottom: '1px solid #2a1010',
        }}>
          <span style={{
            background: '#e74c3c18', border: '1px solid #e74c3c44', color: '#e74c3c',
            fontSize: 9, letterSpacing: 1.5, borderRadius: 3,
            padding: '2px 7px', fontWeight: 700,
          }}>CVE</span>
          <div style={{ flex: 1 }} />
          <DeleteButton id={id} />
          <select
            className="nodrag"
            value={data.status || 'unknown'}
            onChange={e => updateNodeData(id, { status: e.target.value })}
            style={{
              background: 'transparent', border: `1px solid ${statusColor}44`,
              color: statusColor, fontSize: 9, borderRadius: 3,
              padding: '2px 4px', cursor: 'pointer',
            }}
          >
            {STATUSES.map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
          </select>
        </div>
        <div style={{ padding: '9px 10px 4px' }}>
          <input
            className="nodrag"
            value={data.cve_id || ''}
            onChange={e => updateNodeData(id, { cve_id: e.target.value })}
            placeholder="CVE-YYYY-NNNNN"
            spellCheck={false}
            style={{
              ...MONO, background: 'transparent', border: 'none',
              color: '#d4b0a0', fontSize: 14, fontWeight: 700,
              letterSpacing: 0.5, width: '100%', outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>
        <div style={{ padding: '4px 10px 8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{ flex: 1, height: 3, background: '#2a1010', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{
                width: score != null ? `${(score / 10) * 100}%` : '0%',
                height: '100%',
                background: `linear-gradient(90deg, ${color}88, ${color})`,
                borderRadius: 99, transition: 'width 0.3s',
              }} />
            </div>
            <input
              className="nodrag"
              type="number"
              min={0} max={10} step={0.1}
              value={data.cvss ?? ''}
              onChange={e => updateNodeData(id, { cvss: e.target.value })}
              placeholder="CVSS"
              style={{
                ...MONO, background: 'transparent', border: 'none',
                color, fontSize: 11, fontWeight: 700,
                width: 28, outline: 'none', textAlign: 'right',
              }}
            />
            {label && (
              <span style={{ ...MONO, color, fontSize: 8, letterSpacing: 1.5, fontWeight: 700 }}>{label}</span>
            )}
          </div>
        </div>
        <div style={{ padding: '5px 10px 8px', borderTop: '1px solid #2a1010' }}>
          <div style={{ ...LABEL, color: '#4a2020' }}>Product / Vendor</div>
          <input
            className="nodrag"
            value={data.product || ''}
            onChange={e => updateNodeData(id, { product: e.target.value })}
            placeholder="e.g. Apache Log4j 2.x"
            style={{ background: 'transparent', border: 'none', color: '#6a3a3a', fontSize: 10, width: '100%', outline: 'none' }}
          />
        </div>
      </div>
      <Handle type="source" position={Position.Right} style={{ background: color }} />
    </div>
  )
}
