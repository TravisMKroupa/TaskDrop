import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api';

export default function Signup() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: '', password: '', firstName: '', lastName: '', organizationName: '',
    planId: params.get('plan') || 'starter',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result = await api.register(form);
      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
      } else {
        navigate('/login?registered=1');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold text-td-gold mb-6">Create your account</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input type="text" placeholder="Organization name" required value={form.organizationName}
          onChange={(e) => setForm({ ...form, organizationName: e.target.value })}
          className="w-full px-3 py-2 rounded bg-td-surface border border-td-border focus:border-td-accent outline-none" />
        <div className="grid grid-cols-2 gap-3">
          <input type="text" placeholder="First name" required value={form.firstName}
            onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            className="px-3 py-2 rounded bg-td-surface border border-td-border focus:border-td-accent outline-none" />
          <input type="text" placeholder="Last name" required value={form.lastName}
            onChange={(e) => setForm({ ...form, lastName: e.target.value })}
            className="px-3 py-2 rounded bg-td-surface border border-td-border focus:border-td-accent outline-none" />
        </div>
        <input type="email" placeholder="Email" required value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="w-full px-3 py-2 rounded bg-td-surface border border-td-border focus:border-td-accent outline-none" />
        <input type="password" placeholder="Password (8+ chars)" required minLength={8} value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          className="w-full px-3 py-2 rounded bg-td-surface border border-td-border focus:border-td-accent outline-none" />
        <select value={form.planId} onChange={(e) => setForm({ ...form, planId: e.target.value })}
          className="w-full px-3 py-2 rounded bg-td-surface border border-td-border">
          <option value="starter">Starter — 5 seats</option>
          <option value="team">Team — 15 seats</option>
          <option value="business">Business — 50 seats</option>
        </select>
        {error && <p className="text-td-danger text-sm">{error}</p>}
        <button type="submit" disabled={loading}
          className="w-full py-2 rounded bg-td-accent text-white font-medium hover:opacity-90 disabled:opacity-50">
          {loading ? 'Creating...' : 'Sign up & subscribe'}
        </button>
      </form>
      <p className="text-td-muted text-sm mt-4 text-center">
        Already have an account? <Link to="/login" className="text-td-accent">Login</Link>
      </p>
    </div>
  );
}
