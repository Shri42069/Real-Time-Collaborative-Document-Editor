const router = require('express').Router();
const auth   = require('../middleware/auth');
const User   = require('../models/User');

// GET /api/profile  — own profile
router.get('/', auth, (req, res) => {
  res.json({ user: req.user.toSafeObject() });
});

// GET /api/profile/lookup?email=x  — look up another user by email (for sharing)
router.get('/lookup', auth, async (req, res, next) => {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).json({ error: 'email query param required' });
    const user = await User.findOne({ email: email.toLowerCase().trim() })
      .select('_id username email color');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) { next(err); }
});

module.exports = router;
