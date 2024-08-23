const { allowedPackages } = require('../../enums/Package');
const { createStripeProductAndPrices } = require('../../functions/helpers');
const Package = require('../Package');

async function seed() {
    try {
        console.log('Start seeder for packages');
        let x = allowedPackages.length;
        allowedPackages.forEach(async ({ name, amount, interval }) => {
            const priceId = await createStripeProductAndPrices({
                name,
                amount,
                interval,
            });

            await Package.create({
                amount,
                name,
                per: interval,
                stripePriceId: priceId,
            });
            x--;
        });

        if (x == 0) {
            console.log('Seeder completed sucessfuly');
        }
    } catch (error) {
        console.log('🚀 ~ seed ~ error:', error);
    }
}

seed().catch(console.error);
