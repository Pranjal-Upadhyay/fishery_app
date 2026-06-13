/**
 * Bundled species images — loaded locally so they work offline and load instantly.
 * 38 species covered; the remaining 4 (mystus_tengara, monopterus_cuchia,
 * metapenaeus_dobsoni, penaeus_indicus) fall through to category images.
 * All images are public domain / CC-licensed from Wikimedia Commons,
 * resized to max 800px wide for mobile.
 */

// ── Carp / Freshwater fish ────────────────────────────────────────────────────
const IMG_LABEO_ROHITA               = require('../../assets/images/species/labeo_rohita.jpg');
const IMG_CATLA_CATLA                = require('../../assets/images/species/catla_catla.jpg');
const IMG_CIRRHINUS_MRIGALA          = require('../../assets/images/species/cirrhinus_mrigala.jpg');
const IMG_CIRRHINUS_REBA             = require('../../assets/images/species/cirrhinus_reba.jpg');
const IMG_LABEO_CALBASU              = require('../../assets/images/species/labeo_calbasu.jpg');
const IMG_LABEO_BATA                 = require('../../assets/images/species/labeo_bata.jpg');
const IMG_CYPRINUS_CARPIO            = require('../../assets/images/species/cyprinus_carpio.jpg');
const IMG_CTENOPHARYNGODON_IDELLA    = require('../../assets/images/species/ctenopharyngodon_idella.jpg');
const IMG_HYPOPHTHALMICHTHYS_MOLITRIX= require('../../assets/images/species/hypophthalmichthys_molitrix.jpg');
const IMG_ARISTICHTHYS_NOBILIS       = require('../../assets/images/species/aristichthys_nobilis.jpg');
const IMG_PUNTIUS_SARANA             = require('../../assets/images/species/puntius_sarana.jpg');
const IMG_TOR_TOR                    = require('../../assets/images/species/tor_tor.jpg');

// ── Catfish / Snakeheads / Misc freshwater ────────────────────────────────────
const IMG_PANGASIANODON              = require('../../assets/images/species/pangasianodon_hypophthalmus.jpg');
const IMG_CLARIAS_BATRACHUS          = require('../../assets/images/species/clarias_batrachus.jpg');
const IMG_HETEROPNEUSTES_FOSSILIS    = require('../../assets/images/species/heteropneustes_fossilis.jpg');
const IMG_WALLAGO_ATTU               = require('../../assets/images/species/wallago_attu.jpg');
const IMG_OMPOK_PABDA                = require('../../assets/images/species/ompok_pabda.jpg');
const IMG_SPERATA_SEENGHALA          = require('../../assets/images/species/sperata_seenghala.jpg');
const IMG_CHANNA_STRIATA             = require('../../assets/images/species/channa_striata.jpg');
const IMG_CHANNA_PUNCTATA            = require('../../assets/images/species/channa_punctata.jpg');
const IMG_CHANNA_MARULIUS            = require('../../assets/images/species/channa_marulius.jpg');
const IMG_ANABAS_TESTUDINEUS         = require('../../assets/images/species/anabas_testudineus.jpg');

// ── Tilapia / Cichlid / Coastal ──────────────────────────────────────────────
const IMG_OREOCHROMIS_NILOTICUS      = require('../../assets/images/species/oreochromis_niloticus.jpg');
// Etroplus suratensis (Pearlspot) removed — coastal southern India species,
// not cultivable in Bihar/UP. Image import kept commented for reference.
// const IMG_ETROPLUS_SURATENSIS     = require('../../assets/images/species/etroplus_suratensis.jpg');

