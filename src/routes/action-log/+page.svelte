<script lang="ts">
	import { gameStore } from '$lib/stores/game.svelte.js';
	import { goto } from '$app/navigation';

	$effect(() => {
		if (!gameStore.session) goto('/');
	});

	let filterPhase = $state(0);
	let filterPlayer = $state('');

	const filteredLog = $derived(
		[...(gameStore.session?.actionLog ?? [])]
			.reverse()
			.filter((entry) => {
				if (filterPhase !== 0 && entry.phase !== filterPhase) return false;
				if (filterPlayer && entry.affectedPlayerId !== filterPlayer) return false;
				return true;
			})
	);

	const players = $derived(gameStore.session?.players ?? []);

	function formatTime(ts: number): string {
		return new Date(ts).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
	}

	function playerName(playerId: string): string {
		return players.find((p) => p.playerId === playerId)?.playerName ?? playerId;
	}

	function playerCivId(playerId: string): string {
		return players.find((p) => p.playerId === playerId)?.civilizationId ?? '';
	}

	function downloadLog() {
		const log = gameStore.session?.actionLog ?? [];
		const blob = new Blob([JSON.stringify(log, null, 2)], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `megatracker-log-${gameStore.session?.sessionId ?? 'session'}.json`;
		a.click();
		URL.revokeObjectURL(url);
	}

	const PHASES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
</script>

<svelte:head>
	<title>Action Log — MegaTracker</title>
</svelte:head>

<div class="min-h-screen bg-slate-950 text-white">
	<div class="px-4 pb-4 pt-10">
		<div class="mb-4 flex items-center justify-between">
			<h1 class="text-xl font-bold text-white">Action Log</h1>
			<button
				onclick={downloadLog}
				class="rounded bg-slate-700 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-600"
			>
				Export JSON
			</button>
		</div>

		<!-- Filters -->
		<div class="mb-4 flex gap-2">
			<select
				bind:value={filterPhase}
				class="rounded bg-slate-800 px-2 py-1.5 text-xs text-white border border-slate-700"
				aria-label="Filter by phase"
			>
				<option value={0}>All Phases</option>
				{#each PHASES as ph (ph)}
					<option value={ph}>Phase {ph}</option>
				{/each}
			</select>

			<select
				bind:value={filterPlayer}
				class="flex-1 rounded bg-slate-800 px-2 py-1.5 text-xs text-white border border-slate-700"
				aria-label="Filter by player"
			>
				<option value="">All Players</option>
				{#each players as p (p.playerId)}
					<option value={p.playerId}>{p.playerName} ({p.civilizationName})</option>
				{/each}
			</select>
		</div>

		<!-- Log entries -->
		{#if filteredLog.length === 0}
			<p class="text-slate-400">No actions recorded yet.</p>
		{:else}
			<div class="space-y-2">
				{#each filteredLog as entry (entry.entryId)}
					{@const civId = playerCivId(entry.affectedPlayerId)}
					<div class="rounded-lg bg-slate-800 p-3">
						<div class="mb-1 flex items-center gap-2">
							<!-- Phase badge -->
							<span class="rounded bg-slate-700 px-1.5 py-0.5 text-xs text-slate-400">
								P{entry.phase}
							</span>
							<!-- Time -->
							<span class="text-xs text-slate-500">{formatTime(entry.timestamp)}</span>
							<!-- Player name with nation colour -->
							{#if civId}
								<span
									class="text-xs font-medium"
									style:color="var(--color-{civId})"
								>
									{playerName(entry.affectedPlayerId)}
								</span>
							{:else}
								<span class="text-xs font-medium text-slate-400">
									{playerName(entry.affectedPlayerId)}
								</span>
							{/if}
							<!-- Action type badge -->
							<span class="ml-auto rounded bg-slate-600 px-1.5 py-0.5 text-xs text-slate-300">
								{entry.actionType}
							</span>
						</div>
						<p class="text-sm text-slate-300">{entry.description}</p>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>
