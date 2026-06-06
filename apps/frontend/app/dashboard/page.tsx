import DashboardLayout from '@/components/layout/DashboardLayout';
import { Building2, Calendar, Users, Activity } from 'lucide-react';

const stats = [
  { label: 'Établissements', value: '142', icon: Building2, color: '#2563eb' },
  { label: 'RDV Aujourd\'hui', value: '42', icon: Calendar, color: '#16a34a' },
  { label: 'Patients Actifs', value: '1,284', icon: Users, color: '#d97706' },
  { label: 'Système', value: '99.9%', icon: Activity, color: '#0891b2' },
];

export default function DashboardPage() {
  return (
    <DashboardLayout pageTitle="Dashboard" userName="Admin" userRole="Super Admin">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} style={{
            background: 'white', borderRadius: 12,
            border: '1px solid var(--mc-gray-200)', padding: 20,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ fontSize: 12, color: 'var(--mc-gray-400)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
                <p style={{ fontSize: 26, fontWeight: 700, color: 'var(--mc-gray-800)' }}>{value}</p>
              </div>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={20} color={color} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ background: 'white', borderRadius: 12, border: '1px solid var(--mc-gray-200)', padding: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Bienvenue sur MediConnect</h3>
        <p style={{ fontSize: 13, color: 'var(--mc-gray-400)' }}>
          Utilisez la navigation à gauche pour accéder aux différentes sections.
        </p>
      </div>
    </DashboardLayout>
  );
}
