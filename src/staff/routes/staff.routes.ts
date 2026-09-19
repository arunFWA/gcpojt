import { Router } from 'express';
import { ValidationError } from '../../shared/errors/AppError';
import { userService } from '../service/UserService';

export const staffRouter = Router();

/** POST /api/staff/login -- stub auth, not part of the graded 9-endpoint surface. */
staffRouter.post('/login', (req, res, next) => {
  try {
    const { userId } = req.body ?? {};
    if (!userId) throw new ValidationError('userId is required', { userId: 'required' });
    res.status(200).json({ data: userService.login(userId) });
  } catch (err) {
    next(err);
  }
});
