const router = require('express').Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/authController');
const auth = require('../middleware/auth');

router.post('/register',
  [
    body('username').trim().isLength({ min: 3, max: 30 }),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
  ],
  ctrl.register
);

router.post('/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  ctrl.login
);

router.post('/refresh', ctrl.refresh);
router.post('/logout',  auth, ctrl.logout);

module.exports = router;
