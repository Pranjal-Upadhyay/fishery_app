/**
 * Shared API response shapes.
 * Keep in sync with backend route handlers.
 */

export type AdminRole =
  | 'block_officer'
  | 'district_officer'
  | 'dlc_member'
  | 'superadmin';

export interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  role: AdminRole;
  assignedStateCodes: string[];
  assignedDistrictCodes: string[] | null;
  assignedBlockCodes: string[] | null;
}

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  error?: string;
  pagination?: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export interface LoginResponse {
  token: string;
  admin: AdminUser;
}
