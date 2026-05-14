-- Migration 006: Add humanized descriptions, breeding guides, images, and YouTube links
-- Updates the 7 core species from migration 002 with richer, farmer-friendly content

-- ─── Rohu (Labeo rohita) ─────────────────────────────────────────────────────
UPDATE knowledge_nodes SET data = data || $$
{
  "description": "🐟 Meet Rohu — the rice of Indian fish ponds! It's the most-farmed freshwater fish in Bihar, Bengal, Odisha, and Assam. Rohu is a mid-water swimmer that eats plankton, algae, and supplementary feed like rice bran and pellets. In 8–10 months, a tiny fingerling grows to 1–1.5 kg. Best of all: it's forgiving for beginners — hardy, disease-resistant, and sells reliably at ₹80–120/kg. It's almost always grown together with Catla (surface feeder) and Mrigal (bottom feeder) so all three use the pond's water layers without competing for the same food.",
  "image_url": "https://commons.wikimedia.org/wiki/Special:FilePath/Labeo_rohita.jpg",
  "breeding_guide": {
    "overview": "Rohu won't breed naturally inside a pond — in the wild, it needs monsoon river floods to trigger spawning. Farmers solve this with induced breeding: a hormone injection (usually Ovaprim or HCG) that mimics the natural spawning signal. It's simple once you learn it, and most government hatcheries run free training camps.",
    "steps": [
      "Choose healthy broodfish aged 2–3 years (females: 1.5–3 kg, males: 1–2 kg). Look for active, wound-free fish with a round, full belly — that means they're ripe.",
      "Inject females with Ovaprim at 0.5 mL per kg body weight. Males get half that dose. Use a clean syringe and inject near the base of the dorsal fin.",
      "Place injected broodfish inside hapa nets (fine mesh enclosures) in your pond around sunset. Keep 1 male for every 2 females.",
      "Spawning happens naturally in 4–6 hours. You'll see splashing activity in the hapa at night — that's them releasing eggs and milt.",
      "Collect fertilized eggs (they look like tiny white spheres floating in water) and transfer to circular incubation tanks with gentle aeration.",
      "Eggs hatch in 18–24 hours at 28–30°C. The newly hatched larvae are very fragile — don't disturb them for 48 hours.",
      "After 3 days, transfer larvae to nursery ponds. Start feeding with boiled egg yolk, then gradually introduce green water (algae) and rice bran + mustard cake mix."
    ],
    "timeline": "Hormone injection → 4–6 hrs → Spawning → 18–24 hrs → Hatching → 3 days → Nursery transfer → 30–45 days → Fingerlings ready to stock",
    "beginner_tip": "💡 For your first batch, skip breeding and just buy certified fingerlings from an ICAR-CIFA or state fisheries hatchery. Breeding is the next skill to learn after your first successful grow-out crop."
  },
  "youtube_links": [
    {
      "search_query": "rohu fish farming india step by step",
      "title": "Rohu Fish Farming — Complete Step-by-Step",
      "hint": "How Indian farmers grow Rohu from fingerling to harvest"
    },
    {
      "search_query": "induced breeding rohu catla ICAR method",
      "title": "Induced Breeding of Indian Major Carps",
      "hint": "Watch the actual hormone injection and spawning process"
    }
  ]
}
$$::jsonb
WHERE id = '11111111-1111-1111-1111-111111111111';


