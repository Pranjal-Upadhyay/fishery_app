import { type ImageSourcePropType } from 'react-native';

const DISEASE_IMAGE_BY_SLUG: Record<string, ImageSourcePropType> = {
  columnaris: require('../../assets/images/diseases/columnaris.png'),
  'aeromonas-septicemia': require('../../assets/images/diseases/aeromonas-septicemia.png'),
  'white-spot-syndrome': require('../../assets/images/diseases/white-spot-syndrome.png'),
  'ich-white-spot': require('../../assets/images/diseases/ich-white-spot.png'),
  saprolegniasis: require('../../assets/images/diseases/saprolegniasis.png'),
  'oxygen-depletion': require('../../assets/images/diseases/oxygen-depletion.png'),
  'ammonia-toxicity': require('../../assets/images/diseases/ammonia-toxicity.png'),
  'algal-toxicosis': require('../../assets/images/diseases/algal-toxicosis.png'),
  argulosis: require('../../assets/images/diseases/argulosis.png'),
  'pangasius-bacillary-necrosis': require('../../assets/images/diseases/pangasius-bacillary-necrosis.png'),
  'brown-blood-disease': require('../../assets/images/diseases/brown-blood-disease.png'),
  dropsy: require('../../assets/images/diseases/dropsy.png'),
  'eus-red-spot': require('../../assets/images/diseases/eus-red-spot.png'),
  'pangasius-fungal-infection': require('../../assets/images/diseases/pangasius-fungal-infection.png'),
  'gas-bubble-disease': require('../../assets/images/diseases/gas-bubble-disease.png'),
  'gill-rot': require('../../assets/images/diseases/gill-rot.png'),
  'hydrogen-sulfide-toxicity': require('../../assets/images/diseases/hydrogen-sulfide-toxicity.png'),
  'leech-infection': require('../../assets/images/diseases/leech-infection.png'),
  lernaeosis: require('../../assets/images/diseases/lernaeosis.png'),
  'pangasius-red-spot': require('../../assets/images/diseases/pangasius-red-spot.png'),
  'tail-fin-rot': require('../../assets/images/diseases/tail-fin-rot.png'),
  'pangasius-white-spot-ich': require('../../assets/images/diseases/pangasius-white-spot-ich.png'),
};

const CATEGORY_FALLBACK_IMAGE: Record<string, ImageSourcePropType> = {
  BACTERIAL: DISEASE_IMAGE_BY_SLUG.columnaris,
  VIRAL: DISEASE_IMAGE_BY_SLUG['white-spot-syndrome'],
  PARASITIC: DISEASE_IMAGE_BY_SLUG['ich-white-spot'],
  FUNGAL: DISEASE_IMAGE_BY_SLUG.saprolegniasis,
  ENVIRONMENTAL: DISEASE_IMAGE_BY_SLUG['oxygen-depletion'],
  NUTRITIONAL: DISEASE_IMAGE_BY_SLUG['ammonia-toxicity'],
};

const sanitizeUrl = (url?: string) => {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (trimmed.includes('unsplash.com')) return null;
  return trimmed;
};

export function resolveDiseaseImage(disease: {
  slug?: string;
  category?: string;
  image_url?: string;
}): ImageSourcePropType {
  const slug = disease.slug?.toLowerCase().trim() ?? '';
  if (slug && DISEASE_IMAGE_BY_SLUG[slug]) {
    return DISEASE_IMAGE_BY_SLUG[slug];
  }

  const safeBackendImage = sanitizeUrl(disease.image_url);
  if (safeBackendImage) {
    return { uri: safeBackendImage };
  }

  const category = disease.category?.toUpperCase().trim() ?? '';
  return CATEGORY_FALLBACK_IMAGE[category] ?? CATEGORY_FALLBACK_IMAGE.ENVIRONMENTAL;
}
