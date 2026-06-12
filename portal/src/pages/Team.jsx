import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { api, getUser } from '../api';

export default function Team() {
  const user = getUser();
  const [members, setMembers] = useState([]);
  const [invite, setInvite] = useState({ email: '', role: 'Member', managerUserId: '' });
  const [message, setMessage] = useState('');

  const load = () => api.getMembers().then(setMembers).catch(console.error);

  useEffect(() => { if (user) load(); }, [user]);

  if (!user) return <Navigate to="/login" />;

  const handleInvite = async (e) => {
    e.preventDefault();
    try {
      const result = await api.inviteMember(invite);
      setMessage(`Invite sent! Token: ${result.token}`);
      setInvite({ email: '', role: 'Member', managerUserId: '' });
      load();
    } catch (err) {
      setMessage(err.message);
    }
  };

  const handleRoleChange = async (id, role) => {
    await api.updateMember(id, { role });
    load();
  };

  const handleManagerChange = async (id, managerUserId) => {
    await api.updateMember(id, { managerUserId: managerUserId || null });
    load();
  };

  const managers = members.filter((m) => ['Owner', 'Admin', 'Manager'].includes(m.role));

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold text-td-gold mb-6">Team</h1>

      <form onSubmit={handleInvite} className="p-4 rounded-xl bg-td-surface border border-td-border mb-8 space-y-3">
        <h2 className="font-semibold">Invite member</h2>
        <div className="grid md:grid-cols-3 gap-3">
          <input type="email" placeholder="Email" required value={invite.email}
            onChange={(e) => setInvite({ ...invite, email: e.target.value })}
            className="px-3 py-2 rounded bg-td-bg border border-td-border outline-none focus:border-td-accent" />
          <select value={invite.role} onChange={(e) => setInvite({ ...invite, role: e.target.value })}
            className="px-3 py-2 rounded bg-td-bg border border-td-border">
            <option value="Member">Member</option>
            <option value="Manager">Manager</option>
            <option value="Admin">Admin</option>
          </select>
          <select value={invite.managerUserId} onChange={(e) => setInvite({ ...invite, managerUserId: e.target.value })}
            className="px-3 py-2 rounded bg-td-bg border border-td-border">
            <option value="">No manager</option>
            {managers.map((m) => <option key={m.id} value={m.id}>{m.firstName} {m.lastName}</option>)}
          </select>
        </div>
        <button type="submit" className="px-4 py-2 rounded bg-td-accent text-white hover:opacity-90">Send invite</button>
        {message && <p className="text-sm text-td-success">{message}</p>}
      </form>

      <div className="space-y-2">
        {members.map((m) => (
          <div key={m.id} className="flex flex-wrap items-center gap-3 p-3 rounded-lg bg-td-surface border border-td-border">
            <div className="flex-1 min-w-[200px]">
              <p className="font-medium">{m.firstName} {m.lastName}</p>
              <p className="text-td-muted text-sm">{m.email}</p>
            </div>
            <select value={m.role} onChange={(e) => handleRoleChange(m.id, e.target.value)}
              disabled={m.role === 'Owner'}
              className="px-2 py-1 rounded bg-td-bg border border-td-border text-sm">
              <option value="Member">Member</option>
              <option value="Manager">Manager</option>
              <option value="Admin">Admin</option>
              <option value="Owner">Owner</option>
            </select>
            <select value={m.managerUserId || ''} onChange={(e) => handleManagerChange(m.id, e.target.value)}
              className="px-2 py-1 rounded bg-td-bg border border-td-border text-sm">
              <option value="">No manager</option>
              {managers.filter((x) => x.id !== m.id).map((mgr) => (
                <option key={mgr.id} value={mgr.id}>{mgr.firstName} {mgr.lastName}</option>
              ))}
            </select>
            {!m.isActive && <span className="text-td-danger text-xs">Inactive</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
