export type ISODateString = string;

export interface AuthenticatedRequestContext {
  userId: string;
  storeId: string;
  role: 'REGIONAL_MANAGER' | 'STORE_MANAGER' | 'DEPARTMENT_LEAD' | 'ASSOCIATE';
}

/** Minimal id generator -- swappable for a UUID lib without changing callers. */
export function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}
