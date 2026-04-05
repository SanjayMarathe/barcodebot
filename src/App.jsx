import { useRef, useState, useEffect, useCallback } from 'react'
import { Group as PanelGroup, Panel, Separator as PanelResizeHandle } from 'react-resizable-panels'
import { Send, Loader2, DollarSign, ShoppingCart, X } from 'lucide-react'

const POLL_INTERVAL = 4000
const MONO = "'SF Mono', 'Monaco', 'Cascadia Code', monospace"

// Mobile-matched palette
const C = {
  bg:          '#08080a',
  surface:     '#0e0e12',
  card:        '#14141a',
  border:      'rgba(255,255,255,0.08)',
  borderBright:'rgba(255,255,255,0.14)',
  emerald:     '#34d399',
  emeraldDim:  'rgba(52,211,153,0.12)',
  emeraldBorder:'rgba(52,211,153,0.21)',  // emerald + '35'
  emeraldHdr:  'rgba(52,211,153,0.08)',
  cyan:        '#22d3ee',
  cyanDim:     'rgba(34,211,238,0.15)',
  textPrimary: '#f1f5f9',
  textSecondary:'#94a3b8',
  textMuted:   '#475569',
  textDim:     '#334155',
}

const now = () =>
  new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })

// ─── Resize Handle ────────────────────────────────────────────────────────────

function ResizeHandle() {
  return (
    <PanelResizeHandle
      className="group relative flex items-center justify-center w-px z-20 transition-colors"
      style={{ backgroundColor: C.border }}
    />
  )
}

// ─── Feed message components ──────────────────────────────────────────────────

function DetectionEvent({ msg }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 flex-shrink-0 mt-0.5 overflow-hidden flex items-center justify-center" style={{ borderRadius: 8, border: `1px solid ${C.border}`, backgroundColor: '#f0f0e8' }}>
        <img src="/twelve.jpeg" alt="" className="w-full h-full object-cover" style={{ borderRadius: 7 }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-[12px] font-semibold" style={{ color: C.textSecondary }}>TwelveLabs</span>
          <span className="text-[10px]" style={{ fontFamily: MONO, color: C.textDim }}>{msg.time}</span>
        </div>
        <div className="px-4 py-3 text-[13px] leading-relaxed" style={{
          backgroundColor: C.card, border: `1px solid ${C.border}`,
          borderRadius: '14px 14px 14px 4px', color: C.textSecondary,
        }}>
          Detected: {msg.name}
        </div>
      </div>
    </div>
  )
}

function BotMessage({ msg }) {
  // Extract agent name from "[agent_name] ..." prefix, fallback to "BarcodeBot"
  const agentMatch = msg.text?.match(/^\[([^\]]+)\]/)
  const agentName = agentMatch ? agentMatch[1] : 'BarcodeBot'
  const displayText = agentMatch ? msg.text.slice(agentMatch[0].length).trim() : msg.text

  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 flex-shrink-0 mt-0.5 overflow-hidden" style={{ borderRadius: 8, border: `1px solid ${C.border}` }}>
        <img src="/agent-logo.jpeg" alt="" className="w-full h-full object-cover" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-[12px] font-semibold" style={{ color: C.textSecondary }}>{agentName}</span>
          <span className="text-[10px]" style={{ fontFamily: MONO, color: C.textDim }}>{msg.time}</span>
        </div>
        <div className="px-4 py-3 text-[13px] leading-relaxed" style={{
          backgroundColor: C.card, border: `1px solid ${C.border}`,
          borderRadius: '14px 14px 14px 4px', color: C.textSecondary,
        }}>
          {msg.pending
            ? <span className="flex items-center gap-2" style={{ color: C.textMuted }}>
                <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
                <span style={{ fontFamily: MONO, fontSize: 11 }}>Analyzing…</span>
              </span>
            : displayText
          }
        </div>
      </div>
    </div>
  )
}

function UserMessage({ msg }) {
  return (
    <div className="flex items-start gap-3 flex-row-reverse">
      <div className="w-8 h-8 flex-shrink-0 mt-0.5 flex items-center justify-center" style={{
        borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.07)', border: `1px solid ${C.borderBright}`,
      }}>
        <span className="text-[10px] font-bold" style={{ color: 'rgba(255,255,255,0.45)' }}>You</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-end mb-1.5">
          <span className="text-[10px]" style={{ fontFamily: MONO, color: C.textDim }}>{msg.time}</span>
        </div>
        <div className="px-4 py-3 text-[13px] leading-relaxed ml-auto" style={{
          backgroundColor: '#fff', color: '#111',
          borderRadius: '14px 4px 14px 14px', maxWidth: '88%', display: 'inline-block',
        }}>
          {msg.text}
        </div>
      </div>
    </div>
  )
}

