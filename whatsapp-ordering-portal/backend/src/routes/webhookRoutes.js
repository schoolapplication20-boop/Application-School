import { Router } from 'express';
import * as webhookController from '../controllers/webhookController.js';

const router = Router();

// Meta sends a single webhook URL configured at the App level; both
// verification (GET) and event delivery (POST) are handled identically
// regardless of which sub-path is registered with Meta.
router.get('/messages', webhookController.verifyWebhook);
router.post('/messages', webhookController.receiveWebhook);

router.get('/status', webhookController.verifyWebhook);
router.post('/status', webhookController.receiveWebhook);

export default router;
