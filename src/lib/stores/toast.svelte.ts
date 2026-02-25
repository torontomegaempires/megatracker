import { generateId } from '../utils/uuid.js';

export type ToastVariant = 'info' | 'error' | 'success';

export interface ToastEntry {
	id: string;
	message: string;
	variant: ToastVariant;
}

let toasts = $state<ToastEntry[]>([]);

export const toastStore = {
	get list() {
		return toasts;
	},

	add(message: string, variant: ToastVariant = 'info', ms = 4000): void {
		const id = generateId();
		toasts = [...toasts, { id, message, variant }];
		setTimeout(() => {
			toasts = toasts.filter((t) => t.id !== id);
		}, ms);
	},

	dismiss(id: string): void {
		toasts = toasts.filter((t) => t.id !== id);
	}
};
