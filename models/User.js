// models/User.js
const mongoose = require('mongoose');
const { allowedPackages, Package: EPackage } = require('../enums/Package');
const Package = require('./Package');
// Credit Schema
const CreditSchema = new mongoose.Schema({
    feature: {
        type: String,
        enum: [
            'videoEditor',
            'videoRestyle',
            'videoVoicing',
            'lipSync',
            'faceSwap',
            '3dVideoModeling',
            'myAvatar',
        ],
        required: true,
    },
    credits: {
        type: Number,
        default: 0,
    },
});

// Subscription Plan Schema
const SubscriptionPlanSchema = new mongoose.Schema({
    plan: {
        type: String,
        enum: allowedPackages.map(pkg=>pkg.name),
        // enum: [
        //     'Free',
        //     'BasicMonthly',
        //     'PremiumMonthly',
        //     'BasicYearly',
        //     'PremiumYearly',
        // ],
        required: true,
    },
    credits: [CreditSchema],
});

// User Schema
const UserSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true,
    },
    lastName: {
        type: String,
        required: false,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: false,
    },
    profilePicture: {
        type: String,
    },
    isVerified: {
        type: Boolean,
        default: false,
    },
    resetPasswordToken: {
        type: String,
    },
    resetPasswordExpires: {
        type: Date,
    },
    isSignedIn: {
        type: Boolean,
        default: false,
    },
    subscriptionPlan: {
        type: String,
        enum: allowedPackages.map(pkg=>pkg.name),
        default: EPackage.Free.name,
    }, 
    activePackage: {type: mongoose.Types.ObjectId, ref: "Package"},
    activePackageExpiresAt: {type: Date, default: new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000).toISOString()},
    paymantProvider: {type: mongoose.Types.ObjectId, ref: "PaymentProvider"},

    verificationToken: {
        type: String,
    },
    googleId: {
        type: String,
    },
    phoneNumber: {
        type: String,
    },
    address: {
        type: String,
    },
    credits: [CreditSchema],
});

// Create models from schemas
const User = mongoose.model('User', UserSchema);
const SubscriptionPlan = mongoose.model(
    'SubscriptionPlan',
    SubscriptionPlanSchema
);

// Export models as an object
module.exports = {
    User,
    SubscriptionPlan,
    CreditSchema
};