function SystemMessage({ msg }) {
  return (
    <div className="flex items-center gap-3 py-0.5">
      <div className="flex-1 h-px" style={{ backgroundColor: C.border }} />
      <p className="text-[10px] flex-shrink-0" style={{ fontFamily: MONO, color: C.textDim }}>{msg.text}</p>
      <div className="flex-1 h-px" style={{ backgroundColor: C.border }} />
    </div>
  )
}

// ─── Load Funds Modal ─────────────────────────────────────────────────────────

function LoadFundsModal({ onClose, onLoad, loading }) {
  const [custom, setCustom] = useState('')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.78)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md mx-4 rounded-2xl p-7"
        style={{ backgroundColor: C.surface, border: `1px solid ${C.borderBright}` }}>

        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <p className="text-[18px] font-semibold" style={{ color: C.textPrimary }}>Load Shopping Budget</p>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center"
            style={{ borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.06)', border: `1px solid ${C.border}` }}>
            <X className="w-4 h-4" style={{ color: C.textSecondary }} />
          </button>
        </div>
        <p className="text-[12px] mb-6" style={{ fontFamily: MONO, color: C.textMuted }}>
          Funds authorized via Stripe · test mode
        </p>

        {/* Preset amounts */}
        <div className="flex gap-3 mb-4">
          {[1000, 2500, 5000].map(cents => (
            <button
              key={cents}
              onClick={() => !loading && onLoad(cents)}
              disabled={loading}
              className="flex-1 py-4 text-[17px] font-semibold transition-all"
              style={{
                borderRadius: 10,
                backgroundColor: 'rgba(34,211,238,0.08)',
                border: `1px solid rgba(34,211,238,0.22)`,
                color: C.cyan,
                opacity: loading ? 0.5 : 1,
              }}
            >
              ${cents / 100}
            </button>
          ))}
        </div>

        {/* Custom amount */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center flex-1 gap-2 px-4 py-3"
            style={{ borderRadius: 10, backgroundColor: C.card, border: `1px solid ${C.border}` }}>
            <span className="text-[14px]" style={{ color: C.textMuted, fontFamily: MONO }}>$</span>
            <input
              type="number"
              value={custom}
              onChange={e => setCustom(e.target.value)}
              placeholder="Custom amount"
              className="flex-1 bg-transparent outline-none text-[14px]"
              style={{ fontFamily: MONO, color: C.textPrimary }}
            />
          </div>
          <button
            onClick={() => {
              const cents = Math.round(parseFloat(custom || '0') * 100)
              if (cents >= 100) onLoad(cents)
            }}
            disabled={!custom || loading}
            className="px-5 py-3 text-[14px] font-semibold transition-all"
            style={{
              borderRadius: 10,
              backgroundColor: custom && !loading ? C.cyanDim : 'rgba(255,255,255,0.04)',
              border: `1px solid ${custom && !loading ? 'rgba(34,211,238,0.35)' : C.border}`,
              color: custom && !loading ? C.cyan : C.textDim,
            }}
          >
            Load
          </button>
        </div>

        {loading && (
          <div className="flex items-center justify-center gap-2 mb-4">
            <Loader2 className="w-4 h-4 animate-spin" style={{ color: C.cyan }} />
            <span className="text-[12px]" style={{ fontFamily: MONO, color: C.textMuted }}>
              Opening checkout… polling for payment
            </span>
          </div>
        )}

        <p className="text-[11px] text-center" style={{ fontFamily: MONO, color: C.textDim }}>
          Test card: 4242 4242 4242 4242 · Any exp/CVC
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
    <div style={{ backgroundColor: '#08080a', height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
        <span style={{ fontFamily: MONO, fontSize: 9, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Live Agents{activeRunId ? ` · ${activeRunId.slice(0, 8)}` : ''}
        </span>
      </div>

      {/* 4 cards — 2 visible, scroll for the rest */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1 }}>
        {BUYER_SLOTS.map(agentName => {
          const session = sessionMap[agentName]
          const dotColor = session?.status === 'running' ? '#50dc78'
            : session?.status === 'success' ? '#4fc3f7'
            : '#334155'
          return (
            <div key={agentName} style={{
              flexShrink: 0, height: '50%', minHeight: 180, display: 'flex', flexDirection: 'column',
              borderBottom: '1px solid rgba(255,255,255,0.05)',
            }}>
              {/* Card header — minimal height */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '3px 8px', flexShrink: 0,
                backgroundColor: 'rgba(255,255,255,0.02)',
              }}>
                <span style={{
                  width: 5, height: 5, borderRadius: '50%',
                  backgroundColor: dotColor, flexShrink: 0,
                  display: 'inline-block',
                }} />
                <span style={{ fontFamily: MONO, fontSize: 8, color: '#475569', flex: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                  {agentName.replace('_', ' ')}{session?.item_name ? ` · ${session.item_name}` : ''}
                </span>
                {session?.live_view_url && (
                  <a href={session.live_view_url} target="_blank" rel="noopener noreferrer"
                    style={{ fontFamily: MONO, fontSize: 8, color: '#4fc3f7', textDecoration: 'none', flexShrink: 0 }}>↗</a>
                )}
              </div>

              {/* iframe — scaled down so browser chrome takes minimal space */}
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
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontFamily: MONO, fontSize: 8, color: '#1e293b', letterSpacing: '0.2em' }}>
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
  const textareaRef = useRef(null)

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
    <div className="flex flex-col h-full" style={{ backgroundColor: C.bg }}>

      {/* Header */}
      <div className="flex-shrink-0 flex items-center gap-3 px-4 py-3" style={{
        backgroundColor: C.surface, borderBottom: `1px solid ${C.border}`,
      }}>
        <div className="w-8 h-8 overflow-hidden flex-shrink-0" style={{ borderRadius: 8, border: `1px solid ${C.borderBright}` }}>
          <img src="/agent-logo.jpeg" alt="" className="w-full h-full object-cover" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold leading-none" style={{ color: C.textPrimary }}>BarcodeBot</p>
          <p className="text-[11px] mt-0.5 leading-none" style={{ fontFamily: MONO, color: C.textMuted }}>
            Video Intelligence · Pegasus 1.2
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1" style={{
          borderRadius: 6,
          backgroundColor: connected ? 'rgba(52,211,153,0.10)' : 'rgba(255,255,255,0.04)',
          border: `1px solid ${connected ? 'rgba(52,211,153,0.30)' : C.border}`,
        }}>
          {enriching
            ? <Loader2 className="w-3 h-3 animate-spin" style={{ color: C.cyan }} />
            : <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: connected ? C.emerald : C.textDim }} />
          }
          <span className="text-[10px] font-semibold" style={{
            fontFamily: MONO, color: connected ? C.emerald : C.textMuted,
          }}>
            {enriching ? 'Enriching' : connected ? 'Live' : 'Offline'}
          </span>
        </div>

        {/* Balance chip / Load Funds button */}
        {balance ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1" style={{
            borderRadius: 6, backgroundColor: 'rgba(52,211,153,0.10)', border: `1px solid rgba(52,211,153,0.30)`,
          }}>
            <DollarSign className="w-3 h-3" style={{ color: C.emerald }} />
            <span className="text-[10px] font-semibold" style={{ fontFamily: MONO, color: C.emerald }}>
              ${balance.amount.toFixed(2)}
            </span>
          </div>
        ) : (
          <button onClick={onLoadFunds} className="flex items-center gap-1.5 px-2.5 py-1 transition-all"
            style={{
              borderRadius: 6, backgroundColor: 'rgba(167,139,250,0.12)', border: `1px solid rgba(167,139,250,0.35)`,
              cursor: 'pointer',
            }}>
            <DollarSign className="w-3 h-3" style={{ color: '#a78bfa' }} />
            <span className="text-[10px] font-semibold" style={{ fontFamily: MONO, color: '#a78bfa' }}>
              Load Funds
            </span>
          </button>
        )}
      </div>

      {/* Cart section */}
      {cartItems.length > 0 && (
        <div className="flex-shrink-0" style={{ borderBottom: `1px solid ${C.border}` }}>
          <div className="flex items-center gap-2 px-4 py-2" style={{ backgroundColor: C.surface }}>
            <ShoppingCart className="w-3 h-3 flex-shrink-0" style={{ color: '#a78bfa' }} />
            <span className="text-[9px] font-bold tracking-widest uppercase flex-1" style={{ fontFamily: MONO, color: '#a78bfa' }}>
              Cart
            </span>
            <span className="text-[9px]" style={{
              fontFamily: MONO, color: C.textDim,
              backgroundColor: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.20)',
              padding: '1px 6px', borderRadius: 4,
            }}>
              {cartItems.length} item{cartItems.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="px-4 py-2 flex flex-col gap-2">
            {cartItems.map(item => (
              <div key={item.item_name} className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] truncate" style={{ color: C.textSecondary }}>{item.title || item.item_name}</p>
                  <p className="text-[10px]" style={{ fontFamily: MONO, color: '#a78bfa' }}>
                    ${typeof item.price === 'number' ? item.price.toFixed(2) : item.price}
                    {item.rating ? ` · ⭐${item.rating}` : ''}
                  </p>
                </div>
                <button
                  onClick={() => onRemoveCartItem?.(item.item_name)}
                  className="flex-shrink-0 w-5 h-5 flex items-center justify-center"
                  style={{ borderRadius: 4, color: C.textDim, background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detection count bar */}
      {detectionCount > 0 && (
        <div className="flex-shrink-0 flex items-center gap-2 px-4 py-2" style={{
          backgroundColor: C.surface, borderBottom: `1px solid ${C.border}`,
        }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: C.emerald }} />
          <span className="text-[10px] font-semibold" style={{ fontFamily: MONO, color: C.textSecondary }}>
            Detection Log
          </span>
          <span className="ml-auto text-[10px]" style={{
            fontFamily: MONO, color: C.textDim,
            backgroundColor: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`,
            padding: '1px 6px', borderRadius: 4,
          }}>
            {detectionCount} objects
          </span>
        </div>
      )}

      {/* Feed */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 pt-5 pb-4 flex flex-col gap-5">
          {messages.map(msg => {
            if (msg.variant === 'system') return <SystemMessage key={msg.id} msg={msg} />
            if (msg.variant === 'detection') return <DetectionEvent key={msg.id} msg={msg} />
            if (msg.role === 'user') return <UserMessage key={msg.id} msg={msg} />
            return <BotMessage key={msg.id} msg={msg} />
          })}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Buy section — shown when objects detected */}
      {detectedObjects.length > 0 && (
        <div className="flex-shrink-0 px-4 pt-3 pb-3" style={{ borderTop: `1px solid ${C.border}` }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] font-bold tracking-widest uppercase" style={{ fontFamily: MONO, color: C.textMuted }}>
              Buy Detected Items
            </span>
            {balance && (
              <span className="text-[9px]" style={{ fontFamily: MONO, color: C.textDim }}>
                budget: ${balance.amount.toFixed(2)}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-1.5 mb-2.5">
            {detectedObjects.slice(0, 5).map(name => (
              <div key={name} className="flex items-center gap-2">
                <span className="flex-1 text-[11px] truncate" style={{ color: C.textSecondary }}>{name}</span>
                <div className="flex items-center gap-1 px-2 py-1"
                  style={{ borderRadius: 6, backgroundColor: C.card, border: `1px solid ${C.border}` }}>
                  <span className="text-[10px]" style={{ color: C.textMuted, fontFamily: MONO }}>$</span>
                  <input
                    type="number"
                    value={buyPrices[name] || ''}
                    onChange={e => setBuyPrices(p => ({ ...p, [name]: e.target.value }))}
                    placeholder="50"
                    className="w-12 bg-transparent outline-none text-[11px] text-right"
                    style={{ fontFamily: MONO, color: C.textPrimary }}
                  />
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={onBuy}
            disabled={!balance || buying}
            className="w-full flex items-center justify-center gap-2 py-2.5 transition-all"
            style={{
              borderRadius: 9,
              backgroundColor: balance && !buying ? 'rgba(52,211,153,0.12)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${balance && !buying ? 'rgba(52,211,153,0.35)' : C.border}`,
              cursor: balance && !buying ? 'pointer' : 'not-allowed',
            }}
          >
            {buying
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: C.emerald }} />
              : <ShoppingCart className="w-3.5 h-3.5" style={{ color: balance ? C.emerald : C.textDim }} />
            }
            <span className="text-[12px] font-semibold" style={{
              fontFamily: MONO, color: balance && !buying ? C.emerald : C.textDim,
            }}>
              {buying ? 'Buying…' : balance ? `Buy Now · $${balance.amount.toFixed(2)} budget` : 'Load Funds to Buy'}
            </span>
          </button>
        </div>
      )}

      {/* Input */}
      <div className="flex-shrink-0 px-4 pb-4 pt-3" style={{ borderTop: detectedObjects.length > 0 ? 'none' : `1px solid ${C.border}` }}>
        <div className="flex items-end gap-2" style={{
          borderRadius: 12, border: `1px solid ${asking ? C.border : C.borderBright}`,
          backgroundColor: C.card, transition: 'border-color 0.15s',
        }}>
          <textarea
            ref={textareaRef}
            rows={2}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Ask about detected objects…"
            disabled={asking}
            className="flex-1 bg-transparent outline-none resize-none leading-relaxed px-4 py-3"
            style={{ fontFamily: MONO, fontSize: 13, color: C.textPrimary,
              caretColor: C.cyan, '--tw-placeholder-opacity': 1 }}
          />
          <button
            onClick={onSend}
            disabled={!input.trim() || asking}
            className="flex-shrink-0 flex items-center justify-center mb-2 mr-2 transition-all"
            style={{
              width: 38, height: 38, borderRadius: 10,
              backgroundColor: input.trim() && !asking ? C.cyanDim : 'rgba(255,255,255,0.04)',
              border: `1px solid ${input.trim() && !asking ? 'rgba(34,211,238,0.40)' : C.border}`,
              color: input.trim() && !asking ? C.cyan : C.textDim,
            }}
          >
            {asking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [messages, setMessages] = useState([{
    id: 0, variant: 'system', text: `session started · ${now()}`, time: now(),
  }])
  const [globePins, setGlobePins]       = useState([])
  const [enriching, setEnriching]       = useState(false)
  const [connected, setConnected]       = useState(false)
  const [balance, setBalance]           = useState(null)   // { amount, session_id }
  const [showLoadFunds, setShowLoadFunds] = useState(false)
  const [loadingFunds, setLoadingFunds] = useState(false)
  const [buyPrices, setBuyPrices]       = useState({})
  const [buying, setBuying]             = useState(false)
  const [cartItems, setCartItems]       = useState([])
  const [focusPin, setFocusPin]         = useState(null)
  const [activeRunId, setActiveRunId]         = useState('')
  const [browserSessions, setBrowserSessions] = useState([])

  const seenObjectsRef          = useRef(new Set())
  const hadDataRef              = useRef(false)
  const rankerOffsetRef         = useRef(0)
  const focusPinTimeoutRef      = useRef(null)
  const agentEventOffsetRef     = useRef(0)

  const detectedObjects = messages
    .filter(m => m.variant === 'detection')
    .map(m => m.name)
    .filter((n, i, a) => a.indexOf(n) === i)   // dedupe

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

      // Poll for payment confirmation (every 2s, up to 60s)
      let tries = 0
      const poll = setInterval(async () => {
        tries++
        if (tries > 30) {
          clearInterval(poll)
          setLoadingFunds(false)
          return
        }
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

      // Always sync pins so a /reset clears the globe
      setGlobePins(data.pins || [])
      if (typeof data.enriching === 'boolean') setEnriching(data.enriching)

      // Detect backend reset: had data before, now it's gone
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
          // Find a matching manufacturer pin on the globe for this item
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
    <div className="w-full h-full flex flex-col" style={{ backgroundColor: C.bg, fontFamily: MONO }}>
      {showLoadFunds && (
        <LoadFundsModal
          onClose={() => { setShowLoadFunds(false); setLoadingFunds(false) }}
          onLoad={handleLoadFunds}
          loading={loadingFunds}
        />
      )}

      {/* Top bar */}
      <div className="flex-shrink-0 flex items-center gap-4 px-5 py-2.5" style={{
        backgroundColor: C.surface, borderBottom: `1px solid ${C.border}`,
      }}>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 flex items-center justify-center" style={{
            borderRadius: 5, backgroundColor: C.cyanDim, border: `1px solid rgba(34,211,238,0.40)`,
          }}>
            <span className="text-[11px]" style={{ color: C.cyan }}>⬡</span>
          </div>
          <span className="text-[13px] font-bold" style={{ color: C.textPrimary, letterSpacing: '-0.3px' }}>BarcodeBot</span>
          <span className="text-[9px] px-1.5 py-0.5" style={{
            color: C.textDim, backgroundColor: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`, borderRadius: 4,
          }}>v1.0</span>
        </div>
        <div className="h-4 w-px" style={{ backgroundColor: C.border }} />
        <span className="text-[11px]" style={{ color: C.textMuted }}>Pegasus 1.2 · Claude Haiku · Fetch.ai</span>
        <div className="ml-auto">
          <LiveClock />
        </div>
      </div>

      {/* Panels */}
      <div className="flex-1 min-h-0">
        <PanelGroup direction="horizontal" className="w-full h-full">
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
  return <span className="text-[11px]" style={{ fontFamily: MONO, color: C.textMuted }}>{time}</span>
}
