const GoogleStrategy = require('passport-google-oauth20').Strategy;
const LocalStrategy = require('passport-local').Strategy;
const mongoose = require('mongoose');
const { User } = require('../models/User');
const { SubscriptionPlan } = require('../models/User');
const Admin = require('../models/Admin');
const bcrypt = require('bcryptjs');
const passport = require('passport');

// Function to manually parse the full name
function parseFullName(fullName) {
    const nameParts = fullName.split(' ');
    return {
        first: nameParts[0] || '',
        last: nameParts.slice(1).join(' ') || '', // Join the rest as last name
    };
}

module.exports = function (passport) {
    passport.use(
        new GoogleStrategy(
            {
                clientID:
                    '250038052754-atan58f9rgc9q6oacvrq11mfdlneecph.apps.googleusercontent.com',
                clientSecret: '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',
                callbackURL: 'http://gunnyfrisch.shop/auth/google/callback',
            },
            async (accessToken, refreshToken, profile, done) => {
                // Extract full name from profile
                const fullName = profile.displayName || '';
                const parsedName = parseFullName(fullName);

                const newUser = {
                    firstName: parsedName.first || '',
                    lastName: parsedName.last || '',
                    email: profile.emails[0].value,
                    profilePicture: profile.photos[0].value,
                };

                try {
                    let user = await User.findOne({ email: newUser.email });

                    if (user) {
                        // User already exists, update isSignedIn to true
                        user.isSignedIn = true;
                        await user.save();
                        done(null, user);
                    } else {
                        // Create a new user with isSignedIn set to true
                        newUser.isSignedIn = true;
                        user = await User.create(newUser);

                        // Apply credits based on the user's subscription plan
                        await applyDefaultCredits(user._id, 'Free'); // Default subscription plan, adjust as necessary

                        done(null, user);
                    }
                } catch (err) {
                    console.error(err);
                    done(err, false);
                }
            }
        )
    );

    passport.use(
        new LocalStrategy(
            { usernameField: 'email' },
            async (email, password, done) => {
                try {
                    const user = await User.findOne({ email });

                    if (!user) {
                        return done(null, false, {
                            message: 'That email is not registered',
                        });
                    }

                    // const match = await bcrypt.compare(
                    //     password,
                    //     user.password
                    // );
                    const match = password === user.password;

                    if (!match) {
                        return done(null, false, {
                            message: 'Password incorrect',
                        });
                    }

                    if (!user.isVerified) {
                        return done(null, false, {
                            message: 'Please verify your email',
                        });
                    }

                    // Update the isSignedIn flag
                    user.isSignedIn = true;
                    await user.save();

                    return done(null, user);
                } catch (err) {
                    console.error(err);
                    return done(err);
                }
            }
        )
    );

    passport.use(
        'admin-local',
        new LocalStrategy(
            { usernameField: 'email' },
            async (email, password, done) => {
                try {
                    const admin = await Admin.findOne({ email });
                    if (!admin) {
                        return done(null, false, {
                            message: 'Invalid credentials',
                        });
                    }

                    const isMatch = await bcrypt.compare(
                        password,
                        admin.password
                    );

                    if (!isMatch) {
                        return done(null, false, {
                            message: 'Invalid credentials',
                        });
                    }

                    return done(null, admin);
                } catch (err) {
                    return done(err);
                }
            }
        )
    );

    passport.serializeUser((entity, done) => {
        done(null, {
            id: entity.id,
            type: entity instanceof Admin ? 'Admin' : 'User',
        });
    });

    passport.deserializeUser(async (obj, done) => {
        try {
            let entity;
            if (obj.type === 'Admin') {
                entity = await Admin.findById(obj.id);
            } else {
                entity = await User.findById(obj.id);
            }
            done(null, entity);
        } catch (err) {
            done(err, null);
        }
    });
};

// Helper function to apply default credits
async function applyDefaultCredits(userId, subscriptionPlan) {
    try {
        const plan = await SubscriptionPlan.findOne({ plan: subscriptionPlan });

        if (!plan) {
            console.error(`Subscription plan ${subscriptionPlan} not found`);
            return;
        }

        // Update the user's subscription plan and credits
        await User.findByIdAndUpdate(
            userId,
            {
                subscriptionPlan,
                credits: plan.credits, // Inherit credits from the subscription plan
            },
            { new: true }
        );
    } catch (error) {
        console.error('Error updating subscription plan:', error);
    }
}
