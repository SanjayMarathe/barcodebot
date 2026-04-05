import { useState, useMemo, useRef, useEffect } from 'react'
import { ComposableMap, Geographies, Geography, Marker, Line, useMapContext } from 'react-simple-maps'
import { geoCentroid } from 'd3-geo'
import { Loader2, RotateCcw } from 'lucide-react'

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'
const MONO = "'SF Mono', 'Monaco', 'Cascadia Code', monospace"

// ── WorldMonitor color system ─────────────────────────────────────────────────
// Sourced from worldmonitor.app CSS variables (dark theme)
const WM = {
  bg:              '#080809',
  country:         '#111113',
  stroke:          '#222226',
  strokeHighlight: '#2e2e35',
  // heat fills — dark grey gradient for supply chain density
  heat4:           '#1e1e24',
  heat3:           '#191920',
  heat2:           '#16161c',
  heat1:           '#131318',
  heatHover4:      '#28282f',
  heatHover1:      '#1a1a20',
  // accents
  cyan:            '#4fc3f7',
  cyanDim:         'rgba(79,195,247,0.12)',
  cyanBorder:      'rgba(79,195,247,0.25)',
  green:           '#50dc78',
  amber:           '#ffaa00',
  red:             '#ff4444',
  // text
  textPrimary:     '#e2e8f0',
  textSecondary:   '#64748b',
  textMuted:       '#334155',
  textDim:         '#1e293b',
}

// ── Supply chain data ─────────────────────────────────────────────────────────

