// Category colors — WorldMonitor palette
export const CAT_COLORS = {
  pen:          '#4fc3f7', // cyan
  water_bottle: '#50dc78', // green
  energy_drink: '#ffaa00', // amber
  phone:        '#f87171', // red
}

// Keywords for matching scanned object names → category
export const CATEGORY_KEYWORDS = {
  pen:          ['pen', 'pencil', 'ballpoint', 'gel pen', 'marker', 'bic', 'pilot', 'pentel', 'staedtler', 'faber'],
  water_bottle: ['water bottle', 'bottle', 'nalgene', 'camelbak', 'hydro flask', 'hydroflask', 'swell', 'sigg', 'flask', 'canteen', 'tumbler'],
  energy_drink: ['energy drink', 'red bull', 'redbull', 'monster', 'celsius', 'rockstar', 'bang', 'energy can', 'energy beverage'],
  phone:        ['phone', 'iphone', 'samsung', 'galaxy', 'pixel', 'oneplus', 'xperia', 'smartphone', 'mobile', 'handset'],
}

export const FEATURED_PINS = [
  // ── PENS ─────────────────────────────────────────────────────────────────────
  {
    id: 'bic',
    category: 'pen',
    brand: 'BIC',
    name: 'BIC Cristal Ballpoint Pen',
    origin: 'Milford, Connecticut, USA',
    lat: 41.22, lng: -73.06,
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/BICCristalPen.jpg/240px-BICCristalPen.jpg',
    priceRange: '$0.49 – $1.99',
    riskColor: '#22d3ee',
    riskNote: 'US domestic production — minimal tariff exposure, fully stable supply chain',
    news: [
      'BIC reports record North American pen sales in Q1 2026 on back-to-office demand',
      'US stationery category up 8% YoY as hybrid workers invest in desk supplies',
      'Plastic resin costs stabilize — BIC manufacturing margins improve by 4 points',
    ],
  },
  {
    id: 'pilot',
    category: 'pen',
    brand: 'Pilot Pen',
    name: 'Pilot G2 Gel Pen',
    origin: 'Hiroshima, Japan',
    lat: 34.39, lng: 132.46,
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Pilot_G2_pen.jpg/240px-Pilot_G2_pen.jpg',
    priceRange: '$1.99 – $3.99',
    riskColor: '#f59e0b',
    riskNote: 'JPY weakness boosts export competitiveness — trans-Pacific freight slightly elevated',
    news: [
      'Pilot Pen commands 25% global gel pen market share through premium positioning',
      'Japan-US trade corridor reports minor Pacific port delays through Q2 2026',
      'Pilot G2 rated #1 everyday pen for third consecutive year by Consumer Reports',
    ],
  },
  {
    id: 'pentel',
    category: 'pen',
    brand: 'Pentel',
    name: 'Pentel EnerGel Liquid Gel Pen',
    origin: 'Tokyo, Japan',
    lat: 35.69, lng: 139.69,
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9c/Pentel_EnerGel_pens.jpg/240px-Pentel_EnerGel_pens.jpg',
    priceRange: '$2.49 – $4.99',
    riskColor: '#f59e0b',
    riskNote: 'Trans-Pacific freight rates up 12% — Yokohama port congestion minor but monitored',
    news: [
      'Pentel launches eco-refillable EnerGel cartridge system across US retail chains',
      'Asian stationery exports to North America up 11% YoY entering Q2 2026',
      'Pentel Tokyo R&D patents quick-dry ink formula for high-speed note-taking',
    ],
  },
  {
    id: 'staedtler',
    category: 'pen',
    brand: 'Staedtler',
    name: 'Staedtler Triplus Ballpoint',
    origin: 'Nuremberg, Germany',
    lat: 49.45, lng: 11.08,
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Staedtler_Logo.svg/240px-Staedtler_Logo.svg.png',
    priceRange: '$2.99 – $5.99',
    riskColor: '#22d3ee',
    riskNote: 'EU internal trade stable — German precision manufacturing insulated from disruption',
    news: [
      'Staedtler celebrates 185 years of Nuremberg manufacturing heritage in 2026',
      'EU carbon border adjustment mechanism drives cleaner stationery production industry-wide',
      'German stationery exports grow 6% despite broader eurozone industrial slowdown',
    ],
  },
  {
    id: 'faber-castell',
    category: 'pen',
    brand: 'Faber-Castell',
    name: 'Faber-Castell GRIP Ballpoint',
    origin: 'Stein, Germany',
    lat: 49.30, lng: 10.96,
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Faber-Castell_logo.svg/240px-Faber-Castell_logo.svg.png',
    priceRange: '$3.99 – $8.99',
    riskColor: '#22d3ee',
    riskNote: 'Premium brand insulated from cost pressure — EU trade routes fully clear',
    news: [
      'Faber-Castell opens certified carbon-neutral manufacturing facility in Malaysia',
      'Luxury stationery segment outperforms market — premium pens up 15% in 2026',
      'Faber-Castell debuts AI-assisted ink formulation for smoother line consistency',
    ],
  },

  // ── WATER BOTTLES ────────────────────────────────────────────────────────────
  {
    id: 'nalgene',
    category: 'water_bottle',
    brand: 'Nalgene',
    name: 'Nalgene Sustain 32oz Bottle',
    origin: 'Rochester, New York, USA',
    lat: 43.15, lng: -77.61,
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/31/Nalgene_bottle_two.jpg/240px-Nalgene_bottle_two.jpg',
    priceRange: '$9.99 – $14.99',
    riskColor: '#22d3ee',
    riskNote: 'Fully US domestic production — unaffected by trade tensions, BPA-free certified',
    news: [
      'Nalgene Sustain line achieves 50% ocean-bound recycled plastic milestone ahead of schedule',
      'Outdoor recreation spending surges 18% — hydration gear leads the segment in 2026',
      'FDA reaffirms BPA-free certification across US water bottle category for 2026',
    ],
  },
  {
    id: 'camelbak',
    category: 'water_bottle',
    brand: 'CamelBak',
    name: 'CamelBak Chute Mag 32oz',
    origin: 'Petaluma, California, USA',
    lat: 38.23, lng: -122.64,
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/Camelbak_water_bottle.jpg/240px-Camelbak_water_bottle.jpg',
    priceRange: '$14.99 – $22.99',
    riskColor: '#22d3ee',
    riskNote: 'US-designed, Vietnam-assembled — stable Pacific supply lane, low tariff exposure',
    news: [
      'CamelBak posts best quarter in company history riding trail activity boom',
      'Vista Outdoor explores strategic options for CamelBak brand in Q2 2026',
      'CamelBak Chute Mag earns top NSF safety certification for filtered hydration',
    ],
  },
  {
    id: 'swell',
    category: 'water_bottle',
    brand: "S'well",
    name: "S'well Teakwood 17oz Bottle",
    origin: 'New York, USA',
    lat: 40.75, lng: -73.99,
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Swell_Bottle.jpg/240px-Swell_Bottle.jpg',
    priceRange: '$24.99 – $35.00',
    riskColor: '#22d3ee',
    riskNote: 'US brand, Korean stainless steel — stable supply, premium pricing absorbs tariffs',
    news: [
      "S'well partners with UNICEF — every bottle sold funds clean water access globally",
      'Triple-insulated bottle market grows 22% as premium hydration goes mainstream',
      "S'well launches limited artist series collaboration with Museum of Modern Art",
    ],
  },
  {
    id: 'sigg',
    category: 'water_bottle',
    brand: 'SIGG',
    name: 'SIGG Classic Aluminum 1.0L',
    origin: 'Frenkendorf, Switzerland',
    lat: 47.47, lng: 7.72,
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f9/Sigg_water_bottle.jpg/240px-Sigg_water_bottle.jpg',
    priceRange: '$19.99 – $29.99',
    riskColor: '#22d3ee',
    riskNote: 'Swiss franc stability — Alpine aluminum sourcing unaffected by trade disruption',
    news: [
      'SIGG celebrates 118 years of Swiss aluminum craftsmanship from Frenkendorf',
      'European reusable bottle legislation boosts aluminum bottle category by 31%',
      'SIGG wins European Product Design Award for ultra-thin lightweight wall design',
    ],
  },
  {
    id: 'hydroflask',
    category: 'water_bottle',
    brand: 'Hydro Flask',
    name: 'Hydro Flask Wide Mouth 32oz',
    origin: 'Bend, Oregon, USA',
    lat: 44.06, lng: -121.31,
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Hydro_Flask_bottle.jpg/240px-Hydro_Flask_bottle.jpg',
    priceRange: '$29.95 – $44.95',
    riskColor: '#f59e0b',
    riskNote: 'US brand, China-manufactured stainless — tariff impact partially passed to retail',
    news: [
      'Hydro Flask parent Helen of Troy reports 14% revenue growth in outdoor segment',
      'Hydro Flask launches powder coat recycling program at 180 REI locations',
      'Gen Z drives insulated bottle growth — Hydro Flask tops social commerce charts',
    ],
  },

  // ── ENERGY DRINKS ────────────────────────────────────────────────────────────
  {
    id: 'redbull',
    category: 'energy_drink',
    brand: 'Red Bull',
    name: 'Red Bull Energy Drink 250ml',
    origin: 'Fuschi am See, Austria',
    lat: 47.73, lng: 13.28,
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b4/RedBull_can_2010.jpg/240px-RedBull_can_2010.jpg',
    priceRange: '$2.49 – $3.99',
    riskColor: '#22d3ee',
    riskNote: 'EU-Austria: stable trade routes, low tariff exposure, domestic aluminum sourcing',
    news: [
      'Red Bull expands Salzburg facility by 15% to meet record European demand in 2026',
      'Austria maintains favorable EU export conditions — no new tariff exposure through Q3',
      'Energy drink category grows 12% YoY — Red Bull holds 43% of global market share',
    ],
  },
  {
    id: 'monster',
    category: 'energy_drink',
    brand: 'Monster Energy',
    name: 'Monster Energy Original 16oz',
    origin: 'Corona, California, USA',
    lat: 33.87, lng: -117.57,
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/Monster_Energy_Drink.jpg/240px-Monster_Energy_Drink.jpg',
    priceRange: '$2.29 – $3.49',
    riskColor: '#22d3ee',
    riskNote: 'US domestic — Coca-Cola distribution network absorbs supply chain disruption risk',
    news: [
      'Monster Energy reports record Q1 revenue of $2.1B driven by international expansion',
      'Coca-Cola distribution partnership opens 15 new international markets for Monster',
      'Monster Beverage acquires Bang Energy brand trademarks in landmark $362M deal',
    ],
  },
  {
    id: 'celsius',
    category: 'energy_drink',
    brand: 'Celsius',
    name: 'Celsius Sparkling Orange 12oz',
    origin: 'Boca Raton, Florida, USA',
    lat: 26.36, lng: -80.12,
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Celsius_Energy_Drink.jpg/240px-Celsius_Energy_Drink.jpg',
    priceRange: '$2.49 – $3.79',
    riskColor: '#22d3ee',
    riskNote: 'US domestic formulation — contract manufacturing insulated from supply shocks',
    news: [
      'Celsius Holdings posts 58% revenue growth — fastest growing energy drink brand in 2026',
      'PepsiCo distribution deal brings Celsius to 250,000 US retail locations by Q3',
      'Celsius named official energy drink of the NFL heading into the 2026 season',
    ],
  },
  {
    id: 'rockstar',
    category: 'energy_drink',
    brand: 'Rockstar Energy',
    name: 'Rockstar Original 16oz',
    origin: 'Purchase, New York, USA',
    lat: 41.05, lng: -73.72,
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d8/Rockstar_energy_drink.jpg/240px-Rockstar_energy_drink.jpg',
    priceRange: '$1.99 – $2.99',
    riskColor: '#22d3ee',
    riskNote: 'PepsiCo-owned — global logistics network absorbs supply disruption seamlessly',
    news: [
      'PepsiCo leverages Rockstar brand across 175 countries through unified distribution',
      'Rockstar Energy refreshes brand identity with new can design rollout for 2026',
      'PepsiCo beverage segment grows 9% — energy and sports drinks lead the category',
    ],
  },
  {
    id: 'bang',
    category: 'energy_drink',
    brand: 'Bang Energy',
    name: 'Bang Energy Blue Razz 16oz',
    origin: 'Weston, Florida, USA',
    lat: 26.10, lng: -80.40,
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/ba/Bang_Energy_Drink.jpg/240px-Bang_Energy_Drink.jpg',
    priceRange: '$1.99 – $3.29',
    riskColor: '#f59e0b',
    riskNote: 'Post-acquisition integration risk — Monster ownership transition still in progress',
    news: [
      'Monster Beverage integrates Bang Energy manufacturing into consolidated US facilities',
      'Bang Energy reformulation removes controversial Super Creatine ingredient from lineup',
      'Florida energy drink market surges as outdoor fitness culture expands rapidly',
    ],
  },

  // ── PHONES ───────────────────────────────────────────────────────────────────
  {
    id: 'apple-iphone',
    category: 'phone',
    brand: 'Apple',
    name: 'iPhone 15 Pro 256GB',
    origin: 'Zhengzhou, China (Foxconn)',
    lat: 34.75, lng: 113.62,
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/IPhone_15_Pro_in_Natural_Titanium.jpg/240px-IPhone_15_Pro_in_Natural_Titanium.jpg',
    priceRange: '$999 – $1,199',
    riskColor: '#f87171',
    riskNote: 'US-China tariff exposure elevated — Foxconn Zhengzhou is key single-point assembly risk',
    news: [
      'Apple accelerates India manufacturing — 15% of iPhone 15 Pro now assembled in Chennai',
      'US-China tariff negotiations ongoing — consumer electronics face potential 25% duty',
      'Apple reports 7% iPhone revenue growth despite macro headwinds in Q1 2026',
    ],
  },
  {
    id: 'samsung',
    category: 'phone',
    brand: 'Samsung',
    name: 'Samsung Galaxy S24 Ultra',
    origin: 'Suwon, South Korea',
    lat: 37.29, lng: 127.01,
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/Samsung_Galaxy_S24_Ultra.jpg/240px-Samsung_Galaxy_S24_Ultra.jpg',
    priceRange: '$1,299 – $1,499',
    riskColor: '#22d3ee',
    riskNote: 'Korea-US FTA keeps tariffs low — diversified manufacturing in Vietnam reduces risk',
    news: [
      'Samsung Galaxy S24 Ultra outperforms iPhone in independent display benchmarks for 2026',
      'South Korea-US semiconductor alliance strengthens amid global chip competition',
      'Samsung Mobile posts record AI adoption — 80M+ Galaxy AI active users globally',
    ],
  },
  {
    id: 'google-pixel',
    category: 'phone',
    brand: 'Google',
    name: 'Google Pixel 9 Pro',
    origin: 'Mountain View, California (designed)',
    lat: 37.42, lng: -122.08,
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Google_Pixel_9_Pro.jpg/240px-Google_Pixel_9_Pro.jpg',
    priceRange: '$999 – $1,099',
    riskColor: '#f59e0b',
    riskNote: 'Vietnam assembly reduces China tariff risk — TSMC Arizona chip fab diversifies further',
    news: [
      'Google Pixel 9 Pro records 2.3M first-week pre-orders — best Pixel launch in history',
      'Tensor G4 chip manufactured by TSMC Arizona reduces geopolitical supply dependency',
      'Google AI integration drives record iPhone switchers to Pixel platform in 2026',
    ],
  },
  {
    id: 'oneplus',
    category: 'phone',
    brand: 'OnePlus',
    name: 'OnePlus 12 Pro 5G',
    origin: 'Shenzhen, China',
    lat: 22.54, lng: 114.06,
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/OnePlus_12_Pro.jpg/240px-OnePlus_12_Pro.jpg',
    priceRange: '$799 – $899',
    riskColor: '#f87171',
    riskNote: 'China-origin — elevated US tariff exposure, Shenzhen concentration risk',
    news: [
      'OnePlus 12 Pro undercuts flagship competition by $400 — value champion of 2026',
      'BBK Electronics expands OnePlus European distribution amid US trade friction',
      'OnePlus Hasselblad camera partnership earns DXOMark top-5 global ranking',
    ],
  },
  {
    id: 'sony-xperia',
    category: 'phone',
    brand: 'Sony',
    name: 'Sony Xperia 1 VI',
    origin: 'Tokyo, Japan',
    lat: 35.67, lng: 139.73,
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Sony_Xperia_1_VI.jpg/240px-Sony_Xperia_1_VI.jpg',
    priceRange: '$1,299 – $1,399',
    riskColor: '#f59e0b',
    riskNote: 'Japan-origin premium device — yen weakness benefits exports, moderate tariff exposure',
    news: [
      'Sony Xperia 1 VI targets professional creators with native 4K 120fps video',
      'Japan smartphone exports benefit from weak yen — Sony gains pricing advantage in US',
      'Sony integrates PlayStation Remote Play natively into Xperia 1 VI system firmware',
    ],
  },
]

