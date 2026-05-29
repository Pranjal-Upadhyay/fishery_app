/**
 * Pond Model - WatermelonDB
 */

import { Model } from '@nozbe/watermelondb';
import { field, date, readonly } from '@nozbe/watermelondb/decorators';

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
