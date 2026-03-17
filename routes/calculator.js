const express = require('express');
const router  = express.Router();

/**
 * NPK requirements are based on:
 * - FAO Fertilizer and Plant Nutrition Bulletin
 * - ICAR (Indian Council of Agricultural Research) recommendations
 * - BRRI (Bangladesh Rice Research Institute) guidelines
 * - International Plant Nutrition Institute (IPNI) data
 *
 * Fertilizer prices are in USD/kg (approximate global average wholesale prices).
 * Actual prices vary significantly by country, region, season, and supplier.
 * Prices are used for estimation only — always check local market prices.
 */

// GET /api/calculator/crops
router.get('/crops', (req, res) => {
  const crops = [
    // Cereals — NPK in kg/ha from FAO/ICAR guidelines
    {
      id: 'rice_irrigated',
      name: 'Rice – Irrigated (High Yield)',
      icon: '🌾',
      npkRequirement: { n: 120, p: 60, k: 60 },
      season: 'Kharif/Boro',
      source: 'BRRI/ICAR',
      yieldTarget: '6–8 t/ha'
    },
    {
      id: 'rice_rainfed',
      name: 'Rice – Rainfed (Medium Yield)',
      icon: '🌾',
      npkRequirement: { n: 80, p: 40, k: 40 },
      season: 'Kharif',
      source: 'FAO',
      yieldTarget: '3–5 t/ha'
    },
    {
      id: 'wheat',
      name: 'Wheat',
      icon: '🌿',
      npkRequirement: { n: 120, p: 60, k: 40 },
      season: 'Rabi',
      source: 'ICAR/FAO',
      yieldTarget: '4–5 t/ha'
    },
    {
      id: 'maize',
      name: 'Maize (Corn)',
      icon: '🌽',
      npkRequirement: { n: 150, p: 75, k: 75 },
      season: 'Kharif/Summer',
      source: 'IPNI/FAO',
      yieldTarget: '6–8 t/ha'
    },
    {
      id: 'sorghum',
      name: 'Sorghum / Jowar',
      icon: '🌾',
      npkRequirement: { n: 80, p: 40, k: 40 },
      season: 'Kharif',
      source: 'ICRISAT',
      yieldTarget: '3–4 t/ha'
    },
    // Vegetables
    {
      id: 'potato',
      name: 'Potato',
      icon: '🥔',
      npkRequirement: { n: 180, p: 80, k: 150 },
      season: 'Rabi',
      source: 'CIP/ICAR',
      yieldTarget: '25–35 t/ha'
    },
    {
      id: 'tomato',
      name: 'Tomato',
      icon: '🍅',
      npkRequirement: { n: 150, p: 75, k: 150 },
      season: 'Rabi/Summer',
      source: 'AVRDC/ICAR',
      yieldTarget: '40–60 t/ha'
    },
    {
      id: 'onion',
      name: 'Onion',
      icon: '🧅',
      npkRequirement: { n: 100, p: 50, k: 100 },
      season: 'Rabi',
      source: 'NHRDF/ICAR',
      yieldTarget: '25–35 t/ha'
    },
    {
      id: 'cabbage',
      name: 'Cabbage',
      icon: '🥬',
      npkRequirement: { n: 150, p: 60, k: 120 },
      season: 'Rabi',
      source: 'FAO',
      yieldTarget: '30–40 t/ha'
    },
    {
      id: 'carrot',
      name: 'Carrot',
      icon: '🥕',
      npkRequirement: { n: 100, p: 60, k: 100 },
      season: 'Rabi',
      source: 'FAO',
      yieldTarget: '20–30 t/ha'
    },
    {
      id: 'chilli',
      name: 'Chilli / Pepper',
      icon: '🌶️',
      npkRequirement: { n: 100, p: 60, k: 60 },
      season: 'Annual',
      source: 'IIVR/ICAR',
      yieldTarget: '10–15 t/ha fresh'
    },
    {
      id: 'garlic',
      name: 'Garlic',
      icon: '🧄',
      npkRequirement: { n: 100, p: 50, k: 100 },
      season: 'Rabi',
      source: 'NHRDF',
      yieldTarget: '10–15 t/ha'
    },
    // Legumes (lower N due to N-fixation)
    {
      id: 'soybean',
      name: 'Soybean',
      icon: '🫘',
      npkRequirement: { n: 20, p: 60, k: 40 },
      season: 'Kharif',
      source: 'ICAR/CGIAR',
      yieldTarget: '2–3 t/ha',
      note: 'Low N — fixes atmospheric nitrogen via Rhizobium'
    },
    {
      id: 'groundnut',
      name: 'Groundnut (Peanut)',
      icon: '🥜',
      npkRequirement: { n: 20, p: 60, k: 60 },
      season: 'Kharif',
      source: 'ICRISAT',
      yieldTarget: '2–3 t/ha (pod)'
    },
    {
      id: 'lentil',
      name: 'Lentil / Masur Dal',
      icon: '🫘',
      npkRequirement: { n: 20, p: 40, k: 20 },
      season: 'Rabi',
      source: 'ICARDA',
      yieldTarget: '1–1.5 t/ha'
    },
    // Cash / Industrial crops
    {
      id: 'sugarcane',
      name: 'Sugarcane',
      icon: '🎋',
      npkRequirement: { n: 250, p: 100, k: 200 },
      season: 'Annual',
      source: 'ICAR-SBI',
      yieldTarget: '80–100 t/ha'
    },
    {
      id: 'cotton',
      name: 'Cotton',
      icon: '🌱',
      npkRequirement: { n: 120, p: 60, k: 60 },
      season: 'Kharif',
      source: 'CICR/ICAR',
      yieldTarget: '2–3 t/ha lint'
    },
    {
      id: 'mustard',
      name: 'Mustard / Rapeseed',
      icon: '🌼',
      npkRequirement: { n: 90, p: 40, k: 40 },
      season: 'Rabi',
      source: 'ICAR-DRMR',
      yieldTarget: '1.5–2 t/ha'
    },
    {
      id: 'sunflower',
      name: 'Sunflower',
      icon: '🌻',
      npkRequirement: { n: 90, p: 60, k: 60 },
      season: 'Kharif/Rabi',
      source: 'ICAR-IIOR',
      yieldTarget: '2–3 t/ha'
    },
    // Fruits
    {
      id: 'banana',
      name: 'Banana',
      icon: '🍌',
      npkRequirement: { n: 200, p: 60, k: 300 },
      season: 'Annual',
      source: 'NHB/ICAR',
      yieldTarget: '40–60 t/ha'
    },
    {
      id: 'mango',
      name: 'Mango (per tree/year)',
      icon: '🥭',
      npkRequirement: { n: 500, p: 200, k: 500 },
      season: 'Annual',
      source: 'NHB/ICAR',
      yieldTarget: '100–200 kg/tree',
      note: 'Per hectare (100 trees). Adjust for actual tree count.'
    },
  ];
  res.json({ success: true, crops });
});

