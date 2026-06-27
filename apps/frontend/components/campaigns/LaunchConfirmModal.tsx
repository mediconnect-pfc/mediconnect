'use client'

import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'

interface LaunchConfirmModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => Promise<void> | void
  campaignName: string
  recipientCount?: number
  loading?: boolean
}

export default function LaunchConfirmModal({
  open,
  onClose,
  onConfirm,
  campaignName,
  recipientCount,
  loading = false,
}: LaunchConfirmModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Confirmer le lancement"
      actions={
        <>
          <Button variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button loading={loading} onClick={onConfirm}>
            Confirmer
          </Button>
        </>
      }
    >
      <div className="space-y-3 text-sm text-gray-700">
        <p className="font-medium text-gray-900">{campaignName}</p>
        <p>Envoyer à {recipientCount ?? 0} patients ?</p>
        <p className="text-gray-500">
          Cette action démarre immédiatement la campagne et enverra les messages aux patients ciblés.
        </p>
      </div>
    </Modal>
  )
}
