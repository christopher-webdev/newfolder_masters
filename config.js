const getEnv = require('./config/env');

const PORT = process.env.PORT || 80;
const stripe = require('stripe')(getEnv("STRIPE_SECRET_KEY"));
module.exports = {
    PORT,
    stripe
};