// GET /api/calculator/fertilizers
router.get('/fertilizers', (req, res) => {
  /**
   * Prices are in USD per kg — approximate global average wholesale/retail prices (2024).
   * Source: FAO Fertilizer Price Database, World Bank Commodity Data, IFA
   * Actual local retail prices vary by 30–200% depending on country, subsidies, and season.
   * These prices are for estimation purposes only.
   */
  const fertilizers = [
    // ── Nitrogen sources ────────────────────────────────────────────────────
    {
      id: 'urea',
      name: 'Urea (46-0-0)',
      n: 46, p: 0, k: 0,
      type: 'N',
      priceUSD: 0.35,          // ~$350/tonne global avg
      nutrientEfficiency: 0.75, // 75% N uptake efficiency
      notes: 'Most common N fertilizer. Volatile if not incorporated.'
    },
    {
      id: 'ammonium_sulfate',
      name: 'Ammonium Sulphate (21-0-0)',
      n: 21, p: 0, k: 0,
      type: 'N',
      priceUSD: 0.28,
      nutrientEfficiency: 0.80,
      notes: 'Good for alkaline soils. Contains 24% sulphur.'
    },
    {
      id: 'can',
      name: 'CAN – Calcium Ammonium Nitrate (26-0-0)',
      n: 26, p: 0, k: 0,
      type: 'N',
      priceUSD: 0.38,
      nutrientEfficiency: 0.85,
      notes: 'Fast-acting. Good for split application.'
    },
    // ── Phosphorus sources ──────────────────────────────────────────────────
    {
      id: 'dap',
      name: 'DAP – Diammonium Phosphate (18-46-0)',
      n: 18, p: 46, k: 0,
      type: 'NP',
      priceUSD: 0.55,          // ~$550/tonne global avg
      nutrientEfficiency: 0.80,
      notes: 'Most popular P fertilizer globally. Also supplies 18% N.'
    },
    {
      id: 'ssp',
      name: 'SSP – Single Super Phosphate (0-16-0)',
      n: 0, p: 16, k: 0,
      type: 'P',
      priceUSD: 0.22,
      nutrientEfficiency: 0.75,
      notes: 'Contains 12% sulphur. Economical P source.'
    },
    {
      id: 'tsp',
      name: 'TSP – Triple Super Phosphate (0-46-0)',
      n: 0, p: 46, k: 0,
      type: 'P',
      priceUSD: 0.45,
      nutrientEfficiency: 0.80,
      notes: 'High-concentration P. No sulphur content.'
    },
    // ── Potassium sources ───────────────────────────────────────────────────
    {
      id: 'mop',
      name: 'MOP – Muriate of Potash (0-0-60)',
      n: 0, p: 0, k: 60,
      type: 'K',
      priceUSD: 0.30,          // ~$300/tonne global avg
      nutrientEfficiency: 0.85,
      notes: 'Most common K fertilizer. Avoid on chloride-sensitive crops.'
    },
    {
      id: 'sop',
      name: 'SOP – Sulphate of Potash (0-0-50)',
      n: 0, p: 0, k: 50,
      type: 'K',
      priceUSD: 0.65,
      nutrientEfficiency: 0.85,
      notes: 'Premium K source. Contains 17% sulphur. Better for fruits.'
    },
    // ── Complex NPK fertilizers ─────────────────────────────────────────────
    {
      id: 'npk_20_20_20',
      name: 'NPK 20-20-20 (Water Soluble)',
      n: 20, p: 20, k: 20,
      type: 'NPK',
      priceUSD: 1.10,
      nutrientEfficiency: 0.90,
      notes: 'Ideal for fertigation and foliar spray. High uptake efficiency.'
    },
    {
      id: 'npk_15_15_15',
      name: 'NPK 15-15-15',
      n: 15, p: 15, k: 15,
      type: 'NPK',
      priceUSD: 0.52,
      nutrientEfficiency: 0.80,
      notes: 'Balanced formula. Good for general basal application.'
    },
    {
      id: 'npk_10_26_26',
      name: 'NPK 10-26-26',
      n: 10, p: 26, k: 26,
      type: 'NPK',
      priceUSD: 0.58,
      nutrientEfficiency: 0.80,
      notes: 'High P+K. Good for root crops and fruits.'
    },
    // ── Organic fertilizers ─────────────────────────────────────────────────
    {
      id: 'vermicompost',
      name: 'Vermicompost',
      n: 1.5, p: 1.0, k: 0.8,
      type: 'Organic',
      priceUSD: 0.15,
      nutrientEfficiency: 0.60,
      notes: 'Improves soil biology. Nutrients release slowly over months.'
    },
    {
      id: 'fym',
      name: 'FYM – Farm Yard Manure',
      n: 0.5, p: 0.25, k: 0.5,
      type: 'Organic',
      priceUSD: 0.04,
      nutrientEfficiency: 0.50,
      notes: 'Improves soil structure. Apply 10–15 t/ha as basal.'
    },
    {
      id: 'neem_cake',
      name: 'Neem Cake (Organic)',
      n: 5.0, p: 1.0, k: 1.5,
      type: 'Organic',
      priceUSD: 0.20,
      nutrientEfficiency: 0.70,
      notes: 'Also acts as nematicide and pesticide. Slow release N.'
    },
  ];
  res.json({ success: true, fertilizers });
});

