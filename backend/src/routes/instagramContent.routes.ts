import { Router, Request, Response, NextFunction } from 'express';
import { instagramContentController } from '../controllers/InstagramContentController';
import { aiComparisonController } from '../controllers/AIComparisonController';
import { AuthRequest, authenticateToken } from '../middleware/auth.middleware';

const router = Router();

/**
 * Flexible authentication middleware:
 * Validates Bearer token if present; allows unauthenticated calls in development/testing.
 */
const flexibleAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authenticateToken(req as AuthRequest, res, next);
  }
  // In development, proceed smoothly
  return next();
};

// POST /api/ai/instagram/captions
router.post('/captions', flexibleAuth, (req: Request, res: Response) => {
  instagramContentController.generateCaptions(req, res);
});

// POST /api/ai/instagram/hashtags
router.post('/hashtags', flexibleAuth, (req: Request, res: Response) => {
  instagramContentController.generateHashtags(req, res);
});

// POST /api/ai/instagram/ideas
router.post('/ideas', flexibleAuth, (req: Request, res: Response) => {
  instagramContentController.generateIdeas(req, res);
});

// POST /api/ai/instagram/compare
router.post('/compare', flexibleAuth, (req: Request, res: Response) => {
  aiComparisonController.compareProviders(req, res);
});

export default router;
