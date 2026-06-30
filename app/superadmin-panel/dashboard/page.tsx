'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Building2, CreditCard, Users, ChevronRight, Calendar } from 'lucide-react';

interface OverviewTotals {
  total_organizations: number;
  total_cards: number;
  cards_on_date: number;
  total_users: number;
}

interface OrganizationRow {
  id: number;
  name: string;
  created_at: string;
  total_users: number;
  total_cards: number;
  cards_on_date: number;
}

export default function OrganizationsListPage() {
  const [filterDate, setFilterDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [totals, setTotals] = useState<OverviewTotals | null>(null);
  const [organizations, setOrganizations] = useState<OrganizationRow[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/superadmin/overview?date=${filterDate}`);
      const data = await res.json();
      if (res.ok) {
        setTotals(data.totals);
        setOrganizations(data.organizations || []);
      }
    } finally {
      setLoading(false);
    }
  }, [filterDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-400" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Organizations</h2>
          <p className="text-slate-400 text-sm mt-1">Select an organization from the sidebar or below</p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-500" />
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Building2} label="Organizations" value={totals?.total_organizations ?? 0} />
        <StatCard icon={CreditCard} label="Total Cards" value={totals?.total_cards ?? 0} />
        <StatCard icon={CreditCard} label={`Cards on ${filterDate}`} value={totals?.cards_on_date ?? 0} highlight />
        <StatCard icon={Users} label="Total Users" value={totals?.total_users ?? 0} />
      </div>

      <div className="grid gap-3">
        {organizations.map((org) => (
          <Link
            key={org.id}
            href={`/superadmin-panel/dashboard/organizations/${org.id}`}
            className="group flex items-center justify-between p-5 bg-slate-900 border border-slate-800 rounded-xl hover:border-amber-500/40 hover:bg-slate-900/80 transition-all"
          >
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center flex-shrink-0 group-hover:bg-amber-500/10 transition-colors">
                <Building2 className="w-6 h-6 text-slate-400 group-hover:text-amber-400" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-white truncate">{org.name}</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Created {new Date(org.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-6 flex-shrink-0">
              <div className="text-right hidden sm:block">
                <p className="text-lg font-bold text-white">{org.total_cards}</p>
                <p className="text-xs text-slate-500">cards</p>
              </div>
              <div className="text-right hidden sm:block">
                <p className="text-lg font-bold text-amber-400">{org.cards_on_date}</p>
                <p className="text-xs text-slate-500">today</p>
              </div>
              <div className="text-right hidden md:block">
                <p className="text-lg font-bold text-white">{org.total_users}</p>
                <p className="text-xs text-slate-500">users</p>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-amber-400" />
            </div>
          </Link>
        ))}

        {organizations.length === 0 && (
          <div className="text-center py-16 text-slate-500">
            <Building2 className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p>No organizations yet. Use the sidebar to add one.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  highlight = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-xl p-4 border ${
      highlight ? 'bg-amber-500/10 border-amber-500/30' : 'bg-slate-900 border-slate-800'
    }`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${highlight ? 'text-amber-400' : 'text-slate-500'}`} />
        <span className="text-xs text-slate-500">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${highlight ? 'text-amber-400' : 'text-white'}`}>{value}</p>
    </div>
  );
}
