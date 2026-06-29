import { Router } from 'express';
import * as paymentController from '../controllers/paymentController.js';

const router = Router();

// Razorpay webhook — unauthenticated (verified via HMAC inside the handler)
router.post('/webhook/razorpay', paymentController.razorpayWebhook);

export default router;
