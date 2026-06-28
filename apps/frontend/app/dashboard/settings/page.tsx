'use client'

import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Clock3, Plus, Settings2, Users } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { toast } from '@/components/ui'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import {
  createUser,
  getAuthToken,
  getEstablishment,
  getUsers,
  updateEstablishment,
  updateUser,
} from '@/lib/api'

type EstablishmentType = 'CLINIC' | 'HOSPITAL' | 'PHARMACY'
type StaffRole = 'DOCTOR' | 'RECEPTIONIST' | 'CAISSIER' | 'ADMIN' | 'SUPER_ADMIN'
type WorkingDay = 'Lundi' | 'Mardi' | 'Mercredi' | 'Jeudi' | 'Vendredi' | 'Samedi'

interface ClinicSettings {
  autoCallH24: boolean
  confirmationSmsText: string
  reminderSmsText: string
  reminderDelayHours: 24 | 48 | 2
  defaultAppointmentDuration: 15 | 30 | 45 | 60
  workingDays: WorkingDay[]
  openingTime: string
  closingTime: string
}

interface EstablishmentRecord {
  id: string
  name: string
  address?: string | null
  phone: string
  type: EstablishmentType
  settings?: Partial<ClinicSettings> | null
}

interface StaffUser {
  id: string
  name: string
  email: string
  role: StaffRole
  specialty?: string | null
  isActive: boolean
}

interface UserFormState {
  name: string
  email: string
  password: string
  role: 'DOCTOR' | 'RECEPTIONIST' | 'CAISSIER'
  specialty: string
}

const defaultSettings: ClinicSettings = {
  autoCallH24: false,
  confirmationSmsText: 'Bonjour {nom}, votre RDV est confirmé le {date} avec {medecin}.',
  reminderSmsText: 'Bonjour {nom}, rappel de votre RDV demain à {heure} avec {medecin}.',
  reminderDelayHours: 24,
  defaultAppointmentDuration: 30,
  workingDays: ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'],
  openingTime: '08:00',
  closingTime: '18:00',
}

const establishmentTypes: EstablishmentType[] = ['CLINIC', 'HOSPITAL', 'PHARMACY']
const reminderOptions: Array<{ value: 24 | 48 | 2; label: string }> = [
  { value: 24, label: '24h' },
  { value: 48, label: '48h' },
  { value: 2, label: '2h' },
]
const durationOptions: Array<ClinicSettings['defaultAppointmentDuration']> = [15, 30, 45, 60]
const workingDayOptions: WorkingDay[] = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
const phoneRegex = /^\+212\d{9}$/

function normalizeSettings(settings?: Partial<ClinicSettings> | null): ClinicSettings {
  if (!settings) return { ...defaultSettings }

  return {
    autoCallH24: settings.autoCallH24 ?? defaultSettings.autoCallH24,
    confirmationSmsText: settings.confirmationSmsText ?? defaultSettings.confirmationSmsText,
    reminderSmsText: settings.reminderSmsText ?? defaultSettings.reminderSmsText,
    reminderDelayHours: settings.reminderDelayHours ?? defaultSettings.reminderDelayHours,
    defaultAppointmentDuration:
      settings.defaultAppointmentDuration ?? defaultSettings.defaultAppointmentDuration,
    workingDays: settings.workingDays?.length ? (settings.workingDays as WorkingDay[]) : [...defaultSettings.workingDays],
    openingTime: settings.openingTime ?? defaultSettings.openingTime,
    closingTime: settings.closingTime ?? defaultSettings.closingTime,
  }
}

function SkeletonBlock() {
  return <div className="h-10 animate-pulse rounded-lg bg-gray-200" />
}

function PageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <SkeletonBlock />
        <div className="h-4 w-72 animate-pulse rounded bg-gray-100" />
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <SkeletonBlock key={index} />
        ))}
      </div>
      <div className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="grid gap-3 md:grid-cols-2">
          <SkeletonBlock />
          <SkeletonBlock />
          <SkeletonBlock />
          <SkeletonBlock />
        </div>
      </div>
    </div>
  )
}

