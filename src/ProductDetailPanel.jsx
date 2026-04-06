import { useState } from 'react'
import { X, ChevronDown, ChevronUp, ExternalLink, MapPin } from 'lucide-react'
import { CAT_COLORS } from './productData.js'

const MONO = "'SF Mono', 'Monaco', 'Cascadia Code', monospace"

const CAT_LABELS = {
  pen:          'Writing Instrument',
  water_bottle: 'Hydration',
  energy_drink: 'Beverage',
  phone:        'Mobile Device',
}

const RISK_LABELS = {
  '#22d3ee': 'FAVORABLE',
  '#f59e0b': 'MODERATE',
  '#f87171': 'ELEVATED',
}

export default function ProductDetailPanel({ pin, onClose }) {
  const [expanded, setExpanded] = useState(false)
  const [imgError, setImgError]   = useState(false)

  if (!pin) return null

  const catColor  = CAT_COLORS[pin.category] || '#4fc3f7'
  const riskLabel = RISK_LABELS[pin.riskColor] || 'MODERATE'
  const searchQuery = encodeURIComponent(`${pin.brand} ${pin.name}`)

  return (
    <div
      className="fixed z-50 pointer-events-auto"
      style={{
        top: 76, right: 20,
        width: 300,
        backgroundColor: '#040e0a',
        border: `1px solid ${catColor}28`,
        borderRadius: 10,
        boxShadow: `0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px ${catColor}10`,
        fontFamily: MONO,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3.5 pb-3"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: catColor }} />
          <span className="text-[9px] tracking-widest uppercase" style={{ color: catColor }}>
            {CAT_LABELS[pin.category] || pin.category}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded transition-colors"
          style={{ color: '#334155' }}
          onMouseEnter={e => e.currentTarget.style.color = '#64748b'}
          onMouseLeave={e => e.currentTarget.style.color = '#334155'}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Product image + core info */}
      <div className="flex gap-3.5 px-4 py-4">
        {/* Image */}
        <div
          className="flex-shrink-0 w-[72px] h-[72px] rounded-lg flex items-center justify-center overflow-hidden"
          style={{ backgroundColor: '#0a1a14', border: `1px solid ${catColor}20` }}
        >
          {!imgError ? (
            <img
              src={pin.image}
              alt={pin.name}
              className="w-full h-full object-contain p-1.5"
              onError={() => setImgError(true)}
            />
          ) : (
            <span className="text-3xl font-black" style={{ color: catColor, opacity: 0.45 }}>
              {pin.brand[0]}
            </span>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
          <p className="text-[13px] font-bold leading-snug" style={{ color: '#e2e8f0' }}>
            {pin.brand}
          </p>
          <p className="text-[11px] leading-snug" style={{ color: '#475569' }}>
            {pin.name}
          </p>
          <div className="flex items-center gap-1 mt-0.5">
            <MapPin className="w-2.5 h-2.5 flex-shrink-0" style={{ color: catColor, opacity: 0.6 }} />
            <p className="text-[10px] leading-snug truncate" style={{ color: '#334155' }}>
              {pin.origin}
            </p>
          </div>
          {pin.priceRange && (
            <p className="text-[12px] font-semibold mt-1" style={{ color: catColor }}>
              {pin.priceRange}
            </p>
          )}
        </div>
      </div>

      {/* Expand toggle */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-[9px] tracking-widest uppercase transition-colors"
        style={{
          borderTop: '1px solid rgba(255,255,255,0.05)',
          color: '#334155',
          cursor: 'pointer',
        }}
        onMouseEnter={e => e.currentTarget.style.color = '#64748b'}
        onMouseLeave={e => e.currentTarget.style.color = '#334155'}
      >
        <span>Supply Chain Analysis</span>
        {expanded
          ? <ChevronUp className="w-3 h-3" />
          : <ChevronDown className="w-3 h-3" />
        }
      </button>

      {/* Expanded analysis */}
      {expanded && (
        <div className="px-4 pb-4" style={{ borderTop: '1px solid rgba(255,255,255,0.03)' }}>
          {/* Risk badge */}
          <div className="flex items-center gap-2 mt-3.5 mb-2">
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: pin.riskColor, boxShadow: `0 0 8px ${pin.riskColor}80` }}
            />
            <span className="text-[9px] font-bold tracking-widest" style={{ color: pin.riskColor }}>
              {riskLabel}
            </span>
            <span className="text-[9px]" style={{ color: '#1e293b' }}>· WorldMonitor</span>
          </div>
          <p className="text-[10px] leading-relaxed mb-4" style={{ color: '#475569' }}>
            {pin.riskNote}
          </p>

          {/* News headlines */}
          <p className="text-[8px] tracking-widest uppercase mb-2.5" style={{ color: '#1e293b' }}>
            Recent Intelligence
          </p>
          <div className="flex flex-col gap-2 mb-4">
            {pin.news.map((headline, i) => (
              <div key={i} className="flex gap-2 items-start">
                <span className="text-[9px] flex-shrink-0 mt-px" style={{ color: catColor, opacity: 0.5 }}>·</span>
                <p className="text-[10px] leading-relaxed" style={{ color: '#334155' }}>
                  {headline}
                </p>
              </div>
            ))}
          </div>

          {/* Amazon link */}
          <a
            href={`https://www.amazon.com/s?k=${searchQuery}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-2 rounded text-[9px] tracking-widest uppercase"
            style={{
              backgroundColor: `${catColor}10`,
              border: `1px solid ${catColor}28`,
              color: catColor,
              textDecoration: 'none',
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.7'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            Find on Amazon
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}
    </div>
  )
}
