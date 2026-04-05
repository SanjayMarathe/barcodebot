import { useRef, useState, useEffect, useCallback } from 'react'
import Globe from 'react-globe.gl'
import { RotateCcw, Loader2 } from 'lucide-react'
import { FEATURED_PINS, BACKGROUND_PINS, CATEGORY_KEYWORDS, CAT_COLORS } from './productData.js'
import ProductDetailPanel from './ProductDetailPanel.jsx'

const MONO   = "'SF Mono', 'Monaco', 'Cascadia Code', monospace"
const BG     = '#040e0a'
const ATM    = '#1a3a52'

const CAT_ORDER = ['pen', 'water_bottle', 'energy_drink', 'phone']
const CAT_LABELS = { pen: 'Pens', water_bottle: 'Bottles', energy_drink: 'Energy', phone: 'Phones' }

// Supply chain hub lines for each category (manufacturer → hub arcs)
const SC_CHAINS = [
  {
    id: 'phone', color: '#f87171', hub: [-122.0, 37.3],
    mfrs: [
      { lat: 34.75, lng: 113.62 }, // Foxconn Zhengzhou
      { lat: 24.80, lng: 120.90 }, // TSMC Hsinchu
      { lat: 36.80, lng: 127.00 }, // Samsung Display Asan
      { lat: 35.00, lng: 135.70 }, // Murata Kyoto
      { lat: 31.20, lng: 121.50 }, // Pegatron Shanghai
    ],
  },
  {
    id: 'pen', color: '#4fc3f7', hub: [-73.9, 40.7],
    mfrs: [
      { lat: 41.22, lng: -73.06 }, // BIC Milford
      { lat: 34.39, lng: 132.46 }, // Pilot Hiroshima
      { lat: 35.69, lng: 139.69 }, // Pentel Tokyo
      { lat: 49.45, lng:  11.08 }, // Staedtler Nuremberg
      { lat: 49.30, lng:  10.96 }, // Faber-Castell Stein
    ],
  },
  {
    id: 'bottle', color: '#50dc78', hub: [-87.6, 41.9],
    mfrs: [
      { lat: 43.15, lng: -77.61 }, // Nalgene Rochester
      { lat: 38.23, lng: -122.64 }, // CamelBak Petaluma
      { lat: 47.47, lng:   7.72 }, // SIGG Frenkendorf
      { lat: 40.75, lng: -73.99 }, // S'well New York
      { lat: 44.06, lng: -121.31 }, // Hydro Flask Bend
    ],
  },
  {
    id: 'energy', color: '#ffaa00', hub: [-84.4, 33.7],
    mfrs: [
      { lat: 47.73, lng:  13.28 }, // Red Bull Austria
      { lat: 33.87, lng: -117.57 }, // Monster Corona
      { lat: 26.36, lng: -80.12 }, // Celsius Boca Raton
      { lat: 41.05, lng: -73.72 }, // Rockstar Purchase
      { lat: 26.10, lng: -80.40 }, // Bang Weston
    ],
  },
]

// Detect which category a scanned object name matches
function detectCategories(objects) {
  const cats = new Set()
  objects.forEach(obj => {
    const lower = obj.toLowerCase()
    for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      if (keywords.some(kw => lower.includes(kw))) cats.add(cat)
    }
  })
  return cats
}

