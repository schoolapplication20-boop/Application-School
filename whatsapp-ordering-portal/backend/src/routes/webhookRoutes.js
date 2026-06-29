import { Router } from 'express';
import * as webhookController from '../controllers/webhookController.js';

const router = Router();

router.get('/messages', webhookController.verifyWebhook);
router.post('/messages', webhookController.verifyHmac, webhookController.receiveWebhook);

router.get('/status', webhookController.verifyWebhook);
router.post('/status', webhookController.verifyHmac, webhookController.receiveWebhook);

export default router;
