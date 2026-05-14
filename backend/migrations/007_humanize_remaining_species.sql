-- Migration 007: Humanized descriptions, breeding guides & YouTube links for remaining 35 species
-- Also fixes: migration 006 used wrong UUID for Litopenaeus vannamei (33333333-...333 doesn't exist).
-- Correct UUID is 7f9df14c-8749-44da-816b-424f232d1087 — updated here.

-- ─── FIX: Litopenaeus vannamei (Pacific white shrimp) ─────────────────────────
UPDATE knowledge_nodes SET data = data || $$
{
  "description": "🦐 Vannamei is India's #1 farmed shrimp — and for good reason. This Pacific white shrimp grows from a tiny nauplii to market size (18–20g) in just 90–100 days, making it one of the fastest cash crops in aquaculture. It dominates Indian shrimp exports, especially from Andhra Pradesh, Odisha, and Gujarat. Farmers can get ₹250–450/kg depending on size and season. It needs brackish water (10–25 ppt salinity), so it's mostly grown in coastal districts. Once you get the biosecurity right, it's very rewarding.",
  "breeding_guide": {
    "overview": "Vannamei cannot be bred on-farm in India — it needs specialised SPF (Specific Pathogen Free) broodstock imported from abroad and hatcheries with strict biosecurity. As a farmer, your job starts at the nursery stage: you buy certified PLs (post-larvae) from a licensed hatchery, acclimate them to your pond water, and then grow them out. Focus 100% on water quality and feed management.",
    "steps": [
      "Source PLs (post-larvae, PL10–PL12) only from MPEDA-certified or state-licensed hatcheries. Ask for health certification — disease-free stock is the single biggest factor in your success.",
      "Prepare your pond: drain completely, sun-dry for 10–14 days, apply lime (200–300 kg/acre), then fill with filtered brackish water (10–25 ppt). Check pH (7.5–8.5) and DO before stocking.",
      "Acclimate PLs slowly — float the hatchery bag in your pond water for 20–30 minutes to equalise temperature, then gradually mix pond water into the bag over 1 hour before releasing.",
      "Stock at 40–60 PLs per sq. metre for semi-intensive ponds (up to 150/sqm for intensive). Higher density = more aeration needed.",
      "Feed with quality pelleted shrimp feed (30–35% protein) 3–4 times daily using feeding trays to monitor consumption and avoid waste.",
      "Monitor water quality daily: DO >4 mg/L, pH 7.5–8.5, salinity 10–25 ppt, ammonia <0.1 mg/L. Use aerators generously — shrimp suffocate fast.",
      "Harvest at 90–110 days when shrimp reach 18–22g. Early morning harvest is best — cooler water reduces stress."
    ],
    "timeline": "Pond preparation → 14 days → PL stocking → 90–110 days grow-out → Harvest",
    "beginner_tip": "⚠️ Do NOT cut corners on PL quality or biosecurity. One batch of infected seed can wipe out your entire crop in 2–3 weeks. Always buy certified PLs and quarantine them before stocking."
  },
  "youtube_links": [
    {
      "search_query": "vannamei shrimp farming India beginners guide",
      "title": "Vannamei Shrimp Farming — Full Guide for Indian Farmers",
      "hint": "Pond preparation, PL stocking, feed & harvest tips"
    },
    {
      "search_query": "vannamei shrimp water quality management India",
      "title": "Water Quality Management in Vannamei Ponds",
      "hint": "How to maintain DO, salinity and pH for healthy shrimp"
    }
  ]
}
$$::jsonb
WHERE id = '7f9df14c-8749-44da-816b-424f232d1087';

-- ─── Cyprinus carpio (Common carp) ───────────────────────────────────────────
UPDATE knowledge_nodes SET data = data || $$
{
  "description": "🐟 Common carp is the workhorse of Indian fish ponds. Domesticated for centuries, it's adaptable, fast-growing, and eats almost anything — algae, worms, grain, and pellets. It reaches 1–2 kg in 8–10 months and sells at ₹60–100/kg in local markets. Three varieties are commonly farmed: Scale carp (fully scaled), Mirror carp (large irregular scales), and Leather carp (nearly scaleless). It's particularly popular in Bihar, West Bengal, and Uttar Pradesh where pond-based farming is common.",
  "breeding_guide": {
    "overview": "Common carp is one of the easiest fish to breed in India. Unlike Indian major carps, it can spawn naturally in ponds when the right conditions exist — rising water level, aquatic vegetation, and temperature above 20°C. For commercial production, induced breeding gives more control and higher yields.",
    "steps": [
      "Select mature broodfish aged 2+ years. Females should have a soft, round belly full of eggs. Males release milt when gently pressed near the vent.",
      "For natural spawning: place spawning mats (dried grass bundles or kakaban — coconut fibre mats) in a special nursery pond. Fill pond with fresh water to simulate monsoon. Fish spawn on the mats within 12–24 hours.",
      "For induced breeding: inject females with Ovaprim (0.5 mL/kg) or HCG. Males get a half dose. Keep in hapas overnight. Collect eggs and fertilise artificially or let them spawn naturally.",
      "Collect fertilised eggs and transfer to incubation jars with gentle water flow. Eggs hatch in 48–72 hours at 22–26°C.",
      "Move larvae to nursery ponds after 3 days. Feed boiled egg yolk first, then fine rice bran + mustard cake. Transition to starter pellets after 2 weeks.",
      "Fingerlings (5–8 cm) are ready in 30–45 days. Stock into grow-out ponds at 2,000–5,000 fish/acre."
    ],
    "timeline": "Broodfish conditioning → 2 weeks → Spawning → 48–72 hrs → Hatching → 45 days → Fingerlings → 8–10 months → Harvest",
    "beginner_tip": "💡 Common carp is the best fish to start with if you're new to breeding. It's forgiving, and you can watch the whole process unfold in your own pond without needing expensive hatchery equipment."
  },
  "youtube_links": [
    {
      "search_query": "common carp farming India pond culture",
      "title": "Common Carp Farming — India Pond Culture Guide",
      "hint": "Easy step-by-step for beginners in Indian conditions"
    }
  ]
}
$$::jsonb
WHERE id = 'bcd65b41-e496-4ba5-bc62-e003d301dcd3';

-- ─── Ctenopharyngodon idella (Grass carp) ────────────────────────────────────
UPDATE knowledge_nodes SET data = data || $$
{
  "description": "🌿 Grass carp is the lawnmower of the fish pond. It's a herbivore that eats aquatic weeds, submerged grasses, and terrestrial plant matter — making it incredibly useful in ponds that get choked with vegetation. It's one of the world's most farmed fish and grows quickly to 2–3 kg in 12 months. In India it's almost always grown in polyculture alongside Rohu, Catla, and Silver carp so all pond layers and food sources are used efficiently. Market price is ₹70–110/kg.",
  "breeding_guide": {
    "overview": "Grass carp does not breed naturally in ponds — it needs flowing water with monsoon-like conditions to spawn in the wild. In hatcheries, induced breeding with hormones is standard practice. For farmers, simply buying fingerlings from a hatchery and growing them out is the practical approach.",
    "steps": [
      "Grass carp is almost always polyculture-farmed — stock it alongside Catla (surface), Rohu (mid-water), Silver carp (surface plankton), and Mrigal (bottom). Each fish uses a different food source.",
      "Stock fingerlings (10–15 cm) at 500–800 fish/acre as part of a polyculture mix. Grass carp typically gets 10–15% of the total stocking.",
      "Feed with cut grass, aquatic weeds, water hyacinth, leaves of terrestrial plants, and napier grass. Supplement with pellets or rice bran when natural feed is low.",
      "Grass carp are jumpers — make sure pond bunds are at least 60 cm above the water surface or they'll escape.",
      "Harvest after 12–18 months when they reach 2–3 kg. They can grow to 5+ kg if given 2 years."
    ],
    "timeline": "Fingerling stocking → 12–18 months → Harvest at 2–3 kg",
    "beginner_tip": "💡 Plant napier grass or paragrass along your pond bunds — you get free feed for your grass carp and the roots also help prevent bund erosion."
  },
  "youtube_links": [
    {
      "search_query": "grass carp polyculture farming India",
      "title": "Grass Carp Farming & Polyculture India",
      "hint": "How to integrate grass carp in an Indian composite fish culture pond"
    }
  ]
}
$$::jsonb
WHERE id = '8759f405-2ab3-42d8-a5dd-fab00c5fe012';

-- ─── Hypophthalmichthys molitrix (Silver carp) ───────────────────────────────
UPDATE knowledge_nodes SET data = data || $$
{
  "description": "🐠 Silver carp is a natural plankton vacuum — it filters phytoplankton (tiny algae) from the water using special gill rakers, keeping your pond clean while growing. It's a Chinese carp that has become essential in Indian composite fish culture. It grows to 1.5–3 kg in 10–12 months and sells for ₹60–90/kg. Because it eats microscopic algae at the surface, it doesn't compete with Rohu, Catla, or Mrigal for food — making it a perfect addition to any polyculture pond.",
  "breeding_guide": {
    "overview": "Silver carp doesn't breed naturally in ponds — it needs river-like conditions with flowing water. All commercially available fingerlings come from hatcheries using induced breeding. As a farmer, your job is simply to buy certified fingerlings and use them in your polyculture pond.",
    "steps": [
      "Silver carp is always polyculture-farmed. Stock it as a supplementary species at 200–400 fish/acre alongside Catla, Rohu, and Mrigal.",
      "No supplementary feeding needed — silver carp lives entirely on natural phytoplankton in the pond. This makes it essentially a free fish: zero feed cost.",
      "Fertilise your pond regularly (cow dung: 200–300 kg/acre/month, or urea + SSP) to boost plankton growth — this feeds your silver carp.",
      "Monitor water colour: healthy silvery-green or green water means good plankton bloom and happy silver carp. Dark brown or foul-smelling water means over-fertilisation.",
      "Harvest after 10–12 months when fish reach 1.5–2 kg. Silver carp is typically harvested together with the rest of the polyculture batch."
    ],
    "timeline": "Fingerling stocking → 10–12 months → Harvest at 1.5–3 kg",
    "beginner_tip": "💡 Silver carp is a bonus fish — it costs very little to add to a polyculture pond and improves water quality by consuming excess algae. Never leave it out of your composite fish culture mix."
  },
  "youtube_links": [
    {
      "search_query": "silver carp composite fish culture India polyculture",
      "title": "Silver Carp in Indian Composite Fish Culture",
      "hint": "Role of silver carp in a polyculture pond system"
    }
  ]
}
$$::jsonb
WHERE id = '1e48f4ab-2e30-4a60-b49b-3cfdab0ea7f2';

-- ─── Aristichthys nobilis (Bighead carp) ─────────────────────────────────────
UPDATE knowledge_nodes SET data = data || $$
{
  "description": "🐡 Bighead carp is the big brother of Silver carp — it also filter-feeds on plankton but prefers zooplankton (tiny animals) over algae, and it grows much larger, reaching 3–5 kg in 12 months. Originally from China, it's now a key part of Indian composite fish culture systems, especially in West Bengal and Bihar. It's usually stocked as 10–15% of the total fish in a polyculture pond. Market price is ₹65–100/kg.",
  "breeding_guide": {
    "overview": "Like all Chinese carps, Bighead doesn't breed naturally in ponds. Fingerlings come from government or private hatcheries using induced spawning. For farmers, it's a buy-and-grow species — no on-farm breeding needed.",
    "steps": [
      "Stock Bighead carp fingerlings as part of a polyculture mix at 200–400/acre. They coexist with Catla (surface), Rohu (mid-water), Silver carp (phytoplankton), and Mrigal (bottom).",
      "Bighead carp eats primarily zooplankton — the tiny water fleas and copepods that naturally grow in fertilised ponds.",
      "Fertilise ponds regularly to maintain both phytoplankton (for Silver carp) and zooplankton (for Bighead). A mixed organic + inorganic fertilisation schedule works best.",
      "Supplement with rice bran + groundnut cake meal at 2–3% body weight if natural plankton is insufficient.",
      "Harvest at 12–18 months when fish reach 3–5 kg."
    ],
    "timeline": "Fingerling stocking → 12–18 months → Harvest at 3–5 kg",
    "beginner_tip": "💡 If your pond water stays murky brown with poor plankton bloom, Bighead carp will grow slowly. Fix your fertilisation schedule first — healthy green water = faster growth."
  },
  "youtube_links": [
    {
      "search_query": "bighead carp farming polyculture India",
      "title": "Bighead Carp — Indian Polyculture Farming",
      "hint": "How Bighead carp fits into composite fish culture ponds"
    }
  ]
}
$$::jsonb
WHERE id = '456ae84f-d913-4215-bbf3-c64df00bde06';

-- ─── Labeo calbasu (Orange-fin labeo / Kalbasu) ───────────────────────────────
UPDATE knowledge_nodes SET data = data || $$
{
  "description": "🐟 Kalbasu (Labeo calbasu) is a handsome Indian carp with distinctive orange-tipped fins, native to the Ganga and Brahmaputra river systems. It's a bottom feeder that scrapes algae and decomposing organic matter from pond floors — cleaning up waste that other fish ignore. It grows to 1–2 kg in 10–12 months and commands ₹80–130/kg in local markets, slightly higher than Rohu because of its firm, tasty flesh. It's excellent in polyculture where it fills the bottom-feeding niche alongside Mrigal.",
  "breeding_guide": {
    "overview": "Kalbasu requires induced breeding similar to Indian major carps — it does not spawn naturally in ponds. Fingerlings from government hatcheries are widely available in Bihar, West Bengal, and Odisha.",
    "steps": [
      "Stock Kalbasu as part of a polyculture mix at 200–500 fish/acre. Pair it with Rohu (mid-water), Catla (surface), and Silver carp to cover all feeding zones.",
      "Kalbasu feeds on bottom organic matter and algal mats. Supplement with rice bran, mustard cake, and low-sinking pellets that fall to the pond floor.",
      "Fertilise ponds regularly — organic matter breakdown on the pond bottom is Kalbasu's primary food source.",
      "Monitor that pond bottom doesn't become anaerobic (foul-smelling black mud). Periodic aeration or shallow water exchange helps.",
      "Harvest after 10–12 months at 1–2 kg body weight."
    ],
    "timeline": "Fingerling stocking → 10–12 months → Harvest at 1–2 kg",
    "beginner_tip": "💡 Kalbasu is an underrated fish. It cleans your pond floor, earns a better price than Rohu in many markets, and requires almost no extra effort when grown in polyculture."
  },
  "youtube_links": [
    {
      "search_query": "Labeo calbasu kalbasu fish farming India",
      "title": "Kalbasu Fish Farming in India",
      "hint": "All about growing Labeo calbasu in polyculture ponds"
    }
  ]
}
$$::jsonb
WHERE id = 'ba054eac-4432-4275-b0f8-b0f4b51fb97c';

-- ─── Labeo bata (Bata) ────────────────────────────────────────────────────────
UPDATE knowledge_nodes SET data = data || $$
{
  "description": "🐟 Bata (Labeo bata) is a small but important Indian carp from the Ganga and Brahmaputra plains. It's a bottom-feeder like Kalbasu, growing to only 500g–1 kg in ponds but fetching a surprisingly good price (₹80–150/kg) because of its excellent taste. It's commonly grown in polyculture ponds in Bihar, West Bengal, and Assam, often alongside major carps as a supplementary species that makes use of organic matter settling on the pond bottom.",
  "breeding_guide": {
    "overview": "Bata requires induced breeding — it does not spawn naturally in ponds. Induced breeding is done at government hatcheries, and fingerlings are available from April to July. On-farm breeding is possible for experienced farmers with the right setup.",
    "steps": [
      "Stock Bata at 500–1,000 fish/acre alongside major carps in a polyculture system. It fills the bottom-feeding niche without competing with surface or mid-water feeders.",
      "Supplementary feed: rice bran and mustard oil cake mixture applied near pond edges where Bata forages.",
      "Fertilise regularly so organic sedimentation on the pond floor stays nutrient-rich — this is Bata's primary food.",
      "Monitor water quality: Bata is moderately sensitive to poor water. Keep DO >4 mg/L and ammonia low.",
      "Harvest after 8–10 months when fish reach 400–800g."
    ],
    "timeline": "Fingerling stocking → 8–10 months → Harvest at 400–800g",
    "beginner_tip": "💡 Bata is popular in local fish markets and weekend haats. If you can stock it alongside your major carps, it adds revenue with almost no extra cost."
  },
  "youtube_links": [
    {
      "search_query": "Labeo bata bata fish farming India pond",
      "title": "Bata Fish (Labeo bata) Farming India",
      "hint": "Growing bata alongside major carps in Indian ponds"
    }
  ]
}
$$::jsonb
WHERE id = 'cc3f6638-75bd-4216-b042-105986c9dd1f';

-- ─── Cirrhinus reba (Reba carp) ───────────────────────────────────────────────
UPDATE knowledge_nodes SET data = data || $$
{
  "description": "🐟 Reba carp (Cirrhinus reba) is a small-to-medium Indian carp from the Ganga-Brahmaputra river system, closely related to Mrigal. It's a detritivore — it eats decomposing organic matter and algae from the pond bottom. Though it only reaches 500g–1.5 kg in culture, it's prized for its flavour and fetches ₹90–160/kg in local markets. It's grown primarily in Bihar, Jharkhand, and West Bengal, often in polyculture ponds as a bottom-feeding supplement to major carps.",
  "breeding_guide": {
    "overview": "Reba carp requires induced breeding using hormones like Ovaprim or HCG — similar to Mrigal and Rohu. Government hatcheries in Bihar and Jharkhand produce fingerlings during the monsoon season (June–August).",
    "steps": [
      "Stock Reba as a supplementary species in polyculture at 300–600 fish/acre. It coexists well with Rohu, Catla, Mrigal, and Silver carp.",
      "Feed with rice bran, mustard cake, and bottom-sinking pellets. Reba forages near the pond floor and consumes organic debris.",
      "Fertilise ponds monthly with cow dung or poultry manure to sustain bottom organic matter.",
      "Water quality: tolerates slightly turbid ponds; keep DO >3.5 mg/L and pH 7–8.5.",
      "Harvest at 8–12 months when fish reach 500g–1.5 kg."
    ],
    "timeline": "Fingerling stocking → 8–12 months → Harvest at 500g–1.5 kg",
    "beginner_tip": "💡 Reba carp is sometimes overlooked in favour of Mrigal, but it commands a better price in many Eastern Indian markets. Check your local mandi prices before deciding on your polyculture mix."
  },
  "youtube_links": [
    {
      "search_query": "Cirrhinus reba reba carp fish farming India",
      "title": "Reba Carp Farming in Indian Ponds",
      "hint": "Growing Cirrhinus reba in composite fish culture"
    }
  ]
}
$$::jsonb
WHERE id = '046faaa1-e583-4b30-9882-62a02d88f38b';

-- ─── Puntius sarana (Olive barb / Saranga) ────────────────────────────────────
UPDATE knowledge_nodes SET data = data || $$
{
  "description": "🐟 Saranga (Puntius sarana) is a small, bony but delicious fish from the Ganga and Brahmaputra systems, very popular in Assam, West Bengal, and Northeast India. It grows to only 200–500g in ponds, but because it's a beloved local fish, it sells at premium prices of ₹120–220/kg in local markets. It's extremely hardy — tolerates low oxygen and poor water quality better than most carps. Often grown in rice-fish culture systems or small seasonal ponds.",
  "breeding_guide": {
    "overview": "Saranga can spawn naturally in ponds during monsoon when water temperature rises and fresh water is added. It's also breed using induced methods at hatcheries. For small farmers, natural pond spawning works well.",
    "steps": [
      "Saranga breeds well in shallow nursery ponds (0.5–1m deep) during monsoon. Add fresh water to trigger spawning. Place spawning mats for fish to scatter eggs on.",
      "Alternatively, stock fingerlings from government hatcheries in the Northeast or state fisheries departments.",
      "Stock at 1,000–2,000 fish/acre in a monoculture pond or as a minor species in polyculture.",
      "Feed with rice bran, mustard cake, and fine pellets applied at pond edges where Saranga actively forages.",
      "Harvest after 6–8 months when fish reach 200–400g."
    ],
    "timeline": "Natural spawning (monsoon) or fingerling stocking → 6–8 months → Harvest",
    "beginner_tip": "💡 Saranga is a great fish for small ponds and rice-fish culture. If you're in Assam or Northeast India, it can earn you ₹150–200/kg in local markets while needing very little investment."
  },
  "youtube_links": [
    {
      "search_query": "Puntius sarana saranga fish farming Assam northeast India",
      "title": "Saranga (Puntius sarana) Fish Farming",
      "hint": "Cultivation of olive barb in Northeast India ponds"
    }
  ]
}
$$::jsonb
WHERE id = 'b891399f-bb72-4c91-b362-dd1a4e5e5aad';

-- ─── Tor tor (Golden mahseer) ─────────────────────────────────────────────────
UPDATE knowledge_nodes SET data = data || $$
{
  "description": "🏆 Golden mahseer is the king of Indian river fish — large, powerful, and breathtakingly beautiful with golden scales. It grows slowly to 3–8 kg over 3–5 years in culture, but fetches extraordinary prices of ₹500–1,200/kg because of its extreme rarity and demand. It's a cold-to-moderate water fish farmed in hilly streams and river-fed ponds in Uttarakhand, Himachal Pradesh, and the Northeast. It's also a conservation priority species — many farms combine conservation breeding with eco-tourism income.",
  "breeding_guide": {
    "overview": "Mahseer breeding is challenging and best left to specialised research stations. It requires specific river-like conditions: cool, fast-flowing, well-oxygenated water. However, fingerling production has improved significantly through ICAR-DCFR (Bhimtal) and some state fisheries departments. For farmers, it's a grow-out and conservation enterprise rather than a breeding operation.",
    "steps": [
      "Obtain certified fingerlings from ICAR-DCFR Bhimtal or state fisheries departments in Uttarakhand/HP/Northeast. Wild collection is illegal.",
      "Set up raceways or river-fed ponds with fast-flowing, well-oxygenated cold water (15–24°C). Mahseer cannot survive in warm, stagnant water.",
      "Stock at very low densities: 100–200 fish/acre. They need space and clean water.",
      "Feed with commercial trout pellets or high-protein sinking pellets (35–40% protein). They also eat insects, worms, and small fish in natural conditions.",
      "Do NOT harvest for 3+ years. Mahseer's value comes from size — a 5 kg fish earns 5–10× more than five 1 kg fish.",
      "Consider catch-and-release angling tourism alongside culture — mahseer attracts premium fly-fishing tourists willing to pay ₹3,000–10,000/day."
    ],
    "timeline": "Fingerling stocking → 18–24 months → 1 kg → 3–5 years → 5–8 kg (premium harvest)",
    "beginner_tip": "⚠️ Mahseer farming is NOT for beginners or those who need quick income. It's a long-term investment in premium and conservation farming. Best suited for farmers who already have a river-fed water source in a hilly region."
  },
  "youtube_links": [
    {
      "search_query": "golden mahseer Tor tor farming India conservation",
      "title": "Golden Mahseer Farming & Conservation India",
      "hint": "How mahseer is bred and grown in Indian hill state farms"
    }
  ]
}
$$::jsonb
WHERE id = 'e8738828-4503-49d3-a903-8d48ca32b02b';

-- ─── Oreochromis niloticus (Nile tilapia) ─────────────────────────────────────
-- Already in migration 006 (55555555-...) — skip

-- ─── Lates calcarifer (Asian seabass / Barramundi) ────────────────────────────
UPDATE knowledge_nodes SET data = data || $$
{
  "description": "🐟 Asian seabass (also called Barramundi or Bhekti in Bengal) is a premium marine-brackish fish that is rapidly becoming one of the hottest fish farming opportunities in coastal India. It grows fast — from fingerling to 1.5–2.5 kg in just 8–12 months — and earns ₹200–400/kg in domestic markets, with even better returns in export. It's a carnivore that thrives in cage culture in estuaries, brackish ponds, and even RAS systems. States like Andhra Pradesh, Tamil Nadu, Kerala, and West Bengal are leading its culture.",
  "breeding_guide": {
    "overview": "Seabass is a protandrous hermaphrodite — males change sex to female as they grow. Breeding requires specialised hatcheries with marine water and controlled conditions. For farmers, sourcing quality fingerlings from licensed hatcheries (CMFRI, MPEDA-certified) is the starting point.",
    "steps": [
      "Source fingerlings from CMFRI, CIBA, or licensed private hatcheries. Ask for graded fingerlings (5–8 cm) — size uniformity reduces cannibalism.",
      "For pond culture: prepare brackish ponds (5–20 ppt salinity), apply lime, and install aerators. Stock at 2,000–5,000 fish/acre.",
      "For cage culture: net cages (6m × 6m × 4m) are placed in estuaries or coastal waters. Stock at 20–30 fish/cubic metre.",
      "Feed exclusively with high-protein pellets (45–50% protein). Seabass is a carnivore — do NOT use plant-based feeds only.",
      "Grading is critical: seabass are cannibalistic at small sizes. Grade every 4–6 weeks and separate large from small fish.",
      "Harvest at 8–12 months (1–2.5 kg). Larger fish (2+ kg) fetch premium prices in hotels and export markets."
    ],
    "timeline": "Fingerling (5 cm) → 3–4 months → 500g → 8–12 months total → 1.5–2.5 kg harvest",
    "beginner_tip": "⚠️ Seabass fingerlings are cannibalistic. Missing a grading round can result in 30–40% of your stock being eaten by larger fish. Grading every month is non-negotiable."
  },
  "youtube_links": [
    {
      "search_query": "Asian seabass barramundi farming India cage culture",
      "title": "Barramundi / Seabass Farming India — Cage & Pond",
      "hint": "Complete guide to growing bhekti/barramundi in Indian conditions"
    },
    {
      "search_query": "Lates calcarifer seabass RAS farming India",
      "title": "Seabass in RAS Systems — India",
      "hint": "Recirculating aquaculture for barramundi production"
    }
  ]
}
$$::jsonb
WHERE id = '41b54a1a-87af-47cb-8492-f91b1412f495';

-- ─── Chanos chanos (Milkfish) ─────────────────────────────────────────────────
UPDATE knowledge_nodes SET data = data || $$
{
  "description": "🐟 Milkfish (known as Bangda or Bangus) is one of the oldest cultivated fish in Asia — farmers in the Philippines and Indonesia have been growing it in coastal ponds for over 500 years. In India, it's farmed mainly in Tamil Nadu, Andhra Pradesh, and coastal Odisha in brackish water ponds. It grows to 300g–600g in 6–8 months and sells at ₹80–140/kg. It's a plankton feeder that does well in coastal ponds with natural algal growth. The biggest challenge is that it's very bony — but this doesn't bother buyers in coastal South India.",
  "breeding_guide": {
    "overview": "Milkfish cannot be bred in ponds — it needs deep open ocean water for spawning. All fingerlings (called fry or bangus fry) are collected from the wild along coastal beaches during monsoon, or sourced from specialised hatcheries. Farmers in India mostly rely on wild-caught fry or state fisheries departments.",
    "steps": [
      "Source fry (2–3 cm) from coastal hatcheries or fisheries departments in Tamil Nadu, AP, or Odisha in June–August.",
      "Prepare brackish ponds (5–35 ppt salinity acceptable, 10–25 ppt ideal). Allow natural algal growth (lab-lab — a biofilm of algae + bacteria) to develop before stocking.",
      "Stock at 2,000–5,000 fry/acre for extensive culture, up to 10,000–20,000/acre for semi-intensive with supplementary feeding.",
      "Feed: milkfish is primarily a plankton/algae grazer. Supplement with rice bran + soybean meal pellets when natural feed is low.",
      "Fertilise ponds with urea + SSP monthly to maintain algal bloom.",
      "Harvest at 6–8 months when fish reach 300–600g."
    ],
    "timeline": "Fry stocking → 6–8 months → Harvest at 300–600g",
    "beginner_tip": "💡 Milkfish thrives in salty coastal ponds that most other species can't handle. If you have access to brackish water near the coast, milkfish is a reliable, low-cost species to consider."
  },
  "youtube_links": [
    {
      "search_query": "milkfish Chanos chanos farming India coastal pond",
      "title": "Milkfish Farming in Coastal India",
      "hint": "Bangus/milkfish culture in Indian brackish ponds"
    }
  ]
}
$$::jsonb
WHERE id = '09fbe25c-674b-4a4c-b883-3b9ca3319e0d';

-- ─── Mugil cephalus (Grey mullet) ────────────────────────────────────────────
UPDATE knowledge_nodes SET data = data || $$
{
  "description": "🐟 Grey mullet is a euryhaline fish — meaning it can live in fresh water, brackish water, AND full sea water. This makes it incredibly versatile for coastal farmers in Odisha, West Bengal, Tamil Nadu, and Gujarat who have fluctuating-salinity ponds. It grows to 300g–1 kg in 6–12 months and earns ₹100–180/kg. Grey mullet is particularly prized for its roe (eggs), which can be dried and sold as a premium product. It's a bottom grazer that feeds on algae, detritus, and organic matter — very cheap to feed.",
  "breeding_guide": {
    "overview": "Grey mullet breeds naturally in the sea and doesn't spawn in inland ponds. Wild fry are collected from estuaries during November–February or sourced from coastal hatcheries. Culture in India is mostly extensive, relying on natural algal growth in coastal ponds.",
    "steps": [
      "Collect fry from estuaries during November–February, or source from CMFRI or state fisheries coastal hatcheries.",
      "Prepare coastal ponds or brackish ponds (salinity 5–35 ppt). Let natural algal mats (periphyton) grow for 2 weeks before stocking.",
      "Stock at 1,000–3,000 fry/acre for extensive systems. Mullet coexists well with milkfish, prawns, and seabass in polyculture.",
      "Minimal feeding required — mullet grazes on natural algae and organic matter. Supplement with rice bran if natural feed is poor.",
      "Harvest at 6–12 months when fish reach 300g–1 kg. For maximum value, harvest females when gravid (full of eggs) and sell roe separately."
    ],
    "timeline": "Fry stocking → 6–12 months → Harvest at 300g–1 kg",
    "beginner_tip": "💡 Grey mullet is a low-maintenance, low-cost species perfect for coastal ponds. The roe (especially if dried as karasumi-style product) can earn 3–5× more than the fish itself."
  },
  "youtube_links": [
    {
      "search_query": "grey mullet Mugil cephalus farming India coastal",
      "title": "Grey Mullet Farming in India — Coastal Ponds",
      "hint": "How to grow mullet in Indian brackish coastal ponds"
    }
  ]
}
$$::jsonb
WHERE id = 'cec90a2d-2cf7-41bb-8736-8821e04f6f64';

-- ─── Etroplus suratensis (Green chromide / Pearl spot) ───────────────────────
UPDATE knowledge_nodes SET data = data || $$
{
  "description": "🐟 Pearl spot (known as Karimeen in Kerala) is arguably the most prized freshwater-brackish fish in South India. It's small — growing to only 100–300g — but commands astonishing prices of ₹300–600/kg because of its extraordinary taste and cultural significance in Kerala cuisine. It's hardy, adapts to both fresh and brackish water, and can even handle salinities up to 25 ppt. Kerala, Tamil Nadu, and Karnataka are the primary farming states. It's a cichlid, which means it's a caring parent — it guards its eggs and fry.",
  "breeding_guide": {
    "overview": "Pearl spot breeds naturally and readily in ponds and tanks — one of the few farmed fish in India where you don't need hormone injections. A male-female pair will clean a flat rock or hard surface, lay eggs, and guard them fiercely until the fry are free-swimming.",
    "steps": [
      "Stock equal numbers of males and females in a breeding tank or pond section. Provide flat stones or tiles as spawning surfaces.",
      "Pair bonding happens naturally within 1–2 weeks. You'll see pairs swimming together and aggressively defending a territory.",
      "Females lay 100–500 eggs on the cleaned stone surface. Both parents guard the eggs and fan them with their fins.",
      "Eggs hatch in 48–72 hours. Parents continue guarding the fry for 2–3 weeks. Do NOT disturb the parents or they may eat the eggs.",
      "After 3 weeks, separate fry from parents and move to nursery tanks. Feed with artemia nauplii, then micro-pellets.",
      "Fingerlings (3–5 cm) are ready in 6–8 weeks. Grow out in ponds at 2,000–5,000 fish/acre to reach 150–300g in 8–10 months."
    ],
    "timeline": "Pairing → 2 weeks → Spawning → 3 days → Hatching → 3 weeks → Fry → 8–10 months grow-out → Harvest",
    "beginner_tip": "💡 Pearl spot pairs are monogamous and highly territorial when breeding. Give each pair at least 1 square metre of space in the breeding area or they'll fight constantly."
  },
  "youtube_links": [
    {
      "search_query": "karimeen pearl spot farming Kerala India Etroplus",
      "title": "Karimeen (Pearl Spot) Farming — Kerala, India",
      "hint": "How to breed and grow green chromide in Kerala conditions"
    },
    {
      "search_query": "Etroplus suratensis breeding aquarium pond",
      "title": "Etroplus suratensis Natural Breeding Guide",
      "hint": "Breeding behaviour and grow-out of pearl spot"
    }
  ]
}
$$::jsonb
WHERE id = 'c3c37a8c-5c8b-47e8-aee2-17ce3496dea1';

-- ─── Anabas testudineus (Climbing perch / Koi fish) ──────────────────────────
UPDATE knowledge_nodes SET data = data || $$
{
  "description": "🐟 Koi (not the ornamental carp — this is the climbing perch, Anabas testudineus!) is one of the most beloved food fish in Assam, West Bengal, and all of Northeast India. It's an air-breathing fish — it has a labyrinth organ that lets it breathe directly from air, so it can survive in almost any water condition, even in flooded rice fields. It grows to 100–250g in 6–8 months and commands ₹150–300/kg in local markets. It's the original resilient fish: farmers say that Koi will survive even when the pond dries up — it can crawl across land using its spiny gill covers.",
  "breeding_guide": {
    "overview": "Koi (climbing perch) breeds naturally during monsoon when water temperature rises above 28°C and fresh water is added. Induced breeding with Ovaprim is also practised at hatcheries for larger, more reliable seed production.",
    "steps": [
      "For natural breeding: set up a shallow nursery pond (0.5m deep). Add fresh water to simulate monsoon rains. Water temperature should be 28–32°C.",
      "Stock broodfish (2–4 per sq. metre) with 1:2 female:male ratio. Fish spawn at the water surface — eggs are buoyant.",
      "Spawning happens at dusk or night. Remove parents after spawning (they may eat eggs). Eggs float and hatch in 18–24 hours.",
      "Larvae are tiny and need infusoria (microscopic organisms in green water) for first 5 days. Then transition to fine rice bran paste.",
      "After 30 days, fry reach 1–2 cm. Transfer to grow-out ponds at 5,000–10,000/acre.",
      "Grow-out: feed with rice bran, broken rice, and pellets. Koi are omnivores and eat almost anything.",
      "Harvest at 6–8 months when fish reach 100–200g."
    ],
    "timeline": "Monsoon breeding → 24 hrs → Hatching → 30 days → Fry transfer → 6–8 months → Harvest",
    "beginner_tip": "💡 Koi (climbing perch) is perfect for small, seasonal ponds, rice-fish systems, and even waterlogged fields in Northeast India. It needs almost no special care and fetches a good local price."
  },
  "youtube_links": [
    {
      "search_query": "Anabas testudineus climbing perch koi fish farming Assam Bengal",
      "title": "Koi (Climbing Perch) Fish Farming — Northeast India",
      "hint": "Breeding and growing Anabas testudineus in ponds"
    }
  ]
}
$$::jsonb
WHERE id = '81c6074e-fb81-46f0-bd63-27bd5f2143e5';

-- ─── Channa striata (Snakehead murrel) ───────────────────────────────────────
UPDATE knowledge_nodes SET data = data || $$
{
  "description": "🐍 Snakehead murrel (Shol in Bengali, Viraal in Tamil) is one of India's most culturally important fish. It has strong medicinal associations — believed to speed recovery after surgery, recommended for new mothers, and prized for wound healing — which pushes its price to ₹200–500/kg depending on size and region. It's an air-breathing predator that can survive out of water for hours. It grows to 500g–2 kg in 10–14 months. It's farmed mostly in West Bengal, Tamil Nadu, Kerala, and Odisha.",
  "breeding_guide": {
    "overview": "Snakehead murrel breeds naturally in shallow vegetated ponds during monsoon — the male and female build a floating nest from aquatic plants at the surface and guard the eggs fiercely. Induced breeding with Ovaprim is also practised at hatcheries for year-round seed production.",
    "steps": [
      "For natural breeding: keep broodfish in a vegetated pond with shallow areas (30–50 cm). Add water hyacinth or grass clumps as nesting material.",
      "The pair builds a circular nest at the surface. Spawning happens at dawn. Female lays 2,000–5,000 bright orange eggs that float in a mass on the water surface.",
      "Both parents guard the nest aggressively — they will chase and bite anything that comes near. Do NOT disturb. Eggs hatch in 24–36 hours.",
      "Larvae are bright orange-red for the first week. Parents continue guarding. Feed larvae with Artemia nauplii or infusoria after yolk absorption (day 3–5).",
      "After 10–14 days, fry scatter and parents stop guarding. Begin feeding with bloodworms, tubifex, and micro-pellets.",
      "At 4–6 weeks (4–5 cm), fry become cannibalistic — MUST separate by size every 2 weeks.",
      "Grow out in ponds at 1,000–3,000 fish/acre. Feed with trash fish, frog meat, or high-protein pellets (45%+ protein)."
    ],
    "timeline": "Monsoon breeding → 36 hrs → Hatching → 6 weeks → Fry (4–5 cm) → 10–14 months → Harvest at 500g–2 kg",
    "beginner_tip": "⚠️ Snakehead fry are EXTREMELY cannibalistic. If you don't grade them by size every 2 weeks, you'll lose 70–80% of your stock to cannibalism. This is the #1 mistake beginners make."
  },
  "youtube_links": [
    {
      "search_query": "Channa striata snakehead shol fish farming India",
      "title": "Snakehead Murrel (Shol) Fish Farming India",
      "hint": "Complete guide to growing Channa striata in Indian ponds"
    },
    {
      "search_query": "snakehead fish medicinal value India farming techniques",
      "title": "Medicinal Snakehead Fish — Farming & Value in India",
      "hint": "Why snakehead commands premium prices and how to grow it"
    }
  ]
}
$$::jsonb
WHERE id = 'b31039d0-6403-4764-920f-20e0d841fe00';

-- ─── Channa punctata (Spotted snakehead) ─────────────────────────────────────
UPDATE knowledge_nodes SET data = data || $$
{
  "description": "🐍 Spotted snakehead (Channa punctata, also called Dhoraa or Dhaura) is a small snakehead species that rarely exceeds 300–400g, but it's highly valued for medicinal purposes similar to its larger cousin Channa striata. It's found across South Asia in rice fields, irrigation channels, and seasonal ponds. Like all snakeheads, it can breathe air and survive in oxygen-depleted water. It sells for ₹150–350/kg. Its small size makes it better suited for rice-fish polyculture than dedicated pond farming.",
  "breeding_guide": {
    "overview": "Spotted snakehead breeds naturally in shallow ponds and rice fields during monsoon, forming a floating nest of aquatic plants at the surface. It is rarely bred intensively due to its small commercial size — most farmers collect wild fry or small juveniles from rice fields and seasonal water bodies.",
    "steps": [
      "Collect wild fry from rice fields and seasonal water bodies during monsoon (June–September). Or source from government hatcheries in Bengal/Assam.",
      "Stock in ponds or rice-fish systems at 500–1,000 fish/acre.",
      "Feed with rice bran, small worms, insects, and high-protein pellets. It's an opportunistic predator.",
      "Keep in smaller ponds or separate enclosures — it preys on small fish and can decimate fingerling stocks of other species.",
      "Harvest at 6–10 months when fish reach 150–300g."
    ],
    "timeline": "Fry collection/stocking → 6–10 months → Harvest at 150–300g",
    "beginner_tip": "💡 Don't mix spotted snakehead with small fingerlings of other species — it will eat them. Keep it in dedicated ponds or rice-fish culture systems where the other species are large enough to defend themselves."
  },
  "youtube_links": [
    {
      "search_query": "Channa punctata spotted snakehead fish farming India",
      "title": "Spotted Snakehead (Channa punctata) Farming",
      "hint": "Rice-fish culture and pond farming of Dhoraa fish"
    }
  ]
}
$$::jsonb
WHERE id = 'c31ca408-85cf-42fe-8ce9-b01a3fb3cebb';

-- ─── Channa marulius (Giant snakehead) ───────────────────────────────────────
UPDATE knowledge_nodes SET data = data || $$
{
  "description": "🐍 Giant snakehead (Saol, Bull's Eye snakehead) is the largest snakehead in India — it can grow to 6–10 kg in the wild, though farmed fish typically reach 1–3 kg over 2 years. It's a top predator with striking markings and extreme hardiness. Because of its size and rarity, it fetches ₹300–600/kg in premium markets, especially in Northeast India, Bengal, and Kerala. It's not yet widely farmed intensively, but demand is growing among chefs and health-conscious consumers who prize its high protein content.",
  "breeding_guide": {
    "overview": "Giant snakehead breeding behaviour mirrors Channa striata — the pair builds a surface nest and guards eggs aggressively. However, it's much less commonly bred in captivity due to its large size requirement and slow growth. Most farm seed comes from wild-caught juveniles.",
    "steps": [
      "Source wild juveniles from fishermen in large river systems (Ganga, Brahmaputra, Kerala rivers) or from hatcheries in Assam/Kerala.",
      "Large ponds (1+ acre) with good water flow are preferred. Stock at very low density: 200–500 fish/acre max.",
      "Feed with live or fresh fish, frogs, or high-protein carnivore pellets (50%+ protein). Giant snakehead needs meat-based diet.",
      "Grade regularly — like all snakeheads, juveniles are cannibalistic. Separate fish by size every 4–6 weeks.",
      "Be patient: plan for 18–24 months to reach 1.5–2 kg. Premium size is 3+ kg (36+ months)."
    ],
    "timeline": "Juvenile stocking → 18–24 months → 1.5–2 kg → 36+ months → 3 kg (premium)",
    "beginner_tip": "⚠️ Giant snakehead is for experienced farmers with large ponds and patience for long crop cycles. It can escape over low bunds and will eat smaller species in your pond. Not recommended as a first species."
  },
  "youtube_links": [
    {
      "search_query": "Channa marulius giant snakehead farming India",
      "title": "Giant Snakehead (Saol) Farming in India",
      "hint": "Raising Channa marulius in Indian ponds and their value"
    }
  ]
}
$$::jsonb
WHERE id = '027dde50-77fc-4d6f-b34f-b524208e986e';

-- ─── Clarias magur / Clarias batrachus (Magur catfish / Walking catfish) ──────
UPDATE knowledge_nodes SET data = data || $$
{
  "description": "🐟 Magur (Clarias batrachus, also called Walking catfish) is one of India's most prized and expensive freshwater fish, fetching ₹200–450/kg because of strong belief in its medicinal properties — it's recommended for recovery after illness, surgery, and for strengthening joints. It's an air-breather that can walk short distances across land using its pectoral fins (hence the name). It grows to 200–500g in 6–10 months. It's primarily farmed in West Bengal, Bihar, Assam, Odisha, and Northeast India. Note: check local regulations before farming — it's banned in some states outside its native range.",
  "breeding_guide": {
    "overview": "Magur breeds naturally during monsoon in shallow vegetated ponds. Induced breeding with Ovaprim at government hatcheries is also common and gives more reliable results. It breeds prolifically — one female can produce 5,000–20,000 eggs per batch.",
    "steps": [
      "Set up a breeding pond (0.2–0.5 acre, 0.5–1m deep) with water hyacinth or aquatic plants as shelter and spawning material.",
      "Stock mature broodfish (females: 150–250g, males: 100–200g) at 1:2 female:male ratio in June–July when monsoon begins.",
      "For natural spawning: add fresh water to trigger breeding. Fish spawn at night near plant masses. Eggs stick to plants.",
      "For induced breeding: inject females with Ovaprim 0.5 mL/kg and males 0.3 mL/kg. Collect eggs and fertilise artificially. Incubate in shallow trays with gentle water flow.",
      "Eggs hatch in 24–36 hours. Larvae need infusoria for first 5 days, then transition to rice bran paste and Artemia.",
      "Fry are hardy and grow quickly. Move to nursery ponds after 2 weeks. Stock fingerlings in grow-out ponds at 20,000–50,000/acre (they're small).",
      "Harvest at 6–10 months when fish reach 200–400g."
    ],
    "timeline": "Monsoon breeding → 36 hrs → Hatching → 2 weeks → Nursery → 6–10 months → Harvest",
    "beginner_tip": "💡 Magur is extremely hardy and tolerates poor water quality better than most fish. But check your state rules first — it is a restricted species in Maharashtra, Rajasthan, and some other states due to concerns about invasiveness."
  },
  "youtube_links": [
    {
      "search_query": "magur catfish Clarias farming India Bengal",
      "title": "Magur Catfish Farming in India — Complete Guide",
      "hint": "How to breed and grow walking catfish in Indian ponds"
    },
    {
      "search_query": "magur fish medicinal value farming technique India",
      "title": "Magur — Medicinal Value & Farming in India",
      "hint": "Why magur commands high prices and how to grow it profitably"
    }
  ]
}
$$::jsonb
WHERE id = '2c08a522-330e-40e2-ae4c-7d065686684c';

-- ─── Heteropneustes fossilis (Stinging catfish / Singhee / Singhi) ────────────
UPDATE knowledge_nodes SET data = data || $$
{
  "description": "🐟 Singhi (Heteropneustes fossilis) is the air-breathing catfish with a sting — its pectoral spines can deliver a painful jab if mishandled, which is how it earned the name 'stinging catfish'. Despite this, it's highly prized across Eastern India and Southeast Asia for its rich flavour, dark flesh, and widely believed medicinal properties. It fetches ₹200–350/kg. It grows to 150–400g in 8–10 months and is one of the hardiest fish in existence — surviving in waterlogged fields, roadside ditches, and oxygen-depleted ponds where nothing else can.",
  "breeding_guide": {
    "overview": "Singhi breeds naturally during monsoon in shallow ponds and flooded fields. Induced breeding is also well-established at government hatcheries. It's a prolific breeder with very high survival rates in nursery conditions.",
    "steps": [
      "Maintain broodfish in earthen ponds from January–May, feeding with trash fish, earthworms, and pellets to condition them for spawning.",
      "For natural breeding (June–July): provide a shallow pond (0.3–0.5m) with dense vegetation. Add fresh rainwater to trigger spawning. Fish lay eggs in plant masses.",
      "For induced breeding: Ovaprim injection (0.5 mL/kg for females, 0.3 mL/kg for males). Spawning occurs in 6–8 hours. Eggs hatch in 24–36 hours.",
      "Larvae need infusoria and zooplankton for first 5–7 days, then fine rice bran + mustard cake paste.",
      "After 30–45 days, fingerlings reach 3–5 cm. Stock in grow-out ponds at 20,000–50,000/acre.",
      "Feed with agricultural by-products (rice bran, mustard cake) + fishmeal or trash fish. They accept pellets well.",
      "Harvest at 8–10 months when fish reach 150–350g. Handle with thick gloves — the pectoral spines hurt."
    ],
    "timeline": "Monsoon breeding → 36 hrs → Hatching → 45 days → Fingerlings → 8–10 months → Harvest",
    "beginner_tip": "⚠️ ALWAYS wear thick gloves when handling Singhi. The pectoral spine wound is painful and slow-healing. Have a first-aid kit ready during harvest."
  },
  "youtube_links": [
    {
      "search_query": "singhi stinging catfish Heteropneustes farming India",
      "title": "Singhi (Stinging Catfish) Farming — India",
      "hint": "How to breed and grow Heteropneustes fossilis in Indian ponds"
    }
  ]
}
$$::jsonb
WHERE id = '45d55b13-449f-4d7a-8b86-16f2f65071a8';

-- ─── Wallago attu (Wallago / Boal) ────────────────────────────────────────────
UPDATE knowledge_nodes SET data = data || $$
{
  "description": "🐟 Wallago (Boal in Bengali, Wallagoo in Tamil) is a large, silvery predatory catfish from the Ganga and Indus river systems. It can grow to 50+ kg in the wild, though farmed fish typically reach 1–3 kg in 12–18 months. It's a carnivore that commands ₹150–300/kg in markets — not because of exceptional taste, but because of its large size and the demand for big, impressive fish in wholesale markets and restaurants. It's still being researched for intensive aquaculture, but small-scale grow-out of wild-caught juveniles is practiced in Bengal and Assam.",
  "breeding_guide": {
    "overview": "Wallago does not breed easily in captivity. Natural breeding requires large, flowing water bodies. Induced breeding has been attempted at research stations but is not yet commercially viable. Most farm seed comes from wild-caught juvenile fish from riverine sources.",
    "steps": [
      "Source juvenile fish (10–20 cm) from river fishermen or government research stations (CIFRI, CIFA) during monsoon season.",
      "Use large earthen ponds (1+ acre) with good water exchange. Wallago needs space and clean, well-oxygenated water.",
      "Stock at low density: 500–1,000 fish/acre. They are highly aggressive and cannibalistic.",
      "Feed with live or fresh trash fish, frog meat, or high-protein carnivore pellets (50%+ protein). They refuse plant-based feeds.",
      "Grade regularly to separate size classes. Larger Wallago will eat smaller ones without hesitation.",
      "Harvest at 12–18 months when fish reach 1–2 kg. Some farmers grow for 3+ years for premium 3–5 kg fish."
    ],
    "timeline": "Juvenile stocking → 12–18 months → 1–2 kg → 3+ years → 3–5 kg (premium)",
    "beginner_tip": "⚠️ Wallago farming is for experienced farmers with large ponds and reliable wild seed sources. The cannibalism problem is severe — you can lose 50%+ of your stock if you don't grade frequently."
  },
  "youtube_links": [
    {
      "search_query": "Wallago attu boal fish farming India catfish",
      "title": "Wallago (Boal) Catfish Farming in India",
      "hint": "Growing Wallago attu in Indian freshwater ponds"
    }
  ]
}
$$::jsonb
WHERE id = '1ba918ef-88b0-45ca-a0b4-16a0fb9ef082';

-- ─── Ompok pabda (Pabda catfish) ──────────────────────────────────────────────
UPDATE knowledge_nodes SET data = data || $$
{
  "description": "🐟 Pabda (Ompok pabda) is a small, elegant catfish with silver-gold scales and an incredibly delicate, sweet flavour that makes it one of the most prized fish in Bengali cuisine. It grows to only 50–150g, but earns ₹300–600/kg — one of the highest prices per kg among freshwater fish in India. It was nearly wiped out from rivers due to overfishing and pollution, making farm-raised Pabda very profitable. It's an ideal species for small ponds and backyard aquaculture. Research at ICAR-CIFA and West Bengal has made fingerling production routine.",
  "breeding_guide": {
    "overview": "Pabda can be bred using induced methods similar to catfish. Breeding is well-established at government research stations in West Bengal and at some private hatcheries. The eggs are small and need careful handling.",
    "steps": [
      "Maintain broodfish in healthy ponds with protein-rich diet (trash fish, earthworms, pellets) for 2–3 months before breeding.",
      "For induced breeding: inject females with Ovaprim at 0.5 mL/kg body weight. Males get 0.3 mL/kg. Inject at sunset.",
      "Spawning occurs in 8–12 hours. Collect eggs in hapa nets or spawning mats. Eggs are sticky and small.",
      "Incubate in shallow trays with 1–2 cm water depth and gentle aeration. Hatch in 18–24 hours at 28–30°C.",
      "Larvae are fragile — keep in dim conditions for first 2 days. Start feeding with infusoria and green water on day 3.",
      "After 15–20 days, fry reach 1–2 cm. Transfer to nursery ponds at 50,000–100,000/acre.",
      "Grow-out: feed with finely ground rice bran, fishmeal pellets, and bloodworms. Harvest at 8–10 months (50–120g)."
    ],
    "timeline": "Induced breeding → 24 hrs → Hatching → 20 days → Nursery fry → 8–10 months → Harvest",
    "beginner_tip": "💡 At ₹400–600/kg, Pabda is one of the most profitable small-pond fish in Eastern India. Even a small 0.2-acre pond can generate significant income. The market demand almost always exceeds supply."
  },
  "youtube_links": [
    {
      "search_query": "Pabda catfish Ompok pabda farming West Bengal India",
      "title": "Pabda Fish Farming — West Bengal India",
      "hint": "How to breed and grow Ompok pabda for premium markets"
    },
    {
      "search_query": "pabda fish farming profit income small pond India",
      "title": "Pabda Farming — Profit & Income from Small Ponds",
      "hint": "Why Pabda is one of the best fish for small-scale farmers"
    }
  ]
}
$$::jsonb
WHERE id = '732ac9be-4083-493f-827f-48940add9bb4';

-- ─── Mystus seenghala / Sperata seenghala (Seenghala catfish / Aor) ───────────
UPDATE knowledge_nodes SET data = data || $$
{
  "description": "🐟 Seenghala (Sperata seenghala, also called Aor or Singara) is a large catfish from the Ganga and Indus river systems — it can reach 3–8 kg in rivers. It's a premium fish with excellent flesh and earns ₹200–400/kg in markets from Uttar Pradesh to Bihar and Punjab. It's a voracious predator, making intensive farming challenging, but grow-out of wild-caught juveniles in large ponds is practised. Research on its induced breeding is ongoing at CIFA and CIFRI, with some success in producing fingerlings for distribution.",
  "breeding_guide": {
    "overview": "Seenghala breeding in captivity is still being refined. Limited induced breeding success has been achieved at research stations. Most farm seed currently comes from wild-caught juveniles sourced from rivers during monsoon. Large ponds with good management are needed for successful grow-out.",
    "steps": [
      "Source wild juvenile fish (15–25 cm) from river fishermen in the Ganga belt during June–September, or from government hatcheries where available.",
      "Use large, well-oxygenated earthen ponds (1–2 acres). Ensure good water exchange.",
      "Stock at 500–1,000 fish/acre. Keep fish of similar size together — Seenghala is predatory and cannibalistic.",
      "Feed with fresh/live trash fish, earthworms, or high-protein carnivore pellets (45%+ protein). They actively hunt and need meat-based diet.",
      "Grade every 6–8 weeks. Size sorting is critical.",
      "Harvest at 12–18 months when fish reach 1.5–3 kg."
    ],
    "timeline": "Wild juvenile stocking → 12–18 months → 1.5–3 kg harvest",
    "beginner_tip": "⚠️ Never stock Seenghala with smaller species — it will eat them. This is a dedicated pond species for experienced farmers who can source reliable wild seed and manage a large, carnivorous fish."
  },
  "youtube_links": [
    {
      "search_query": "Sperata seenghala aor seenghala catfish farming India",
      "title": "Seenghala Catfish (Aor) Farming in India",
      "hint": "Grow-out and management of Sperata seenghala in Indian ponds"
    }
  ]
}
$$::jsonb
WHERE id = '49dd8cec-7221-4b55-8cd8-3bafd51c70e9';

-- ─── Mystus tengara (Tengra catfish) ──────────────────────────────────────────
UPDATE knowledge_nodes SET data = data || $$
{
  "description": "🐟 Tengra (Mystus tengara) is a small, bony catfish that holds a very special place in Bengali, Assamese, and Odia cuisine. Despite growing to only 30–80g, it fetches ₹200–400/kg because of its intense, unique flavour that is simply irreplaceable in traditional dishes. It's found in rivers, seasonal ponds, and rice fields across the Ganga-Brahmaputra plains. Commercial farming is still at an early stage, but research interest is growing because wild catches are declining sharply from overfishing and habitat loss.",
  "breeding_guide": {
    "overview": "Commercial Tengra breeding protocols are still being developed at research institutions. Currently, most supply comes from wild capture in rivers, seasonal ponds, and rice fields. Small-scale farmers sometimes rear wild-caught juveniles in ponds to market size. ICAR research is working on induced breeding protocols.",
    "steps": [
      "Collect wild juveniles from river catches or rice field drainage during monsoon (June–September).",
      "Acclimatise carefully to pond water — Tengra is sensitive to sudden water changes.",
      "Stock in small, clean earthen ponds at 10,000–20,000 fish/acre.",
      "Feed with fine rice bran, groundnut cake, and small invertebrates. They are omnivorous bottom feeders.",
      "Change 20–30% of water weekly to maintain water quality — Tengra needs clean water.",
      "Harvest at 6–8 months when fish reach 40–80g."
    ],
    "timeline": "Wild juvenile collection → 6–8 months → Harvest at 40–80g",
    "beginner_tip": "💡 The supply of wild Tengra is declining fast — this creates an excellent market opportunity for farmers who can reliably produce farm-raised Tengra. Even a small pond can earn well at ₹300–400/kg."
  },
  "youtube_links": [
    {
      "search_query": "Mystus tengara tengra fish farming Bengal Assam",
      "title": "Tengra Fish Farming — Bengal & Assam",
      "hint": "Rearing tengra catfish in ponds for premium local markets"
    }
  ]
}
$$::jsonb
WHERE id = 'f623d2e6-c765-4c9a-a8b1-8f3a7a095ad7';

-- ─── Monopterus cuchia (Cuchia eel / Mud eel) ─────────────────────────────────
UPDATE knowledge_nodes SET data = data || $$
{
  "description": "🐍 Cuchia (Monopterus cuchia) is a fascinating mud-dwelling eel from the Ganga-Brahmaputra plains. It's an obligate air-breather — it will actually drown if prevented from reaching the water surface — and it can burrow into wet mud and survive completely out of water for months during dry seasons. It grows to 300–700g in 12–18 months and commands premium prices of ₹300–600/kg because of strong medicinal demand and its scarcity. It's popular in Assam, West Bengal, Odisha, and Bangladesh.",
  "breeding_guide": {
    "overview": "Cuchia breeding in captivity is extremely challenging — very little published protocol exists for reliable farm-scale breeding. It breeds in burrows during monsoon, creating a nest of foam bubbles. Most farm seed currently comes from wild collection. Research is ongoing at ICAR-CIFA.",
    "steps": [
      "Collect wild cuchia from paddy fields, wetlands, and seasonal water bodies during monsoon. Handle with thick gloves — they are slippery and strong.",
      "Stock in mud-bottomed ponds (0.5–1m deep) with no concrete edges — they need soft mud to burrow into.",
      "Cover ponds with strong nets — cuchia are escape artists. They can squeeze through small gaps and also breathe air from land.",
      "Feed with earthworms, small crustaceans, and high-protein sinking pellets. They feed at night near the pond bottom.",
      "Maintain water quality carefully. Despite their hardiness in the wild, overstocking causes disease in farm conditions.",
      "Harvest at 12–18 months when fish reach 300–500g. Use fine-mesh nets and traps — they're hard to catch conventionally."
    ],
    "timeline": "Wild juvenile stocking → 12–18 months → Harvest at 300–500g",
    "beginner_tip": "⚠️ Cuchia farming requires very specific pond conditions and experience. Do not attempt intensive culture without researching escape prevention thoroughly — a pond full of burrowed cuchia is nearly impossible to fully harvest."
  },
  "youtube_links": [
    {
      "search_query": "cuchia eel Monopterus farming India northeast pond",
      "title": "Cuchia Eel Farming in India — Northeast",
      "hint": "Growing mud eel (cuchia) in Indian ponds for premium markets"
    }
  ]
}
$$::jsonb
WHERE id = 'ff6e398d-12ea-42e2-b79e-1e524c37986e';

-- ─── Penaeus monodon (Tiger prawn / Giant tiger prawn) ────────────────────────
UPDATE knowledge_nodes SET data = data || $$
{
  "description": "🦐 Tiger prawn is the giant of Indian shrimp farming — it can grow to 150–200g, which is 8–10× the size of vannamei shrimp. Known for its striking black-and-white tiger stripes, it commands premium prices of ₹350–650/kg in domestic and export markets. It was India's primary farmed shrimp before vannamei took over, and it's still highly valued in coastal AP, Odisha, Tamil Nadu, and West Bengal. It's more sensitive than vannamei and needs better biosecurity, but the premium price rewards careful farmers who can manage it well.",
  "breeding_guide": {
    "overview": "Tiger prawn seed comes from hatcheries — no on-farm breeding is practical. Wild broodstock are captured from the sea and spawned in specialised hatcheries under strict biosecurity protocols. As a farmer, you source PLs (post-larvae) from licensed hatcheries. MPEDA certification is important.",
    "steps": [
      "Source PLs (PL15–PL20) from MPEDA-certified hatcheries. Tiger prawn PLs are less commonly available than vannamei — plan your orders 2–3 months ahead.",
      "Prepare semi-intensive ponds: drain, sun-dry 10–14 days, apply lime (400–500 kg/acre), fill to 1.2–1.5m depth. Salinity 15–25 ppt.",
      "Stock at 15–25 PLs per sq. metre (much lower than vannamei). Tiger prawn needs more space.",
      "Feed with high-protein shrimp pellets (35–40% protein), 3–4 times daily. Use feeding trays to monitor feed consumption.",
      "Monitor water quality aggressively: DO >5 mg/L, salinity 15–25 ppt, pH 7.5–8.5. Tiger prawn is more sensitive than vannamei to environmental stress.",
      "Harvest at 120–150 days (5–6 months) when prawns reach 50–100g. Premium harvest is at 100–150g (count 10–20 per kg)."
    ],
    "timeline": "PL stocking → 4–5 months → 50–80g → 5–6 months → 80–150g (premium)",
    "beginner_tip": "⚠️ Tiger prawn requires better biosecurity than vannamei. White spot virus (WSSV) and other diseases spread quickly in tiger prawn ponds. Get PLs tested for major pathogens before stocking."
  },
  "youtube_links": [
    {
      "search_query": "tiger prawn Penaeus monodon farming India AP Odisha",
      "title": "Tiger Prawn Farming in India — Complete Guide",
      "hint": "How to grow black tiger shrimp (Penaeus monodon) in Indian ponds"
    }
  ]
}
$$::jsonb
WHERE id = '33333333-3333-3333-3333-333333333334';

-- ─── Penaeus indicus (Indian white shrimp) ────────────────────────────────────
UPDATE knowledge_nodes SET data = data || $$
{
  "description": "🦐 Indian white shrimp (Penaeus indicus, now reclassified as Fenneropenaeus indicus) is a native Indian marine shrimp found all along the Indian coastline. It's smaller than tiger prawn (20–40g at harvest) but is a very important capture fishery species and was one of the early farmed shrimps in India before vannamei took over. It's still farmed in small-scale coastal operations in Tamil Nadu, AP, and Kerala, fetching ₹200–350/kg. It's more tolerant of variable salinity than other penaeid shrimps.",
  "breeding_guide": {
    "overview": "Penaeus indicus hatchery seed is less commonly available compared to vannamei or tiger prawn. Wild seed collection from coastal waters was historically practised but is now regulated. Hatchery PLs are available from some Tamil Nadu and AP coastal hatcheries. Most small farmers who grow this species use semi-intensive extensive methods in coastal ponds.",
    "steps": [
      "Source PLs from licensed coastal hatcheries in Tamil Nadu or AP. Ask for health certification.",
      "Prepare coastal ponds with 10–30 ppt salinity. Semi-intensive methods work well.",
      "Stock at 20–40 PLs per sq. metre. Indian white shrimp tolerates a wider salinity range (5–40 ppt).",
      "Feed with standard shrimp pellets (30–35% protein). Supplement with natural pond productivity.",
      "Harvest at 90–120 days when shrimp reach 20–40g."
    ],
    "timeline": "PL stocking → 90–120 days → Harvest at 20–40g",
    "beginner_tip": "💡 Penaeus indicus is more tolerant of salinity fluctuation than vannamei, making it suitable for coastal ponds where salinity changes seasonally. However, hatchery seed availability is limited — plan sourcing early."
  },
  "youtube_links": [
    {
      "search_query": "Penaeus indicus Indian white shrimp farming coastal India",
      "title": "Indian White Shrimp (Penaeus indicus) Farming",
      "hint": "Coastal pond culture of Fenneropenaeus indicus in India"
    }
  ]
}
$$::jsonb
WHERE id = '08601d85-00aa-4f5d-bb7a-af81bbcdd2e0';

-- ─── Metapenaeus dobsoni (Kadal shrimp / Flower shrimp) ──────────────────────
UPDATE knowledge_nodes SET data = data || $$
{
  "description": "🦐 Kadal shrimp (Metapenaeus dobsoni) is a small but commercially important marine shrimp native to Indian coastal waters. It's one of the most abundant shrimp species in the wild catch of Kerala, Tamil Nadu, and Karnataka. Despite being small (10–25g at market), it's highly valued for its sweet, intense flavour and fetches ₹180–350/kg in local fish markets. Farm culture of Kadal shrimp is limited — most supply comes from trawl fisheries — but its tolerance for lower salinities (5–25 ppt) makes it a candidate for coastal pond farming.",
  "breeding_guide": {
    "overview": "Dedicated hatchery protocols for Metapenaeus dobsoni are not yet commercially established in India. Some coastal farmers stock wild-caught juveniles in ponds during monsoon season. Research is ongoing at CMFRI and CIBA. For most farmers, this remains a capture fishery species rather than a farmed one.",
    "steps": [
      "Collect wild shrimp seed from coastal backwaters and estuaries during June–September using fine-mesh cast nets.",
      "Acclimatise to pond water slowly over 2–3 hours before stocking.",
      "Stock in coastal ponds (5–25 ppt salinity) at low density: 5–10 post-larvae per sq. metre.",
      "Minimal supplementary feeding needed — they feed on natural pond productivity (algae, zooplankton, detritus).",
      "Harvest at 60–90 days when shrimp reach 10–20g."
    ],
    "timeline": "Wild seed stocking → 60–90 days → Harvest at 10–20g",
    "beginner_tip": "💡 Kadal shrimp farming is still primitive in India. If you're in Kerala or coastal Tamil Nadu and have a backwater-adjacent pond, experimental stocking of wild juveniles can yield good results with minimal investment."
  },
  "youtube_links": [
    {
      "search_query": "Metapenaeus dobsoni kadal shrimp coastal farming Kerala",
      "title": "Kadal Shrimp Farming in Coastal India",
      "hint": "Culture of flower shrimp (Metapenaeus dobsoni) in India"
    }
  ]
}
$$::jsonb
WHERE id = 'cfedc734-fc6c-4f93-be0b-04e3c4b3e4f5';

-- ─── Macrobrachium malcolmsonii (River prawn / Monsoon river prawn) ────────────
UPDATE knowledge_nodes SET data = data || $$
{
  "description": "🦐 Monsoon river prawn (Macrobrachium malcolmsonii) is a large freshwater prawn endemic to Indian rivers, growing to 100–200g — bigger than most farmed freshwater prawns. It's highly prized in local markets across Bihar, UP, Assam, and West Bengal, fetching ₹250–500/kg. It's related to the Giant freshwater prawn (Macrobrachium rosenbergii) but adapted to fast-flowing riverine conditions. Commercial farming is still in development, but government interest is high as wild populations have declined sharply from habitat loss.",
  "breeding_guide": {
    "overview": "M. malcolmsonii breeding requires brackish water for larval development — larvae cannot survive in pure fresh water. This is the main challenge in farming: you need access to brackish water (5–15 ppt) for a hatchery, then transfer juvenile prawns to fresh water for grow-out. Research at CIFA and some state fisheries departments has cracked the breeding protocol.",
    "steps": [
      "Maintain broodstock in fresh water ponds. When females carry eggs (orange-coloured eggs under abdomen), transfer them to a brackish water hatchery tank (10–15 ppt).",
      "Larvae hatch and go through 11 zoeal stages over 20–30 days in brackish water. Feed with Artemia nauplii and micro-algae during larval stages.",
      "After completing metamorphosis (post-larvae stage), transfer PL to fresh water gradually (reduce salinity by 2 ppt/day).",
      "Grow fresh water PL in nursery ponds at 10,000–20,000/acre for 60–90 days until they reach 2–4 cm.",
      "Transfer to grow-out ponds at 5,000–10,000/acre. Feed with sinking pellets (30–35% protein) and rice bran.",
      "Harvest at 10–12 months when prawns reach 80–150g."
    ],
    "timeline": "Breeding → 30 days → PL (freshwater) → 60–90 days → Nursery → 10–12 months → Harvest",
    "beginner_tip": "💡 The brackish water larval stage is the key technical challenge in farming M. malcolmsonii. Partnering with a coastal hatchery or government research station for seed supply is the best approach for most farmers."
  },
  "youtube_links": [
    {
      "search_query": "Macrobrachium malcolmsonii river prawn farming India",
      "title": "Monsoon River Prawn (M. malcolmsonii) Farming",
      "hint": "Breeding and grow-out of Indian river prawn in ponds"
    }
  ]
}
$$::jsonb
WHERE id = 'ac5f49ff-dd73-480b-a4c9-7f8459a7ede0';

-- ─── Scylla serrata (Mud crab) ────────────────────────────────────────────────
UPDATE knowledge_nodes SET data = data || $$
{
  "description": "🦀 Mud crab (Scylla serrata) is one of the most profitable aquaculture species in India's coastal belt — it earns ₹400–900/kg and significantly more for premium live-export quality. It's farmed extensively in mangrove-adjacent ponds and brackish water areas in Odisha, West Bengal, Andhra Pradesh, Tamil Nadu, and Kerala. It grows to 300g–1 kg in 5–8 months. There's also a specialised practice called 'soft-shell crab' culture where crabs are harvested just after moulting (shedding their shell) — soft-shell crabs sell at 3–5× the price of hard crabs.",
  "breeding_guide": {
    "overview": "Mud crab breeding requires deep, high-salinity marine water (28–35 ppt) for larval development. Farm-scale hatchery breeding is done at specialised centres. For most farmers, the practical approach is to source crablets (1–5g juvenile crabs) from hatcheries (CIBA, CMFRI) or wild collection from mangrove areas.",
    "steps": [
      "Source crablets (1–5g) from CIBA-certified hatcheries or collect wild juveniles from mangrove forests during monsoon (with appropriate permissions).",
      "Prepare ponds: 0.5–1m deep, brackish water 10–25 ppt. Ensure there's a soft muddy bottom — crabs hide in burrows. Install anti-escape fencing (smooth PVC sheets along pond walls).",
      "Stock at 1–3 crabs per sq. metre. Higher density increases fighting and mortality.",
      "Feed with trash fish, clam meat, or formulated crab pellets. Feed twice daily near pond edges at dusk. Remove uneaten feed to maintain water quality.",
      "Crabs moult (shed their shell) every 2–4 weeks when young. Immediately after moulting they are soft-shell and vulnerable — collect and market if targeting soft-shell premium.",
      "For hard-shell harvest: collect at 5–8 months when crabs reach 300–800g. Use baited traps or drain the pond partially."
    ],
    "timeline": "Crablet stocking (2–5g) → 5–8 months → Harvest at 300g–1 kg",
    "beginner_tip": "💡 The premium opportunity in mud crab is live export and soft-shell production. If you can maintain crabs alive for transport (in moist coconut coir, claws tied), you can sell directly to exporters for 2–3× the local market price."
  },
  "youtube_links": [
    {
      "search_query": "mud crab Scylla serrata farming India mangrove pond",
      "title": "Mud Crab Farming India — Complete Guide",
      "hint": "How to grow Scylla serrata for export and local markets"
    },
    {
      "search_query": "soft shell crab farming India fattening technique",
      "title": "Soft-Shell Mud Crab Farming India",
      "hint": "Premium soft-shell crab production for export"
    }
  ]
}
$$::jsonb
WHERE id = '0d65064a-df01-4b2e-8630-ad63a31119f1';

-- ─── Lutjanus argentimaculatus (Mangrove red snapper) ────────────────────────
UPDATE knowledge_nodes SET data = data || $$
{
  "description": "🐠 Mangrove red snapper is a stunning marine fish with deep red-orange colouring and excellent eating quality — it commands ₹350–600/kg in premium fish markets, hotels, and export. It's found in mangrove estuaries along India's entire coastline. It grows to 1–2.5 kg in 12–18 months in cage culture and is increasingly farmed in net cages in estuaries and coastal waters in AP, TN, Kerala, and the Andamans. Its firm, white flesh has very high demand from restaurants and the export seafood sector.",
  "breeding_guide": {
    "overview": "Red snapper hatchery seed is produced at CMFRI, CIBA, and a few private marine hatcheries using induced spawning of wild broodstock. As a cage farmer, you source fingerlings (8–12 cm) from these sources. On-farm breeding is not practical without specialised marine hatchery facilities.",
    "steps": [
      "Source fingerlings (8–12 cm) from CMFRI, CIBA, or licensed marine hatcheries. Currently production is limited — book orders well in advance.",
      "Set up floating net cages (4m × 4m × 4m or 6m × 6m × 4m) in protected estuaries or coastal bays with good water exchange and minimal boat traffic.",
      "Stock at 15–25 fish per cubic metre. Red snapper is less cannibalistic than seabass but still needs size grading.",
      "Feed exclusively with high-protein marine pellets (45–50% protein) or fresh/frozen trash fish. It is a pure carnivore.",
      "Grade every 60 days. Despite moderate cannibalism, significant size variation develops that needs management.",
      "Harvest at 12–18 months when fish reach 1–2 kg. Premium size for export is 1.5–2.5 kg (fetches ₹500–700/kg)."
    ],
    "timeline": "Fingerling stocking (10 cm) → 6 months → 500g → 12–18 months → 1–2.5 kg",
    "beginner_tip": "💡 Red snapper cage culture in estuaries is one of the most exciting opportunities in Indian marine aquaculture. The main barrier is fingerling availability — work with CMFRI or CIBA early to secure your seed supply."
  },
  "youtube_links": [
    {
      "search_query": "mangrove red snapper Lutjanus farming cage culture India",
      "title": "Red Snapper Cage Culture in India",
      "hint": "Growing Lutjanus argentimaculatus in Indian coastal cages"
    }
  ]
}
$$::jsonb
WHERE id = 'bfa77a08-8a1f-4637-b891-4d0f5651ad68';

-- ─── Acanthopagrus berda (Goldsilk seabream / Black porgy) ───────────────────
UPDATE knowledge_nodes SET data = data || $$
{
  "description": "🐠 Goldsilk seabream (Acanthopagrus berda) is a stocky, silver-grey fish found in estuaries, mangroves, and coastal waters across India. It's an omnivore — unusual for a marine fish — that eats molluscs, crustaceans, algae, and plant matter. It grows to 500g–1.5 kg in 12–18 months and earns ₹200–400/kg in coastal fish markets. While not yet widely farmed in India, it's actively researched by CMFRI and CIBA as a good candidate for brackish water cage and pond culture due to its euryhaline nature (tolerates salinity from 2–35 ppt) and omnivorous diet.",
  "breeding_guide": {
    "overview": "Acanthopagrus berda is a protandrous hermaphrodite — all fish start life as male and some change to female as they grow. Hatchery seed production is in research phase at CMFRI. Currently most farm-scale supply comes from wild fingerling collection in estuaries. The species has good potential for brackish water pond culture.",
    "steps": [
      "Source wild fingerlings from estuarine areas, or contact CMFRI Mandapam/Vizhinjam for experimental seed availability.",
      "Stock in brackish ponds (5–25 ppt) or net cages at 2,000–5,000 fish/acre for ponds, or 10–15 fish/cubic metre for cages.",
      "Being omnivorous, it accepts a wide range of feeds: rice bran, mollusc flesh, shrimp meal, and commercial marine pellets.",
      "Monitor salinity — it tolerates wide range but thrives at 10–20 ppt.",
      "Harvest at 12–18 months when fish reach 400g–1 kg."
    ],
    "timeline": "Fingerling stocking → 12–18 months → 400g–1 kg",
    "beginner_tip": "💡 Seabream is an underexplored opportunity in Indian coastal farming. If you're near CMFRI and can get experimental seed, it's worth trying — market demand is strong and the species is hardy."
  },
  "youtube_links": [
    {
      "search_query": "seabream Acanthopagrus farming coastal India estuarine",
      "title": "Seabream Farming in Coastal India",
      "hint": "Brackish water culture of Acanthopagrus berda"
    }
  ]
}
$$::jsonb
WHERE id = 'e4f13f28-d296-49b4-8209-34ca5872a12e';

-- ─── Epinephelus spp. (Grouper) ───────────────────────────────────────────────
UPDATE knowledge_nodes SET data = data || $$
{
  "description": "🐠 Grouper is one of the most valuable marine fish in Asia — live grouper can fetch ₹800–2,000/kg in the live fish export trade to Hong Kong, Singapore, and China. They're stocky, mottled marine predators that grow to 1–5 kg in 12–24 months depending on species. In India, grouper cage culture is practiced in the Andaman & Nicobar Islands, Lakshadweep, Tamil Nadu, and Kerala. The most commonly farmed species in India are the Orange-spotted grouper (E. coioides) and Malabar grouper (E. malabaricus).",
  "breeding_guide": {
    "overview": "Grouper are also protandrous hermaphrodites — males change to females at larger size. Hatchery seed production is technically complex and available from CMFRI, CIBA, and private marine hatcheries. Feed training (switching from live feed to pellets) is a critical nursery skill. Most India cage farmers source fingerlings from these institutions or from Indonesia/Thailand when domestic supply is limited.",
    "steps": [
      "Source fingerlings (5–8 cm) from CMFRI Mandapam or private marine hatcheries. Book months in advance — supply is limited.",
      "Set up deep-water net cages (6m × 6m × 6m minimum) in well-flushed coastal or offshore sites with 5–10 m water depth.",
      "Start fingerlings on live feed (small fish, shrimp) and gradually transition to pelleted feed over 4–6 weeks. This 'feed training' period is critical — failure here means permanent live-feed dependency.",
      "Stock at 10–20 fish per cubic metre. Grouper are territorial but manageable at these densities.",
      "Grade every 60 days — significant size variation develops. Large grouper will injure smaller ones.",
      "Harvest at 18–24 months when fish reach 600g–1.5 kg. For live export premium, keep fish alive until the last moment — use aerated live-fish containers."
    ],
    "timeline": "Fingerling stocking → 6 months → 200–300g → 18–24 months → 600g–1.5 kg",
    "beginner_tip": "⚠️ Grouper cage farming requires significant capital (cage infrastructure, marine site, live fish transport equipment) and proximity to export markets or live-fish buyers. Not suitable for inland beginners — this is a coastal/island advanced venture."
  },
  "youtube_links": [
    {
      "search_query": "grouper cage farming India Andaman Kerala export",
      "title": "Grouper Cage Farming in India — Export Market",
      "hint": "Net cage culture of Epinephelus grouper for live fish export"
    },
    {
      "search_query": "grouper fish farming feed training India technique",
      "title": "Grouper Feed Training — From Live to Pellet",
      "hint": "Critical nursery technique for weaning grouper onto dry feed"
    }
  ]
}
$$::jsonb
WHERE id = 'e83c28cc-efd4-4b8b-b52a-1f28915480d5';

-- ─── Rachycentron canadum (Cobia) ─────────────────────────────────────────────
UPDATE knowledge_nodes SET data = data || $$
{
  "description": "🐟 Cobia is the fastest-growing marine fish you can farm — it can gain 5–6 kg in a single year, reaching 4–5 kg within 12 months of stocking fingerlings. It has excellent firm white flesh, no intermuscular bones, and earns ₹300–500/kg in domestic premium markets plus high value in export. It's farmed in cage culture at sea or in large onshore tanks (RAS) in Tamil Nadu, AP, Kerala, and the Andamans. India's marine cage farming sector sees cobia as a top commercial candidate alongside seabass and grouper.",
  "breeding_guide": {
    "overview": "Cobia hatchery production is established at CMFRI and some private marine hatcheries. Fingerling (8–12 cm) supply is improving each year. On-farm breeding requires large broodstock tanks and marine conditions — not suitable for small farmers. The grow-out stage, however, is very rewarding given cobia's extraordinary growth rate.",
    "steps": [
      "Source fingerlings from CMFRI or licensed marine hatcheries. Currently limited supply — book 3–6 months in advance.",
      "Set up offshore or nearshore net cages (minimum 6m × 6m × 6m). Cobia are strong, fast swimmers and need large cages.",
      "Stock at 5–15 fish per cubic metre. Cobia are less aggressive than grouper but still need space.",
      "Feed exclusively with high-protein marine pellets (48–50% protein) or fresh fish. Cobia consume feed aggressively — they grow fast when fed well.",
      "Check cage nets weekly — cobia are powerful and can damage nets. Upgrade to thicker netting material.",
      "Harvest at 10–12 months when fish reach 4–6 kg. Larger fish (6–8 kg) can be held another 3–4 months for premium restaurant market."
    ],
    "timeline": "Fingerling (10 cm) → 6 months → 2 kg → 10–12 months → 4–6 kg",
    "beginner_tip": "💡 Cobia's growth rate is its superpower. A fingerling costing ₹50–80 can become a 5 kg fish worth ₹1,500–2,500 in 12 months. But it needs proper marine cage infrastructure — offshore location, strong nets, and regular feeding."
  },
  "youtube_links": [
    {
      "search_query": "cobia Rachycentron canadum cage farming India marine",
      "title": "Cobia Cage Farming in India — Fast-Growing Marine Fish",
      "hint": "How to grow cobia in net cages along India's coastline"
    }
  ]
}
$$::jsonb
WHERE id = 'a9e64436-30ca-45c2-916d-0d6206f09db2';

-- ─── Oncorhynchus mykiss (Rainbow trout) ──────────────────────────────────────
UPDATE knowledge_nodes SET data = data || $$
{
  "description": "🐟 Rainbow trout is the flagship fish of hill-state aquaculture in India. With its beautiful pink-orange flesh (from natural carotenoids in feed), it fetches ₹400–800/kg and is served in premium restaurants and hotels across India. It needs cold water (10–18°C), making it exclusive to Himachal Pradesh, Jammu & Kashmir, Uttarakhand, and parts of Northeast India. The government heavily subsidises trout farming in these states. It grows to 250–500g in 12–18 months in raceways fed by mountain streams.",
  "breeding_guide": {
    "overview": "Rainbow trout breeding in India is done at government hatcheries (ICAR-DCFR, state fisheries departments) in the Himalayan and Northeast states. Eggs are imported from USA/Denmark or produced at domestic hatcheries. For most hill farmers, the starting point is buying eyed eggs or fingerlings from the government hatchery. On-farm breeding is possible but requires specialised knowledge of trout reproduction.",
    "steps": [
      "Source eyed eggs or fingerlings from state fisheries hatcheries in HP, J&K, or Uttarakhand. Trout eggs/fry are available February–May.",
      "Set up raceways: concrete channels (1.5m × 10m or larger) with continuous cold-water flow from mountain streams. Water must be 10–18°C with DO >8 mg/L.",
      "Stock at 30–50 fish per sq. metre in raceways. Trout need high oxygen and cannot tolerate stagnant water.",
      "Feed with specialised trout pellets (40–50% protein, 15–20% fat, with astaxanthin for pink flesh colour). Trout need floating or semi-floating feed.",
      "Grading is important — trout are competitive feeders and size variation grows quickly.",
      "Harvest at 12–18 months when fish reach 250–500g. Premium 'plate-size' fish (300–400g) fetch the best hotel prices."
    ],
    "timeline": "Eyed egg (February) → 3 months → Fingerling → 12–18 months → 250–500g harvest",
    "beginner_tip": "💡 Rainbow trout farming is almost exclusively suitable for Himalayan and Northeast hill states. If you have a reliable cold mountain stream and live in these areas, government subsidy under NFDB makes startup costs very manageable."
  },
  "youtube_links": [
    {
      "search_query": "rainbow trout farming India Himachal Pradesh Kashmir Uttarakhand",
      "title": "Rainbow Trout Farming in Indian Hill States",
      "hint": "Cold water trout farming in Himachal, J&K and Uttarakhand"
    },
    {
      "search_query": "trout fish farming raceway India government subsidy",
      "title": "Trout Farming Raceways & Government Subsidy India",
      "hint": "How to set up a trout raceway with government support"
    }
  ]
}
$$::jsonb
WHERE id = '936427b2-ab19-4b64-a2c7-61ffbd9f92d9';

-- ─── Salmo trutta fario (Brown trout) ────────────────────────────────────────
UPDATE knowledge_nodes SET data = data || $$
{
  "description": "🐟 Brown trout is the wild cousin of rainbow trout — spotted, wary, and extraordinarily challenging to catch. In India, it's found naturally in the cold mountain streams of Jammu & Kashmir, Himachal Pradesh, and Uttarakhand, where it supports an important sport fishing tourism industry. It's slower-growing than rainbow trout (takes 2–3 years to reach 500g) but fetches ₹500–1,000/kg as a niche premium fish. Conservation hatcheries produce brown trout for river stocking. Commercial farming for food is limited but growing as a luxury market product.",
  "breeding_guide": {
    "overview": "Brown trout breeding is done by stripping eggs from females and milt from males manually (dry fertilisation) in autumn (October–December) when the fish naturally spawn. Incubation in specially designed egg incubators takes 4–8 weeks depending on water temperature. This is exclusively a specialist and government-hatchery operation in India.",
    "steps": [
      "Breeding season: October–December when water temperature drops to 6–10°C. Select gravid females (full of eggs) and ripe males.",
      "Strip eggs from anaesthetised females and collect milt from males. Mix and fertilise in a dry bowl, then add water to activate sperm.",
      "Place fertilised eggs in incubation trays with 0.5–1 cm water flow over eggs. Remove dead (white) eggs daily to prevent fungal spread.",
      "Incubation takes 4–8 weeks depending on water temperature (slower in colder water). Eyed eggs (visible eyes inside egg) can be safely transported.",
      "After hatching, alevins (larvae with attached yolk sac) need minimal care for 3–4 weeks until the yolk sac is absorbed.",
      "Begin feeding with trout starter crumbles when fry start actively swimming and feeding (March–April).",
      "Grow out in cold-water raceways. Brown trout need 2–3 years to reach 500g."
    ],
    "timeline": "Breeding (Oct–Dec) → 6 weeks → Hatching → 4 weeks → Active feeding fry → 2–3 years → 500g+",
    "beginner_tip": "💡 Brown trout farming in India is a niche, specialised activity best suited for existing trout farmers in J&K and HP looking to add a premium product line or attract fly-fishing tourists to their farm."
  },
  "youtube_links": [
    {
      "search_query": "brown trout Salmo trutta farming India Kashmir hill streams",
      "title": "Brown Trout in India — Farming & Conservation",
      "hint": "Brown trout hatchery and sport fishing in Indian hill states"
    }
  ]
}
$$::jsonb
WHERE id = '0f4a3a6b-93e4-44a6-9710-754413e5e8da';