export default function ProductGlobe({ pins = [], enriching = false, detectedObjects = [] }) {
  const globeRef        = useRef()
  const containerRef    = useRef()
  const autoTimer       = useRef()
  const [dims, setDims]             = useState({ w: 0, h: 0 })
  const [selectedPin, setSelectedPin]       = useState(null)
  const [activeCategories, setActiveCategories] = useState(new Set())
  const [rings, setRings]           = useState([])
  const [ready, setReady]           = useState(false)

  // Track container dimensions for globe sizing
  useEffect(() => {
    if (!containerRef.current) return
    const obs = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect
      setDims({ w: Math.floor(width), h: Math.floor(height) })
    })
    obs.observe(containerRef.current)
    return () => obs.disconnect()
  }, [])

  // Globe ready after mount
  useEffect(() => {
    const t = setTimeout(() => {
      setReady(true)
      if (globeRef.current) {
        const ctrl = globeRef.current.controls()
        ctrl.autoRotate      = true
        ctrl.autoRotateSpeed = 0.4
        ctrl.enableDamping   = true
        ctrl.dampingFactor   = 0.1
        // Initial camera position
        globeRef.current.pointOfView({ lat: 20, lng: 10, altitude: 2.2 }, 0)
      }
    }, 800)
    return () => clearTimeout(t)
  }, [])

  // Pause auto-rotate on interaction, resume after 8s idle
  const pauseRotate = useCallback(() => {
    if (globeRef.current) globeRef.current.controls().autoRotate = false
    clearTimeout(autoTimer.current)
    autoTimer.current = setTimeout(() => {
      if (globeRef.current) globeRef.current.controls().autoRotate = true
    }, 8000)
  }, [])

  // When scanned objects change → detect categories → highlight + fly to pins
  useEffect(() => {
    if (detectedObjects.length === 0) {
      setActiveCategories(new Set())
      setRings([])
      return
    }
    const cats = detectCategories(detectedObjects)
    setActiveCategories(cats)

    if (cats.size === 0 || !globeRef.current) return

    // Fly to first matched pin
    const firstCat = [...cats][0]
    const target   = FEATURED_PINS.find(p => p.category === firstCat)
    if (target) {
      globeRef.current.pointOfView({ lat: target.lat, lng: target.lng, altitude: 1.8 }, 1500)
      pauseRotate()
    }

    // Pulse rings on all matched-category pins for 6s
    const matchedPins = FEATURED_PINS.filter(p => cats.has(p.category))
    setRings(matchedPins.map(p => ({
      lat: p.lat, lng: p.lng,
      maxR: 10, propagationSpeed: 2.5, repeatPeriod: 900,
      color: CAT_COLORS[p.category],
    })))
    const t = setTimeout(() => setRings([]), 6000)
    return () => clearTimeout(t)
  }, [detectedObjects, pauseRotate])

  // Build points data
  const bgPoints       = BACKGROUND_PINS.map(p => ({ ...p, _type: 'bg' }))
  const featuredPoints = FEATURED_PINS.map(p => ({ ...p, _type: 'featured' }))
  const allPoints      = [...bgPoints, ...featuredPoints]

  // Build supply-chain arcs (always visible)
  const scArcs = SC_CHAINS.flatMap(chain =>
    chain.mfrs.map(m => ({
      startLat: m.lat, startLng: m.lng,
      endLat:   chain.hub[1], endLng: chain.hub[0],
      color: chain.color,
    }))
  )

  // Point accessors
  const pColor = d => {
    if (d._type === 'bg') return '#1a1a2e'
    if (activeCategories.size > 0 && !activeCategories.has(d.category)) return '#1a2a24'
    return CAT_COLORS[d.category]
  }
  const pRadius = d => {
    if (d._type === 'bg') return 0.18
    return activeCategories.size > 0 && activeCategories.has(d.category) ? 0.72 : 0.5
  }
  const pAltitude = d => {
    if (d._type === 'bg') return 0.003
    return activeCategories.size > 0 && activeCategories.has(d.category) ? 0.07 : 0.025
  }
  const pLabel = d => {
    if (d._type === 'bg') {
      return `<div style="font-family:monospace;font-size:9px;color:#334155;background:rgba(4,14,10,0.85);padding:3px 7px;border-radius:4px;border:1px solid #0d1f18">Unanalyzed product</div>`
    }
    const c = CAT_COLORS[d.category]
    return `<div style="font-family:monospace;font-size:11px;color:#e2e8f0;background:rgba(4,14,10,0.92);padding:6px 10px;border-radius:6px;border:1px solid ${c}28;pointer-events:none"><span style="color:${c};font-size:10px">${d.brand}</span><br/><span style="color:#475569;font-size:9px">${d.origin}</span></div>`
  }

  // Label pins (always show a few brand labels)
  const labelPins = activeCategories.size > 0
    ? FEATURED_PINS.filter(p => activeCategories.has(p.category))
    : FEATURED_PINS.filter(p => ['bic', 'nalgene', 'redbull', 'apple-iphone'].includes(p.id))

  function resetView() {
    if (!globeRef.current) return
    globeRef.current.pointOfView({ lat: 20, lng: 10, altitude: 2.2 }, 1000)
    pauseRotate()
  }

  const handlePointClick = useCallback((point) => {
    if (point._type === 'bg') return
    setSelectedPin(point)
    pauseRotate()
    if (globeRef.current) {
      globeRef.current.pointOfView({ lat: point.lat, lng: point.lng, altitude: 1.5 }, 700)
    }
  }, [pauseRotate])

  const handleGlobeClick = useCallback(() => {
    setSelectedPin(null)
    pauseRotate()
  }, [pauseRotate])

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden"
      style={{ backgroundColor: BG }}
    >
      {/* Loading */}
      {!ready && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3"
          style={{ backgroundColor: BG }}>
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: '#4fc3f7' }} />
          <span className="text-[9px] tracking-widest uppercase"
            style={{ fontFamily: MONO, color: '#334155' }}>
            Initializing supply chain intelligence…
          </span>
        </div>
      )}

      {dims.w > 0 && dims.h > 0 && (
        <Globe
          ref={globeRef}
          width={dims.w}
          height={dims.h}

          globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
          bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
          backgroundColor={BG}
          atmosphereColor={ATM}
          atmosphereAltitude={0.18}

          // Product marketplace pins
          pointsData={allPoints}
          pointColor={pColor}
          pointRadius={pRadius}
          pointAltitude={pAltitude}
          pointResolution={8}
          pointLabel={pLabel}
          onPointClick={handlePointClick}
          onPointHover={pauseRotate}

          // Supply chain arcs
          arcsData={scArcs}
          arcColor={d => d.color}
          arcDashLength={0.35}
          arcDashGap={0.15}
          arcDashAnimateTime={2200}
          arcStroke={0.35}
          arcAltitude={0.14}

          // Pulse rings on scan match
          ringsData={rings}
          ringColor={d => t => `${d.color}${Math.round((1 - t) * 200).toString(16).padStart(2, '0')}`}
          ringMaxRadius={d => d.maxR}
          ringPropagationSpeed={d => d.propagationSpeed}
          ringRepeatPeriod={d => d.repeatPeriod}

          // Brand labels
          labelsData={labelPins}
          labelLat="lat"
          labelLng="lng"
          labelText="brand"
          labelSize={0.75}
          labelColor={d => CAT_COLORS[d.category] + 'bb'}
          labelAltitude={0.04}
          labelResolution={3}
          labelDotRadius={0}

          onGlobeClick={handleGlobeClick}
          animateIn={false}
        />
      )}

      {/* Status bar — bottom left */}
      <div className="absolute bottom-3 left-3 z-20 flex items-center gap-2 pointer-events-auto">
        <div
          className="flex items-center gap-3 px-3 py-1.5"
          style={{
            backgroundColor: 'rgba(4,14,10,0.9)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 6,
            backdropFilter: 'blur(4px)',
          }}
        >
          {CAT_ORDER.map(cat => (
            <div key={cat} className="flex items-center gap-1.5">
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{
                  backgroundColor: activeCategories.has(cat) ? CAT_COLORS[cat] : '#1e293b',
                  boxShadow: activeCategories.has(cat) ? `0 0 5px ${CAT_COLORS[cat]}` : 'none',
                  transition: 'background-color 0.3s, box-shadow 0.3s',
                }}
              />
              <span
                className="text-[9px] tracking-wider uppercase"
                style={{
                  fontFamily: MONO,
                  color: activeCategories.has(cat) ? CAT_COLORS[cat] : '#1e293b',
                  transition: 'color 0.3s',
                }}
              >
                {CAT_LABELS[cat]}
              </span>
            </div>
          ))}
        </div>

        <button
          onClick={resetView}
          title="Reset view"
          className="flex items-center justify-center p-2"
          style={{
            backgroundColor: 'rgba(4,14,10,0.9)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 6,
            cursor: 'pointer',
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'}
        >
          <RotateCcw className="w-3 h-3" style={{ color: '#334155' }} />
        </button>
      </div>

      {/* Enriching overlay */}
      {enriching && (
        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none"
          style={{ backgroundColor: 'rgba(2,10,8,0.55)' }}>
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: '#4fc3f7' }} />
            <span className="text-[9px] tracking-widest uppercase"
              style={{ fontFamily: MONO, color: '#475569' }}>
              Analyzing supply chain…
            </span>
          </div>
        </div>
      )}

      {/* Idle hint — only before any scan */}
      {!ready || (detectedObjects.length === 0 && !enriching) ? null : null}

      {/* Product detail popup */}
      <ProductDetailPanel pin={selectedPin} onClose={() => setSelectedPin(null)} />
    </div>
  )
}
