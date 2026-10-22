import { getAuth } from '@clerk/express';
import type { RequestHandler } from 'express';

// API-friendly guard: responds with 401 JSON instead of redirecting to sign-in.
const requireUser: RequestHandler = (req, res, next) => {
  const { isAuthenticated, userId } = getAuth(req);

  if (!isAuthenticated) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  res.locals.userId = userId;
  next();
};

export default requireUser;
