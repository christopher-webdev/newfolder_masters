const mongoose = require('mongoose');

const PaymentProvider = new mongoose.Schema({
    name: { type: String, enum: ['stripe', 'paypal', 'app'], default: 'app' },
    config: {type: Object, default: {}},
    package: {type: mongoose.Types.ObjectId, ref: "Package"},
    periodEnd: {type: Date}
},
{timestamps: true});

module.exports = mongoose.model('PaymentProvider', PaymentProvider);