-- ─── Catla (Catla catla) ─────────────────────────────────────────────────────
UPDATE knowledge_nodes SET data = data || $$
{
  "description": "🐠 Catla is the surface swimmer of your pond — spot it by its large, upturned mouth that's always scooping phytoplankton from the water surface. It grows even faster than Rohu and commands a better price (₹130–190/kg). Catla is almost never grown alone. It's the 'top' fish in composite carp culture — Catla eats at the surface, Rohu in the middle, and Mrigal at the bottom. All three in one pond means zero competition and maximum production from the same water body. One heads-up: Catla is the most pH-sensitive of the three. Keep pH above 6.5 or growth slows sharply.",
  "image_url": "https://commons.wikimedia.org/wiki/Special:FilePath/Catla_catla.jpg",
  "breeding_guide": {
    "overview": "Like Rohu, Catla doesn't breed in ponds — it needs induced breeding. The process is identical to Rohu: Ovaprim or HCG hormone injection, hapa nets in the pond, and eggs collected for hatching. Many hatcheries breed Catla and Rohu in the same facility at the same time since the process is the same.",
    "steps": [
      "Select broodfish that are 2+ years old and visibly plump (females should have a soft, bulging belly — that's the sign of ripe eggs ready to be released).",
      "Inject females with Ovaprim (0.5 mL/kg) and males with 0.25 mL/kg. Catla broodfish are larger and more aggressive — handle carefully.",
      "Transfer injected fish to hapa nets set in calm pond water around 5–6 PM.",
      "Spawning occurs 5–7 hours after injection (slightly longer than Rohu). Look for splashing and swirling activity in the hapa.",
      "Collect eggs and incubate in circular hatchery tanks. Catla eggs are slightly larger than Rohu eggs — don't confuse them if both species are bred together.",
      "Hatch time is 18–20 hours at 28–30°C. Move larvae to nursery ponds on Day 3."
    ],
    "timeline": "Injection → 5–7 hrs → Spawning → 18–20 hrs → Hatching → 3 days → Nursery → 30–40 days → 2–3 cm fingerlings",
    "beginner_tip": "💡 Catla fingerlings are more expensive than Rohu at hatcheries because demand is high. Book early from your district fisheries office before the monsoon stocking season (June–July)."
  },
  "youtube_links": [
    {
      "search_query": "catla fish farming india composite carp culture",
      "title": "Composite Carp Culture — Rohu, Catla & Mrigal Together",
      "hint": "The smart way to triple your pond productivity"
    },
    {
      "search_query": "catla fish growth rate pond management",
      "title": "Catla Fish Growth & Pond Management Tips",
      "hint": "Water quality and feeding strategies for Catla"
    }
  ]
}
$$::jsonb
WHERE id = '11111111-1111-1111-1111-111111111112';


-- ─── Mrigal (Cirrhinus mrigala) ──────────────────────────────────────────────
UPDATE knowledge_nodes SET data = data || $$
{
  "description": "🐟 Mrigal is the quiet worker at the bottom of your pond — and you'd miss it badly if it wasn't there. It grazes along the pond floor, eating decaying organic matter, bottom algae, and detritus. In doing so, it cleans the pond naturally and converts waste into meat. It's the most salt-tolerant of the three major carps (survives up to 4 ppt salinity comfortably), which makes it especially valuable in Bihar and Eastern India where groundwater often has mild salinity. Grows to market size in 10–12 months, selling at ₹80–110/kg. Slower and cheaper than Catla, but it makes the whole composite pond system work better.",
  "image_url": "https://commons.wikimedia.org/wiki/Special:FilePath/Cirrhinus_mrigala.jpg",
  "breeding_guide": {
    "overview": "Mrigal uses the same induced breeding method as Rohu and Catla — Ovaprim injection, hapa nets, and hatchery incubation. It's often bred simultaneously with the other two major carps during the monsoon season. Mrigal eggs are the smallest of the three, so careful incubation is needed.",
    "steps": [
      "Select mature broodfish (2+ years, female at least 1.5 kg). Mrigal females are rounder-bellied than males when ripe.",
      "Inject females with Ovaprim at 0.5 mL/kg and males at 0.25 mL/kg — same as Rohu.",
      "Place in hapa nets in the evening. Mrigal is calmer than Catla and easier to handle.",
      "Spawning happens 5–6 hours after injection. Eggs are pale yellow and slightly smaller than Rohu eggs.",
      "Incubate in hatchery tanks. Mrigal eggs hatch in 16–20 hours at 28–30°C.",
      "Move larvae to nursery after 3 days. Mrigal larvae prefer pond bottom areas from a young age — add some leaf litter or organic matter to the nursery pond."
    ],
    "timeline": "Injection → 5–6 hrs → Spawning → 16–20 hrs → Hatching → 3 days → Nursery → 35–45 days → Fingerlings",
    "beginner_tip": "💡 Never stock your pond with Mrigal alone — it produces the best results as the bottom component of composite carp culture. Typical stocking ratio: 30% Catla + 40% Rohu + 30% Mrigal."
  },
  "youtube_links": [
    {
      "search_query": "mrigal fish farming composite culture india",
      "title": "Mrigal in Composite Fish Culture",
      "hint": "Why Mrigal is the essential third partner in Indian ponds"
    },
    {
      "search_query": "Indian major carp polyculture pond management",
      "title": "Major Carp Polyculture — Full Pond Guide",
      "hint": "Manage three species in one pond efficiently"
    }
  ]
}
$$::jsonb
WHERE id = '11111111-1111-1111-1111-111111111113';