function RoleBadge({ role }: { role: StaffRole }) {
  const map: Record<StaffRole, { variant: 'success' | 'warning' | 'danger' | 'info'; label: string; className?: string }> = {
    DOCTOR: { variant: 'info', label: 'DOCTOR', className: 'bg-blue-100 text-blue-700' },
    RECEPTIONIST: { variant: 'success', label: 'RECEPTIONIST' },
    CAISSIER: { variant: 'warning', label: 'CAISSIER', className: 'bg-orange-100 text-orange-700' },
    ADMIN: { variant: 'info', label: 'ADMIN', className: 'bg-purple-100 text-purple-700' },
    SUPER_ADMIN: { variant: 'danger', label: 'SUPER_ADMIN' },
  }

  const current = map[role] ?? map.ADMIN
  return (
    <Badge variant={current.variant} className={current.className}>
      {current.label}
    </Badge>
  )
}

function StatusBadge({ active }: { active: boolean }) {
  return <Badge variant={active ? 'success' : 'danger'}>{active ? 'Actif' : 'Inactif'}</Badge>
}

function TabButton({
  active,
  icon: Icon,
  children,
  onClick,
}: {
  active: boolean
  icon: React.ComponentType<{ size?: number; className?: string }>
  children: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
        active ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
    >
      <Icon size={16} />
      {children}
    </button>
  )
}

function SectionCard({
  title,
  subtitle,
  children,
  actions,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
  actions?: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
        </div>
        {actions}
      </div>
      {children}
    </div>
  )
}

