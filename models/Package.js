const mongoose = require('mongoose');
const { allowedPackages, allowedIntervals } = require('../enums/Package');



const package = new mongoose.Schema(
    {
        creditStore:  {type: mongoose.Types.ObjectId, ref: "SubscriptionPlan"},
        isPopular: { type: Boolean, default: false },
        name: { type: String, enum: allowedPackages.map(pkg=>pkg.name) },
        amount: {type: Number, default: 0},
        stripePriceId: {type: String, default: ""},
        paypalProductId: {type: String, default: ""},
        interval: { type: String, enum: allowedIntervals },
        benefits: [{ isAvailable: Boolean, name: String }],
    },
    { timestamps: true } // Prevents automatic creation of _id field for subdocuments
);

module.exports = mongoose.model('Package', package);
