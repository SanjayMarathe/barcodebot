import { useRef, useState, useEffect, useCallback } from 'react'
import { Group as PanelGroup, Panel, Separator as PanelResizeHandle } from 'react-resizable-panels'
import ProductGlobe from './ProductGlobe.jsx'
import { Send, Loader2, DollarSign, ShoppingCart, X, ExternalLink } from 'lucide-react'

const POLL_INTERVAL = 4000
const SANS = "'Plus Jakarta Sans', sans-serif"
const MONO = "'JetBrains Mono', 'SF Mono', monospace"

// ─── Design tokens (Supabase-inspired) ───────────────────────────────────────
const C = {
  bg:           '#0e0e0e',
  surface:      '#141414',
  card:         '#1a1a1a',
  cardHover:    '#1f1f1f',
  border:       'rgba(255,255,255,0.07)',
  borderStrong: 'rgba(255,255,255,0.12)',
  green:        '#3ecf8e',
  greenDim:     'rgba(62,207,142,0.10)',
  greenBorder:  'rgba(62,207,142,0.22)',
  greenHover:   'rgba(62,207,142,0.16)',
  amber:        '#f59e0b',
  textPrimary:  '#f2f2f2',
  textSecondary:'#a1a1aa',
  textMuted:    '#71717a',
  textDim:      '#3f3f46',
}

const now = () =>
  new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })

// ─── Resize Handle ────────────────────────────────────────────────────────────

function ResizeHandle() {
  return (
    <PanelResizeHandle
      className="group relative flex items-center justify-center w-px z-20"
      style={{ backgroundColor: C.border }}
    />
  )
}

function HResizeHandle() {
  return (
    <PanelResizeHandle
      className="group relative flex items-center justify-center h-px z-20"
      style={{ backgroundColor: C.border }}
    />
  )
}

// ─── Feed message components ──────────────────────────────────────────────────

function DetectionEvent({ msg }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-7 h-7 flex-shrink-0 mt-0.5 overflow-hidden flex items-center justify-center"
        style={{ borderRadius: 6, border: `1px solid ${C.border}`, backgroundColor: '#f0f0e8' }}>
        <img src="/twelve.jpeg" alt="" className="w-full h-full object-cover" style={{ borderRadius: 5 }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span style={{ fontFamily: SANS, fontSize: 11, fontWeight: 600, color: C.textMuted }}>TwelveLabs</span>
          <span style={{ fontFamily: MONO, fontSize: 10, color: C.textDim }}>{msg.time}</span>
        </div>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '5px 10px',
          backgroundColor: C.card, border: `1px solid ${C.border}`,
          borderRadius: '0 8px 8px 8px',
        }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: C.green, flexShrink: 0, display: 'inline-block' }} />
          <span style={{ fontFamily: SANS, fontSize: 12, color: C.textSecondary }}>Detected: {msg.name}</span>
        </div>
      </div>
    </div>
  )
}

function BotMessage({ msg }) {
  const agentMatch = msg.text?.match(/^\[([^\]]+)\]/)
  const agentName = agentMatch ? agentMatch[1] : 'Kaimon'
  const displayText = agentMatch ? msg.text.slice(agentMatch[0].length).trim() : msg.text

  return (
    <div className="flex items-start gap-3">
      <div className="w-7 h-7 flex-shrink-0 mt-0.5 overflow-hidden"
        style={{ borderRadius: 6, border: `1px solid ${C.border}` }}>
        <img src="/agent-logo.jpeg" alt="" className="w-full h-full object-cover" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span style={{ fontFamily: SANS, fontSize: 11, fontWeight: 600, color: C.textMuted }}>{agentName}</span>
          <span style={{ fontFamily: MONO, fontSize: 10, color: C.textDim }}>{msg.time}</span>
        </div>
        <div style={{
          padding: '8px 12px',
          backgroundColor: C.card, border: `1px solid ${C.border}`,
          borderRadius: '0 8px 8px 8px',
        }}>
          {msg.pending
            ? <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Loader2 style={{ width: 12, height: 12, color: C.textMuted }} className="animate-spin flex-shrink-0" />
                <span style={{ fontFamily: MONO, fontSize: 11, color: C.textMuted }}>Analyzing…</span>
              </span>
            : <span style={{ fontFamily: SANS, fontSize: 13, lineHeight: 1.6, color: C.textSecondary }}>{displayText}</span>
          }
        </div>
      </div>
    </div>
  )
}

