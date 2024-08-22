const express = require('express');
const passport = require('passport');
const path = require('path');
const router = express.Router();
const { User } = require('../models/User');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const { check, validationResult } = require('express-validator');
const isSignedIn = require('../middleware/auth');
const { PORT } = require('../config');

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

router.post('/', async (req, res) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user)
            return res
                .status(400)
                .json({ msg: 'No user with that email address' });

        const token = crypto.randomBytes(20).toString('hex');
        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
        await user.save();

        const resetURL = `https://gunnyfrisch.shop/reset-password/${token}`;

        await transporter.sendMail({
            to: user.email,
            from: 'cvideoai@gmail.com', // Replace with your email
            subject: 'Password Reset',
            text: `You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\nPlease click on the following link, or paste this into your browser to complete the process:\n\n<a href="${resetURL}">Reset Password</a>\n\nIf you did not request this, please ignore this email.\n`,
        });

        res.json({
            msg: 'Password reset email sent. Please check your email.',
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            msg: 'There was an issue sending the reset email. Please try again later or contact support.',
        });
    }
});
router.post('/reset-password/:token', async (req, res) => {
    const { token } = req.params;
    const { password } = req.body;

    try {
        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() },
        });

        if (!user) {
            return res.status(400).json({
                msg: 'Password reset token is invalid or has expired.',
            });
        }

        user.password = password; // No encryption, as specified
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        res.json({
            msg: 'Password has been reset successfully. You can now log in with your new password.',
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            msg: 'There was an issue resetting the password. Please try again later or contact support.',
        });
    }
});

// Route to serve reset-password.html
router.get('/reset-password/:token', async (req, res) => {
    const { token } = req.params;
    try {
        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() },
        });
        if (!user) {
            return res.status(400).json({
                msg: 'Password reset token is invalid or has expired.',
            });
        }
        // Serve the reset-password.html file
        res.sendFile(path.join(__dirname, '../public/reset-password.html')); // Adjust the path as needed
    } catch (err) {
        console.error(err);
        res.status(500).json({
            msg: 'There was an error processing your request. Please try again later.',
        });
    }
});

// Route to handle password reset form submission
router.post('/reset-password/:token', async (req, res) => {
    const { token } = req.params;
    const { password } = req.body;
    try {
        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() },
        });
        if (!user) {
            return res.status(400).json({
                msg: 'Password reset token is invalid or has expired.',
            });
        }
        // Update user's password
        user.password = password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();
        res.json({ msg: 'Password has been successfully reset.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            msg: 'There was an error resetting your password. Please try again later.',
        });
    }
});

module.exports = router;