const CHAINS = [
  {
    id: 'iphone', label: 'iPhone 15 Pro', color: WM.red,
    hub: [-122.0, 37.3], hubLabel: 'Apple HQ',
    manufacturers: [
      { brand: 'Foxconn',           city: 'Zhengzhou',    country: 'China',        lat: 34.7,  lng: 113.6, vol: 10, note: 'Primary assembly — 350k workers on-site' },
      { brand: 'Foxconn',           city: 'Shenzhen',     country: 'China',        lat: 22.5,  lng: 114.1, vol: 8,  note: 'Secondary assembly + SMT components' },
      { brand: 'TSMC',              city: 'Hsinchu',      country: 'Taiwan',       lat: 24.8,  lng: 120.9, vol: 9,  note: 'A17 Pro chip — 3nm TSMC N3B process' },
      { brand: 'Samsung Display',   city: 'Asan',         country: 'South Korea',  lat: 36.8,  lng: 127.0, vol: 7,  note: 'Super Retina XDR OLED panels' },
      { brand: 'LG Energy',         city: 'Ochang',       country: 'South Korea',  lat: 36.6,  lng: 127.5, vol: 6,  note: 'Lithium-ion battery cells' },
      { brand: 'Murata',            city: 'Kyoto',        country: 'Japan',        lat: 35.0,  lng: 135.7, vol: 5,  note: 'MLCCs + passive components' },
      { brand: 'Texas Instruments', city: 'Dallas',       country: 'USA',          lat: 32.8,  lng: -96.8, vol: 5,  note: 'Power management ICs' },
      { brand: 'Corning',           city: 'Harrodsburg',  country: 'USA',          lat: 37.7,  lng: -84.8, vol: 4,  note: 'Ceramic Shield front glass' },
      { brand: 'Skyworks',          city: 'Irvine',       country: 'USA',          lat: 33.7,  lng: -117.8,vol: 5,  note: '5G RF front-end modules' },
      { brand: 'Pegatron',          city: 'Shanghai',     country: 'China',        lat: 31.2,  lng: 121.5, vol: 6,  note: 'Backup assembly facility' },
    ]
  },
  {
    id: 'pen', label: 'Ballpoint Pen', color: WM.amber,
    hub: [-73.9, 40.7], hubLabel: 'US Retail',
    manufacturers: [
      { brand: 'BIC',           city: 'Milford',       country: 'USA',         lat: 41.2,  lng: -73.0,  vol: 8,  note: '2M pens/day — North American HQ' },
      { brand: 'BIC',           city: 'Clichy',        country: 'France',      lat: 48.9,  lng: 2.3,    vol: 7,  note: 'European HQ + manufacturing since 1945' },
      { brand: 'Pentel',        city: 'Tokyo',         country: 'Japan',       lat: 35.7,  lng: 139.7,  vol: 6,  note: 'Gel ink pioneer, EnerGel tech' },
      { brand: 'Pilot Pen',     city: 'Hiroshima',     country: 'Japan',       lat: 34.4,  lng: 132.5,  vol: 7,  note: 'G2 ballpoint — 25% global market share' },
      { brand: 'Staedtler',     city: 'Nuremberg',     country: 'Germany',     lat: 49.4,  lng: 11.0,   vol: 6,  note: 'Writing instruments since 1835' },
      { brand: 'Carbide Tips',  city: 'Zhuhai',        country: 'China',       lat: 22.3,  lng: 113.6,  vol: 5,  note: 'Tungsten carbide 0.7mm ball tips' },
      { brand: 'Ink Supplier',  city: 'Shanghai',      country: 'China',       lat: 31.3,  lng: 121.4,  vol: 5,  note: 'Oil-based dye ink — 1.2km per pen' },
      { brand: 'Parker',        city: 'Janesville',    country: 'USA',         lat: 42.7,  lng: -89.0,  vol: 5,  note: 'Premium segment — Newell Brands' },
      { brand: 'Zebra Pen',     city: 'Osaka',         country: 'Japan',       lat: 34.7,  lng: 135.5,  vol: 5,  note: 'F-301 stainless barrel' },
      { brand: 'Faber-Castell', city: 'Stein',         country: 'Germany',     lat: 49.3,  lng: 10.9,   vol: 5,  note: 'Premium pens + pencils since 1761' },
    ]
  },
  {
    id: 'bottle', label: 'Water Bottle', color: WM.green,
    hub: [-87.6, 41.9], hubLabel: 'US Distribution',
    manufacturers: [
      { brand: 'Nalgene',       city: 'Rochester',      country: 'USA',         lat: 43.2,  lng: -77.6,  vol: 7,  note: 'HDPE wide-mouth — BPA-free since 2008' },
      { brand: 'Contigo',       city: 'Chicago',        country: 'USA',         lat: 41.9,  lng: -87.6,  vol: 6,  note: 'Autoseal lid patent — 5M units/yr' },
      { brand: 'PET Resin',     city: 'Corpus Christi', country: 'USA',         lat: 27.8,  lng: -97.4,  vol: 5,  note: 'Petroleum-derived PET resin feedstock' },
      { brand: 'Nestlé Waters', city: 'Stamford',       country: 'USA',         lat: 41.1,  lng: -73.5,  vol: 6,  note: 'Pure Life bottling + distribution' },
      { brand: 'Cap Injection', city: 'Suzhou',         country: 'China',       lat: 31.3,  lng: 120.6,  vol: 5,  note: 'PP flip-cap injection molding' },
      { brand: 'Label Print',   city: 'Guangzhou',      country: 'China',       lat: 23.1,  lng: 113.3,  vol: 4,  note: 'BOPP pressure-sensitive labels' },
      { brand: 'CamelBak',      city: 'Petaluma',       country: 'USA',         lat: 38.2,  lng: -122.6, vol: 6,  note: 'Podium Chill insulated line' },
      { brand: "S'well",        city: 'New York',       country: 'USA',         lat: 40.8,  lng: -73.9,  vol: 5,  note: 'Triple-layer stainless steel' },
      { brand: 'Tupperware',    city: 'Orlando',        country: 'USA',         lat: 28.5,  lng: -81.4,  vol: 5,  note: 'Eco Bottle — recycled HDPE' },
      { brand: 'Sigg',          city: 'Frenkendorf',    country: 'Switzerland', lat: 47.5,  lng: 7.7,    vol: 4,  note: 'Swiss aluminum bottles since 1908' },
    ]
  },
]

const COUNTRY_HEAT = {
  'China': 4, 'United States of America': 4,
  'Japan': 3, 'South Korea': 3, 'Taiwan': 3,
  'Germany': 2, 'France': 2, 'Switzerland': 1,
}

const HEAT_FILL = {
  4: WM.heat4, 3: WM.heat3, 2: WM.heat2, 1: WM.heat1,
}
const HEAT_HOVER = {
  4: WM.heatHover4, 3: '#1a3a28', 2: '#152c20', 1: WM.heatHover1,
}

