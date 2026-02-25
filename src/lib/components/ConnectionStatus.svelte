<script lang="ts">
	import { sessionMetaStore } from '../stores/session-meta.svelte.js';

	const STATUS_CONFIG = {
		idle: { color: 'bg-slate-500', label: '' },
		connecting: { color: 'bg-amber-400 animate-pulse', label: 'Connecting…' },
		open: { color: 'bg-green-400', label: 'Connected' },
		error: { color: 'bg-red-500', label: 'Error' },
		disconnected: { color: 'bg-red-500 animate-pulse', label: 'Disconnected' }
	};

	const config = $derived(STATUS_CONFIG[sessionMetaStore.status]);
	const visible = $derived(sessionMetaStore.status !== 'idle');
</script>

{#if visible}
	<div class="flex items-center gap-1.5 px-3 py-1 text-xs text-slate-400">
		<span class="h-2 w-2 rounded-full {config.color}"></span>
		{#if config.label}
			<span>{config.label}</span>
		{/if}
		{#if sessionMetaStore.roomCode && sessionMetaStore.role === 'host'}
			<span class="font-mono font-semibold text-slate-300">{sessionMetaStore.roomCode}</span>
		{/if}
	</div>
{/if}
