import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Auth.css';

export default function Register() {
  const { register } = useAuth();
  const navigate     = useNavigate();
  const [form,    setForm]    = useState({ username: '', email: '', password: '', confirm: '' });
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const onChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) return setError('Passwords do not match');
    if (form.password.length < 6)       return setError('Password must be at least 6 characters');
    setLoading(true);
    try {
      await register(form.username, form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">✦ CollabEditor</div>
        <h1 className="auth-heading">Create account</h1>
        <p className="auth-sub">Start collaborating in seconds</p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={onSubmit} className="auth-form">
          <label className="auth-label">Username</label>
          <input
            className="auth-input"
            type="text" name="username" required
            minLength={3} maxLength={30}
            value={form.username} onChange={onChange}
            placeholder="yourname"
          />

          <label className="auth-label">Email</label>
          <input
            className="auth-input"
            type="email" name="email" required
            value={form.email} onChange={onChange}
            placeholder="you@example.com"
          />

          <label className="auth-label">Password</label>
          <input
            className="auth-input"
            type="password" name="password" required
            value={form.password} onChange={onChange}
            placeholder="min. 6 characters"
          />

          <label className="auth-label">Confirm password</label>
          <input
            className="auth-input"
            type="password" name="confirm" required
            value={form.confirm} onChange={onChange}
            placeholder="••••••••"
          />

          <button className="auth-btn" type="submit" disabled={loading}>
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