// Background pins — scattered globally, no product data yet
// Visually distinct: smaller, dimmed, "unanalyzed" state
export const BACKGROUND_PINS = [
  { id: 'bg-1',  lat: 55.75,  lng: 37.62  }, // Moscow
  { id: 'bg-2',  lat: 19.43,  lng: -99.13 }, // Mexico City
  { id: 'bg-3',  lat: -23.55, lng: -46.63 }, // São Paulo
  { id: 'bg-4',  lat: 28.61,  lng: 77.21  }, // New Delhi
  { id: 'bg-5',  lat: -33.87, lng: 151.21 }, // Sydney
  { id: 'bg-6',  lat: 51.51,  lng: -0.13  }, // London
  { id: 'bg-7',  lat: 48.86,  lng: 2.35   }, // Paris
  { id: 'bg-8',  lat: 41.01,  lng: 28.97  }, // Istanbul
  { id: 'bg-9',  lat: 1.35,   lng: 103.82 }, // Singapore
  { id: 'bg-10', lat: 25.20,  lng: 55.27  }, // Dubai
  { id: 'bg-11', lat: -1.29,  lng: 36.82  }, // Nairobi
  { id: 'bg-12', lat: 6.52,   lng: 3.38   }, // Lagos
  { id: 'bg-13', lat: 30.06,  lng: 31.25  }, // Cairo
  { id: 'bg-14', lat: 55.68,  lng: 12.57  }, // Copenhagen
  { id: 'bg-15', lat: 59.33,  lng: 18.07  }, // Stockholm
  { id: 'bg-16', lat: 37.57,  lng: 126.98 }, // Seoul
  { id: 'bg-17', lat: 39.93,  lng: 116.39 }, // Beijing
  { id: 'bg-18', lat: 23.13,  lng: 113.26 }, // Guangzhou
  { id: 'bg-19', lat: 13.75,  lng: 100.52 }, // Bangkok
  { id: 'bg-20', lat: -6.21,  lng: 106.85 }, // Jakarta
  { id: 'bg-21', lat: 14.69,  lng: -17.44 }, // Dakar
  { id: 'bg-22', lat: -26.20, lng: 28.04  }, // Johannesburg
  { id: 'bg-23', lat: 33.69,  lng: -117.83}, // Orange County
  { id: 'bg-24', lat: 45.42,  lng: -75.70 }, // Ottawa
  { id: 'bg-25', lat: 4.86,   lng: 114.94 }, // Brunei
  { id: 'bg-26', lat: -12.04, lng: -77.03 }, // Lima
  { id: 'bg-27', lat: 52.37,  lng: 4.89   }, // Amsterdam
  { id: 'bg-28', lat: 60.19,  lng: 24.94  }, // Helsinki
  { id: 'bg-29', lat: -34.60, lng: -58.38 }, // Buenos Aires
  { id: 'bg-30', lat: 10.48,  lng: -66.88 }, // Caracas
  { id: 'bg-31', lat: 43.65,  lng: -79.38 }, // Toronto
  { id: 'bg-32', lat: 50.08,  lng: 14.42  }, // Prague
  { id: 'bg-33', lat: -4.32,  lng: 15.32  }, // Kinshasa
  { id: 'bg-34', lat: 31.55,  lng: 74.34  }, // Lahore
  { id: 'bg-35', lat: -17.73, lng: 168.32 }, // Port Vila
]
