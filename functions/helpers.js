const Currency = require('../enums/Currency');
const Package = require('../models/Package');
const { stripe } = require('../config');
const { Request } = require('./request');
const getEnv = require('../config/env');

// Used accross integration. Should only be changed here
const CURRENCY = Currency.USD;

async function createPaymentIntent({ amount, currency = CURRENCY }) {
    // const paymentIntent = await stripe.paymentIntents.create({
    //     amount, // Amount in cents
    //     currency: currency,
    //     // 'google_pay', 'apple_pay'
    //     payment_method_types: ['card', 'klarna'],
    //     // setup_future_usage: 'off_session',
    // });
    // console.log("🚀 ~ createPaymentIntent ~ paymentIntent:", paymentIntent)
    // return paymentIntent
}

async function createStripeCustomer(email, paymentMethodId) {
    const customer = await stripe.customers.create({
        email,
    });

    return customer.id;
}

async function createStripeSubscription(customerId, packagePriceId) {
    const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [
            {
                price: packagePriceId,
            },
        ],
        expand: ['latest_invoice.payment_intent'],
    });
    return subscription.id;
}
// async function confirmStripePayment({
//     amount,
//     paymentIntentId = null,
//     paymentMethodId = null,
// }) {
//     let paymentIntent;
//     if (paymentIntentId) {
//         paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId);
//     } else if (paymentMethodId) {
//         paymentIntent = await stripe.paymentIntents.create({
//             payment_method: paymentMethodId,
//             amount, // Amount in the smallest currency unit
//             currency: CURRENCY,
//             confirmation_method: 'manual',
//             confirm: true,
//         });
//     }
//     return paymentIntent;
// }

function getStripeSecretKey() {
    return getEnv('STRIPE_SECRET_KEY');
}

async function createStripeProductAndPrices({ name, amount, interval }) {
    const product = await stripe.products.create({
        name,
    });

    const price = await stripe.prices.create({
        unit_amount: amount,
        currency: CURRENCY,
        recurring: { interval },
        product: product.id,
    });
    return price.id;
}

async function createPackage({ name, amount, interval, isPopular }) {
    const package = await Package.create({ name, amount, interval, isPopular });
    return package.id;
}

async function createPackageBenefits(packageId, benefits) {
    const bn = await Package.findByIdAndUpdate(packageId, {
        $set: { benefits },
    });
    return bn.id;
}

async function getAvailablePackages({ exclude }) {
    const pks = await Package.find({}, exclude);
    return pks;
}

async function createPaypalProducts({ name, amount, interval }) {
    try {
        const paylaod = {
            name,
            type: 'DIGITAL',
            category: 'SOFTWARE',
        };
        const response = await Request('/catalogs/products', 'POST', paylaod);
        return response.id;
    } catch (error) {
        console.log('🚀 ~ createPaypalProducts ~ error:', error);
    }
}

async function createPaypalProductPlan(packageId) {
    try {
        const package = await Package.findById(packageId);
        const paylaod = {
            name: package.name,
            product_id: package.paypalProductId,
            billing_cycles: [
                {
                    frequency: {
                        interval_unit: package.interval.toUpperCase(),
                        interval_count: 1,
                    },
                    tenure_type: 'REGULAR',
                    sequence: 1,
                    pricing_scheme: {
                        fixed_price: {
                            value: package.amount,
                            currency_code: 'USD',
                        },
                    },
                },
            ],
            payment_preferences: {
                auto_bill_outstanding: true,
                setup_fee: {
                    value: 0,
                    currency_code: 'USD',
                },
                setup_fee_failure_action: 'CONTINUE',
                payment_failure_threshold: 3,
            },
        };
        const response = await Request('/billing/plans', 'POST', paylaod);
        return response;
    } catch (error) {
        console.log('🚀 ~ createPaypalProducts ~ error:', error);
    }
}

