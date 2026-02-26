<script lang="ts">
	import type { Player, TokenBucket, TokenTransfer } from '../types/game.js';
	import { COMMODITY_TYPES } from '../types/game.js';
	import TokenPool from './TokenPool.svelte';
	import { calcVictoryPoints } from '../utils/vp.js';

	interface Props {
		player: Player;
		isHost?: boolean;
		/** Called with the validated transfer(s) — route to net layer or demo store. */
		onTransfer?: (transfers: TokenTransfer[]) => void;
	}

	let { player, isHost = false, onTransfer }: Props = $props();

	const vpBreakdown = $derived(calcVictoryPoints(player, new Map(), false));
	const commodityTotal = $derived(
		COMMODITY_TYPES.reduce((sum, t) => sum + (player.commodityHand[t] ?? 0), 0)
	);

	/** Bridge TokenPool's (from, to, amount) callback to the TokenTransfer[] interface. */
	function handleTokenPoolTransfer(from: TokenBucket, to: TokenBucket, amount: number) {
		onTransfer?.([{ from, to, amount }]);
	}

	const nationColorStyle = $derived(
		`border-color: var(${player.civilizationId ? `--color-${player.civilizationId}` : '--color-minoa'})`
	);
</script>

<div
	class="flex min-h-0 flex-1 flex-col overflow-y-auto"
	style="--nation-color: var(--color-{player.civilizationId}, #7CB342)"
>
	<!-- Nation header -->
	<div
		class="border-l-4 bg-slate-800 px-4 py-3"
		style={nationColorStyle}
	>
		<div class="flex items-start justify-between">
			<div>
				<h1 class="text-lg font-bold text-white">{player.civilizationName}</h1>
				<p class="text-sm text-slate-400">{player.playerName}</p>
			</div>
			<div class="flex items-center gap-2">
				{#if isHost}
					<span class="rounded bg-purple-700 px-2 py-0.5 text-xs font-semibold text-white">HOST</span>
				{/if}
				<div class="text-right">
					<div class="text-2xl font-bold text-white">{vpBreakdown.total}</div>
					<div class="text-xs text-slate-400">Victory Points</div>
				</div>
			</div>
		</div>

		<!-- VP breakdown (compact) -->
		<div class="mt-2 flex flex-wrap gap-2 text-xs text-slate-400">
			{#if vpBreakdown.cities > 0}
				<span>{vpBreakdown.cities} cities</span>
			{/if}
			{#if vpBreakdown.cardVp1 > 0}
				<span>{vpBreakdown.cardVp1 * 1} card VP (1pt)</span>
			{/if}
			{#if vpBreakdown.cardVp3 > 0}
				<span>{vpBreakdown.cardVp3 * 3} card VP (3pt)</span>
			{/if}
			{#if vpBreakdown.cardVp6 > 0}
				<span>{vpBreakdown.cardVp6 * 6} card VP (6pt)</span>
			{/if}
			{#if vpBreakdown.astVp > 0}
				<span>{vpBreakdown.astVp} AST VP</span>
			{/if}
			{#if vpBreakdown.lateIronAgeBonus > 0}
				<span class="text-yellow-400">+5 Late Iron Age</span>
			{/if}
		</div>
	</div>

	<div class="space-y-3 p-3">
		<!-- Token Pool -->
		<TokenPool {player} onTransfer={handleTokenPoolTransfer} />

		<!-- Cities & Ships -->
		<div class="grid grid-cols-2 gap-3">
			<div class="rounded-lg border border-slate-700 bg-slate-800 p-3">
				<p class="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Cities</p>
				<div class="flex items-baseline gap-1">
					<span class="text-3xl font-bold text-white">{player.citiesOnBoard}</span>
					<span class="text-sm text-slate-400">/ {player.citiesOnBoard + player.citiesInStock} total</span>
				</div>
				<p class="mt-1 text-xs text-slate-500">{player.citiesInStock} in stock</p>
			</div>

			<div class="rounded-lg border border-slate-700 bg-slate-800 p-3">
				<p class="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Ships</p>
				<div class="flex items-baseline gap-1">
					<span class="text-3xl font-bold text-white">{player.shipsOnBoard}</span>
					<span class="text-sm text-slate-400">/ {player.shipsOnBoard + player.shipsInStock} total</span>
				</div>
				<p class="mt-1 text-xs text-slate-500">{player.shipsInStock} in stock</p>
			</div>
		</div>

		<!-- Commodities -->
		<div class="rounded-lg border border-slate-700 bg-slate-800 p-3">
			<div class="mb-2 flex items-center justify-between">
				<p class="text-xs font-semibold uppercase tracking-wide text-slate-400">Commodities</p>
				<span class="text-xs text-slate-400">{commodityTotal} cards</span>
			</div>
			{#if commodityTotal === 0}
				<p class="text-sm text-slate-500">No commodity cards</p>
			{:else}
				<div class="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
					{#each COMMODITY_TYPES as type (type)}
						{@const count = player.commodityHand[type] ?? 0}
						{#if count > 0}
							<div class="flex items-center justify-between rounded bg-slate-700 px-2 py-1">
								<span class="text-xs text-slate-300">{type}</span>
								<span class="ml-1 font-bold text-white">{count}</span>
							</div>
						{/if}
					{/each}
				</div>
			{/if}
		</div>

		<!-- Owned Cards -->
		{#if player.ownedCardIds.length > 0}
			<div class="rounded-lg border border-slate-700 bg-slate-800 p-3">
				<p class="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
					Civilization Cards ({player.ownedCardIds.length})
				</p>
				<p class="text-xs text-slate-500">{player.ownedCardIds.length} card(s) owned</p>
			</div>
		{/if}

		<!-- AST Position -->
		<div class="rounded-lg border border-slate-700 bg-slate-800 p-3">
			<div class="flex items-center justify-between">
				<p class="text-xs font-semibold uppercase tracking-wide text-slate-400">AST Position</p>
				<span class="text-lg font-bold text-white">{player.astPosition}</span>
			</div>
			<p class="mt-0.5 text-xs text-slate-500">Ranking #{player.astRanking}</p>
		</div>
	</div>
</div>
