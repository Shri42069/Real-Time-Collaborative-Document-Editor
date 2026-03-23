const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String, required: true, unique: true,
    trim: true, minlength: 3, maxlength: 30,
  },
  email: {
    type: String, required: true, unique: true,
    lowercase: true, trim: true,
  },
  password: {
    type: String, required: true, minlength: 6,
  },
  refreshTokenHash: { type: String, default: null },
  color: {
    type: String,
    default: () => '#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0'),
  },
}, { timestamps: true });

// Hash password before save
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

userSchema.methods.toSafeObject = function () {
  const { _id, username, email, color, createdAt } = this;
  return { _id, username, email, color, createdAt };
};

module.exports = mongoose.model('User', userSchema);
