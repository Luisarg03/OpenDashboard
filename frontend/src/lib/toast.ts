import { toast } from 'sonner';

/**
 * Shared toast helpers for transient (non-fatal) errors and success
 * feedback. Centralized here so both feature areas and lib code (SSE stream)
 * can use them without importing UI component files.
 */
export function toastError(message: string) {
  toast.error(message, { duration: 6_000 });
}

export function toastSuccess(message: string) {
  toast.success(message);
}