// POST /api/calculator/calculate
router.post('/calculate', (req, res) => {
  try {
    const { cropId, area, areaUnit, soilN, soilP, soilK, crops } = req.body;

    // ── Convert area to hectares ──────────────────────────────────────────
    let areaHa = parseFloat(area);
    if (areaUnit === 'acre')    areaHa = areaHa * 0.404686;
    else if (areaUnit === 'bigha')   areaHa = areaHa * 0.202343; // 1 bigha = 0.2023 ha (varies by region)
    else if (areaUnit === 'katha')   areaHa = areaHa * 0.013378; // 1 katha = 0.0134 ha (Bangladesh)
    else if (areaUnit === 'decimal') areaHa = areaHa * 0.004047; // 1 decimal = 1/100 acre
    else if (areaUnit === 'sqm')     areaHa = areaHa / 10000;

    const crop = crops.find(c => c.id === cropId);
    if (!crop) return res.status(400).json({ success: false, message: 'Crop not found' });

    // ── Base NPK requirement (kg/ha) ──────────────────────────────────────
    const reqN = crop.npkRequirement.n;
    const reqP = crop.npkRequirement.p;
    const reqK = crop.npkRequirement.k;

    /**
     * Soil available nutrient deduction
     * Based on soil organic carbon (SOC) and standard conversion factors:
     * Soil test levels: Low=0, Medium=1, High=2
     * Available N from SOC (kg/ha): Low≈80, Medium≈120, High≈180
     * Available P2O5 (kg/ha): Low≈10, Medium≈22, High≈45
     * Available K2O (kg/ha): Low≈80, Medium≈140, High≈220
     * Source: ICAR Soil Testing & Fertilizer Recommendation guidelines
     */
    const soilNAvail = [0, 30, 60][soilN] || 0;   // kg/ha of available N
    const soilPAvail = [0, 10, 20][soilP] || 0;   // kg/ha of available P2O5
    const soilKAvail = [0, 40, 80][soilK] || 0;   // kg/ha of available K2O

    const netN = Math.max(reqN - soilNAvail, 0);
    const netP = Math.max(reqP - soilPAvail, 0);
    const netK = Math.max(reqK - soilKAvail, 0);

    // ── Total nutrients needed for the area ───────────────────────────────
    const totalN = netN * areaHa;
    const totalP = netP * areaHa;
    const totalK = netK * areaHa;

    /**
     * Auto-recommendation logic:
     * 1. DAP first — supplies both P and some N
     * 2. MOP — supplies K
     * 3. Urea — makes up remaining N deficit
     *
     * Fertilizer quantities calculated from nutrient content:
     * e.g. To supply 100 kg N using Urea (46% N): 100 / 0.46 = 217 kg Urea
     */
    const recommendations = [];
    let remainN = totalN;

    // DAP for phosphorus
    if (totalP > 0) {
      const dapKg = totalP / 0.46;                    // DAP is 46% P2O5
      const nFromDap = dapKg * 0.18;                  // DAP also has 18% N
      remainN = Math.max(remainN - nFromDap, 0);
      recommendations.push({
        fertilizer: 'DAP (Diammonium Phosphate)',
        requiredKg: Math.round(dapKg * 10) / 10,
        costUSD: Math.round(dapKg * 0.55 * 100) / 100,
        perHa: Math.round((dapKg / areaHa) * 10) / 10,
        nutrients: { n: Math.round(nFromDap), p: Math.round(totalP), k: 0 }
      });
    }

    // MOP for potassium
    if (totalK > 0) {
      const mopKg = totalK / 0.60;                    // MOP is 60% K2O
      recommendations.push({
        fertilizer: 'MOP (Muriate of Potash)',
        requiredKg: Math.round(mopKg * 10) / 10,
        costUSD: Math.round(mopKg * 0.30 * 100) / 100,
        perHa: Math.round((mopKg / areaHa) * 10) / 10,
        nutrients: { n: 0, p: 0, k: Math.round(totalK) }
      });
    }

    // Urea for remaining nitrogen
    if (remainN > 0) {
      const ureaKg = remainN / 0.46;                  // Urea is 46% N
      recommendations.push({
        fertilizer: 'Urea (46% N)',
        requiredKg: Math.round(ureaKg * 10) / 10,
        costUSD: Math.round(ureaKg * 0.35 * 100) / 100,
        perHa: Math.round((ureaKg / areaHa) * 10) / 10,
        nutrients: { n: Math.round(remainN), p: 0, k: 0 }
      });
    }

    const totalCostUSD = recommendations.reduce((sum, r) => sum + (r.costUSD || 0), 0);

    res.json({
      success: true,
      result: {
        crop: crop.name,
        area: Math.round(areaHa * 100) / 100,
        areaUnit: 'hectares',
        source: crop.source || 'FAO/ICAR',
        yieldTarget: crop.yieldTarget || '',
        requiredNPK: {
          n: Math.round(totalN),
          p: Math.round(totalP),
          k: Math.round(totalK)
        },
        soilDeductions: {
          n: Math.round(soilNAvail * areaHa),
          p: Math.round(soilPAvail * areaHa),
          k: Math.round(soilKAvail * areaHa)
        },
        recommendations,
        totalCostUSD: Math.round(totalCostUSD * 100) / 100,
        priceNote: 'Prices in USD (global avg wholesale 2024). Actual local prices may vary significantly.',
        applicationSchedule: [
          {
            timing: 'Basal Application (Before/At Sowing)',
            share: '100% P (DAP), 50% K (MOP), 30% N (Urea)',
            notes: 'Incorporate into soil before planting or transplanting'
          },
          {
            timing: '25–30 Days After Sowing (1st Top Dress)',
            share: '40% N (Urea)',
            notes: 'Apply when crop is actively growing. Avoid during heavy rain.'
          },
          {
            timing: '50–60 Days After Sowing (2nd Top Dress)',
            share: '30% N (Urea), 50% K (MOP)',
            notes: 'Final N and K application. Irrigate after application if possible.'
          }
        ],
        disclaimer: 'Recommendations are based on FAO/ICAR research guidelines and standard soil fertility assumptions. Actual requirements depend on local soil conditions, variety, climate, and management practices. Always consult your local agronomist or soil testing laboratory for precision recommendations. Fertilizer prices are approximate global averages — actual prices vary by country, season, and supplier.'
      }
    });
  } catch (error) {
    console.error('Calculator error:', error);
    res.status(500).json({ success: false, message: 'Calculation error. Please try again.' });
  }
});

module.exports = router;
