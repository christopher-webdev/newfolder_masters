const { User } = require('../models/User');

module.exports = {
    async getUserById(id, options = { returnPassword: false }) {
        try {
            let ignores = '-resetPasswordToken -resetPasswordExpires';
            if (!options.returnPassword) ignores += ' -password';
            const user = await User.findById(id).select(ignores);

            if (!user) {
                throw new Error('User not found');
            }
            return user;
        } catch (error) {
            this.createError('Unable to fetch user');
        }
    },
    async getPackages() {
        const subscriptionPackages = [
            {
                id: 1,
                isPopular: false,
                name: 'ProX',
                amount: 40,
                per: 'month',
                benefits: [
                    { isAvailable: true, name: 'Lorem ipsum' },
                    { isAvailable: true, name: 'Lorem ipsum' },
                    { isAvailable: false, name: 'Lorem ipsum' },
                ],
            },
            {
                id: 2,
                isPopular: true,
                name: 'ProX',
                amount: 90,
                per: 'month',
                benefits: [{ isAvailable: true, name: 'Lorem ipsum' }],
            },
            {
                id: 3,
                isPopular: false,
                name: 'ProX',
                amount: 70,
                per: 'month',
                benefits: [{ isAvailable: true, name: 'Lorem ipsum' }],
            },
        ];
        return subscriptionPackages;
    },

    createError(message = 'Internal Error', statusCode = 500) {
        const err = new Error(message);
        err.status = statusCode;
        err.message = 'Something went wrong';
        console.log('🚀 ~ error:', message);

        throw err;
    },
};
