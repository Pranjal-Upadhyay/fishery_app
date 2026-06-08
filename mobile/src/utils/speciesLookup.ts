import { speciesService } from '../services/apiService';

export type SpeciesLookupEntry = {
  label: string;
  scientificName: string;
};

export type SpeciesLookup = Record<string, SpeciesLookupEntry>;

export function buildSpeciesLookup(records: any[] = []): SpeciesLookup {
  return records.reduce((acc: SpeciesLookup, item: any) => {
    const data = item?.data || {};
    const id = item?.id;

    if (!id) {
      return acc;
    }

    let label = data.common_names?.en || data.scientific_name || 'Unknown Species';
    const scientificName = data.scientific_name || label;

    if (scientificName === 'Labeo rohita') {
      label = 'Jayanti Rohu';
    } else if (scientificName === 'Catla catla') {
      label = 'Amrita Katla';
    } else if (scientificName === 'Pangasianodon hypophthalmus' || scientificName === 'Pangasionodon hypophthalmus') {
      label = 'Pangasius';
    }

    acc[id] = { label, scientificName };
    return acc;
  }, {});
}

export async function fetchSpeciesLookup(): Promise<SpeciesLookup> {
  try {
    const response = await speciesService.getAll();
    if (!response.success || !Array.isArray(response.data)) {
      return {};
    }

    return buildSpeciesLookup(response.data);
  } catch (error) {
    console.error('Failed to load species lookup', error);
    return {};
  }
}

export function getSpeciesDisplay(speciesId?: string | null, lookup: SpeciesLookup = {}) {
  if (!speciesId) {
    return null;
  }

  return lookup[speciesId] || {
    label: 'Species selected',
    scientificName: '',
  };
}
