<script lang="ts">
	import { gameStore } from '$lib/stores/game.svelte.js';
	import { goto } from '$app/navigation';
	import TokenPool from '$lib/components/TokenPool.svelte';

	$effect(() => {
		if (!gameStore.session) goto('/');
	});

	const players = $derived(gameStore.session?.players ?? []);
</script>

<svelte:head>
	<title>Nations — MegaTracker</title>
</svelte:head>

<div class="min-h-screen bg-slate-950 text-white">
	<div class="px-4 pb-4 pt-10">
		<h1 class="mb-4 text-xl font-bold text-white">All Nations</h1>

		{#if players.length === 0}
			<p class="text-slate-400">No players yet.</p>
		{:else}
			<div class="space-y-4">
				{#each players as p (p.playerId)}
					<div
						class="overflow-hidden rounded-lg bg-slate-800"
						style:border-left="4px solid var(--color-{p.civilisationId})"
					>
						<!-- Header -->
						<div class="flex items-center gap-2 px-3 py-2">
							<div class="flex-1 min-w-0">
								<div class="flex items-center gap-2">
									<span class="font-semibold text-white truncate">{p.playerName}</span>
									{#if p.playerId === gameStore.myPlayerId}
										<span class="rounded bg-blue-600 px-1.5 py-0.5 text-xs font-medium text-white">You</span>
									{/if}
									{#if p.isHost}
										<span class="rounded bg-amber-600 px-1.5 py-0.5 text-xs font-medium text-white">Host</span>
									{/if}
								</div>
								<p class="text-xs text-slate-400">{p.civilisationName}</p>
							</div>

							<!-- Connection status -->
							<div class="flex items-center gap-1">
								<span
									class="h-2 w-2 rounded-full"
									class:bg-green-400={p.connectionStatus === 'connected'}
									class:bg-amber-400={p.connectionStatus === 'disconnected'}
									class:bg-red-500={p.connectionStatus === 'removed'}
								></span>
								<span class="text-xs text-slate-500 capitalize">{p.connectionStatus}</span>
							</div>
						</div>

						<!-- Token pool (read-only) -->
						<div class="px-3 pb-1">
							<TokenPool player={p} readonly={true} />
						</div>

						<!-- Stats row -->
						<div class="grid grid-cols-4 divide-x divide-slate-700 border-t border-slate-700">
							<div class="flex flex-col items-center py-2">
								<span class="text-lg font-bold text-white">{p.citiesOnBoard}</span>
								<span class="text-xs text-slate-400">Cities</span>
							</div>
							<div class="flex flex-col items-center py-2">
								<span class="text-lg font-bold text-white">{p.shipsOnBoard}</span>
								<span class="text-xs text-slate-400">Ships</span>
							</div>
							<div class="flex flex-col items-center py-2">
								<span class="text-lg font-bold text-white">{p.astPosition}</span>
								<span class="text-xs text-slate-400">AST</span>
							</div>
							<div class="flex flex-col items-center py-2">
								<span class="text-lg font-bold text-white">
									{Object.values(p.commodityHand).reduce((a, b) => a + b, 0)}
								</span>
								<span class="text-xs text-slate-400">Comms</span>
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>
