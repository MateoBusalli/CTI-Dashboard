import { useState, useRef, useEffect } from 'react'
import { RobotOutlined, LoadingOutlined } from '@ant-design/icons'

const ACCENT = '#1668dc'
const PROMPT_COLOR = '#1668dc'
const MONO = "'JetBrains Mono', 'Courier New', monospace"

const WELCOME = [
  { text: 'CyberMind v1.0 - CTI Assistant' },
  { text: 'Model: dolphin-llama3 · Ollama local inference' },
  { text: 'Commands: /new [name]  /ls  /select  /rename  /rm' },
]

// All available commands with usage hint
const COMMANDS = [
  { name: '/new_conversation', hint: '[name]' },
  { name: '/new',              hint: '[name]' },
  { name: '/ls',               hint: '' },
  { name: '/show_conversations', hint: '' },
  { name: '/select',           hint: '[id|name]' },
  { name: '/rename',           hint: '[id] [new name]' },
  { name: '/rm',              hint: '[id1] [id2] ...] (no args = current)' },
]

export default function ChatTerminal() {
  const counterRef = useRef(2)
  function makeConv(name) {
    const id = String(counterRef.current++)
    return { id, name: name || `Session ${id}`, messages: [] }
  }

  const [open, setOpen]           = useState(false)
  const [convs, setConvs]         = useState(() => [{ id: '1', name: 'Session 1', messages: [] }])
  const [activeId, setActiveId]   = useState('1')
  const [input, setInput]         = useState('')
  const [streaming, setStreaming] = useState(false)
  const [streamBuf, setStreamBuf] = useState('')
  const [sysLine, setSysLine]     = useState(null)
  const [suggIdx, setSuggIdx]     = useState(-1)
  const bottomRef = useRef(null)
  const inputRef  = useRef(null)
  const abortRef  = useRef(null)

  const activeConv = convs.find(c => c.id === activeId) ?? convs[0]

  // COMPUTE SUGGESTIONS
  const suggestions = (() => {
    if (!input.startsWith('/')) return []
    const parts = input.split(/\s+/)
    const typed = parts[0].toLowerCase()

    if (parts.length === 1) {
      return COMMANDS.filter(c => c.name.startsWith(typed) && c.name !== typed)
    }

    // Command is complete  suggest argument values (conv id/name) where relevant
    const cmd = typed
    if (['/select', '/rename', '/rm'].includes(cmd)) {
      const lastArg = parts[parts.length - 1].toLowerCase()
      return convs
        .filter(c => c.id.startsWith(lastArg) || c.name.toLowerCase().startsWith(lastArg))
        .filter(c => {
          // for /rm: exclude already typed ids
          if (cmd === '/rm') return !parts.slice(1, -1).includes(c.id)
          return true
        })
        .map(c => ({ name: c.id, hint: c.name }))
    }
    return []
  })()

  // Reset suggestion index when suggestions list changes
  useEffect(() => { setSuggIdx(-1) }, [input])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 80)
  }, [open])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeConv?.messages, streamBuf, sysLine])

  function updateMessages(id, fn) {
    setConvs(cs => cs.map(c => c.id === id ? { ...c, messages: fn(c.messages) } : c))
  }

  // TAB COMPLETION
  function applyCompletion(sugg) {
    const parts = input.split(/\s+/)
    if (parts.length === 1) {
      // Complete the command name; add a space if it takes args
      setInput(sugg.name + (sugg.hint ? ' ' : ''))
    } else {
      // Replace the last word with the suggestion value
      parts[parts.length - 1] = sugg.name
      setInput(parts.join(' ') + ' ')
    }
    setSuggIdx(-1)
    inputRef.current?.focus()
  }

  // COMMANDS
  function handleCommand(text) {
    const parts = text.trim().split(/\s+/)
    const cmd   = parts[0].toLowerCase()

    if (cmd === '/new_conversation' || cmd === '/new') {
      const name = parts.slice(1).join(' ') || null
      const conv = makeConv(name)
      setConvs(cs => [...cs, conv])
      setActiveId(conv.id)
      setSysLine(`// New conversation: "${conv.name}"  [${conv.id}]`)
      return true
    }

    if (cmd === '/ls' || cmd === '/show_conversations') {
      setConvs(cs => {
        const lines = cs.map(c =>
          `  ${c.id === activeId ? '▶' : ' '} [${c.id}]  ${c.name}  (${Math.floor(c.messages.length / 2)} exchanges)`
        ).join('\n')
        setSysLine(`// Conversations:\n${lines}`)
        return cs
      })
      return true
    }

    if (cmd === '/select') {
      const query = parts.slice(1).join(' ')
      if (!query) { setSysLine('// Usage: /select [id|name]'); return true }
      setConvs(cs => {
        const found = cs.find(c => c.id === query || c.name.toLowerCase() === query.toLowerCase())
        if (!found) { setSysLine(`// Not found: "${query}"`); return cs }
        setActiveId(found.id)
        setSysLine(`// Switched to "${found.name}"  [${found.id}]`)
        return cs
      })
      return true
    }

    if (cmd === '/rename') {
      const id      = parts[1]
      const newName = parts.slice(2).join(' ')
      if (!id || !newName) { setSysLine('// Usage: /rename [id] [new name]'); return true }
      setConvs(cs => {
        const found = cs.find(c => c.id === id)
        if (!found) { setSysLine(`// Not found: [${id}]`); return cs }
        const updated = cs.map(c => c.id === id ? { ...c, name: newName } : c)
        setSysLine(`// Renamed [${id}] → "${newName}"`)
        return updated
      })
      return true
    }

    if (cmd === '/rm') {
      const ids = parts.slice(1).length ? parts.slice(1) : [activeId]
      const toDelete  = ids.filter(id => convs.some(c => c.id === id))
      const missing   = ids.filter(id => !convs.some(c => c.id === id))
      const remaining = convs.filter(c => !toDelete.includes(c.id))
      if (!toDelete.length) { setSysLine(`// Not found: ${ids.map(i => `[${i}]`).join(' ')}`); return true }
      // Decide on the next active conv before touching state
      let nextId = activeId
      let nextConvs = remaining
      if (toDelete.includes(activeId)) {
        if (remaining.length) {
          nextId = remaining[0].id
        } else {
          const fresh = makeConv()
          nextConvs = [fresh]
          nextId = fresh.id
        }
      }
      const note = missing.length ? `  (not found: ${missing.map(i => `[${i}]`).join(' ')})` : ''
      setSysLine(`// Deleted: ${toDelete.map(i => `[${i}]`).join(' ')}${note}`)
      setConvs(nextConvs)
      setActiveId(nextId)
      return true
    }

    setSysLine(`// Unknown command: ${cmd}`)
    return true
  }

  // SEND
  async function sendMessage() {
    const text = input.trim()
    if (!text || streaming) return
    setInput('')
    setSysLine(null)
    setSuggIdx(-1)

    if (text.startsWith('/')) {
      handleCommand(text)
      return
    }

    const convId = activeConv.id
    const next   = [...activeConv.messages, { role: 'user', content: text }]
    updateMessages(convId, () => next)
    setStreaming(true)
    setStreamBuf('')

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const history = next.slice(-20).map(m => ({ role: m.role, content: m.content }))
      const res = await fetch('/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
        signal: controller.signal,
      })
      const reader  = res.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        const lines = (buf + chunk).split('\n')
        buf = lines.pop()
        for (const line of lines) {
          if (!line.trim()) continue
          try {
            const data = JSON.parse(line)
            if (data.error) { setStreamBuf(p => p + `\n⚠ ${data.error}`); continue }
            setStreamBuf(p => p + (data.message?.content || ''))
          } catch { }
        }
      }
    } catch (e) {
      if (e.name !== 'AbortError')
        setStreamBuf(p => p + `\n⚠ Connection error: ${e.message}`)
    } finally {
      setStreaming(false)
      setStreamBuf(prev => {
        updateMessages(convId, m => [...m, { role: 'assistant', content: prev }])
        return ''
      })
    }
  }

  // KEYBOARD HANDLING
  function handleKey(e) {
    if (suggestions.length > 0) {
      if (e.key === 'Tab') {
        e.preventDefault()
        const idx = suggIdx < 0 ? 0 : suggIdx
        applyCompletion(suggestions[idx])
        return
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSuggIdx(i => Math.min(i + 1, suggestions.length - 1))
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSuggIdx(i => Math.max(i - 1, 0))
        return
      }
      if (e.key === 'Escape') {
        setSuggIdx(-1)
        setInput('')
        return
      }
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      // If a suggestion is highlighted, complete it instead of sending
      if (suggIdx >= 0 && suggestions.length > 0) {
        applyCompletion(suggestions[suggIdx])
        return
      }
      sendMessage()
    }
  }

  function handleClose() {
    abortRef.current?.abort()
    setOpen(false)
  }

  // RENDER
  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position: 'fixed', bottom: 28, right: 28,
          width: 68, height: 68, borderRadius: '50%',
          background: open ? '#0a1628' : ACCENT,
          border: `2px solid ${open ? ACCENT : 'transparent'}`,
          boxShadow: `0 4px 24px ${ACCENT}66`,
          cursor: 'pointer', display: 'flex', alignItems: 'center',
          justifyContent: 'center', transition: 'all 0.2s', zIndex: 1000,
        }}
        title="CyberMind AI"
      >
        <RobotOutlined style={{ color: open ? ACCENT : '#fff', fontSize: 30 }} />
      </button>

      {/* Terminal window */}
      {open && (
        <div style={{
          position: 'fixed', bottom: 108, right: 28,
          width: 560, height: 520,
          background: '#060a0f', border: '1px solid #1a2e45',
          borderRadius: 8, boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
          display: 'flex', flexDirection: 'column',
          zIndex: 999, overflow: 'hidden', fontFamily: MONO,
        }}>

          {/* title bar */}
          <div style={{
            background: '#0b1218', borderBottom: '1px solid #1a2e45',
            padding: '10px 14px', display: 'flex', alignItems: 'center',
            gap: 8, flexShrink: 0,
          }}>
            <div onClick={handleClose} title="Close"
              style={{ width: 12, height: 12, borderRadius: '50%', background: '#e74c3c', cursor: 'pointer' }} />
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#e8a838' }} />
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#2ecc71' }} />
            <span style={{ flex: 1, textAlign: 'center', color: '#3d5266', fontSize: 11, letterSpacing: 1 }}>
              {activeConv.name}
            </span>
          </div>

          {/* output area */}
          <div style={{
            flex: 1, overflow: 'auto', padding: '14px 16px',
            display: 'flex', flexDirection: 'column', gap: 2,
          }}>
            {WELCOME.map((w, i) => (
              <div key={i} style={{ color: '#2a4a6a', fontSize: 11, lineHeight: 1.5 }}>{'// '}{w.text}</div>
            ))}
            <div style={{ marginBottom: 8 }} />

            {activeConv.messages.map((m, i) => (
              <MessageBlock key={i} role={m.role} content={m.content} />
            ))}

            {(streaming || streamBuf) && (
              <div style={{ marginTop: 4 }}>
                <span style={{ color: '#2ecc71', fontSize: 10 }}>cybermind</span>
                <span style={{ color: '#1a2e45', fontSize: 10 }}> ▶ </span>
                <span style={{ color: '#c4d0e0', fontSize: 12, lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {streamBuf}
                  {streaming && <span style={{ color: ACCENT, animation: 'blink 1s step-end infinite' }}>▌</span>}
                </span>
              </div>
            )}

            {sysLine && (
              <div style={{ marginTop: 8, color: '#e8a838', fontSize: 11, whiteSpace: 'pre', lineHeight: 1.7 }}>
                {sysLine}
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* autocomplete suggestions */}
          {suggestions.length > 0 && (
            <div style={{
              borderTop: '1px solid #1a2e45',
              background: '#070c12',
              padding: '4px 0',
              flexShrink: 0,
              maxHeight: 130,
              overflowY: 'auto',
            }}>
              {suggestions.map((s, i) => (
                <div
                  key={s.name}
                  onMouseDown={e => { e.preventDefault(); applyCompletion(s) }}
                  style={{
                    padding: '3px 14px',
                    display: 'flex', alignItems: 'center', gap: 10,
                    cursor: 'pointer',
                    background: i === suggIdx ? '#0e1e30' : 'transparent',
                    borderLeft: `2px solid ${i === suggIdx ? ACCENT : 'transparent'}`,
                  }}
                  onMouseEnter={() => setSuggIdx(i)}
                >
                  <span style={{ color: i === suggIdx ? '#7ab8f5' : '#4a7aaa', fontSize: 11, minWidth: 160 }}>
                    {s.name}
                  </span>
                  {s.hint && (
                    <span style={{ color: '#2a4a6a', fontSize: 10 }}>{s.hint}</span>
                  )}
                </div>
              ))}
              <div style={{ padding: '2px 14px', color: '#1a2e45', fontSize: 10 }}>
                Tab · ↑↓ · Enter to complete
              </div>
            </div>
          )}

          {/* input bar */}
          <div style={{
            borderTop: '1px solid #1a2e45', padding: '8px 14px',
            display: 'flex', alignItems: 'center', gap: 8,
            background: '#070b10', flexShrink: 0,
          }}>
            <span style={{ color: PROMPT_COLOR, fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{'>'}</span>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              disabled={streaming}
              placeholder={streaming ? '' : 'message ou /cmd...'}
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                color: '#c4d0e0', fontFamily: MONO, fontSize: 12, caretColor: ACCENT,
              }}
            />
            {streaming && <LoadingOutlined style={{ color: ACCENT, fontSize: 13 }} />}
          </div>
        </div>
      )}

      <style>{`@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }`}</style>
    </>
  )
}

function MessageBlock({ role, content }) {
  const isUser = role === 'user'
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
        <span style={{ color: isUser ? ACCENT : '#2ecc71', fontSize: 10 }}>
          {isUser ? 'analyst' : 'cybermind'}
        </span>
        <span style={{ color: '#1a2e45', fontSize: 10 }}> ▶ </span>
      </div>
      <div style={{
        color: isUser ? '#6a9fd8' : '#c4d0e0',
        fontSize: 12, lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        paddingLeft: 4,
        borderLeft: `2px solid ${isUser ? ACCENT + '40' : '#2ecc7130'}`,
        marginLeft: 2,
      }}>
        {content}
      </div>
    </div>
  )
}


