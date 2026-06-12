'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Calendar, Plus, Check, X, Clock } from 'lucide-react';

type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';

interface Appointment {
  id: string;
  doctorName: string;
  date: string;
  status: AppointmentStatus;
  patient: { firstName: string; lastName: string; phone: string };
}

const STATUS_CONFIG = {
  CONFIRMED: { label: 'Confirmé', bg: '#dcfce7', color: '#16a34a' },
  PENDING:   { label: 'En attente', bg: '#f1f5f9', color: '#475569' },
  CANCELLED: { label: 'Annulé', bg: '#fee2e2', color: '#dc2626' },
  COMPLETED: { label: 'Terminé', bg: '#e0f2fe', color: '#0891b2' },
};

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [filterDoctor, setFilterDoctor] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAppointments();
  }, [filterDoctor, filterDate]);

  const fetchAppointments = async () => {
    try {
      const params = new URLSearchParams();
      if (filterDoctor) params.append('doctorName', filterDoctor);
      if (filterDate) params.append('date', filterDate);
      const res = await fetch(`http://localhost:3000/api/appointments?${params}`);
      const data = await res.json();
      setAppointments(data);
    } catch {
      console.error('Erreur chargement RDV');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (id: string) => {
    await fetch(`http://localhost:3000/api/appointments/${id}/confirm`, { method: 'PATCH' });
    fetchAppointments();
  };

  const handleCancel = async (id: string) => {
    await fetch(`http://localhost:3000/api/appointments/${id}/cancel`, { method: 'PATCH' });
    fetchAppointments();
  };

  return (
    <DashboardLayout pageTitle="Appointments" userName="Admin" userRole="Réceptionniste">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--mc-gray-800)' }}>
            Planning du Jour
          </h2>
          <p style={{ fontSize: 13, color: 'var(--mc-gray-400)', marginTop: 2 }}>
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'var(--mc-navy)', color: 'white',
            border: 'none', borderRadius: 8, padding: '10px 16px',
            fontSize: 14, fontWeight: 500, cursor: 'pointer',
          }}
        >
          <Plus size={16} /> Nouveau RDV
        </button>
      </div>

      {/* Filtres */}
      <div style={{
        background: 'white', borderRadius: 12, padding: 16,
        border: '1px solid var(--mc-gray-200)', marginBottom: 20,
        display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--mc-gray-600)' }}>Filtrer :</span>
        <input
          type="text"
          placeholder="Par médecin..."
          value={filterDoctor}
          onChange={e => setFilterDoctor(e.target.value)}
          style={{
            padding: '7px 12px', border: '1px solid var(--mc-gray-200)',
            borderRadius: 8, fontSize: 13, outline: 'none', width: 180,
          }}
        />
        <input
          type="date"
          value={filterDate}
          onChange={e => setFilterDate(e.target.value)}
          style={{
            padding: '7px 12px', border: '1px solid var(--mc-gray-200)',
            borderRadius: 8, fontSize: 13, outline: 'none',
          }}
        />
        {(filterDoctor || filterDate) && (
          <button onClick={() => { setFilterDoctor(''); setFilterDate(''); }}
            style={{ fontSize: 12, color: 'var(--mc-blue)', background: 'none', border: 'none', cursor: 'pointer' }}>
            Réinitialiser
          </button>
        )}
      </div>

      {/* Liste des RDV */}
      <div style={{ background: 'white', borderRadius: 12, border: '1px solid var(--mc-gray-200)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--mc-gray-400)' }}>
            <Clock size={32} style={{ margin: '0 auto 12px' }} />
            <p>Chargement...</p>
          </div>
        ) : appointments.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--mc-gray-400)' }}>
            <Calendar size={32} style={{ margin: '0 auto 12px' }} />
            <p>Aucun rendez-vous pour aujourd'hui</p>
          </div>
        ) : appointments.map((apt, i) => {
          const status = STATUS_CONFIG[apt.status];
          const time = new Date(apt.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
          return (
            <div key={apt.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 20px',
              borderBottom: i < appointments.length - 1 ? '1px solid var(--mc-gray-100)' : 'none',
            }}>
              {/* Heure */}
              <div style={{
                width: 56, fontWeight: 600, fontSize: 15,
                color: 'var(--mc-navy)', flexShrink: 0,
              }}>
                {time}
              </div>

              {/* Patient + Médecin */}
              <div style={{ flex: 1, paddingLeft: 16 }}>
                <div style={{ fontWeight: 500, fontSize: 14, color: 'var(--mc-gray-800)' }}>
                  {apt.patient.firstName} {apt.patient.lastName}
                </div>
                <div style={{ fontSize: 12, color: 'var(--mc-gray-400)', marginTop: 2 }}>
                  {apt.doctorName}
                </div>
              </div>

              {/* Badge statut */}
              <span style={{
                padding: '4px 10px', borderRadius: 99,
                background: status.bg, color: status.color,
                fontSize: 12, fontWeight: 500, marginRight: 16,
              }}>
                {status.label}
              </span>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 6 }}>
                {apt.status === 'PENDING' && (
                  <>
                    <button onClick={() => handleConfirm(apt.id)} style={{
                      background: '#dcfce7', color: '#16a34a',
                      border: 'none', borderRadius: 6, padding: '6px 10px',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12,
                    }}>
                      <Check size={13} /> Confirmer
                    </button>
                    <button onClick={() => handleCancel(apt.id)} style={{
                      background: '#fee2e2', color: '#dc2626',
                      border: 'none', borderRadius: 6, padding: '6px 10px',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12,
                    }}>
                      <X size={13} /> Annuler
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </DashboardLayout>
  );
}
