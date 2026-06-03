/**
 * Pond Model - WatermelonDB
 */

import { Model } from '@nozbe/watermelondb';
import { field, date, readonly } from '@nozbe/watermelondb/decorators';

export type OwnershipType = 'OWNED' | 'LEASED' | 'SHARED' | 'GOVT';
export type WaterAvailability = 'SEASONAL' | 'PERENNIAL';
export type CultureSystemCategory = 'EXTENSIVE' | 'SEMI_INTENSIVE' | 'INTENSIVE';
export type PondActivityType = 'NURSERY' | 'REARING' | 'GROW_OUT' | 'BROODSTOCK' | 'MIXED';
export type DiseaseOccurrence = 'NONE' | 'MINOR' | 'MAJOR';

export default class Pond extends Model {
  static table = 'ponds';

  @field('pond_id') pondId!: string;
  @field('name') name!: string;
  @field('area_hectares') areaHectares!: number;
  @field('water_source_type') waterSourceType!: string;
  @field('system_type') systemType!: string;
  @field('species_id') speciesId?: string;
  @field('stocking_date') stockingDate?: number;
  @field('status') status!: string;
  @field('latitude') latitude?: number;
  @field('longitude') longitude?: number;
  @field('image_uri') imageUri?: string;
  @field('district_code') districtCode?: string;
  @field('block_code') blockCode?: string;
  @field('panchayat_code') panchayatCode?: string;
  @field('district_name') districtName?: string;
  @field('block_name') blockName?: string;
  @field('panchayat_name') panchayatName?: string;
  @field('fingerling_count') fingerlingCount?: number;
  @field('fingerling_avg_weight_g') fingerlingAvgWeightG?: number;
  @field('fingerling_source') fingerlingSource?: string;
  @field('fingerling_transaction_ref') fingerlingTransactionRef?: string;
  @field('species_variant') speciesVariant?: string;
  @field('expected_harvest_date') expectedHarvestDate?: number;

  // ── v5 — gov survey Section B/D/F fields ──
  @field('ownership_type') ownershipType?: OwnershipType;
  @field('water_availability') waterAvailability?: WaterAvailability;
  @field('culture_system_category') cultureSystemCategory?: CultureSystemCategory;
  @field('pond_activity_type') pondActivityType?: PondActivityType;
  @field('wide_angle_photo_uri') wideAnglePhotoUri?: string;
  @field('embankment_photo_uri') embankmentPhotoUri?: string;
  @field('close_view_photo_uri') closeViewPhotoUri?: string;
  @field('farmer_with_pond_photo_uri') farmerWithPondPhotoUri?: string;
  @field('is_insured') isInsured?: boolean;
  @field('flood_impact_3yrs') floodImpact3Yrs?: boolean;
  @field('disease_occurrence') diseaseOccurrence?: DiseaseOccurrence;

  @field('sync_status') localSyncStatus!: string;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  getLocation() {
    if (this.latitude && this.longitude) {
      return { latitude: this.latitude, longitude: this.longitude };
    }
    return null;
  }

  getStockingDate(): Date | null {
    if (this.stockingDate) {
      return new Date(this.stockingDate);
    }
    return null;
  }

  isActive(): boolean {
    return this.status === 'ACTIVE';
  }
}
