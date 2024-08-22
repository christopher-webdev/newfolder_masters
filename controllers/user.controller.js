const { Router } = require('express');
const { User } = require('../models/User');
const { validationResult, check } = require('express-validator');
const bcrypt = require('bcryptjs');
const { getUserById } = require('../functions');

const router = Router();

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

module.exports = router;
