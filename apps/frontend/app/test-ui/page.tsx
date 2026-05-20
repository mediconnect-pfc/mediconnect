'use client'

import { useState } from 'react'
import { Button, Badge, Card, Modal, Table, Spinner, Avatar, toast, ToastContainer, Input } from '@/components/ui'
import { Upload } from 'lucide-react'

export default function TestUIPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [inputValue, setInputValue] = useState('')

  const columns = [
    { key: 'name', header: 'Nom' },
    { key: 'role', header: 'Rôle', hideOn: 'sm' as const },
    { key: 'status', header: 'Statut', render: (r: any) => <Badge variant={r.status === 'Actif' ? 'success' : 'warning'}>{r.status}</Badge> },
    { key: 'action', header: '', render: () => <Button size="sm" variant="ghost">Voir</Button> },
  ]
  const data = [
    { id: 1, name: 'Jean Dupont', role: 'Admin', status: 'Actif' },
    { id: 2, name: 'Marie Curie', role: 'Médecin', status: 'Actif' },
    { id: 3, name: 'Paul Martin', role: 'Patient', status: 'En attente' },
  ]

  return (
    <div className="mx-auto max-w-4xl space-y-12 p-8">
      <h1 className="text-3xl font-bold">UI Components — Test</h1>

      {/* Buttons */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Button</h2>
        <div className="flex flex-wrap items-center gap-3">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="danger">Danger</Button>
          <Button variant="ghost">Ghost</Button>
          <Button loading>Loading</Button>
          <Button disabled>Disabled</Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
          <Button icon={<Upload size={16} />}>Icon left</Button>
          <Button icon={<Upload size={16} />} iconPosition="right">Icon right</Button>
          <Button fullWidth>Full width</Button>
        </div>
      </section>

      {/* Badge */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Badge</h2>
        <div className="flex gap-3">
          <Badge variant="success">Actif</Badge>
          <Badge variant="warning">En attente</Badge>
          <Badge variant="danger">No-show</Badge>
          <Badge variant="info">Info</Badge>
        </div>
      </section>

      {/* Card */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Card</h2>
        <Card>
          <p className="text-gray-600">Contenu par défaut (padding md)</p>
        </Card>
        <Card padding="sm" className="border-blue-200">
          <p className="text-gray-600">Padding small + bordure bleue</p>
        </Card>
      </section>

      {/* Input */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Input</h2>
        <div className="max-w-sm space-y-4">
          <Input label="Nom" id="name" value={inputValue} onChange={(e) => setInputValue(e.target.value)} placeholder="Votre nom" />
          <Input label="Email" id="email" type="email" error="Email invalide" />
        </div>
      </section>

      {/* Modal */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Modal</h2>
        <Button onClick={() => setModalOpen(true)}>Ouvrir modal</Button>
        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Exemple de modal"
          actions={
            <>
              <Button variant="secondary" onClick={() => setModalOpen(false)}>Annuler</Button>
              <Button onClick={() => setModalOpen(false)}>Confirmer</Button>
            </>
          }
        >
          <p className="text-gray-600">Contenu de la modal…</p>
        </Modal>
      </section>

      {/* Table */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Table</h2>
        <Table columns={columns} data={data} />
        <Table columns={columns} data={[]} emptyMessage="Aucun résultat" />
      </section>

      {/* Spinner */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Spinner</h2>
        <div className="flex items-end gap-4">
          <Spinner size="sm" />
          <Spinner size="md" />
          <Spinner size="lg" />
        </div>
      </section>

      {/* Avatar */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Avatar</h2>
        <div className="flex items-center gap-4">
          <Avatar name="Jean Dupont" size="sm" />
          <Avatar name="Marie Curie" size="md" />
          <Avatar name="Paul Martin" size="lg" />
          <Avatar src="https://i.pravatar.cc/80?img=1" size="lg" />
        </div>
      </section>

      {/* Toast */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Toast</h2>
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => toast({ message: 'Patient créé', type: 'success' })}>Success</Button>
          <Button variant="danger" onClick={() => toast({ message: 'Erreur réseau', type: 'error' })}>Error</Button>
          <Button variant="ghost" onClick={() => toast({ message: 'Mise à jour disponible', type: 'info' })}>Info</Button>
          <Button variant="secondary" onClick={() => toast({ message: 'Attention', type: 'warning' })}>Warning</Button>
        </div>
      </section>

      <ToastContainer />
    </div>
  )
}
