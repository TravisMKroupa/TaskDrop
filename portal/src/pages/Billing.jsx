import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { api, getUser } from '../api';

export default function Billing() {
  const user = getUser();
  const [org, setOrg] = useState(null);
  const [loading, setLoading] = useState('');

  useEffect(() => {
    if (user) api.getOrg().then(setOrg).catch(console.error);
  }, [user]);

  if (!user) return <Navigate to="/login" />;

  const handleCheckout = async (planId) => {
    setLoading(planId);
    try {
      const { url } = await api.checkout(planId);
      window.location.href = url;
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading('');
    }
  };

  const handlePortal = async () => {
    setLoading('portal');
    try {
      const { url } = await api.portal();
      window.location.href = url;
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading('');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold text-td-gold mb-6">Billing</h1>

      {org && (
        <div className="p-6 rounded-xl bg-td-surface border border-td-border mb-8">
          <p className="text-td-muted text-sm">Current plan</p>
          <p className="text-xl font-bold capitalize mb-1">{org.planId}</p>
          <p className="text-td-muted capitalize">Status: {org.subscriptionStatus}</p>
          <p className="text-td-muted text-sm mt-2">{org.memberCount} of {org.seatLimit} seats used</p>
          <button type="button" onClick={handlePortal} disabled={loading === 'portal'}
            className="mt-4 px-4 py-2 rounded border border-td-border hover:border-td-accent text-sm">
            Manage billing & invoices
          </button>
        </div>
      )}

      <h2 className="font-semibold mb-4">Change plan</h2>
      <div className="grid md:grid-cols-3 gap-4">
        {['starter', 'team', 'business'].map((plan) => (
          <button key={plan} type="button" onClick={() => handleCheckout(plan)}
            disabled={loading === plan}
            className="p-4 rounded-xl bg-td-surface border border-td-border hover:border-td-accent text-left capitalize">
            <p className="font-bold text-td-gold">{plan}</p>
            <p className="text-td-muted text-sm">{loading === plan ? 'Loading...' : 'Select plan'}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
