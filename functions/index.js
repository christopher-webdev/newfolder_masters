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

    createError(message = 'Internal Error', statusCode = 500) {
        const err = new Error(message);
        err.status = statusCode;
        err.message = 'Something went wrong';
        console.log('🚀 ~ error:', message);

        throw err;
    },
};