const MAJOR_COUNTRIES = new Set([
  'United States of America', 'Canada', 'Brazil', 'Russia', 'China',
  'India', 'Australia', 'Argentina', 'Mexico', 'Indonesia',
  'Saudi Arabia', 'Iran', 'Nigeria', 'South Africa', 'Algeria',
  'France', 'Germany', 'United Kingdom', 'Italy', 'Spain',
  'Japan', 'South Korea', 'Turkey', 'Egypt', 'Pakistan',
  'Kazakhstan', 'Mongolia', 'Peru', 'Colombia', 'Sudan',
  'Libya', 'Angola', 'Ethiopia', 'Ukraine', 'Greenland',
  'Democratic Republic of the Congo',
])

const ALL_PINS = CHAINS.flatMap(chain =>
  chain.manufacturers.map(m => ({ ...m, chainId: chain.id, color: chain.color, chainLabel: chain.label }))
)

const dotR = vol => 4 + (vol / 10) * 10

// ── Country labels ────────────────────────────────────────────────────────────

function CountryLabelsLayer({ geographies, zoom }) {
  const { projection } = useMapContext()
  return geographies.map(geo => {
    const name = geo.properties.name
    if (!name) return null
    if (zoom < 2.5 && !MAJOR_COUNTRIES.has(name)) return null
    const centroid = geoCentroid(geo)
    const coords = projection(centroid)
    if (!coords) return null
    const [x, y] = coords
    return (
      <text
        key={`clbl-${geo.rsmKey}`}
        x={x} y={y}
        textAnchor="middle"
        fontSize={zoom < 2.5 ? 5 : 4}
        fontFamily={MONO}
        fill={WM.textMuted}
        fontWeight="700"
        letterSpacing="0.8"
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        {name.toUpperCase()}
      </text>
    )
  })
}

// ── Main ──────────────────────────────────────────────────────────────────────

// ── PinFocusEffect — programmatic zoom-to-pin ─────────────────────────────────
// Must live inside ComposableMap to access useMapContext() projection

function PinFocusEffect({ focusPin, containerRef, setView }) {
  const { projection } = useMapContext()
  useEffect(() => {
    if (!focusPin || !containerRef.current) return
    const coords = projection([focusPin.lng, focusPin.lat])
    if (!coords) return
    const [svgX, svgY] = coords
    const W = containerRef.current.offsetWidth
    const H = containerRef.current.offsetHeight
    const newZoom = 4
    setView({ zoom: newZoom, x: W / 2 - svgX * newZoom, y: H / 2 - svgY * newZoom })
  }, [focusPin])
  return null
}

