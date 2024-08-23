const express = require("express");
const { stripe } = require("../config");
const getEnv = require("../config/env");

const router = express.Router()


router.post(
    '/stripe.webhooks',
    express.raw({ type: 'application/json' }),
    async (req, res) => {
      // Retrieve the event by verifying the signature using the raw body and secret.
      let event;
  
      try {
        event = stripe.webhooks.constructEvent(
          req.body,
          req.header('Stripe-Signature'),
          getEnv("STRIPE_WEBHOOK_SECRET")
        );
      } catch (err) {
        console.log(err);
        console.log(`⚠️  Webhook signature verification failed.`);
        console.log(
          `⚠️  Check the env file and enter the correct webhook secret.`
        );
        return res.sendStatus(400);
      }
  
      // Extract the object from the event.
      const dataObject = event.data.object;
  
      // Handle the event
      // Review important events for Billing webhooks
      // https://stripe.com/docs/billing/webhooks
      // Remove comment to see the various objects sent for this sample
      switch (event.type) {
        case 'invoice.payment_succeeded':
          if(dataObject['billing_reason'] == 'subscription_create') {
            // The subscription automatically activates after successful payment
            // Set the payment method used to pay the first invoice
            // as the default payment method for that subscription
            const subscription_id = dataObject['subscription']
            const payment_intent_id = dataObject['payment_intent']
  
            // Retrieve the payment intent used to pay the subscription
            const payment_intent = await stripe.paymentIntents.retrieve(payment_intent_id);
  
            try {
              const subscription = await stripe.subscriptions.update(
                subscription_id,
                {
                  default_payment_method: payment_intent.payment_method,
                },
              );
  
              console.log("Default payment method set for subscription:" + payment_intent.payment_method);
            } catch (err) {
              console.log(err);
              console.log(`⚠️  Failed to update the default payment method for subscription: ${subscription_id}`);
            }
          };
  
          break;
        case 'invoice.payment_failed':
          // If the payment fails or the customer does not have a valid payment method,
          //  an invoice.payment_failed event is sent, the subscription becomes past_due.
          // Use this webhook to notify your user that their payment has
          // failed and to retrieve new card details.
          break;
        case 'invoice.finalized':
          // If you want to manually send out invoices to your customers
          // or store them locally to reference to avoid hitting Stripe rate limits.
          break;
        case 'customer.subscription.deleted':
          if (event.request != null) {
            // handle a subscription cancelled by your request
            // from above.
          } else {
            // handle subscription cancelled automatically based
            // upon your subscription settings.
          }
          break;
        case 'customer.subscription.trial_will_end':
          // Send notification to your user that the trial will end
          break;
        default:
        // Unexpected event type
      }
      res.sendStatus(200);
    }
  );

  // Webhook endpoint
router.post('/paypal.webhooks', express.raw({type: 'application/json'}),  (req, res) => {
  const body = req.body;

  // Validate the webhook event
  const transmissionId = req.headers['paypal-transmission-id'];
  const transmissionTime = req.headers['paypal-transmission-time'];
  const certUrl = req.headers['paypal-cert-url'];
  const authAlgo = req.headers['paypal-auth-algo'];
  const transmissionSig = req.headers['paypal-transmission-sig'];

  const webhookId = PAYPAL_WEBHOOK_ID;
  const expectedSig = transmissionId + "|" + transmissionTime + "|" + webhookId + "|" + JSON.stringify(body);
  
  const hash = crypto.createHmac('sha256', PAYPAL_CLIENT_SECRET).update(expectedSig).digest('base64');

  if (hash === transmissionSig) {
    console.log('Webhook event is valid');

    // Handle the webhook event
    switch (body.event_type) {
      case 'BILLING.SUBSCRIPTION.CREATED':
        console.log('Subscription created:', body);
        break;
      case 'BILLING.SUBSCRIPTION.ACTIVATED':
        console.log('Subscription activated:', body);
        break;
      case 'BILLING.SUBSCRIPTION.APPROVED':
        console.log('Subscription approved:', body);
        break;
      case 'BILLING.SUBSCRIPTION.CANCELLED':
        console.log('Subscription cancelled:', body);
        break;
      case 'BILLING.SUBSCRIPTION.EXPIRED':
        console.log('Subscription expired:', body);
        break;
      default:
        console.log('Unhandled event type:', body.event_type);
    }

    res.status(200).send('OK');
  } else {
    console.error('Webhook event validation failed');
    res.status(400).send('Invalid webhook event');
  }
});


module.exports = router