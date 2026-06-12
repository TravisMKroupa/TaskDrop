import React from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { getUser, logout } from '../api';

export default function Layout() {
  const user = getUser();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen">
      <nav className="border-b border-td-border bg-td-surface">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="text-td-gold font-bold text-lg">TaskDrop</Link>
          <div className="flex items-center gap-4 text-sm">
            <Link to="/download" className="text-td-muted hover:text-td-text">Download</Link>
            {user ? (
              <>
                <Link to="/dashboard" className="text-td-muted hover:text-td-text">Dashboard</Link>
                <Link to="/team" className="text-td-muted hover:text-td-text">Team</Link>
                <Link to="/billing" className="text-td-muted hover:text-td-text">Billing</Link>
                <button type="button" onClick={handleLogout} className="text-td-muted hover:text-td-danger">Logout</button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-td-muted hover:text-td-text">Login</Link>
                <Link to="/signup" className="px-3 py-1.5 rounded bg-td-accent text-white hover:opacity-90">Sign Up</Link>
              </>
            )}
          </div>
        </div>
      </nav>
      <Outlet />
    </div>
  );
}
