const { Router } = require('express');
const paymentWebHooksRouter = require('../routes/payment-webhook');
const {
    createPaypalProductPlan,
} = require('../functions/helpers');
const { getUserById } = require('../functions');
const Package = require('../models/Package');
const Currency = require('../enums/Currency');
const { stripe } = require('../config');
const getEnv = require('../config/env');
const { User, } = require('../models/User');
const PaymentProvider = require('../models/PaymentProvider');

const router = Router();

router.get('/', (req, res) => res.json('Everythimg works fine ✅ '));

router
    .route('/pay-with')
    .post(async (req, res) => {
        switch (req.query.provide) {
            case 'stripe.create-payment-subscription':
                {
                    let { packageId } = req.body;
                    const {firstName, lastName, email} = await getUserById(req.user._id);
                    // create stripe customer detail
                    const customer = await stripe.customers.create({
                        email,
                    });

                    let { stripePriceId } = await Package.findById(packageId);

                    const subscription = await stripe.subscriptions.create({
                        customer: customer.id,
                        items: [
                            {
                                price: stripePriceId,
                            },
                        ],
                        payment_behavior: 'default_incomplete',
                        expand: ['latest_invoice.payment_intent'],
                    });

                    
                    await PaymentProvider.create({
                        name: 'stripe',
                        config: { 
                            customerId: customer.id,
                            subscriptionId: subscription.id,
                            paymantIntentId: subscription.latest_invoice.payment_intent.id,
                        },
                        periodEnd: customer.period_end,
                        package: packageId,
                    });


                    // await user.updateOne({
                    //     $set: {
                    //         'subscriptionPlanDetail.stripeSubscriptionId':
                    //             subscription.id,
                    //     },
                    // });
           

                    res.status(200).json({
                        success: true,
                        data: {
                            redirectUrl: getEnv('STRIPE_REDIRECT_URL'),
                            customer: {
                                fullName: `${firstName} ${lastName}`,
                            },
                            subscriptionId: subscription.id,
                            clientSecret:
                                subscription.latest_invoice.payment_intent
                                    .client_secret,
                        },
                    });
                }
                break;
            case 'stripe.confirm-subscription':
                {
                    try {
                        const { paymentIntentId } = req.body;
                        const { _id: userId } = req.user;

                        // const user = ;

                        const intent = await PaymentProvider.findOne({name: 'stripe', "config.paymantIntentId":paymentIntentId }).populate("package")

                        // Subscription was successful

                        await User.findByIdAndUpdate(userId, {
                            activePackage: intent.package.id,
                            paymantProvider: intent.id,
                            subscriptionPlan: intent.package.name,
                            activePackageExpiresAt: intent.periodEnd
                        });

                        res.status(200).json({
                            success: true,
                            data: subscriptionId,
                        });
                    } catch (error) {
                        console.log(
                            '🚀 ~ subscription paypal.success ~ error:',
                            error
                        );
                        res.status(500).json({
                            success: false,
                            errrors: error.message,
                        });
                    }
                }
                break;
            case 'klarna.create-payment-session':
                {
                    try {
                        res.status(200).json({
                            success: true,
                            data: {},
                        });
                    } catch (error) {
                        console.log('🚀 ~ error:', error);
                        res.status(500).json({
                            success: false,
                            errors: error.message,
                        });
                    }
                }
                break;
            case 'paypal.create-plan':
                {
                    const { packageId } = req.body;
                    try {
                        const productPlan = await createPaypalProductPlan(packageId);


                        res.status(200).json({
                            success: true,
                            data: {
                                planId: productPlan.id,
                                productId: productPlan.product_id
                            },
                        });
                    } catch (error) {
                        return res
                            .status(400)
                            .json({ success: false, errors: error.message });
                    }
                }
                break;
            case 'paypal.create-subscription':
                {
                    const {  packageId, productId, planId, subscriptionId} = req.body;

                    try {

                        await PaymentProvider.create({
                            name: 'paypal',
                            package: packageId,
                            config: {
                                planId,
                                productId,
                                subscriptionId
                            },
                            periodEnd: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString()
                        })

                   

                        res.status(200).json({
                            success: true,
                            data: {
                                subscriptionId
                            },
                        });
                    } catch (error) {
                        return res
                            .status(400)
                            .json({ success: false, errors: error.message });
                    }
                }
                break;
            case 'paypal.confirm-subscription':
                {
                    try {
                        const { subscriptionId, packageId } = req.body;
                        const { _id: userId } = req.user;

                        // Subscription was successful

                        const intent = await PaymentProvider.findOne({name: 'paypal', "config.subscriptionId":subscriptionId }).populate("package")

                        // Subscription was successful

                        await User.findByIdAndUpdate(userId, {
                            activePackage: intent.package.id,
                            paymantProvider: intent.id,
                            subscriptionPlan: intent.package.name,
                            activePackageExpiresAt: intent.periodEnd
                        });

                        // upgrade user subscription level
                        res.status(200).json({
                            success: true,
                            data: subscriptionId,
                        });
                    } catch (error) {
                        console.log(
                            '🚀 ~ subscription paypal.success ~ error:',
                            error
                        );
                        res.status(500).json({
                            success: false,
                            errrors: error.message,
                        });
                    }
                }
                break;
        }
    })
    .get(async (req, res) => {
        switch (req.query.provide) {
            case 'stripe.manage-subscriptions':
                {
                    const user = await User.findById(req.user._id).populate(
                        'activePackage'
                    );
                   
                    res.status(200).json({
                        success: true,
                        data: {
                            user:{
                                fullName: `${user.firstName} ${user.lastName}`,
                                profilePicture: user.profilePicture
                            },
                            name: user.activePackage.name,
                            subscriptionId: '',
                            activePackageExpiresAt: user.activePackageExpiresAt,
                        },
                    });
                    
                }
                break;
            case 'stripe.cancel-subscription':
                {
                    try {
                        const deletedSubscription =
                            await stripe.subscriptions.del(
                                req.body.subscriptionId
                            );

                        res.status(200).json({
                            success: true,
                            data: deletedSubscription,
                        });
                    } catch (error) {
                        return res
                            .status(400)
                            .json({ success: false, errors: error.message });
                    }
                }
                break;
        }
    });

router.get('/callbacks/paypal.success', async (req, res) => {
    //subscription_id=I-MFTMXW2DEPPL&ba_token=BA-5AS35050S54231744&token=50X015724M307303V
    res.send('Success');
});

router.get('/callbacks/paypal.cancel', (req, res) => {
    res.send('Canceled');
});

router.use('/webhooks', paymentWebHooksRouter);

module.exports = router;