export default function GlobePanel({ pins = [], enriching = false, hasDetections = false, focusPin = null }) {
  const [hovered, setHovered]         = useState(null)
  const [hoveredPos, setHoveredPos]   = useState({ x: 0, y: 0 })
  const [activeChain, setActiveChain] = useState(null)
  const [view, setView]               = useState({ zoom: 1, x: 0, y: 0 })
  const [loading, setLoading]         = useState(true)

  const containerRef = useRef(null)
  const dragging     = useRef(false)
  const lastMouse    = useRef({ x: 0, y: 0 })

  // Auto-reset view 5s after focus clears
  useEffect(() => {
    if (focusPin) return
    const t = setTimeout(() => setView({ zoom: 1, x: 0, y: 0 }), 200)
    return () => clearTimeout(t)
  }, [focusPin])

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 900)
    return () => clearTimeout(t)
  }, [])

  // Reset chain filter when detections clear
  useEffect(() => {
    if (!hasDetections) setActiveChain(null)
  }, [hasDetections])

  const visibleChains = useMemo(() =>
    activeChain ? CHAINS.filter(c => c.id === activeChain) : CHAINS, [activeChain])
  const visiblePins = useMemo(() =>
    activeChain ? ALL_PINS.filter(p => p.chainId === activeChain) : ALL_PINS, [activeChain])

  function handleWheel(e) {
    e.preventDefault()
    const rect = containerRef.current.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    const factor = e.deltaY > 0 ? 0.85 : 1.18
    setView(v => {
      const newZoom = Math.min(10, Math.max(1, v.zoom * factor))
      const ratio = newZoom / v.zoom
      return { zoom: newZoom, x: mx * (1 - ratio) + v.x * ratio, y: my * (1 - ratio) + v.y * ratio }
    })
  }

  function handleMouseDown(e) {
    if (e.target.closest('button')) return
    dragging.current = true
    containerRef.current.style.cursor = 'grabbing'
    lastMouse.current = { x: e.clientX, y: e.clientY }
  }

  function handleMouseMove(e) {
    setHoveredPos({ x: e.clientX, y: e.clientY })
    if (!dragging.current) return
    const dx = e.clientX - lastMouse.current.x
    const dy = e.clientY - lastMouse.current.y
    lastMouse.current = { x: e.clientX, y: e.clientY }
    setView(v => ({ ...v, x: v.x + dx, y: v.y + dy }))
  }

  function stopDrag() {
    dragging.current = false
    if (containerRef.current) containerRef.current.style.cursor = 'grab'
  }

  function resetView() { setView({ zoom: 1, x: 0, y: 0 }) }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden"
      style={{ backgroundColor: WM.bg, cursor: 'grab' }}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={stopDrag}
      onMouseLeave={stopDrag}
    >
      {/* Initial loading */}
      {loading && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-3"
          style={{ backgroundColor: WM.bg }}>
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: WM.textSecondary }} />
          <span className="text-[9px] tracking-widest uppercase"
            style={{ fontFamily: MONO, color: WM.textSecondary }}>
            Initializing supply chain model…
          </span>
        </div>
      )}

      {/* Zoomable map */}
      <div style={{
        width: '100%', height: '100%',
        transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})`,
        transformOrigin: '0 0',
        willChange: 'transform',
        opacity: loading ? 0 : 1,
        transition: 'opacity 0.6s ease',
      }}>
        <ComposableMap
          projection="geoMercator"
          style={{ width: '100%', height: '100%' }}
          projectionConfig={{ scale: 145, center: [10, 20] }}
        >
          <Geographies geography={GEO_URL}>
            {({ geographies }) => (
              <>
                {geographies.map(geo => {
                  const name  = geo.properties.name
                  const heat  = COUNTRY_HEAT[name]
                  // Only highlight supply-chain countries when there are detections
                  const activeFill  = heat && hasDetections ? HEAT_FILL[heat] : WM.country
                  const activeHover = heat && hasDetections ? HEAT_HOVER[heat] : '#0d2820'
                  const strokeColor = heat && hasDetections ? WM.strokeHighlight : WM.stroke
                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill={activeFill}
                      stroke={strokeColor}
                      strokeWidth={0.4}
                      style={{
                        default: { outline: 'none' },
                        hover:   { outline: 'none', fill: activeHover },
                        pressed: { outline: 'none' },
                      }}
                    />
                  )
                })}
                <CountryLabelsLayer geographies={geographies} zoom={view.zoom} />
              </>
            )}
          </Geographies>

          <PinFocusEffect focusPin={focusPin} containerRef={containerRef} setView={setView} />

          {/* Supply chain lines — only when detections exist */}
          {hasDetections && visibleChains.flatMap(chain =>
            chain.manufacturers.map((m, i) => (
              <Line
                key={`line-${chain.id}-${i}`}
                from={[m.lng, m.lat]}
                to={chain.hub}
                stroke={WM.cyan}
                strokeWidth={0.5}
                strokeOpacity={0.15}
                strokeLinecap="round"
              />
            ))
          )}

          {/* Hub rings — only when detections exist */}
          {hasDetections && visibleChains.map(chain => (
            <Marker key={`hub-${chain.id}`} coordinates={chain.hub}>
              <circle r={14} fill={chain.color} fillOpacity={0.06} stroke={chain.color} strokeWidth={0.7} strokeOpacity={0.25} />
              <circle r={4.5} fill={chain.color} fillOpacity={0.9} stroke={WM.bg} strokeWidth={1} />
              <text y={-17} textAnchor="middle" fill={chain.color} fontSize={7.5} fontFamily={MONO}
                style={{ pointerEvents: 'none', opacity: 0.7 }}>
                {chain.hubLabel}
              </text>
            </Marker>
          ))}

          {/* Manufacturer dots — only when detections exist */}
          {hasDetections && visiblePins.map((pin, i) => {
            const r = dotR(pin.vol)
            return (
              <Marker
                key={`pin-${i}`}
                coordinates={[pin.lng, pin.lat]}
                onMouseEnter={() => { if (!dragging.current) setHovered(pin) }}
                onMouseLeave={() => setHovered(null)}
              >
                <circle r={r + 5} fill={pin.color} fillOpacity={0.06} style={{ pointerEvents: 'none' }} />
                <circle r={r} fill={pin.color} fillOpacity={0.85} stroke={WM.bg} strokeWidth={0.8}
                  style={{ cursor: 'pointer' }} />
                {pin.vol >= 7 && (
                  <text y={-(r + 5)} textAnchor="middle" fill={pin.color} fontSize={7} fontFamily={MONO}
                    style={{ pointerEvents: 'none', opacity: 0.75 }}>
                    {pin.city}
                  </text>
                )}
              </Marker>
            )
          })}
        </ComposableMap>
      </div>

      {/* ── Fixed overlays ── */}

      {/* Enriching spinner */}
      {enriching && (
        <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none"
          style={{ backgroundColor: 'rgba(2,10,8,0.6)' }}>
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: WM.cyan }} />
            <span className="text-[9px] tracking-widest uppercase"
              style={{ fontFamily: MONO, color: WM.textSecondary }}>
              Analyzing supply chain…
            </span>
          </div>
        </div>
      )}

      {/* Idle state — no detections yet */}
      {!loading && !hasDetections && !enriching && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none z-10">
          <p className="text-[9px] tracking-[0.25em] uppercase"
            style={{ fontFamily: MONO, color: WM.textMuted }}>
            · awaiting scan ·
          </p>
          <p className="text-[9px]"
            style={{ fontFamily: MONO, color: WM.textDim }}>
            scan an object on mobile to map supply chain
          </p>
        </div>
      )}


      {/* Bottom bar */}
      {!loading && (
        <div className="absolute bottom-3 left-3 z-10 flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5"
            style={{ backgroundColor: 'rgba(2,10,8,0.88)', border: `1px solid ${WM.stroke}`, borderRadius: 4 }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{
              backgroundColor: hasDetections ? WM.green : WM.textMuted,
              animation: hasDetections ? 'pulse 2s infinite' : 'none',
            }} />
            <span className="text-[10px]" style={{ fontFamily: MONO, color: WM.textSecondary }}>
              {hasDetections
                ? `${visiblePins.length} nodes · ${visibleChains.length} chains`
                : 'supply chain intelligence'}
            </span>
          </div>

          {view.zoom > 1.05 && (
            <button
              onClick={resetView}
              className="flex items-center gap-1.5 px-2.5 py-1.5"
              style={{
                backgroundColor: 'rgba(2,10,8,0.88)', border: `1px solid ${WM.stroke}`,
                borderRadius: 4, cursor: 'pointer',
              }}
            >
              <RotateCcw className="w-3 h-3" style={{ color: WM.textSecondary }} />
              <span className="text-[10px]" style={{ fontFamily: MONO, color: WM.textSecondary }}>
                {view.zoom.toFixed(1)}×
              </span>
            </button>
          )}
        </div>
      )}

      {/* Hover tooltip */}
      {hovered && (
        <div className="fixed z-30 pointer-events-none"
          style={{ left: hoveredPos.x + 14, top: hoveredPos.y - 10 }}>
          <div className="px-3.5 py-3 min-w-[210px]"
            style={{ backgroundColor: '#040e0a', border: `1px solid ${hovered.color}35`, borderRadius: 6 }}>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: hovered.color }} />
              <p className="text-[13px] font-semibold" style={{ color: WM.textPrimary }}>{hovered.brand}</p>
            </div>
            <p className="text-[11px] mb-0.5" style={{ fontFamily: MONO, color: WM.textSecondary }}>
              {hovered.city}, {hovered.country}
            </p>
            <p className="text-[10px] mb-2" style={{ fontFamily: MONO, color: hovered.color, opacity: 0.8 }}>
              ↳ {hovered.chainLabel} · vol {hovered.vol}/10
            </p>
            {hovered.note && (
              <div className="pt-2" style={{ borderTop: `1px solid ${WM.stroke}` }}>
                <p className="text-[10px] leading-relaxed" style={{ fontFamily: MONO, color: WM.textMuted }}>
                  {hovered.note}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
