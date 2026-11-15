import { AlertTriangle, Trash2, X } from 'lucide-react';

interface ConfirmDeleteModalProps {
  open: boolean;
  title: string;
  itemLabel: string;
  description: string;
  confirmLabel?: string;
  deleting?: boolean;
  error?: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmDeleteModal({
  open,
  title,
  itemLabel,
  description,
  confirmLabel = 'Delete Permanently',
  deleting = false,
  error = '',
  onCancel,
  onConfirm,
}: ConfirmDeleteModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-[#202020]/60 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-delete-title"
    >
      <div className="bg-[#FFFFFF] rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-[#202020]/10">
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#202020]/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-red-50 border border-red-200 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4 text-red-700" />
            </div>
            <div>
              <h2
                id="confirm-delete-title"
                className="text-base font-bold text-[#202020]"
              >
                {title}
              </h2>
              <p className="text-xs text-[#202020]/60">
                Permanent database deletion
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={deleting}
            onClick={onCancel}
            aria-label="Close confirmation dialog"
            className="p-1 text-[#202020]/60 hover:text-[#202020] disabled:opacity-40"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2.5">
          <div className="px-3.5 py-2.5 bg-[#F3EEE6] border border-[#B58B61]/30 rounded-md">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#B58B61]">
              Record to Delete
            </p>
            <p className="text-sm font-semibold text-[#202020] mt-0.5 break-words">
              {itemLabel}
            </p>
          </div>

          <p className="text-sm text-[#202020]/80 leading-relaxed">
            {description}
          </p>

          <p className="text-xs font-medium text-red-800 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            This item will be permanently removed from the database and storefront and will not be restored automatically.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-md">
            {error}
          </div>
        )}

        <div className="pt-2 flex items-center justify-end gap-3">
          <button
            type="button"
            disabled={deleting}
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium border border-[#202020]/20 text-[#202020] rounded-md hover:bg-[#F5F5F5] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={deleting}
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-semibold bg-red-600 text-[#FFFFFF] rounded-md hover:bg-red-700 inline-flex items-center gap-1.5 disabled:opacity-60"
          >
            <Trash2 className="w-4 h-4" />
            {deleting ? 'Deleting...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
