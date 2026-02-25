<script lang="ts">
	import { toastStore } from '../stores/toast.svelte.js';
</script>

<div class="pointer-events-none fixed bottom-4 left-4 z-50 flex flex-col gap-2" aria-live="polite">
	{#each toastStore.list as toast (toast.id)}
		<div
			class="pointer-events-auto flex max-w-sm items-start gap-3 rounded-lg border bg-slate-900 px-4 py-3 shadow-lg"
			class:border-blue-500={toast.variant === 'info'}
			class:border-red-500={toast.variant === 'error'}
			class:border-green-500={toast.variant === 'success'}
		>
			<div class="flex-1">
				<p
					class="text-sm text-white"
					class:text-blue-300={toast.variant === 'info'}
					class:text-red-300={toast.variant === 'error'}
					class:text-green-300={toast.variant === 'success'}
				>
					{toast.message}
				</p>
			</div>
			<button
				onclick={() => toastStore.dismiss(toast.id)}
				class="shrink-0 text-slate-500 hover:text-white"
				aria-label="Dismiss"
			>
				✕
			</button>
		</div>
	{/each}
</div>