export default function SettingsPage() {
  const { user, loading: authLoading } = useAuth()
  const [activeTab, setActiveTab] = useState<'general' | 'users' | 'messages' | 'slots'>('general')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [savingGeneral, setSavingGeneral] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)
  const [staffLoading, setStaffLoading] = useState(false)
  const [staffSavingId, setStaffSavingId] = useState<string | null>(null)
  const [userModalOpen, setUserModalOpen] = useState(false)
  const [users, setUsers] = useState<StaffUser[]>([])
  const [establishment, setEstablishment] = useState<EstablishmentRecord | null>(null)
  const [generalErrors, setGeneralErrors] = useState<Record<string, string>>({})
  const [general, setGeneral] = useState({
    name: '',
    address: '',
    phone: '',
    type: 'CLINIC' as EstablishmentType,
  })
  const [settings, setSettings] = useState<ClinicSettings>({ ...defaultSettings })
  const [userForm, setUserForm] = useState<UserFormState>({
    name: '',
    email: '',
    password: '',
    role: 'DOCTOR',
    specialty: '',
  })
  const [userErrors, setUserErrors] = useState<Record<string, string>>({})

  const token = useMemo(() => getAuthToken(), [])
  const canAccess = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN'
  const establishmentId = user?.establishmentId ?? ''

  useEffect(() => {
    if (authLoading) return
    if (!canAccess || !token || !establishmentId) {
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError('')

    Promise.all([
      getEstablishment(token, establishmentId),
      getUsers(token),
    ])
      .then(([establishmentResponse, usersResponse]) => {
        if (cancelled) return
        const establishmentData = establishmentResponse as EstablishmentRecord
        const userList = Array.isArray(usersResponse) ? usersResponse : usersResponse?.data ?? []

        setEstablishment(establishmentData)
        setGeneral({
          name: establishmentData.name ?? '',
          address: establishmentData.address ?? '',
          phone: establishmentData.phone ?? '',
          type: establishmentData.type ?? 'CLINIC',
        })
        setSettings(normalizeSettings(establishmentData.settings))
        setUsers(userList)
      })
      .catch((fetchError) => {
        if (!cancelled) {
          setError(fetchError instanceof Error ? fetchError.message : 'Erreur chargement paramètres')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [authLoading, canAccess, establishmentId, token])

  function validateGeneral() {
    const nextErrors: Record<string, string> = {}
    if (!general.name.trim()) nextErrors.name = 'Nom requis'
    if (!general.phone.trim()) nextErrors.phone = 'Téléphone requis'
    else if (!phoneRegex.test(general.phone.trim())) nextErrors.phone = 'Format attendu : +212XXXXXXXXX'
    if (!general.type) nextErrors.type = 'Type requis'
    setGeneralErrors(nextErrors)
    return nextErrors
  }

  async function saveGeneralInfo() {
    if (!token || !establishmentId) return
    const nextErrors = validateGeneral()
    if (Object.keys(nextErrors).length > 0) return

    setSavingGeneral(true)
    try {
      const updated = await updateEstablishment(token, establishmentId, {
        name: general.name.trim(),
        address: general.address.trim(),
        phone: general.phone.trim(),
        type: general.type,
      })
      const record = updated as EstablishmentRecord
      setEstablishment(record)
      toast({ type: 'success', message: 'Informations générales sauvegardées' })
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Erreur sauvegarde')
    } finally {
      setSavingGeneral(false)
    }
  }

  async function saveSettings() {
    if (!token || !establishmentId) return
    setSavingSettings(true)
    try {
      const updated = await updateEstablishment(token, establishmentId, {
        settings,
      })
      setEstablishment(updated as EstablishmentRecord)
      toast({ type: 'success', message: 'Paramètres sauvegardés' })
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Erreur sauvegarde des paramètres')
    } finally {
      setSavingSettings(false)
    }
  }

  async function refreshUsers() {
    if (!token) return
    setStaffLoading(true)
    try {
      const response = await getUsers(token)
      const list = Array.isArray(response) ? response : response?.data ?? []
      setUsers(list)
    } catch (staffError) {
      setError(staffError instanceof Error ? staffError.message : 'Erreur chargement utilisateurs')
    } finally {
      setStaffLoading(false)
    }
  }

  function openUserModal() {
    setUserForm({ name: '', email: '', password: '', role: 'DOCTOR', specialty: '' })
    setUserErrors({})
    setUserModalOpen(true)
  }

  function validateUserForm() {
    const nextErrors: Record<string, string> = {}
    if (!userForm.name.trim()) nextErrors.name = 'Nom requis'
    if (!userForm.email.trim()) nextErrors.email = 'Email requis'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userForm.email.trim())) nextErrors.email = 'Email invalide'
    if (!userForm.password.trim()) nextErrors.password = 'Mot de passe requis'
    if (userForm.role === 'DOCTOR' && !userForm.specialty.trim()) nextErrors.specialty = 'Spécialité requise'
    setUserErrors(nextErrors)
    return nextErrors
  }

  async function handleCreateUser() {
    if (!token) return
    const nextErrors = validateUserForm()
    if (Object.keys(nextErrors).length > 0) return

    setStaffSavingId('create')
    try {
      await createUser(token, {
        name: userForm.name.trim(),
        email: userForm.email.trim(),
        password: userForm.password.trim(),
        role: userForm.role,
        specialty: userForm.role === 'DOCTOR' ? userForm.specialty.trim() : null,
      })
      setUserModalOpen(false)
      toast({ type: 'success', message: 'Utilisateur créé avec succès' })
      await refreshUsers()
    } catch (createError) {
      setUserErrors({ general: createError instanceof Error ? createError.message : 'Erreur création utilisateur' })
    } finally {
      setStaffSavingId(null)
    }
  }

  async function deactivateUser(id: string) {
    if (!token) return
    setStaffSavingId(id)
    try {
      await updateUser(token, id, { isActive: false })
      toast({ type: 'warning', message: 'Utilisateur désactivé' })
      await refreshUsers()
    } catch (disableError) {
      setError(disableError instanceof Error ? disableError.message : 'Erreur désactivation utilisateur')
    } finally {
      setStaffSavingId(null)
    }
  }

  function saveMessageSettings() {
    void saveSettings()
  }

  function saveSlotSettings() {
    void saveSettings()
  }

  if (authLoading || loading) {
    return <PageSkeleton />
  }

  if (!canAccess) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
        <h1 className="text-2xl font-semibold text-gray-900">Paramètres</h1>
        <p className="mt-1 text-sm text-gray-500">Page réservée aux administrateurs.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Paramètres</h1>
          <p className="mt-1 text-sm text-gray-500">Gestion de l&apos;établissement, des utilisateurs et des règles automatiques</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <TabButton active={activeTab === 'general'} icon={Settings2} onClick={() => setActiveTab('general')}>
            Informations générales
          </TabButton>
          <TabButton active={activeTab === 'users'} icon={Users} onClick={() => setActiveTab('users')}>
            Utilisateurs
          </TabButton>
          <TabButton active={activeTab === 'messages'} icon={CheckCircle2} onClick={() => setActiveTab('messages')}>
            Messages automatiques
          </TabButton>
          <TabButton active={activeTab === 'slots'} icon={Clock3} onClick={() => setActiveTab('slots')}>
            Créneaux
          </TabButton>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {activeTab === 'general' && (
        <SectionCard
          title="Informations générales"
          subtitle="Données de base de votre établissement."
          actions={
            <Button onClick={saveGeneralInfo} loading={savingGeneral} icon={<CheckCircle2 size={16} />}>
              Sauvegarder
            </Button>
          }
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              id="establishment-name"
              label="Nom"
              value={general.name}
              onChange={(e) => {
                setGeneral((prev) => ({ ...prev, name: e.target.value }))
                setGeneralErrors((prev) => ({ ...prev, name: '' }))
              }}
              error={generalErrors.name}
            />
            <Input
              id="establishment-phone"
              label="Téléphone"
              value={general.phone}
              onChange={(e) => {
                setGeneral((prev) => ({ ...prev, phone: e.target.value }))
                setGeneralErrors((prev) => ({ ...prev, phone: '' }))
              }}
              error={generalErrors.phone}
            />
            <Input
              id="establishment-address"
              label="Adresse"
              value={general.address}
              onChange={(e) => setGeneral((prev) => ({ ...prev, address: e.target.value }))}
              className="md:col-span-2"
            />
            <div className="md:col-span-2">
              <label htmlFor="establishment-type" className="block text-sm font-medium text-gray-700">
                Type
              </label>
              <select
                id="establishment-type"
                value={general.type}
                onChange={(e) => setGeneral((prev) => ({ ...prev, type: e.target.value as EstablishmentType }))}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              >
                {establishmentTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              {generalErrors.type && <p className="mt-1 text-xs text-red-500">{generalErrors.type}</p>}
            </div>
          </div>
        </SectionCard>
      )}

      {activeTab === 'users' && (
        <SectionCard
          title="Utilisateurs"
          subtitle="Médecins, réceptionnistes et caissiers de l&apos;établissement."
          actions={
            <Button onClick={openUserModal} icon={<Plus size={16} />}>
              Ajouter utilisateur
            </Button>
          }
        >
          <div className="overflow-x-auto rounded-xl border">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr className="text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3">Nom</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Rôle</th>
                  <th className="px-4 py-3">Spécialité</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {staffLoading ? (
                  Array.from({ length: 4 }).map((_, index) => (
                    <tr key={`user-loading-${index}`} className="animate-pulse">
                      <td className="px-4 py-4"><div className="h-4 w-36 rounded bg-gray-200" /></td>
                      <td className="px-4 py-4"><div className="h-4 w-48 rounded bg-gray-200" /></td>
                      <td className="px-4 py-4"><div className="h-6 w-24 rounded-full bg-gray-200" /></td>
                      <td className="px-4 py-4"><div className="h-4 w-28 rounded bg-gray-100" /></td>
                      <td className="px-4 py-4"><div className="h-6 w-20 rounded-full bg-gray-200" /></td>
                      <td className="px-4 py-4 text-right"><div className="ml-auto h-4 w-20 rounded bg-gray-200" /></td>
                    </tr>
                  ))
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-gray-500">
                      Aucun utilisateur trouvé.
                    </td>
                  </tr>
                ) : (
                  users.map((staff) => (
                    <tr key={staff.id}>
                      <td className="px-4 py-3 font-medium text-gray-900">{staff.name}</td>
                      <td className="px-4 py-3 text-gray-600">{staff.email}</td>
                      <td className="px-4 py-3"><RoleBadge role={staff.role} /></td>
                      <td className="px-4 py-3 text-gray-600">{staff.specialty || '—'}</td>
                      <td className="px-4 py-3"><StatusBadge active={staff.isActive} /></td>
                      <td className="px-4 py-3 text-right">
                        {staff.isActive ? (
                          <Button
                            variant="secondary"
                            size="sm"
                            loading={staffSavingId === staff.id}
                            onClick={() => deactivateUser(staff.id)}
                          >
                            Désactiver
                          </Button>
                        ) : (
                          <span className="text-xs text-gray-400">Compte désactivé</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {activeTab === 'messages' && (
        <SectionCard
          title="Messages automatiques"
          subtitle="Ces paramètres s&apos;appliquent à tous les nouveaux rendez-vous."
          actions={
            <Button onClick={saveMessageSettings} loading={savingSettings} icon={<CheckCircle2 size={16} />}>
              Sauvegarder
            </Button>
          }
        >
          <div className="space-y-5">
            <label className="flex items-center justify-between rounded-xl border px-4 py-3">
              <div>
                <p className="font-medium text-gray-900">Activer appel automatique H-24</p>
                <p className="text-sm text-gray-500">Déclenche un appel de rappel pour les rendez-vous de demain.</p>
              </div>
              <input
                type="checkbox"
                checked={settings.autoCallH24}
                onChange={(e) => setSettings((prev) => ({ ...prev, autoCallH24: e.target.checked }))}
                className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </label>

            <div className="grid gap-4">
              <div>
                <label htmlFor="confirmation-sms" className="block text-sm font-medium text-gray-700">
                  Texte SMS confirmation RDV
                </label>
                <textarea
                  id="confirmation-sms"
                  value={settings.confirmationSmsText}
                  onChange={(e) => setSettings((prev) => ({ ...prev, confirmationSmsText: e.target.value }))}
                  rows={4}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
              </div>
              <div>
                <label htmlFor="reminder-sms" className="block text-sm font-medium text-gray-700">
                  Texte SMS rappel H-24
                </label>
                <textarea
                  id="reminder-sms"
                  value={settings.reminderSmsText}
                  onChange={(e) => setSettings((prev) => ({ ...prev, reminderSmsText: e.target.value }))}
                  rows={4}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
              </div>
              <div className="max-w-xs">
                <label htmlFor="reminder-delay" className="block text-sm font-medium text-gray-700">
                  Délai rappel avant RDV
                </label>
                <select
                  id="reminder-delay"
                  value={settings.reminderDelayHours}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, reminderDelayHours: Number(e.target.value) as 24 | 48 | 2 }))
                  }
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                >
                  {reminderOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </SectionCard>
      )}

      {activeTab === 'slots' && (
        <SectionCard
          title="Créneaux"
          subtitle="Définissez les horaires par défaut des nouveaux rendez-vous."
          actions={
            <Button onClick={saveSlotSettings} loading={savingSettings} icon={<CheckCircle2 size={16} />}>
              Sauvegarder
            </Button>
          }
        >
          <div className="space-y-5">
            <div className="max-w-xs">
              <label htmlFor="default-duration" className="block text-sm font-medium text-gray-700">
                Durée par défaut d&apos;un RDV
              </label>
              <select
                id="default-duration"
                value={settings.defaultAppointmentDuration}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    defaultAppointmentDuration: Number(e.target.value) as ClinicSettings['defaultAppointmentDuration'],
                  }))
                }
                className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              >
                {durationOptions.map((value) => (
                  <option key={value} value={value}>
                    {value} minutes
                  </option>
                ))}
              </select>
            </div>

            <div>
              <p className="block text-sm font-medium text-gray-700">Jours ouvrés</p>
              <div className="mt-2 flex flex-wrap gap-3">
                {workingDayOptions.map((day) => (
                  <label key={day} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={settings.workingDays.includes(day)}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          workingDays: e.target.checked
                            ? [...prev.workingDays, day]
                            : prev.workingDays.filter((value) => value !== day),
                        }))
                      }
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    {day}
                  </label>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                id="opening-time"
                label="Heure ouverture"
                type="time"
                value={settings.openingTime}
                onChange={(e) => setSettings((prev) => ({ ...prev, openingTime: e.target.value }))}
              />
              <Input
                id="closing-time"
                label="Heure fermeture"
                type="time"
                value={settings.closingTime}
                onChange={(e) => setSettings((prev) => ({ ...prev, closingTime: e.target.value }))}
              />
            </div>
          </div>
        </SectionCard>
      )}

      <Modal
        open={userModalOpen}
        onClose={() => setUserModalOpen(false)}
        title="Ajouter utilisateur"
        actions={
          <>
            <Button variant="secondary" onClick={() => setUserModalOpen(false)}>
              Annuler
            </Button>
            <Button loading={staffSavingId === 'create'} onClick={handleCreateUser}>
              Créer
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              id="user-name"
              label="Nom"
              value={userForm.name}
              onChange={(e) => {
                setUserForm((prev) => ({ ...prev, name: e.target.value }))
                setUserErrors((prev) => ({ ...prev, name: '' }))
              }}
              error={userErrors.name}
            />
            <Input
              id="user-email"
              label="Email"
              type="email"
              value={userForm.email}
              onChange={(e) => {
                setUserForm((prev) => ({ ...prev, email: e.target.value }))
                setUserErrors((prev) => ({ ...prev, email: '' }))
              }}
              error={userErrors.email}
            />
          </div>
          <Input
            id="user-password"
            label="Mot de passe"
            type="password"
            value={userForm.password}
            onChange={(e) => {
              setUserForm((prev) => ({ ...prev, password: e.target.value }))
              setUserErrors((prev) => ({ ...prev, password: '' }))
            }}
            error={userErrors.password}
          />
          <div>
            <label htmlFor="user-role" className="block text-sm font-medium text-gray-700">
              Rôle
            </label>
            <select
              id="user-role"
              value={userForm.role}
              onChange={(e) => setUserForm((prev) => ({ ...prev, role: e.target.value as UserFormState['role'] }))}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            >
              <option value="DOCTOR">DOCTOR</option>
              <option value="RECEPTIONIST">RECEPTIONIST</option>
              <option value="CAISSIER">CAISSIER</option>
            </select>
          </div>
          {userForm.role === 'DOCTOR' && (
            <Input
              id="user-specialty"
              label="Spécialité"
              value={userForm.specialty}
              onChange={(e) => {
                setUserForm((prev) => ({ ...prev, specialty: e.target.value }))
                setUserErrors((prev) => ({ ...prev, specialty: '' }))
              }}
              error={userErrors.specialty}
            />
          )}
          {userErrors.general && <p className="text-sm text-red-500">{userErrors.general}</p>}
        </div>
      </Modal>

      <div className="rounded-2xl border bg-gray-50 px-5 py-4 text-sm text-gray-600">
        <p className="font-medium text-gray-800">Note</p>
        <p className="mt-1">Les changements sont appliqués à l&apos;établissement courant uniquement.</p>
      </div>
    </div>
  )
}
