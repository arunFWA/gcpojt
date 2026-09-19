import { UserProfile } from '../types/User';

/**
 * staff is "read-only for other modules" (Section 3.3): other modules may
 * call UserService.getProfile(...) for a lookup, but nothing outside this
 * module may import UserRepository directly or write to it.
 */
export class UserRepository {
  private users = new Map<string, UserProfile>();

  constructor() {
    // Seed a couple of demo users so alerts/reports lookups have something
    // to resolve against out of the box.
    this.users.set('demo-user', {
      id: 'demo-user',
      storeId: 'demo-store',
      regionId: 'demo-region',
      displayName: 'Demo Associate',
      role: 'ASSOCIATE',
    });
  }

  public findById(id: string): UserProfile | undefined {
    return this.users.get(id);
  }

  public listByStore(storeId: string): UserProfile[] {
    return Array.from(this.users.values()).filter((u) => u.storeId === storeId);
  }
}

export const userRepository = new UserRepository();
