export type StaffRole = 'REGIONAL_MANAGER' | 'STORE_MANAGER' | 'DEPARTMENT_LEAD' | 'ASSOCIATE';

export interface UserProfile {
  id: string;
  storeId: string;
  regionId: string;
  displayName: string;
  role: StaffRole;
}

export interface AuthToken {
  token: string;
  userId: string;
  issuedAt: string;
  expiresAt: string;
}
