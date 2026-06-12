import React, { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { api, getUser } from '../api';

export default function Dashboard() {
  const user = getUser();
  const [org, setOrg] = useState(null);

  useEffect(() => {
    if (user) api.getOrg().then(setOrg).catch(console.error);
  }, [user]);

  if (!user) return <Navigate to="/login" />;

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold text-td-gold mb-2">
        Hello, {user.firstName}
      </h1>
      <p className="text-td-muted mb-8">{user.organizationName} · {user.role}</p>

      {org && (
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <div className="p-4 rounded-xl bg-td-surface border border-td-border">
            <p className="text-td-muted text-sm">Subscription</p>
            <p className="text-lg font-semibold capitalize">{org.subscriptionStatus}</p>
          </div>
          <div className="p-4 rounded-xl bg-td-surface border border-td-border">
            <p className="text-td-muted text-sm">Plan</p>
            <p className="text-lg font-semibold capitalize">{org.planId}</p>
          </div>
          <div className="p-4 rounded-xl bg-td-surface border border-td-border">
            <p className="text-td-muted text-sm">Team members</p>
            <p className="text-lg font-semibold">{org.memberCount} / {org.seatLimit}</p>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <Link to="/download" className="p-6 rounded-xl bg-td-surface border border-td-border hover:border-td-accent">
          <h3 className="font-semibold text-td-gold mb-1">Download desktop app</h3>
          <p className="text-td-muted text-sm">Install TaskDrop on Windows and sign in to sync.</p>
        </Link>
        <Link to="/team" className="p-6 rounded-xl bg-td-surface border border-td-border hover:border-td-accent">
          <h3 className="font-semibold text-td-gold mb-1">Manage team</h3>
          <p className="text-td-muted text-sm">Invite members, set roles, and assign managers.</p>
        </Link>
      </div>
    </div>
  );
}