-- ─── Pangasius (Pangasianodon hypophthalmus) ─────────────────────────────────
UPDATE knowledge_nodes SET data = data || $$
{
  "description": "🐟 Pangasius (also called Basa or Panga fish) is the speed champion of Indian aquaculture — it can hit 1 kg in just 5–6 months, nearly twice as fast as carps! This catfish (yes, it has whiskers) originally came from Vietnam's Mekong River and arrived in India in the 1990s. Today it's hugely popular in Andhra Pradesh, Karnataka, and West Bengal. It has a superpower: it can breathe air for short periods using a modified swim bladder, so it tolerates low-oxygen water better than most fish. Sells at ₹60–80/kg — lower margins than carps but you can do 2 crops a year, which compensates nicely.",
  "image_url": "https://commons.wikimedia.org/wiki/Special:FilePath/Pangasianodon_hypophthalmus.jpg",
  "breeding_guide": {
    "overview": "Pangasius breeding in India is done almost entirely at commercial hatcheries in Andhra Pradesh, Tamil Nadu, and West Bengal. As a grow-out farmer, you'll almost certainly buy fingerlings (7–10 cm) rather than breeding yourself. The breeding process at hatcheries uses hormone injection similar to carps, but with a specific protocol developed for Pangasius.",
    "steps": [
      "Purchase fingerlings (7–10 cm, 5–10g) from a licensed Pangasius hatchery — your district fisheries office can recommend certified ones.",
      "Prepare your pond: Lime at 200 kg/acre for pH correction, then fill and let plankton bloom for 7–10 days before stocking.",
      "Stock at 10,000–15,000 fingerlings per acre for semi-intensive farming (lower for your first batch).",
      "Feed 4–5 times daily. Pangasius accepts pelleted feed very efficiently — use 28–30% protein feed for first 2 months, then 22–25% protein for grow-out.",
      "Pangasius grows fast: 200g by Month 2, 600g by Month 4, 1 kg by Month 5–6. Harvest when you hit your target size.",
      "Harvest using a partial drain — lower the water, then net the fish. Pangasius is hardy and survives harvest well."
    ],
    "timeline": "Fingerling stocked (10g) → Month 2 → 200g → Month 4 → 600g → Month 5–6 → 1 kg harvest",
    "beginner_tip": "💡 Pangasius grows best at 28–30°C and is very tolerant of poor water — but don't ignore water quality completely. Ammonia buildup from dense stocking is the #1 killer. Aeration is mandatory above 10,000 fish/acre."
  },
  "youtube_links": [
    {
      "search_query": "pangasius basa fish farming india andhra pradesh",
      "title": "Pangasius (Basa) Fish Farming in India",
      "hint": "How AP farmers grow 1 kg Pangasius in just 5 months"
    },
    {
      "search_query": "pangasius pond management feeding tips",
      "title": "Pangasius Feeding & Pond Management",
      "hint": "Feed scheduling, stocking density, and harvest tips"
    }
  ]
}
$$::jsonb
WHERE id = '22222222-2222-2222-2222-222222222222';


