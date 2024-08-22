// middleware/adminAuth.js
module.exports = (req, res, next) => {
    if (req.isAuthenticated() && req.user instanceof Admin) {
        return next();
    }
    res.redirect('/admin/login');
};
