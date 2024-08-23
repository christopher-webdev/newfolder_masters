const { Router } = require('express');
const { User } = require('../models/User');
const { validationResult, check } = require('express-validator');
const bcrypt = require('bcryptjs');
const { getUserById } = require('../functions');
const PaymentProvider = require('../models/PaymentProvider');
const { stripe } = require('../config');
const {
    createPaypalProductPlan,
} = require('../functions/helpers');
const router = Router();
const paymentWebHooksRouter = require('../routes/payment-webhook');
const getEnv = require('../config/env');


router
    .get('/', async (req, res) => {
        try {
            const user = await getUserById(req.user._id);

            res.json(user);
        } catch (error) {
            res.status(500).json({
                error: 'Error fetching user information: ' + error.message,
            });
        }
    })
    .put('/profile', async (req, res) => {
        try {
            const user = await getUserById(req.user._id);

            if (!user) {
                res.status(400).json({
                    success: false,
                    message: 'User could not be found',
                });
                return;
            }

            const { phoneNumber, address } = req.body;

            await user.updateOne(
                { phoneNumber, address },
                { upsert: true, new: true }
            );

            res.status(200).json({
                success: true,
                data: user.toObject(),
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'Error updating user information: ' + error.message,
            });
        }
    })
    .put(
        '/password',
        [
            check('currentPassword', 'Current Password is required')
                .isString()
                .notEmpty(),
            check(
                'newPassword',
                'Password must be at least 6 characters long and contain at least one uppercase letter, one lowercase letter, and one digit'
            ).matches(/^(?=.*[A-Z])(?=.*\d)(?=.*[a-zA-Z])[A-Za-z\d]{6,}$/),
        ],
        async (req, res) => {
            try {
                const errors = validationResult(req);
                if (!errors.isEmpty()) {
                    return res.status(400).json({
                        success: false,
                        errors: errors
                            .array()
                            .map((e) => e.msg)
                            .join('\n'),
                    });
                }

                const user = await getUserById(req.user._id, {
                    returnPassword: true,
                });

                if (!user) {
                    res.status(400).json({
                        success: false,
                        errors: 'User could not be found',
                    });
                    return;
                }

                const { currentPassword, newPassword } = req.body;

                if (user.password) {
                    // const match = await bcrypt.compare(
                    //     currentPassword,
                    //     user.password
                    // );
                    const match = currentPassword === user.password;

                    if (!match) {
                        res.status(400).json({
                            success: false,
                            errors: 'Current Pasword and new password do not match',
                        });
                        return;
                    }
                }
                // const password = await bcrypt.hash(newPassword, 10);

                await user.updateOne(
                    { password: newPassword },
                    { upsert: true }
                );

                res.status(200).json({
                    success: true,
                    data: user,
                });
            } catch (error) {
                res.status(500).json({
                    success: false,
                    errors: 'Error updating user information: ' + error.message,
                });
            }
        }
    );


    
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
                        data: "subscriptionId",
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