function UserMessage({ msg }) {
  return (
    <div className="flex items-start gap-3 flex-row-reverse">
      <div className="w-7 h-7 flex-shrink-0 mt-0.5 flex items-center justify-center"
        style={{ borderRadius: 6, backgroundColor: C.greenDim, border: `1px solid ${C.greenBorder}` }}>
        <span style={{ fontFamily: SANS, fontSize: 9, fontWeight: 700, color: C.green }}>You</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-end mb-1">
          <span style={{ fontFamily: MONO, fontSize: 10, color: C.textDim }}>{msg.time}</span>
        </div>
        <div style={{
          padding: '8px 12px',
          backgroundColor: '#1e2a22',
          border: `1px solid ${C.greenBorder}`,
          borderRadius: '8px 0 8px 8px',
          maxWidth: '88%', marginLeft: 'auto', display: 'inline-block',
        }}>
          <span style={{ fontFamily: SANS, fontSize: 13, lineHeight: 1.6, color: C.textPrimary }}>{msg.text}</span>
        </div>
      </div>
    </div>
  )
}

function SystemMessage({ msg }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '2px 0' }}>
      <div style={{ flex: 1, height: 1, backgroundColor: C.border }} />
      <span style={{ fontFamily: MONO, fontSize: 10, color: C.textDim, flexShrink: 0 }}>{msg.text}</span>
      <div style={{ flex: 1, height: 1, backgroundColor: C.border }} />
    </div>
  )
}

// ─── Load Funds Modal ─────────────────────────────────────────────────────────

