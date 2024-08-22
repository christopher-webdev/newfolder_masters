const express = require('express');
const passport = require('passport');
const path = require('path');
const router = express.Router();
const { User } = require('../models/User');
const { SubscriptionPlan } = require('../models/User');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const { check, validationResult } = require('express-validator');
const { PORT } = require('../config');

// Define the function to update credits
const updateUserCredits = async (user, subscriptionPlan) => {
    try {
        // Find the subscription plan to inherit credits from
        const plan = await SubscriptionPlan.findOne({ plan: subscriptionPlan });

        if (!plan) {
            console.error(`Subscription plan ${subscriptionPlan} not found`);
            throw new Error('Subscription plan not found');
        }

        // Update the user's subscription plan and credits
        const updatedUser = await User.findByIdAndUpdate(
            user._id,
            {
                subscriptionPlan,
                credits: plan.credits, // Inherit credits from the subscription plan
            },
            { new: true }
        );

        if (!updatedUser) {
            console.error(`User with ID ${user._id} not found`);
            throw new Error('User not found');
        }

        return updatedUser;
    } catch (error) {
        console.error('Error updating subscription plan:', error);
        throw new Error('Internal server error');
    }
};

// Email setup
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'cvideoai@gmail.com',
        pass: 'zkgp iiye okuv onbr', // Use application-specific password if 2FA is enabled
    },
    logger: true, // Enable logging
    debug: true, // Enable debug output
    tls: {
        rejectUnauthorized: false,
    },
});

router.post(
    '/',
    [
        check('firstName', 'First name is required').not().isEmpty(),
        check('lastName', 'Last name is required').not().isEmpty(),
        check('email', 'Please include a valid email').isEmail(),
        check(
            'password',
            'Password must be at least 6 characters long and contain at least one uppercase letter, one lowercase letter, one digit, and one symbol.'
        ).matches(
            /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[\W_])[A-Za-z\d\W_]{6,}$/
        ),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { firstName, lastName, email, password, subscriptionPlan } =
            req.body;

        try {
            let user = await User.findOne({ email });

            if (user) {
                return res.status(400).json({ msg: 'User already exists' });
            }

            const verificationToken = crypto.randomBytes(32).toString('hex');
            console.log(verificationToken);
            const verificationLink = `https://gunnyfrisch.shop/auth/verify-email?token=${verificationToken}`;

            user = new User({
                firstName,
                lastName,
                email,
                password,
                isVerified: false,
                verificationToken,
                subscriptionPlan: subscriptionPlan || 'Free', // Set default subscription plan
            });

            await user.save();
            console.log(verificationToken);

            // Apply credits based on the subscription plan
            await updateUserCredits(user, subscriptionPlan || 'Free');

            await transporter.sendMail({
                to: user.email,
                from: 'cvideoai@gmail.com',
                subject: 'Email Verification',
                html: `<p>Please verify your email by clicking the following link: <a href="${verificationLink}">Verify Email</a></p>`,
            });

            res.status(200).json({ msg: 'Verification email sent' });
        } catch (err) {
            console.error(err.message);
            res.status(500).json({ msg: 'Server error' });
        }
    }
);
module.exports = router;
