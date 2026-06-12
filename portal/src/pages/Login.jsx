import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api';

export default function Login() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.login(form);
      const redirect = params.get('redirect');
      navigate(redirect || '/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold text-td-gold mb-6">Welcome back</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input type="email" placeholder="Email" required value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="w-full px-3 py-2 rounded bg-td-surface border border-td-border focus:border-td-accent outline-none" />
        <input type="password" placeholder="Password" required value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          className="w-full px-3 py-2 rounded bg-td-surface border border-td-border focus:border-td-accent outline-none" />
        {error && <p className="text-td-danger text-sm">{error}</p>}
        <button type="submit" disabled={loading}
          className="w-full py-2 rounded bg-td-accent text-white font-medium hover:opacity-90 disabled:opacity-50">
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
      <p className="text-td-muted text-sm mt-4 text-center">
        New here? <Link to="/signup" className="text-td-accent">Create account</Link>
      </p>
    </div>
  );
}