// ── Brackish / Marine finfish ─────────────────────────────────────────────────
const IMG_LATES_CALCARIFER           = require('../../assets/images/species/lates_calcarifer.jpg');
const IMG_CHANOS_CHANOS              = require('../../assets/images/species/chanos_chanos.jpg');
const IMG_MUGIL_CEPHALUS             = require('../../assets/images/species/mugil_cephalus.jpg');
const IMG_LUTJANUS_ARGENTIMACULATUS  = require('../../assets/images/species/lutjanus_argentimaculatus.jpg');
const IMG_ACANTHOPAGRUS_BERDA        = require('../../assets/images/species/acanthopagrus_berda.jpg');
const IMG_EPINEPHELUS_COIOIDES       = require('../../assets/images/species/epinephelus_coioides.jpg');
const IMG_RACHYCENTRON_CANADUM       = require('../../assets/images/species/rachycentron_canadum.jpg');

// ── Trout / Salmonids ─────────────────────────────────────────────────────────
const IMG_ONCORHYNCHUS_MYKISS        = require('../../assets/images/species/oncorhynchus_mykiss.jpg');
const IMG_SALMO_TRUTTA               = require('../../assets/images/species/salmo_trutta.jpg');

// ── Shrimp ────────────────────────────────────────────────────────────────────
const IMG_LITOPENAEUS_VANNAMEI       = require('../../assets/images/species/litopenaeus_vannamei.jpg');
// Penaeus monodon (Black Tiger Shrimp) removed — strictly coastal/maritime,
// not farmed in inland Bihar or UP. Image import kept commented for reference.
// const IMG_PENAEUS_MONODON         = require('../../assets/images/species/penaeus_monodon.jpg');
const IMG_MACROBRACHIUM_ROSENBERGII  = require('../../assets/images/species/macrobrachium_rosenbergii.jpg');
const IMG_MACROBRACHIUM_MALCOLMSONII = require('../../assets/images/species/macrobrachium_malcolmsonii.jpg');

// ── Crab ──────────────────────────────────────────────────────────────────────
const IMG_SCYLLA_SERRATA             = require('../../assets/images/species/scylla_serrata.jpg');

// ── Generic category fallbacks (for species not individually mapped) ──────────
const IMG_CARP    = require('../../assets/images/categories/generic_carp.jpg');
const IMG_CATFISH = require('../../assets/images/categories/generic_catfish.jpg');
const IMG_SHRIMP  = require('../../assets/images/categories/generic_shrimp.jpg');
const IMG_CRAB    = require('../../assets/images/categories/generic_crab.jpg');

/**
 * Exact scientific-name → image map (lowercase keys for case-insensitive lookup).
 * Covers 38 of 42 species; the rest fall through to category-based fallbacks below.
 */
