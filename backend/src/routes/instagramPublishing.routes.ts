import { Router, Request, Response, NextFunction } from 'express';
import { instagramPublishingController } from '../controllers/InstagramPublishingController';
import { AuthRequest, authenticateToken } from '../middleware/auth.middleware';

const router = Router();

/**
 * Flexible auth middleware to facilitate testing and development
 */
const flexibleAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authenticateToken(req as AuthRequest, res, next);
  }
  return next();
};

// POST /api/instagram/accounts/connect (Connect Instagram Professional Account)
router.post('/accounts/connect', flexibleAuth, (req: Request, res: Response) => {
  instagramPublishingController.connectAccount(req, res);
});

// GET /api/instagram/accounts (List connected accounts)
router.get('/accounts', flexibleAuth, (req: Request, res: Response) => {
  instagramPublishingController.getAccounts(req, res);
});

// POST /api/instagram/publish/image (Publish image post)
router.post('/publish/image', flexibleAuth, (req: Request, res: Response) => {
  instagramPublishingController.publishImage(req, res);
});

// POST /api/instagram/publish/reel (Publish video / Reel)
router.post('/publish/reel', flexibleAuth, (req: Request, res: Response) => {
  instagramPublishingController.publishReel(req, res);
});

// POST /api/instagram/publish/carousel (Publish multi-slide carousel)
router.post('/publish/carousel', flexibleAuth, (req: Request, res: Response) => {
  instagramPublishingController.publishCarousel(req, res);
});

// POST /api/instagram/schedule (Schedule post for future publishing)
router.post('/schedule', flexibleAuth, (req: Request, res: Response) => {
  instagramPublishingController.schedulePost(req, res);
});

// GET /api/instagram/status/:creationId (Check container processing status)
router.get('/status/:creationId', flexibleAuth, (req: Request, res: Response) => {
  instagramPublishingController.getStatus(req, res);
});

// GET /api/instagram/history (Get Instagram publishing logs)
router.get('/history', flexibleAuth, (req: Request, res: Response) => {
  instagramPublishingController.getHistory(req, res);
});

export default router;
