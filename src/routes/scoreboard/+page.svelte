<script lang="ts">
	import { gameStore } from '$lib/stores/game.svelte.js';
	import { goto } from '$app/navigation';
	import { calcVictoryPoints } from '$lib/utils/vp.js';
	import { CARD_MAP } from '$lib/data/cards.js';

	$effect(() => {
		if (!gameStore.session) goto('/');
	});

	const ranked = $derived(
		(gameStore.session?.players ?? [])
			.map((p) => ({ p, vp: calcVictoryPoints(p, CARD_MAP, false) }))
			.sort((a, b) => b.vp.total - a.vp.total || a.p.astRanking - b.p.astRanking)
	);
</script>

<svelte:head>
	<title>Scoreboard — MegaTracker</title>
</svelte:head>

<div class="min-h-screen bg-slate-950 text-white">
	<div class="px-4 pb-4 pt-10">
		<h1 class="mb-4 text-xl font-bold text-white">Scoreboard</h1>
		<p class="mb-4 text-xs text-slate-500">
			Turn {gameStore.currentTurn} · Phase {gameStore.currentPhase}
		</p>

		{#if ranked.length === 0}
			<p class="text-slate-400">No players yet.</p>
		{:else}
			<div class="space-y-2">
				{#each ranked as { p, vp }, i (p.playerId)}
					<div
						class="relative overflow-hidden rounded-lg bg-slate-800"
						style:border-left="4px solid var(--color-{p.civilisationId})"
					>
						<div class="flex items-center gap-3 p-3">
							<!-- Rank -->
							<span class="w-6 text-center text-sm font-bold text-slate-400">#{i + 1}</span>

							<!-- Nation info -->
							<div class="flex-1 min-w-0">
								<p class="font-semibold text-white truncate">{p.playerName}</p>
								<p class="text-xs text-slate-400 truncate">{p.civilisationName}</p>
							</div>

							<!-- VP breakdown chips -->
							<div class="flex flex-wrap gap-1 justify-end">
								{#if vp.cities > 0}
									<span class="rounded bg-slate-700 px-1.5 py-0.5 text-xs text-slate-300">
										🏛 {vp.cities}
									</span>
								{/if}
								{#if vp.cardVp1 + vp.cardVp3 + vp.cardVp6 > 0}
									<span class="rounded bg-slate-700 px-1.5 py-0.5 text-xs text-slate-300">
										📜 {vp.cardVp1 * 1 + vp.cardVp3 * 3 + vp.cardVp6 * 6}
									</span>
								{/if}
								{#if vp.astVp > 0}
									<span class="rounded bg-slate-700 px-1.5 py-0.5 text-xs text-slate-300">
										📊 {vp.astVp}
									</span>
								{/if}
								{#if vp.lateIronAgeBonus > 0}
									<span class="rounded bg-amber-700 px-1.5 py-0.5 text-xs text-amber-200">
										LIA +5
									</span>
								{/if}
							</div>

							<!-- Total VP -->
							<span class="ml-2 text-2xl font-bold" style:color="var(--color-{p.civilisationId})">
								{vp.total}
							</span>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>