-- ─── Vannamei / White-leg Shrimp (Litopenaeus vannamei) ──────────────────────
UPDATE knowledge_nodes SET data = data || $$
{
  "description": "🦐 Vannamei — also called White-leg Shrimp or Whiteleg — is India's golden export crop. Over 70% of India's entire seafood export (to USA, EU, China, Japan) is this single species! It's a marine shrimp that grows in brackish water (5–30 ppt salinity; ideal around 10–15 ppt). In just 4–5 months, it reaches 20–25g and fetches ₹350–500/kg at the farm gate. Nothing else in freshwater farming comes close to this income potential. But fair warning: Vannamei is demanding. It needs SPF (Specific Pathogen Free) certified seed from approved hatcheries, good pond lining or prep, and daily water quality monitoring. High effort — high reward.",
  "image_url": "https://commons.wikimedia.org/wiki/Special:FilePath/Litopenaeus_vannamei.jpg",
  "breeding_guide": {
    "overview": "Vannamei does NOT breed in grow-out ponds. In India, breeding happens at licensed coastal hatcheries (mainly in Andhra Pradesh, Tamil Nadu, and Odisha) using SPF (Specific Pathogen Free) broodstock imported from certified sources. As a farmer, your job starts when you buy PLs (Post-Larvae). The grow-out phase — from PL to harvest — is what you control.",
    "steps": [
      "Buy PL10–PL15 (10–15 day old Post-Larvae) from a MPEDA-registered, SPF-certified hatchery. Never compromise on seed quality — it determines 50% of your success.",
      "Prepare your pond: apply agricultural lime (200 kg/acre), let it dry 2–3 days, then fill slowly. Target salinity 10–15 ppt by mixing saline groundwater or sea water. Let plankton bloom for 7–10 days before stocking.",
      "Acclimatize PLs before stocking: Float the sealed seed bag in your pond for 15–20 minutes, then slowly add pond water to the bag over 30 minutes before releasing.",
      "Stock at 25–40 PL/m² for semi-intensive farming. For your very first crop, use 15–20 PL/m².",
      "Feed 4–6 times daily using a feeding tray. Start with 38% protein shrimp feed and reduce protein as they grow larger.",
      "Check water daily: pH 7.5–8.5, DO above 4 mg/L (ideally above 6), salinity 10–25 ppt, temperature 27–30°C, ammonia below 0.1 mg/L.",
      "Harvest at 20–25g (count size 40–50 per kg) after 4–5 months using cast nets or partial drain harvest."
    ],
    "timeline": "Pond prep (15 days) → Stock PL → Month 1 → 2–3g → Month 3 → 10–12g → Month 4–5 → 20–25g harvest",
    "beginner_tip": "⚠️ DO NOT stock Vannamei without completing your pond preparation properly. Bad pond prep causes 80% of first-crop failures. Contact your nearest MPEDA Regional Office or Coastal Aquaculture Authority (CAA) office before your first batch — they offer free technical guidance."
  },
  "youtube_links": [
    {
      "search_query": "vannamei shrimp farming india andhra pradesh beginners",
      "title": "Vannamei Shrimp Farming — Beginner's Guide",
      "hint": "How coastal farmers grow India's #1 export shrimp"
    },
    {
      "search_query": "vannamei pond preparation water quality management",
      "title": "Shrimp Pond Preparation & Water Quality",
      "hint": "The most critical steps before stocking your first batch"
    },
    {
      "search_query": "SPF shrimp seed selection MPEDA hatchery India",
      "title": "How to Choose Quality Shrimp Seed (PL)",
      "hint": "Why SPF-certified seed matters and how to identify it"
    }
  ]
}
$$::jsonb
WHERE id = '33333333-3333-3333-3333-333333333333';


-- ─── Scampi / Giant Freshwater Prawn (Macrobrachium rosenbergii) ─────────────
UPDATE knowledge_nodes SET data = data || $$
{
  "description": "🦞 Giant Freshwater Prawn — known as Scampi, Galda Chingri (in Bengal), or Freshwater Lobster — is the most prized freshwater aquaculture species in India. At ₹250–400/kg, it earns more than carps and rivals coastal shrimp in value. Here is the fascinating biology: the larvae absolutely need slightly salty water (10–12 ppt) for their first 30–40 days of life — without it, they die. After that critical larval phase, they switch to living in freshwater for the rest of their 8–12 month grow-out. NFDB specifically promotes Scampi farming in Bihar and Eastern India, and subsidies are available under PMMSY. Patience pays off with this one.",
  "image_url": "https://commons.wikimedia.org/wiki/Special:FilePath/Macrobrachium_rosenbergii.jpg",
  "breeding_guide": {
    "overview": "Scampi breeding is the most interesting process in freshwater aquaculture — it happens in two completely different water types. Females carry eggs under their abdomen (called berried females) for 18–21 days. When eggs hatch into zoea larvae, they need brackish water to survive. After 30–40 days in brackish conditions, they metamorphose into juveniles that can live in freshwater.",
    "steps": [
      "Set up a brackish nursery tank (10–12 ppt salinity, 28–30°C, with gentle aeration). This is where larvae will spend their first 30–40 days.",
      "Collect berried females (females with eggs visible under their tail) from a broodstock pond. Females turn berried naturally without hormone injection — Scampi breeds more easily than carps.",
      "Place berried females in the brackish tank in a hapa net. Eggs hatch in 18–21 days into tiny zoea larvae.",
      "Feed zoea larvae with Artemia nauplii (baby brine shrimp) 4–6 times daily for the first 2 weeks, then transition to powdered feed.",
      "After 30–40 days, larvae metamorphose into post-larvae (PL) — tiny miniature prawns. Gradually reduce salinity over 5–7 days by adding freshwater. This acclimatizes them to their permanent freshwater home.",
      "Transfer freshwater-adapted PLs to nursery ponds. Keep 10–20 juveniles/m² in nursery for 2–3 months.",
      "Stock grow-out ponds at 2–4/m². Harvest selectively (remove only large males) over 8–12 months to maintain a continuous crop."
    ],
    "timeline": "Berried female → 18–21 days → Larvae hatch → 30–40 days (brackish) → Freshwater PL → 60–90 days (nursery) → Grow-out pond → 8–12 months → Harvest",
    "beginner_tip": "💡 For your first Scampi crop, buy freshwater-adapted PL from a Scampi hatchery instead of breeding yourself. Setting up a brackish larval unit is a 2nd-year project. Contact ICAR-CIFA Bhubaneswar or the Bihar state fisheries department for certified PL sources."
  },
  "youtube_links": [
    {
      "search_query": "scampi freshwater prawn farming India galda chingri",
      "title": "Scampi (Giant Freshwater Prawn) Farming",
      "hint": "Complete guide to growing India's most valuable freshwater prawn"
    },
    {
      "search_query": "Macrobrachium rosenbergii breeding hatchery India",
      "title": "Scampi Hatchery & Breeding Process",
      "hint": "The two-water-type larval cycle explained simply"
    }
  ]
}
$$::jsonb
WHERE id = '44444444-4444-4444-4444-444444444444';


