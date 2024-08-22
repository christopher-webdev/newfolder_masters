// middleware/auth.js
function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated() && req.user.isSignedIn) {
        return next();
    }
    res.redirect('/login'); // Redirect to login page if not authenticated or signed in
}
module.exports = ensureAuthenticated;

// Middleware to check token validity
const verifyTokenMiddleware = async (req, res, next) => {
    const { token } = req.query;
    if (!token) {
        return res.status(403).json({ msg: 'No token provided' });
    }

    try {
        const user = await User.findOne({
            oneTimeToken: token,
            oneTimeTokenExpires: { $gt: Date.now() },
        });

        if (!user) {
            return res.status(403).json({ msg: 'Invalid or expired token' });
        }

        // Attach user to request object if needed
        req.user = user;
        // Clear the one-time token for security reasons
        user.oneTimeToken = undefined;
        user.oneTimeTokenExpires = undefined;
        await user.save();

        // Proceed to the next middleware or route handler
        next();
    } catch (err) {
        res.status(500).json({ msg: 'Server error' });
    }
};
module.exports = verifyTokenMiddleware;

module.exports.ensureAdminAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/admin-login.html');
};

const updateCreditsMiddleware = async (req, res, next) => {
    const { subscriptionPlan } = req.body;
    const { userId } = req.params;

    try {
        // Find the subscription plan to inherit credits from
        const plan = await SubscriptionPlan.findOne({ plan: subscriptionPlan });
        if (!plan) {
            return res
                .status(404)
                .json({ message: 'Subscription plan not found' });
        }

        // Update the user's credits
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            {
                subscriptionPlan,
                credits: plan.credits, // Inherit credits from the subscription plan
            },
            { new: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Attach the updated user to the request object for further use
        req.updatedUser = updatedUser;

        // Proceed to the next middleware or route handler
        next();
    } catch (error) {
        console.error('Error updating credits:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

module.exports = updateCreditsMiddleware;
