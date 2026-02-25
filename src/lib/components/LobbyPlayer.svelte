<script lang="ts">
	import type { Player } from '../types/game.js';

	interface Props {
		player: Player;
		isMe?: boolean;
		canRemove?: boolean;
		onRemove?: () => void;
	}

	let { player, isMe = false, canRemove = false, onRemove }: Props = $props();

	const statusColor = $derived(
		player.connectionStatus === 'connected'
			? 'bg-green-400'
			: player.connectionStatus === 'disconnected'
				? 'bg-amber-400 animate-pulse'
				: 'bg-red-500'
	);
</script>

<div
	class="flex items-center gap-3 rounded-lg border px-3 py-2.5 {isMe ? 'border-blue-500 bg-slate-800/80' : 'border-slate-700 bg-slate-800'}"
	style="border-left-color: var(--color-{player.civilisationId}, {player.colorHex}); border-left-width: 4px"
>
	<!-- Connection dot -->
	<span class="h-2 w-2 flex-shrink-0 rounded-full {statusColor}"></span>

	<!-- Player info -->
	<div class="min-w-0 flex-1">
		<div class="flex items-center gap-1.5">
			<span class="truncate text-sm font-semibold text-white">{player.playerName}</span>
			{#if isMe}
				<span class="rounded bg-blue-700 px-1 py-0.5 text-[10px] font-bold text-white">YOU</span>
			{/if}
			{#if player.isHost}
				<span class="rounded bg-purple-700 px-1 py-0.5 text-[10px] font-bold text-white">HOST</span>
			{/if}
		</div>
		<p class="text-xs text-slate-400">{player.civilisationName} · #{player.astRanking}</p>
	</div>

	<!-- Remove button (host only) -->
	{#if canRemove && onRemove}
		<button
			onclick={onRemove}
			class="flex-shrink-0 rounded px-2 py-1 text-xs text-red-400 hover:bg-red-900/30 hover:text-red-300"
		>
			Remove
		</button>
	{/if}
</div>