-- ─── Nile Tilapia (Oreochromis niloticus) ────────────────────────────────────
UPDATE knowledge_nodes SET data = data || $$
{
  "description": "🐟 Tilapia is the tough guy of aquaculture — it survives in conditions that would kill most other fish. Originally from Africa's Nile River, it tolerates low oxygen, dirty water, crowded ponds, and temperature drops down to 15°C. It grows to 500g in 6–8 months in ponds and performs even better in intensive biofloc or RAS systems (where it can reach 800g–1 kg). Tilapia is an excellent beginner fish — low-maintenance, low-risk. BUT: ⚠️ Tilapia farming is regulated or restricted in several Indian states (Bihar, West Bengal, and others) because it can escape into natural water bodies and crowd out native species. Always check your state fisheries authority's rules BEFORE you invest in Tilapia.",
  "image_url": "https://commons.wikimedia.org/wiki/Special:FilePath/Oreochromis_niloticus.jpg",
  "breeding_guide": {
    "overview": "Tilapia is the easiest fish to breed in captivity — in fact, the challenge is preventing OVER-breeding! Tilapia breed naturally in ponds without any hormone injection. Females carry fertilized eggs in their mouth (called mouthbrooding) for 2–3 weeks, protecting the fry. This means your pond can become overcrowded with small fish that eat all the feed meant for large fish.",
    "steps": [
      "For grow-out farming, use monosex male tilapia (all-male batches produced by hatcheries using hormonal sex reversal). Males grow 30–40% faster than females and won't breed in your grow-out pond.",
      "Buy monosex male fingerlings (5–10g) from a certified hatchery — these are produced by feeding female larvae a testosterone supplement for 21 days right after hatching.",
      "Stock at 10,000–20,000/acre for semi-intensive pond culture, or 50–100 fish/m³ for biofloc systems.",
      "Feed 3–4 times daily. Tilapia eats almost anything — pellets, rice bran, algae, duckweed. Use 28–32% protein pellets for best growth.",
      "Tilapia grows to 300g by Month 3, 500g by Month 5–6. Harvest at 400–600g for best market price.",
      "If you see tiny fish in your pond, it means some females got mixed in — remove them immediately to prevent population explosion."
    ],
    "timeline": "Stock 10g fingerlings → Month 2 → 150–200g → Month 4 → 350–400g → Month 5–6 → 500–600g harvest",
    "beginner_tip": "⚠️ Never stock tilapia from an unknown source — wild-caught or mixed-sex batches will breed in your pond and reduce your harvest dramatically. Only use certified monosex male fingerlings from a registered hatchery."
  },
  "youtube_links": [
    {
      "search_query": "tilapia fish farming India biofloc pond monosex",
      "title": "Tilapia Farming in India — Complete Guide",
      "hint": "Pond and biofloc methods for growing monosex Tilapia"
    },
    {
      "search_query": "tilapia biofloc system India commercial farming",
      "title": "Tilapia in Biofloc — High-Density Farming",
      "hint": "How biofloc technology supercharges Tilapia production"
    }
  ]
}
$$::jsonb
WHERE id = '55555555-5555-5555-5555-555555555555';
