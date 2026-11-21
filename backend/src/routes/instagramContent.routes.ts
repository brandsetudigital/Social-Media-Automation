import { Router, Request, Response, NextFunction } from 'express';
import { instagramContentController } from '../controllers/InstagramContentController';
import { aiComparisonController } from '../controllers/AIComparisonController';
import { brandVoiceController } from '../controllers/BrandVoiceController';
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

// POST /api/ai/instagram/brand-voice (Save/update brand voice preferences)
router.post('/brand-voice', flexibleAuth, (req: Request, res: Response) => {
  brandVoiceController.saveBrandVoice(req, res);
});

// GET /api/ai/instagram/brand-voice/:identifier (Get brand voice profile)
router.get('/brand-voice/:identifier', flexibleAuth, (req: Request, res: Response) => {
  brandVoiceController.getBrandVoice(req, res);
});

// POST /api/ai/instagram/refine (Rewrite & refine captions with brand voice)
router.post('/refine', flexibleAuth, (req: Request, res: Response) => {
  brandVoiceController.refineCaption(req, res);
});

// POST /api/ai/instagram/evaluate (AI multi-factor quality scoring)
router.post('/evaluate', flexibleAuth, (req: Request, res: Response) => {
  brandVoiceController.evaluateQuality(req, res);
});

// POST /api/ai/instagram/feedback (Submit human 1-5 star rating)
router.post('/feedback', flexibleAuth, (req: Request, res: Response) => {
  brandVoiceController.submitFeedback(req, res);
});

// GET /api/ai/instagram/feedback (Retrieve feedback history)
router.get('/feedback', flexibleAuth, (req: Request, res: Response) => {
  brandVoiceController.getFeedbackLogs(req, res);
});

export default router;
