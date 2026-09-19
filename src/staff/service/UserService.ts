import { NotFoundError, UnauthorizedError } from '../../shared/errors/AppError';
import { newId } from '../../shared/types/common';
import { UserRepository, userRepository } from '../repository/UserRepository';
import { AuthToken, UserProfile } from '../types/User';

export class UserService {
  constructor(private readonly repo: UserRepository = userRepository) {}

  /** Stub login -- issues a bearer token for any known user id. */
  public login(userId: string): AuthToken {
    const user = this.repo.findById(userId);
    if (!user) throw new UnauthorizedError('Unknown user');
    const now = new Date();
    return {
      token: newId('tok'),
      userId: user.id,
      issuedAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + 60 * 60 * 1000).toISOString(),
    };
  }

  /** The ONLY read surface other modules should call for staff lookups. */
  public getProfile(userId: string): UserProfile {
    const user = this.repo.findById(userId);
    if (!user) throw new NotFoundError('User', userId);
    return user;
  }
}

export const userService = new UserService();
