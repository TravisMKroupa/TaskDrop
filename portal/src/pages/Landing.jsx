import React from 'react';
import { Link } from 'react-router-dom';

export default function Landing() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-16">
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-bold text-td-gold mb-4">
          Your tasks, always one click away
        </h1>
        <p className="text-td-muted text-lg max-w-2xl mx-auto mb-8">
          TaskDrop is a Windows desktop sidebar for fast task capture, team collaboration,
          reminders, and notes — synced across your organization.
        </p>
        <div className="flex gap-4 justify-center">
          <Link to="/signup" className="px-6 py-3 rounded-lg bg-td-accent text-white font-medium hover:opacity-90">
            Start Free Trial
          </Link>
          <Link to="/download" className="px-6 py-3 rounded-lg border border-td-border text-td-text hover:border-td-accent">
            Download for Windows
          </Link>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-16">
        {[
          { title: 'Always visible', desc: '340px sidebar docked to your screen edge. Toggle with Ctrl+Shift+T.' },
          { title: 'Team-ready', desc: 'Assign tasks, share manager lists, and collaborate across your company.' },
          { title: 'Smart reminders', desc: 'Windows toast, SMS, and email reminders keep you on track.' },
        ].map((f) => (
          <div key={f.title} className="p-6 rounded-xl bg-td-surface border border-td-border">
            <h3 className="text-td-gold font-semibold mb-2">{f.title}</h3>
            <p className="text-td-muted text-sm">{f.desc}</p>
          </div>
        ))}
      </div>

      <div className="text-center">
        <h2 className="text-2xl font-bold mb-8">Simple pricing</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { id: 'starter', name: 'Starter', seats: 5, price: '$9/mo' },
            { id: 'team', name: 'Team', seats: 15, price: '$29/mo' },
            { id: 'business', name: 'Business', seats: 50, price: '$79/mo' },
          ].map((plan) => (
            <div key={plan.id} className="p-6 rounded-xl bg-td-surface border border-td-border">
              <h3 className="text-xl font-bold text-td-gold">{plan.name}</h3>
              <p className="text-3xl font-bold my-4">{plan.price}</p>
              <p className="text-td-muted text-sm mb-4">Up to {plan.seats} users</p>
              <Link to={`/signup?plan=${plan.id}`} className="block py-2 rounded bg-td-accent text-white hover:opacity-90">
                Get started
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
