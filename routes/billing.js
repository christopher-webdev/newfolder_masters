const { Router } = require("express");
const path = require("path")

const router = Router()

router.get('/payment-methods.html', ensureAuthenticated, (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.sendFile(path.join(__dirname, 'public', 'payment-methods.html'));
});