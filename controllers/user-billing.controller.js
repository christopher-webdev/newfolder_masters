const { Router } = require('express');

const router = Router();

router.get('/', (req, res) => res.json('Responded'));

module.exports = router;