function LoadFundsModal({ onClose, onLoad, loading }) {
  const [custom, setCustom] = useState('')

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backgroundColor: 'rgba(0,0,0,0.72)',
      backdropFilter: 'blur(4px)',
    }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        width: '100%', maxWidth: 400, margin: '0 16px',
        borderRadius: 12, padding: '24px',
        backgroundColor: C.surface, border: `1px solid ${C.borderStrong}`,
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontFamily: SANS, fontSize: 16, fontWeight: 600, color: C.textPrimary }}>
            Load Shopping Budget
          </span>
          <button onClick={onClose} style={{
            width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`,
            cursor: 'pointer',
          }}>
            <X style={{ width: 13, height: 13, color: C.textMuted }} />
          </button>
        </div>
        <p style={{ fontFamily: MONO, fontSize: 11, color: C.textDim, marginBottom: 20 }}>
          Authorized via Stripe · test mode
        </p>

        {/* Preset amounts */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          {[1000, 2500, 5000].map(cents => (
            <button
              key={cents}
              onClick={() => !loading && onLoad(cents)}
              disabled={loading}
              style={{
                flex: 1, padding: '12px 0',
                fontFamily: SANS, fontSize: 15, fontWeight: 600,
                borderRadius: 8,
                backgroundColor: C.greenDim,
                border: `1px solid ${C.greenBorder}`,
                color: C.green,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.5 : 1,
                transition: 'background-color 0.15s',
              }}
            >
              ${cents / 100}
            </button>
          ))}
        </div>

        {/* Custom amount */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px',
            borderRadius: 8, backgroundColor: C.card, border: `1px solid ${C.border}`,
          }}>
            <span style={{ fontFamily: MONO, fontSize: 13, color: C.textDim }}>$</span>
            <input
              type="number"
              value={custom}
              onChange={e => setCustom(e.target.value)}
              placeholder="Custom amount"
              style={{
                flex: 1, background: 'none', border: 'none', outline: 'none',
                fontFamily: MONO, fontSize: 13, color: C.textPrimary,
              }}
            />
          </div>
          <button
            onClick={() => {
              const cents = Math.round(parseFloat(custom || '0') * 100)
              if (cents >= 100) onLoad(cents)
            }}
            disabled={!custom || loading}
            style={{
              padding: '10px 16px',
              fontFamily: SANS, fontSize: 13, fontWeight: 600,
              borderRadius: 8,
              backgroundColor: custom && !loading ? C.greenDim : 'rgba(255,255,255,0.03)',
              border: `1px solid ${custom && !loading ? C.greenBorder : C.border}`,
              color: custom && !loading ? C.green : C.textDim,
              cursor: custom && !loading ? 'pointer' : 'not-allowed',
              transition: 'all 0.15s',
            }}
          >
            Load
          </button>
        </div>

        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 14 }}>
            <Loader2 style={{ width: 13, height: 13, color: C.green }} className="animate-spin" />
            <span style={{ fontFamily: MONO, fontSize: 11, color: C.textMuted }}>Opening checkout · polling for payment</span>
          </div>
        )}

        <p style={{ fontFamily: MONO, fontSize: 10, textAlign: 'center', color: C.textDim }}>
          Test card: 4242 4242 4242 4242 · any exp/CVC
        </p>
      </div>
    </div>
  )
}

// ─── Agent event → readable text ─────────────────────────────────────────────

function _agentEventToText(e) {
  const a = e.agent_name, p = e.payload || {}
  switch (e.event_type) {
    case 'run_started':     return `[orchestrator] run started`
    case 'buy_started':     return `[${a}] starting purchase: ${p.item_name || ''}`
    case 'session_created': return `[${a}] browser session open · ${p.item_name || ''}`
    case 'buy_done':        return `[${a}] ${p.status || 'done'}: ${p.item_name || ''}${p.error ? ' — ' + p.error : ''}`
    case 'ranking_done':    return `[ranker] picked: ${(p.chosen_title || '').slice(0, 50)} — $${p.chosen_price ?? ''}`
    case 'payment_complete': return `[${a}] payment confirmed`
    default: return null
  }
}

// ─── Browser Panel ────────────────────────────────────────────────────────────

const BUYER_SLOTS = ['buyer_a', 'buyer_b', 'buyer_c', 'buyer_d']

function BrowserPanel({ sessions, activeRunId }) {
  const sessionMap = Object.fromEntries((sessions || []).map(s => [s.agent_name, s]))

  return (
    <div style={{ backgroundColor: C.bg, height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{
        padding: '10px 16px',
        borderBottom: `1px solid ${C.border}`,
        flexShrink: 0,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{ fontFamily: MONO, fontSize: 10, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Live Agents
        </span>
        {activeRunId && (
          <span style={{
            fontFamily: MONO, fontSize: 10, color: C.textDim,
            padding: '1px 6px', borderRadius: 4,
            backgroundColor: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`,
          }}>
            {activeRunId.slice(0, 8)}
          </span>
        )}
      </div>

      {/* Agent cards */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1 }}>
        {BUYER_SLOTS.map(agentName => {
          const session = sessionMap[agentName]
          const dotColor = session?.status === 'running' ? C.green
            : session?.status === 'success' ? '#60a5fa'
            : C.textDim
          return (
            <div key={agentName} style={{
              flexShrink: 0, height: '50%', minHeight: 180,
              display: 'flex', flexDirection: 'column',
              borderBottom: `1px solid ${C.border}`,
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '5px 12px', flexShrink: 0,
                backgroundColor: C.surface,
              }}>
                <span style={{
                  width: 6, height: 6, borderRadius: '50%',
                  backgroundColor: dotColor, flexShrink: 0,
                }} />
                <span style={{
                  fontFamily: MONO, fontSize: 9, color: C.textMuted,
                  flex: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                }}>
                  {agentName.replace('_', ' ')}{session?.item_name ? ` · ${session.item_name}` : ''}
                </span>
                {session?.live_view_url && (
                  <a href={session.live_view_url} target="_blank" rel="noopener noreferrer"
                    style={{ color: '#60a5fa', flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                    <ExternalLink style={{ width: 9, height: 9 }} />
                  </a>
                )}
              </div>

              <div style={{ flex: 1, minHeight: 0, position: 'relative', overflow: 'hidden' }}>
                {session?.live_view_url ? (
                  <iframe
                    src={session.live_view_url}
                    allow="clipboard-read; clipboard-write"
                    style={{
                      border: 'none', display: 'block',
                      width: '167%', height: '167%',
                      transform: 'scale(0.6)', transformOrigin: 'top left',
                    }}
                    title={`${agentName} live session`}
                  />
                ) : (
                  <div style={{
                    height: '100%', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span style={{
                      fontFamily: MONO, fontSize: 9,
                      color: C.textDim, letterSpacing: '0.15em',
                    }}>
                      {activeRunId ? '· waiting ·' : '· idle ·'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Left Panel ───────────────────────────────────────────────────────────────

function LeftPanel({
  messages, setMessages, connected, enriching,
  balance, onLoadFunds, onBuy, buying, detectedObjects, buyPrices, setBuyPrices,
  cartItems = [], onRemoveCartItem,
}) {
  const [input, setInput] = useState('')
  const [asking, setAsking] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function onSend() {
    const text = input.trim()
    if (!text || asking) return

    const userMsg = { id: Date.now(), role: 'user', text, time: now() }
    const pendingId = Date.now() + 1
    setMessages(prev => [...prev, userMsg, { id: pendingId, role: 'bot', text: '', time: now(), pending: true }])
    setInput('')
    setAsking(true)

    try {
      const res = await fetch('http://localhost:8000/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: text }),
      })
      const data = await res.json()
      setMessages(prev => prev.map(m =>
        m.id === pendingId ? { ...m, pending: false, text: data.answer, time: now() } : m
      ))
    } catch {
      setMessages(prev => prev.map(m =>
        m.id === pendingId ? { ...m, pending: false, text: 'Could not reach backend.', time: now() } : m
      ))
    } finally {
      setAsking(false)
    }
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend() }
  }

  const detectionCount = messages.filter(m => m.variant === 'detection').length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: C.bg }}>

      {/* Panel Header */}
      <div style={{
        flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 16px',
        backgroundColor: C.surface, borderBottom: `1px solid ${C.border}`,
      }}>
        <div style={{
          width: 28, height: 28, overflow: 'hidden', flexShrink: 0,
          borderRadius: 6, border: `1px solid ${C.borderStrong}`,
        }}>
          <img src="/agent-logo.jpeg" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontFamily: SANS, fontSize: 13, fontWeight: 600, color: C.textPrimary, lineHeight: 1 }}>Kaimon</p>
          <p style={{ fontFamily: MONO, fontSize: 10, color: C.textDim, marginTop: 3, lineHeight: 1 }}>
            Pegasus 1.2 · Claude Haiku
          </p>
        </div>

        {/* Status badge */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '4px 9px', borderRadius: 6,
          backgroundColor: connected ? C.greenDim : 'rgba(255,255,255,0.03)',
          border: `1px solid ${connected ? C.greenBorder : C.border}`,
        }}>
          {enriching
            ? <Loader2 style={{ width: 10, height: 10, color: C.green }} className="animate-spin" />
            : <span style={{
                width: 5, height: 5, borderRadius: '50%',
                backgroundColor: connected ? C.green : C.textDim,
              }} />
          }
          <span style={{
            fontFamily: MONO, fontSize: 10, fontWeight: 500,
            color: connected ? C.green : C.textMuted,
          }}>
            {enriching ? 'Enriching' : connected ? 'Live' : 'Offline'}
          </span>
        </div>

        {/* Balance / Load Funds */}
        {balance ? (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '4px 9px', borderRadius: 6,
            backgroundColor: C.greenDim, border: `1px solid ${C.greenBorder}`,
          }}>
            <DollarSign style={{ width: 11, height: 11, color: C.green }} />
            <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 500, color: C.green }}>
              ${balance.amount.toFixed(2)}
            </span>
          </div>
        ) : (
          <button onClick={onLoadFunds} style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '4px 9px', borderRadius: 6,
            backgroundColor: 'rgba(255,255,255,0.03)', border: `1px solid ${C.border}`,
            cursor: 'pointer', transition: 'all 0.15s',
          }}>
            <DollarSign style={{ width: 11, height: 11, color: C.textMuted }} />
            <span style={{ fontFamily: SANS, fontSize: 11, fontWeight: 500, color: C.textMuted }}>
              Load Funds
            </span>
          </button>
        )}
      </div>

      {/* Cart */}
      {cartItems.length > 0 && (
        <div style={{ flexShrink: 0, borderBottom: `1px solid ${C.border}` }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 16px', backgroundColor: C.surface,
          }}>
            <ShoppingCart style={{ width: 11, height: 11, color: C.textMuted, flexShrink: 0 }} />
            <span style={{ fontFamily: SANS, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', flex: 1, color: C.textMuted }}>
              Cart
            </span>
            <span style={{
              fontFamily: MONO, fontSize: 10, color: C.textDim,
              padding: '1px 6px', borderRadius: 4,
              backgroundColor: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`,
            }}>
              {cartItems.length} item{cartItems.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div style={{ padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {cartItems.map(item => (
              <div key={item.item_name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: SANS, fontSize: 12, color: C.textSecondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.title || item.item_name}
                  </p>
                  <p style={{ fontFamily: MONO, fontSize: 10, color: C.green, marginTop: 1 }}>
                    ${typeof item.price === 'number' ? item.price.toFixed(2) : item.price}
                    {item.rating ? ` · ⭐ ${item.rating}` : ''}
                  </p>
                </div>
                <button
                  onClick={() => onRemoveCartItem?.(item.item_name)}
                  style={{
                    flexShrink: 0, width: 18, height: 18,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderRadius: 4, color: C.textDim, background: 'none', border: 'none', cursor: 'pointer',
                  }}
                >
                  <X style={{ width: 11, height: 11 }} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detection count bar */}
      {detectionCount > 0 && (
        <div style={{
          flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8,
          padding: '6px 16px',
          backgroundColor: C.surface, borderBottom: `1px solid ${C.border}`,
        }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: C.green }} />
          <span style={{ fontFamily: SANS, fontSize: 11, fontWeight: 500, color: C.textSecondary }}>
            Detection Log
          </span>
          <span style={{
            marginLeft: 'auto',
            fontFamily: MONO, fontSize: 10, color: C.textDim,
            padding: '1px 6px', borderRadius: 4,
            backgroundColor: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`,
          }}>
            {detectionCount} objects
          </span>
        </div>
      )}

      {/* Message feed */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {messages.map(msg => {
            if (msg.variant === 'system') return <SystemMessage key={msg.id} msg={msg} />
            if (msg.variant === 'detection') return <DetectionEvent key={msg.id} msg={msg} />
            if (msg.role === 'user') return <UserMessage key={msg.id} msg={msg} />
            return <BotMessage key={msg.id} msg={msg} />
          })}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Buy section */}
      {detectedObjects.length > 0 && (
        <div style={{ flexShrink: 0, padding: '12px 16px', borderTop: `1px solid ${C.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontFamily: SANS, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: C.textDim }}>
              Buy Detected Items
            </span>
            {balance && (
              <span style={{ fontFamily: MONO, fontSize: 10, color: C.textDim }}>
                budget: ${balance.amount.toFixed(2)}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
            {detectedObjects.slice(0, 5).map(name => (
              <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ flex: 1, fontFamily: SANS, fontSize: 12, color: C.textSecondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {name}
                </span>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '4px 8px', borderRadius: 6,
                  backgroundColor: C.card, border: `1px solid ${C.border}`,
                }}>
                  <span style={{ fontFamily: MONO, fontSize: 10, color: C.textDim }}>$</span>
                  <input
                    type="number"
                    value={buyPrices[name] || ''}
                    onChange={e => setBuyPrices(p => ({ ...p, [name]: e.target.value }))}
                    placeholder="50"
                    style={{
                      width: 44, background: 'none', border: 'none', outline: 'none',
                      fontFamily: MONO, fontSize: 11, color: C.textPrimary, textAlign: 'right',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={onBuy}
            disabled={!balance || buying}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              padding: '9px 0',
              borderRadius: 8,
              backgroundColor: balance && !buying ? C.greenDim : 'rgba(255,255,255,0.03)',
              border: `1px solid ${balance && !buying ? C.greenBorder : C.border}`,
              cursor: balance && !buying ? 'pointer' : 'not-allowed',
              transition: 'all 0.15s',
            }}
          >
            {buying
              ? <Loader2 style={{ width: 13, height: 13, color: C.green }} className="animate-spin" />
              : <ShoppingCart style={{ width: 13, height: 13, color: balance ? C.green : C.textDim }} />
            }
            <span style={{
              fontFamily: SANS, fontSize: 12, fontWeight: 600,
              color: balance && !buying ? C.green : C.textDim,
            }}>
              {buying ? 'Buying…' : balance ? `Buy Now · $${balance.amount.toFixed(2)} budget` : 'Load Funds to Buy'}
            </span>
          </button>
        </div>
      )}

      {/* Input */}
      <div style={{
        flexShrink: 0, padding: '12px 16px',
        borderTop: detectedObjects.length > 0 ? 'none' : `1px solid ${C.border}`,
      }}>
        <div style={{
          display: 'flex', alignItems: 'flex-end', gap: 8,
          borderRadius: 10, border: `1px solid ${C.borderStrong}`,
          backgroundColor: C.card, transition: 'border-color 0.15s',
        }}>
          <textarea
            rows={2}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Ask about detected objects…"
            disabled={asking}
            style={{
              flex: 1, background: 'none', border: 'none', outline: 'none',
              resize: 'none', lineHeight: 1.5,
              padding: '10px 14px',
              fontFamily: SANS, fontSize: 13, color: C.textPrimary,
            }}
          />
          <button
            onClick={onSend}
            disabled={!input.trim() || asking}
            style={{
              flexShrink: 0, width: 34, height: 34,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 8px 8px 0', borderRadius: 8,
              backgroundColor: input.trim() && !asking ? C.green : 'rgba(255,255,255,0.05)',
              border: 'none',
              cursor: input.trim() && !asking ? 'pointer' : 'not-allowed',
              transition: 'background-color 0.15s',
            }}
          >
            {asking
              ? <Loader2 style={{ width: 14, height: 14, color: input.trim() ? '#0e0e0e' : C.textDim }} className="animate-spin" />
              : <Send style={{ width: 14, height: 14, color: input.trim() && !asking ? '#0e0e0e' : C.textDim }} />
            }
          </button>
        </div>
        <p style={{ fontFamily: MONO, fontSize: 10, color: C.textDim, marginTop: 6, textAlign: 'right' }}>
          Enter to send · Shift+Enter for newline
        </p>
      </div>
    </div>
  )
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [messages, setMessages] = useState([{
    id: 0, variant: 'system', text: `session started · ${now()}`, time: now(),
  }])
  const [globePins, setGlobePins]           = useState([])
  const [enriching, setEnriching]           = useState(false)
  const [connected, setConnected]           = useState(false)
  const [balance, setBalance]               = useState(null)
  const [showLoadFunds, setShowLoadFunds]   = useState(false)
  const [loadingFunds, setLoadingFunds]     = useState(false)
  const [buyPrices, setBuyPrices]           = useState({})
  const [buying, setBuying]                 = useState(false)
  const [cartItems, setCartItems]           = useState([])
  const [focusPin, setFocusPin]             = useState(null)
  const [activeRunId, setActiveRunId]       = useState('')
  const [browserSessions, setBrowserSessions] = useState([])

  const seenObjectsRef      = useRef(new Set())
  const hadDataRef          = useRef(false)
  const rankerOffsetRef     = useRef(0)
  const focusPinTimeoutRef  = useRef(null)
  const agentEventOffsetRef = useRef(0)

  const detectedObjects = messages
    .filter(m => m.variant === 'detection')
    .map(m => m.name)
    .filter((n, i, a) => a.indexOf(n) === i)

  async function handleLoadFunds(cents) {
    setLoadingFunds(true)
    try {
      const res = await fetch('http://localhost:8000/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount_cents: cents }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Checkout failed')

      window.open(data.checkout_url, '_blank')

      let tries = 0
      const poll = setInterval(async () => {
        tries++
        if (tries > 30) { clearInterval(poll); setLoadingFunds(false); return }
        try {
          const vRes = await fetch(`http://localhost:8000/stripe-session-status/${data.session_id}`)
          const vData = await vRes.json()
          if (vData.status === 'paid') {
            clearInterval(poll)
            const amount = (vData.amount_total ?? cents) / 100
            setBalance({ amount, session_id: data.session_id })
            setShowLoadFunds(false)
            setLoadingFunds(false)
            setMessages(prev => [...prev, {
              id: Date.now(), variant: 'system',
              text: `$${amount.toFixed(2)} loaded · ready to buy`, time: now(),
            }])
          }
        } catch {}
      }, 2000)
    } catch (e) {
      setMessages(prev => [...prev, {
        id: Date.now(), variant: 'system',
        text: `Checkout error: ${e.message}`, time: now(),
      }])
      setLoadingFunds(false)
    }
  }

  async function handleBuy() {
    if (!balance || buying) return
    setBuying(true)
    try {
      const res = await fetch('http://localhost:8000/trigger-buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          objects: detectedObjects,
          prices: buyPrices,
          stripe_session_id: balance.session_id,
          total_budget: balance.amount,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Buy failed')
      setActiveRunId(data.run_id || '')
      agentEventOffsetRef.current = 0
      setMessages(prev => [...prev, {
        id: Date.now(), variant: 'system',
        text: `shopping run dispatched · run_id ${data.run_id?.slice(0, 8) ?? 'ok'}`, time: now(),
      }])
      setBalance(null)
    } catch (e) {
      setMessages(prev => [...prev, {
        id: Date.now(), variant: 'system',
        text: `Buy error: ${e.message}`, time: now(),
      }])
    } finally {
      setBuying(false)
    }
  }

  const pollGlobeState = useCallback(async () => {
    try {
      const res = await fetch('http://localhost:8000/globe-state')
      if (!res.ok) { setConnected(false); return }
      setConnected(true)
      const data = await res.json()
      setGlobePins(data.pins || [])
      if (typeof data.enriching === 'boolean') setEnriching(data.enriching)

      const isEmpty = !data.last_updated && (!data.objects || data.objects.length === 0)
      if (isEmpty && hadDataRef.current) {
        hadDataRef.current = false
        seenObjectsRef.current.clear()
        setBalance(null)
        setBuyPrices({})
        setCartItems([])
        setFocusPin(null)
        setActiveRunId('')
        setBrowserSessions([])
        rankerOffsetRef.current = 0
        agentEventOffsetRef.current = 0
        setMessages([{ id: 0, variant: 'system', text: `session cleared · ${now()}`, time: now() }])
        return
      }

      if (data.objects && data.objects.length > 0 && data.last_updated) {
        hadDataRef.current = true
        const key = data.last_updated + ':' + data.objects.join(',')
        if (!seenObjectsRef.current.has(key)) {
          seenObjectsRef.current.add(key)
          const ts = now()
          data.objects.forEach((name, i) => {
            setMessages(prev => [...prev, {
              id: Date.now() + i + Math.random(), variant: 'detection', name, time: ts,
            }])
          })
        }
      }
    } catch {
      setConnected(false)
    }
  }, [])

  const pollCartState = useCallback(async () => {
    try {
      const res = await fetch('http://localhost:8000/cart-state')
      if (!res.ok) return
      const data = await res.json()
      const newItems = data.items || []
      setCartItems(prev => {
        if (newItems.length > prev.length) {
          const newest = newItems[newItems.length - 1]
          setGlobePins(pins => {
            const match = pins.find(p =>
              p.object?.toLowerCase().includes(newest.item_name?.toLowerCase()) ||
              newest.item_name?.toLowerCase().includes(p.object?.toLowerCase())
            )
            if (match) {
              clearTimeout(focusPinTimeoutRef.current)
              setFocusPin({ lat: match.lat, lng: match.lng })
              focusPinTimeoutRef.current = setTimeout(() => setFocusPin(null), 5000)
            }
            return pins
          })
        }
        return newItems
      })
    } catch {}
  }, [])

  const pollRankerThoughts = useCallback(async () => {
    try {
      const res = await fetch(`http://localhost:8000/ranker-thoughts?since=${rankerOffsetRef.current}`)
      if (!res.ok) return
      const data = await res.json()
      if (data.thoughts?.length) {
        const ts = now()
        data.thoughts.forEach(t => {
          setMessages(prev => [...prev, {
            id: Date.now() + Math.random(),
            role: 'bot', text: `[Ranker] ${t.text}`, time: ts,
          }])
        })
        rankerOffsetRef.current = data.total
      }
    } catch {}
  }, [])

  const pollActiveRunId = useCallback(async () => {
    try {
      const res = await fetch('http://localhost:8000/active-run-id')
      if (!res.ok) return
      const data = await res.json()
      if (data.run_id) {
        setActiveRunId(prev => {
          if (prev !== data.run_id) agentEventOffsetRef.current = 0
          return data.run_id
        })
      }
    } catch {}
  }, [])

  const pollBrowserSessions = useCallback(async () => {
    try {
      const res = await fetch(`http://localhost:8000/run-sessions?run_id=${activeRunId}`)
      if (!res.ok) return
      const data = await res.json()
      setBrowserSessions((data.sessions || []).slice(0, 4))
    } catch {}
  }, [activeRunId])

  const pollAgentEvents = useCallback(async () => {
    try {
      const res = await fetch(`http://localhost:8000/run-agent-events?run_id=${activeRunId}&since=${agentEventOffsetRef.current}`)
      if (!res.ok) return
      const data = await res.json()
      if (data.events?.length) {
        const ts = now()
        data.events.forEach(e => {
          const text = _agentEventToText(e)
          if (text) setMessages(prev => [...prev, { id: Date.now() + Math.random(), role: 'bot', text, time: ts }])
        })
        agentEventOffsetRef.current = data.total
      }
    } catch {}
  }, [activeRunId])

  useEffect(() => {
    pollGlobeState()
    const interval = setInterval(pollGlobeState, POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [pollGlobeState])

  useEffect(() => {
    pollCartState()
    const interval = setInterval(pollCartState, 3000)
    return () => clearInterval(interval)
  }, [pollCartState])

  useEffect(() => {
    const interval = setInterval(pollRankerThoughts, 2000)
    return () => clearInterval(interval)
  }, [pollRankerThoughts])

  useEffect(() => {
    const interval = setInterval(pollActiveRunId, 3000)
    return () => clearInterval(interval)
  }, [pollActiveRunId])

  useEffect(() => {
    const interval = setInterval(pollBrowserSessions, 3000)
    return () => clearInterval(interval)
  }, [pollBrowserSessions])

  useEffect(() => {
    const interval = setInterval(pollAgentEvents, 2000)
    return () => clearInterval(interval)
  }, [pollAgentEvents])

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: C.bg }}>
      {showLoadFunds && (
        <LoadFundsModal
          onClose={() => { setShowLoadFunds(false); setLoadingFunds(false) }}
          onLoad={handleLoadFunds}
          loading={loadingFunds}
        />
      )}

      {/* Top bar */}
      <div style={{
        flexShrink: 0, display: 'flex', alignItems: 'center', gap: 16,
        padding: '0 20px', height: 44,
        backgroundColor: C.surface, borderBottom: `1px solid ${C.border}`,
      }}>
        {/* Logo + wordmark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 5,
            background: `linear-gradient(135deg, ${C.green}22, ${C.green}44)`,
            border: `1px solid ${C.greenBorder}`,
          }}>
            <span style={{ fontSize: 11, color: C.green, lineHeight: 1 }}>⬡</span>
          </div>
          <span style={{ fontFamily: SANS, fontSize: 14, fontWeight: 700, color: C.textPrimary, letterSpacing: '-0.4px' }}>
            Kaimon
          </span>
          <span style={{
            fontFamily: MONO, fontSize: 9, color: C.textDim,
            padding: '1px 5px', borderRadius: 4,
            backgroundColor: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`,
          }}>
            v1.0
          </span>
        </div>

        <div style={{ width: 1, height: 16, backgroundColor: C.border }} />

        <span style={{ fontFamily: MONO, fontSize: 10, color: C.textDim }}>
          Pegasus 1.2 · Claude Haiku · Fetch.ai
        </span>

        <div style={{ marginLeft: 'auto' }}>
          <LiveClock />
        </div>
      </div>

      {/* Panels */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <PanelGroup direction="vertical" style={{ width: '100%', height: '100%' }}>
          {/* Top row: chat + browser agents */}
          <Panel defaultSize={55} minSize={25}>
            <PanelGroup direction="horizontal" style={{ width: '100%', height: '100%' }}>
              <Panel defaultSize={40} minSize={25}>
                <LeftPanel
                  messages={messages}
                  setMessages={setMessages}
                  connected={connected}
                  enriching={enriching}
                  balance={balance}
                  onLoadFunds={() => setShowLoadFunds(true)}
                  onBuy={handleBuy}
                  buying={buying}
                  detectedObjects={detectedObjects}
                  buyPrices={buyPrices}
                  setBuyPrices={setBuyPrices}
                  cartItems={cartItems}
                  onRemoveCartItem={async (name) => {
                    setCartItems(prev => prev.filter(i => i.item_name !== name))
                    try { await fetch(`http://localhost:8000/cart/item/${encodeURIComponent(name)}`, { method: 'DELETE' }) } catch {}
                  }}
                />
              </Panel>
              <ResizeHandle />
              <Panel defaultSize={60} minSize={35}>
                <BrowserPanel sessions={browserSessions} activeRunId={activeRunId} />
              </Panel>
            </PanelGroup>
          </Panel>
          <HResizeHandle />
          {/* Bottom row: 3D product globe */}
          <Panel defaultSize={45} minSize={20}>
            <ProductGlobe
              pins={globePins}
              enriching={enriching}
              detectedObjects={detectedObjects}
            />
          </Panel>
        </PanelGroup>
      </div>
    </div>
  )
}

function LiveClock() {
  const [time, setTime] = useState(now())
  useEffect(() => {
    const t = setInterval(() => setTime(now()), 1000)
    return () => clearInterval(t)
  }, [])
  return (
    <span style={{ fontFamily: MONO, fontSize: 10, color: C.textDim }}>{time}</span>
  )
}