async function createPaypalProductSubscription(user, planId) {
    try {
        const paylaod = {
            plan_id: planId,
            start_time: new Date(Date.now() + 10000).toISOString(),
            shipping_amount: {
                currency_code: 'USD',
                value: 0,
            },
            subscriber: {
                name: {
                    given_name: user.firstName,
                    surname: user.lastName,
                },
                email_address: user.email,
            },
            application_context: {
                brand_name: getEnv('APP_NAME'),
                locale: 'en-US',
                shipping_preference: 'NO_SHIPPING',
                user_action: 'SUBSCRIBE_NOW',
                payment_method: {
                    payer_selected: 'PAYPAL',
                    payee_preferred: 'IMMEDIATE_PAYMENT_REQUIRED',
                },
                return_url: `${getEnv(
                    'APP_URL'
                )}/api/billings/callbacks/paypal.success`,
                cancel_url: `${getEnv(
                    'APP_URL'
                )}/api/billings/callbacks/paypal.cancel`,
            },
        };
        const response = await Request(
            '/billing/subscriptions',
            'POST',
            paylaod
        );

        return response;
    } catch (error) {
        console.log('🚀 ~ createPaypalProductSubscription ~ error:', error);
    }
}

async function getSubscriptionDetails(subscriptionId) {
    console.log(
        'getSubscriptionDetails URL',
        `/billing/subscriptions/${subscriptionId}`
    );
    let subscription;
    let times = 3;
    try {
        subscription = await Request(
            `/billing/subscriptions/${subscriptionId}`
        );
    } catch (error) {
        if (times < 1) throw error;
        --times;
        subscription = await Request(
            `/billing/subscriptions/${subscriptionId}`
        );
        console.log(
            '🚀 ~ getSubscriptionDetails ~ get subscription details errored. retyring',
            subscription
        );
    }
    console.log('Tried ', times, ' times');

    return subscription;
}

async function activateSubscription(subscriptionId, reason) {
    const paylaod = { reason };
    let activateResponse;

    let times = 3;
    try {
        activateResponse = await Request(
            `/billing/subscriptions/${subscriptionId}/activate`,
            'POST',
            paylaod
        );
    } catch (error) {
        if (times < 1) throw error;
        --times;
        activateResponse = await Request(
            `/billing/subscriptions/${subscriptionId}/activate`,
            'POST',
            paylaod
        );
        console.log(
            '🚀 ~ activateSubscription ~ activate subscription details errored. retyring',
        );
    }
    console.log('Tried ', times, ' times');

    return activateResponse;
}

async function createWebhooks(payload) {
    try {
        let webhookResponse = await Request(
            `/notifications/webhooks`,
            'POST',
            payload
        );
        return webhookResponse;
    } catch (error) {
        console.log('🚀 ~ createPaypalWebhook ~ . retyring', error);
        throw error;
    }
}

module.exports = {
    createPaymentIntent,
    // confirmStripePayment,
    getStripeSecretKey,
    createStripeProductAndPrices,
    createPackage,
    createPackageBenefits,
    getAvailablePackages,
    createStripeCustomer,
    createStripeSubscription,
    createPaypalProducts,
    createPaypalProductPlan,
    createPaypalProductSubscription,
    getSubscriptionDetails,
    activateSubscription,
    createWebhooks,
};

// async function downloadAndCachePaypalCertUrl(url, cacheKey) {
//     if(!cacheKey) {
//       cacheKey = url.replace(/\W+/g, '-')
//     }
//     const filePath = path.resolve(process.cwd(), cacheKey);

//     // Check if cached file exists
//     const cachedData = await fs.readFile(filePath, 'utf-8').catch(() => null);
//     if (cachedData) {
//       return cachedData;
//     }

//     // Download the file if not cached
//     const response = await fetch(url);
//     const data = await response.text()
//     await fs.writeFile(filePath, data);

//     return data;
//   }

//   async function verifyPaypalCertSignature(event, headers) {
//     const transmissionId = headers['paypal-transmission-id']
//     const timeStamp = headers['paypal-transmission-time']
//     const crc = parseInt("0x" + crc32(event).toString('hex')); // hex crc32 of raw event data, parsed to decimal form

//     const message = `${transmissionId}|${timeStamp}|${WEBHOOK_ID}|${crc}`
//     console.log(`Original signed message ${message}`);

//     const certPem = await downloadAndCache(headers['paypal-cert-url']);

//     // Create buffer from base64-encoded signature
//     const signatureBuffer = Buffer.from(headers['paypal-transmission-sig'], 'base64');

//     // Create a verification object
//     const verifier = crypto.createVerify('SHA256');

//     // Add the original message to the verifier
//     verifier.update(message);

//     return verifier.verify(certPem, signatureBuffer);
//   }
