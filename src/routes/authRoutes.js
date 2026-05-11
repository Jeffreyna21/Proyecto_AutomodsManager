const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { requireAuth } = require('../middlewares/authMiddleware');

router.get('/login', authController.showLogin);
router.post('/login', authController.login);
router.get('/logout', requireAuth, authController.logout);

router.get('/', requireAuth, (req, res) => {
  res.redirect('/autos');
});

module.exports = router;
