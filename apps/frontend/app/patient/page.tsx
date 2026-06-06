'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Calendar, Phone, Check, X, Clock, MessageSquare, AlertCircle } from 'lucide-react';

interface PortalData {
  patient: { id: string; firstName: string; lastName: string; phone: string };
  nextAppointment: { id: string; doctorName: string; date: string; status: string } | null;
  appointments: { id: string; doctorName: string; date: string; status: string }[];
  smsHistory: { id: string; message: string; sentAt: string; type: string }[];
}

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  CONFIRMED: { label: 'Confirmé', color: '#16a34a', bg: '#dcfce7' },
  PENDING:   { label: 'En attente', color: '#d97706', bg: '#fef3c7' },
  CANCELLED: { label: 'Annulé', color: '#dc2626', bg: '#fee2e2' },
  COMPLETED: { label: 'Terminé', color: '#0891b2', bg: '#e0f2fe' },
};

function PatientPortalContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [data, setData] = useState<PortalData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState('');

  useEffect(() => {
    if (!token) { setError('Token manquant ou invalide.'); setLoading(false); return; }
    fetch(`http://localhost:3000/api/patient/portal?token=${token}`)
      .then(r => { if (!r.ok) throw new Error('Token invalide ou expiré'); return r.json(); })
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  const handleAction = async (id: string, action: 'confirm' | 'cancel') => {
    try {
      const res = await fetch(
        `http://localhost:3000/api/patient/portal/rdv/${id}/${action}?token=${token}`,
        { method: 'PATCH' }
      );
      if (!res.ok) throw new Error('Erreur');
      setActionMsg(action === 'confirm' ? '✅ RDV confirmé !' : '❌ RDV annulé.');
      // Rafraîchir les données
      const updated = await fetch(`http://localhost:3000/api/patient/portal?token=${token}`).then(r => r.json());
      setData(updated);
      setTimeout(() => setActionMsg(''), 3000);
    } catch {
      setActionMsg('Une erreur est survenue.');
    }
  };

  // Loading
  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, border: '3px solid var(--mc-blue)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
        <p style={{ color: 'var(--mc-gray-400)', fontSize: 14 }}>Chargement...</p>
      </div>
    </div>
  );

  // Erreur token
  if (error) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ textAlign: 'center', maxWidth: 320 }}>
        <AlertCircle size={48} color="#dc2626" style={{ margin: '0 auto 16px' }} />
        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--mc-gray-800)', marginBottom: 8 }}>
          Accès impossible
        </h2>
        <p style={{ fontSize: 14, color: 'var(--mc-gray-400)' }}>{error}</p>
        <p style={{ fontSize: 12, color: 'var(--mc-gray-400)', marginTop: 8 }}>
          Ce lien est peut-être expiré ou invalide. Contactez votre clinique.
        </p>
      </div>
    </div>
  );

  const { patient, nextAppointment, appointments, smsHistory } = data!;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--mc-gray-50)' }}>
      {/* Header simple — pas de sidebar */}
      <div style={{
        background: 'var(--mc-navy)', padding: '16px 20px',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{
          width: 32, height: 32, background: 'var(--mc-blue)',
          borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ color: 'white', fontWeight: 700 }}>M</span>
        </div>
        <span style={{ color: 'white', fontWeight: 600, fontSize: 16 }}>MediConnect</span>
      </div>

      <div style={{ maxWidth: 480, margin: '0 auto', padding: '20px 16px' }}>

        {/* Message d'action */}
        {actionMsg && (
          <div style={{
            background: 'white', border: '1px solid var(--mc-gray-200)',
            borderRadius: 10, padding: '12px 16px', marginBottom: 16,
            textAlign: 'center', fontSize: 14, fontWeight: 500,
          }}>
            {actionMsg}
          </div>
        )}

        {/* Bonjour patient */}
        <div style={{
          background: 'var(--mc-navy)', borderRadius: 14,
          padding: '20px', marginBottom: 16, color: 'white',
        }}>
          <p style={{ fontSize: 13, opacity: 0.7, marginBottom: 4 }}>Bonjour,</p>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>
            {patient.firstName} {patient.lastName}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, opacity: 0.7 }}>
            <Phone size={13} />
            <span style={{ fontSize: 13 }}>{patient.phone}</span>
          </div>
        </div>

        {/* Prochain RDV */}
        {nextAppointment ? (
          <div style={{
            background: 'white', borderRadius: 14,
            border: '1px solid var(--mc-gray-200)', padding: 20, marginBottom: 16,
          }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--mc-gray-400)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Prochain Rendez-vous
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{
                width: 44, height: 44, background: 'var(--mc-gray-100)',
                borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Calendar size={20} color="var(--mc-blue)" />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--mc-gray-800)' }}>
                  {nextAppointment.doctorName}
                </div>
                <div style={{ fontSize: 13, color: 'var(--mc-gray-400)', marginTop: 2 }}>
                  {new Date(nextAppointment.date).toLocaleDateString('fr-FR', {
                    weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
                  })}
                </div>
              </div>
            </div>

            {nextAppointment.status === 'PENDING' && (
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => handleAction(nextAppointment.id, 'confirm')}
                  style={{
                    flex: 1, padding: '11px', background: 'var(--mc-navy)', color: 'white',
                    border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}
                >
                  <Check size={16} /> Confirmer mon RDV
                </button>
                <button
                  onClick={() => handleAction(nextAppointment.id, 'cancel')}
                  style={{
                    flex: 1, padding: '11px', background: '#fee2e2', color: '#dc2626',
                    border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}
                >
                  <X size={16} /> Annuler
                </button>
              </div>
            )}
          </div>
        ) : (
          <div style={{
            background: 'white', borderRadius: 14, border: '1px solid var(--mc-gray-200)',
            padding: 20, marginBottom: 16, textAlign: 'center',
          }}>
            <Clock size={28} color="var(--mc-gray-400)" style={{ margin: '0 auto 8px' }} />
            <p style={{ fontSize: 14, color: 'var(--mc-gray-400)' }}>Aucun rendez-vous à venir</p>
          </div>
        )}

        {/* Historique des RDV */}
        <div style={{
          background: 'white', borderRadius: 14,
          border: '1px solid var(--mc-gray-200)', padding: 20, marginBottom: 16,
        }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--mc-gray-400)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Historique des RDV
          </h2>
          {appointments.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--mc-gray-400)', textAlign: 'center' }}>Aucun historique</p>
          ) : appointments.map(apt => {
            const s = STATUS_LABELS[apt.status] || STATUS_LABELS.PENDING;
            return (
              <div key={apt.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                paddingBottom: 10, marginBottom: 10, borderBottom: '1px solid var(--mc-gray-100)',
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--mc-gray-800)' }}>{apt.doctorName}</div>
                  <div style={{ fontSize: 12, color: 'var(--mc-gray-400)', marginTop: 2 }}>
                    {new Date(apt.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 500, padding: '3px 8px',
                  borderRadius: 99, background: s.bg, color: s.color,
                }}>
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Historique SMS */}
        {smsHistory.length > 0 && (
          <div style={{
            background: 'white', borderRadius: 14,
            border: '1px solid var(--mc-gray-200)', padding: 20,
          }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--mc-gray-400)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Historique SMS & Appels
            </h2>
            {smsHistory.map(sms => (
              <div key={sms.id} style={{
                display: 'flex', gap: 10, alignItems: 'flex-start',
                marginBottom: 10, paddingBottom: 10, borderBottom: '1px solid var(--mc-gray-100)',
              }}>
                <MessageSquare size={15} color="var(--mc-blue)" style={{ marginTop: 2, flexShrink: 0 }} />
                <div>
                  <p style={{ fontSize: 13, color: 'var(--mc-gray-800)' }}>{sms.message}</p>
                  <p style={{ fontSize: 11, color: 'var(--mc-gray-400)', marginTop: 2 }}>
                    {new Date(sms.sentAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function PatientPortalPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center' }}>Chargement...</div>}>
      <PatientPortalContent />
    </Suspense>
  );
}
