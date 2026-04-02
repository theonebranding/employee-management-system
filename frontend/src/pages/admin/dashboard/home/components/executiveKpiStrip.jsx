import { Loader2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';

const ExecutiveKpiStrip = () => {
  const BASE_URL = import.meta.env.VITE_BACKEND_URL;
  const [loading, setLoading] = useState(false);
  const [kpis, setKpis] = useState(null);

  const fetchKpis = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${BASE_URL}/reporting/executive-kpis`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch executive KPIs');
      }
      setKpis(data.kpis || null);
    } catch {
      setKpis(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKpis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl p-4 bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border inline-flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading executive KPIs...
      </div>
    );
  }

  if (!kpis) return null;

  const cards = [
    { label: 'Absenteeism', value: `${kpis.absenteeismRate}%` },
    { label: 'Overtime Cost', value: `INR ${kpis.overtimeCost}` },
    { label: 'Leave Liability', value: `INR ${kpis.leaveLiability}` },
    { label: 'Payroll Variance', value: `INR ${kpis.payrollVariance}` },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      {cards.map(card => (
        <div
          key={card.label}
          className="rounded-xl p-4 bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border"
        >
          <p className="text-xs opacity-70">{card.label}</p>
          <p className="text-xl font-semibold">{card.value}</p>
        </div>
      ))}
    </div>
  );
};

export default ExecutiveKpiStrip;