const SPECIES_MAP: Record<string, any> = {
  'labeo rohita':                img(IMG_LABEO_ROHITA),
  'catla catla':                 img(IMG_CATLA_CATLA),
  'cirrhinus mrigala':           img(IMG_CIRRHINUS_MRIGALA),
  'cirrhinus reba':              img(IMG_CIRRHINUS_REBA),
  'labeo calbasu':               img(IMG_LABEO_CALBASU),
  'labeo bata':                  img(IMG_LABEO_BATA),
  'cyprinus carpio':             img(IMG_CYPRINUS_CARPIO),
  'cyprinus carpio haematopterus': img(IMG_CYPRINUS_CARPIO),
  'ctenopharyngodon idella':     img(IMG_CTENOPHARYNGODON_IDELLA),
  'hypophthalmichthys molitrix': img(IMG_HYPOPHTHALMICHTHYS_MOLITRIX),
  'aristichthys nobilis':        img(IMG_ARISTICHTHYS_NOBILIS),
  'hypophthalmichthys nobilis':  img(IMG_ARISTICHTHYS_NOBILIS),
  'puntius sarana':              img(IMG_PUNTIUS_SARANA),
  'tor tor':                     img(IMG_TOR_TOR),
  'pangasianodon hypophthalmus': img(IMG_PANGASIANODON),
  'pangasionodon hypophthalmus': img(IMG_PANGASIANODON),
  'clarias batrachus':           img(IMG_CLARIAS_BATRACHUS),
  'clarias magur':               img(IMG_CLARIAS_BATRACHUS),
  'heteropneustes fossilis':     img(IMG_HETEROPNEUSTES_FOSSILIS),
  'wallago attu':                img(IMG_WALLAGO_ATTU),
  'ompok pabda':                 img(IMG_OMPOK_PABDA),
  'sperata seenghala':           img(IMG_SPERATA_SEENGHALA),
  'mystus seenghala':            img(IMG_SPERATA_SEENGHALA),
  'channa striata':              img(IMG_CHANNA_STRIATA),
  'channa punctata':             img(IMG_CHANNA_PUNCTATA),
  'channa marulius':             img(IMG_CHANNA_MARULIUS),
  'anabas testudineus':          img(IMG_ANABAS_TESTUDINEUS),
  'oreochromis niloticus':       img(IMG_OREOCHROMIS_NILOTICUS),
  // 'etroplus suratensis' removed — coastal southern India, not cultivable in Bihar/UP
  'lates calcarifer':            img(IMG_LATES_CALCARIFER),
  'chanos chanos':               img(IMG_CHANOS_CHANOS),
  'mugil cephalus':              img(IMG_MUGIL_CEPHALUS),
  'lutjanus argentimaculatus':   img(IMG_LUTJANUS_ARGENTIMACULATUS),
  'acanthopagrus berda':         img(IMG_ACANTHOPAGRUS_BERDA),
  'epinephelus coioides':        img(IMG_EPINEPHELUS_COIOIDES),
  'epinephelus spp.':            img(IMG_EPINEPHELUS_COIOIDES),
  'rachycentron canadum':        img(IMG_RACHYCENTRON_CANADUM),
  'oncorhynchus mykiss':         img(IMG_ONCORHYNCHUS_MYKISS),
  'salmo trutta':                img(IMG_SALMO_TRUTTA),
  'salmo trutta fario':          img(IMG_SALMO_TRUTTA),
  'litopenaeus vannamei':        img(IMG_LITOPENAEUS_VANNAMEI),
  // 'penaeus monodon' removed — strictly coastal/maritime, not farmed in Bihar/UP
  'macrobrachium rosenbergii':   img(IMG_MACROBRACHIUM_ROSENBERGII),
  'macrobrachium malcolmsonii':  img(IMG_MACROBRACHIUM_MALCOLMSONII),
  'scylla serrata':              img(IMG_SCYLLA_SERRATA),
};

function img(src: any) { return src; }

/**
 * Returns the image source for a species.
 * Priority: exact scientific-name match → category fallback.
 * The dbImageUrl param is kept for API compatibility but ignored —
 * all images are now bundled locally for offline-first performance.
 */
export function getSpeciesImageUri(
  scientificName?: string | null,
  _dbImageUrl?: string | null,
): any {
  const key = (scientificName || '').toLowerCase().trim();

  // Exact match first
  if (key && SPECIES_MAP[key]) return SPECIES_MAP[key];

  // Partial-name match for compound DB names like "Clarias magur / Clarias batrachus"
  for (const [mapKey, src] of Object.entries(SPECIES_MAP)) {
    if (key.includes(mapKey) || mapKey.includes(key.split(' ')[0] + ' ' + key.split(' ')[1])) {
      return src;
    }
  }

  // Category fallback based on scientific name patterns
  if (key.includes('penaeus') || key.includes('macrobrachium') || key.includes('metapenaeus') || key.includes('litopenaeus')) {
    return IMG_SHRIMP;
  }
  if (key.includes('scylla') || key.includes('sartoriana') || key.includes('barytelphusa') || key.includes('paratelphusa')) return IMG_CRAB;
  if (
    key.includes('clarias') || key.includes('mystus') || key.includes('heteropneustes') ||
    key.includes('wallago') || key.includes('pangasianodon') || key.includes('ompok') ||
    key.includes('sperata') || key.includes('monopterus') || key.includes('mastacembelus') ||
    key.includes('rita') || key.includes('pangasius')
  ) {
    return IMG_CATFISH;
  }

  return IMG_CARP;
}

export const FISH_MEAL_IMAGE = require('../../assets/images/categories/generic_fish_feed.jpg');
