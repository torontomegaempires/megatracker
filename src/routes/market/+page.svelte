<script lang="ts">
	import { gameStore } from '$lib/stores/game.svelte.js';
	import { sessionMetaStore } from '$lib/stores/session-meta.svelte.js';
	import { hostNet } from '$lib/net/host.svelte.js';
	import { clientNet } from '$lib/net/client.svelte.js';
	import { toastStore } from '$lib/stores/toast.svelte.js';
	import { goto } from '$app/navigation';
	import { CARDS, CARD_MAP } from '$lib/data/cards.js';
	import { calcNetCardCost } from '$lib/utils/vp.js';
	import { buildActionEntry } from '$lib/utils/action-builder.js';
	import type { CardGroup, CivilisationCard } from '$lib/types/game.js';

	// Redirect if no active session
	$effect(() => {
		if (!gameStore.session) goto('/');
	});

	type GroupFilter = 'All' | CardGroup;
	let selectedGroup = $state<GroupFilter>('All');

	const groups: GroupFilter[] = ['All', 'Arts', 'Crafts', 'Sciences', 'Religion', 'Civics'];

	const groupColors: Record<CardGroup, string> = {
		Arts: 'bg-purple-700 text-purple-100',
		Crafts: 'bg-amber-700 text-amber-100',
		Sciences: 'bg-blue-700 text-blue-100',
		Religion: 'bg-emerald-700 text-emerald-100',
		Civics: 'bg-rose-700 text-rose-100'
	};

	const groupFilterColors: Record<GroupFilter, string> = {
		All: 'bg-slate-600 text-slate-100',
		Arts: 'bg-purple-700 text-purple-100',
		Crafts: 'bg-amber-700 text-amber-100',
		Sciences: 'bg-blue-700 text-blue-100',
		Religion: 'bg-emerald-700 text-emerald-100',
		Civics: 'bg-rose-700 text-rose-100'
	};

	const vpBadgeColors: Record<1 | 3 | 6, string> = {
		1: 'bg-slate-600 text-slate-200',
		3: 'bg-yellow-700 text-yellow-100',
		6: 'bg-amber-500 text-amber-950'
	};

	const filteredCards = $derived.by(() => {
		const session = gameStore.session;
		const variant = session?.variant ?? 'Full';

		return CARDS.filter((card) => {
			if (variant === 'Western' && card.deck !== 'Western') return false;
			if (variant === 'Eastern' && card.deck !== 'Eastern') return false;
			if (selectedGroup !== 'All' && card.group !== selectedGroup) return false;
			return true;
		});
	});

	function getNetCost(card: CivilisationCard): number {
		const player = gameStore.myPlayer;
		if (!player) return card.baseCost;
		const ownedCards = player.ownedCardIds
			.map((id) => CARD_MAP.get(id))
			.filter((c): c is CivilisationCard => c !== undefined);
		return calcNetCardCost(card, ownedCards);
	}

	function canBuy(card: CivilisationCard): boolean {
		const session = gameStore.session;
		const player = gameStore.myPlayer;
		if (!session || !player) return false;
		if (session.currentPhase !== 12) return false;
		if (player.ownedCardIds.includes(card.cardId)) return false;
		return player.inTreasury >= getNetCost(card);
	}

	function isOwned(cardId: string): boolean {
		return gameStore.myPlayer?.ownedCardIds.includes(cardId) ?? false;
	}

	function purchaseCard(card: CivilisationCard) {
		const netCost = getNetCost(card);
		const role = sessionMetaStore.role;

		if (role === 'host') {
			const err = hostNet.applyHostCardPurchase(card.cardId);
			if (err) toastStore.add(err, 'error');
		} else if (role === 'client') {
			clientNet.sendCardPurchase(card.cardId, netCost);
		} else {
			// Demo mode — apply directly to store
			const player = gameStore.myPlayer;
			const playerId = gameStore.myPlayerId;
			if (!player || !playerId) return;

			if (player.ownedCardIds.includes(card.cardId)) {
				toastStore.add(`You already own ${card.name}.`, 'error');
				return;
			}
			if (player.inTreasury < netCost) {
				toastStore.add(`Insufficient treasury for ${card.name}.`, 'error');
				return;
			}

			if (netCost > 0) {
				gameStore.applyPlayerTransfers(playerId, [
					{ from: 'inTreasury', to: 'populationInStock', amount: netCost }
				]);
			}
			gameStore.updatePlayerFields(playerId, {
				ownedCardIds: [...player.ownedCardIds, card.cardId]
			});

			const entry = buildActionEntry({
				actionType: 'PURCHASE_CARD',
				description: `${player.playerName} purchased ${card.name} for ${netCost} treasury.`,
				initiatedBy: playerId,
				affectedPlayerId: playerId,
				previousValue: { inTreasury: player.inTreasury, ownedCardIds: player.ownedCardIds },
				newValue: { cardId: card.cardId, netCost }
			});
			gameStore.appendActionEntry(entry);

			toastStore.add(`Purchased ${card.name}!`, 'success');
		}
	}

	const btnPrimary =
		'rounded bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed';
</script>

<svelte:head>
	<title>Card Market — MegaTracker</title>
</svelte:head>

<div class="min-h-screen bg-slate-950 text-white">
	<div class="px-4 pb-4 pt-10">
		<div class="mb-4 flex items-center justify-between">
			<h1 class="text-xl font-bold text-white">Card Market</h1>
			<div class="text-right">
				<span class="text-xs text-slate-400">Phase {gameStore.currentPhase}</span>
				{#if gameStore.currentPhase !== 12}
					<p class="text-xs text-amber-400">Available in Phase 12</p>
				{/if}
			</div>
		</div>

		<!-- Treasury indicator -->
		{#if gameStore.myPlayer}
			<div class="mb-4 rounded-lg bg-slate-800 px-3 py-2">
				<span class="text-xs text-slate-400">Your Treasury: </span>
				<span class="font-bold text-amber-400">{gameStore.myPlayer.inTreasury}</span>
				<span class="ml-3 text-xs text-slate-400">Cards owned: </span>
				<span class="font-bold text-white">{gameStore.myPlayer.ownedCardIds.length}</span>
			</div>
		{/if}

		<!-- Group filter pills -->
		<div class="mb-4 flex flex-wrap gap-2">
			{#each groups as group (group)}
				<button
					onclick={() => (selectedGroup = group)}
					class="rounded-full px-3 py-1 text-xs font-semibold transition-opacity {selectedGroup === group
						? groupFilterColors[group]
						: 'bg-slate-700 text-slate-400 opacity-60'}"
				>
					{group}
				</button>
			{/each}
		</div>

		<!-- Card count -->
		<p class="mb-3 text-xs text-slate-500">
			{filteredCards.length} card{filteredCards.length !== 1 ? 's' : ''} shown
		</p>

		<!-- Card grid -->
		{#if filteredCards.length === 0}
			<p class="text-slate-400">No cards match the current filter.</p>
		{:else}
			<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
				{#each filteredCards as card (card.cardId)}
					{@const netCost = getNetCost(card)}
					{@const owned = isOwned(card.cardId)}
					{@const discounted = netCost < card.baseCost}
					<div
						class="flex flex-col rounded-lg border bg-slate-800 p-3 {owned
							? 'border-emerald-700'
							: 'border-slate-700'}"
					>
						<!-- Card header -->
						<div class="mb-2 flex items-start justify-between gap-2">
							<div class="min-w-0 flex-1">
								<h3 class="truncate text-sm font-bold text-white">{card.name}</h3>
								<p class="text-xs text-slate-500">{card.deck} deck</p>
							</div>
							<div class="flex shrink-0 flex-col items-end gap-1">
								<span class="rounded px-1.5 py-0.5 text-xs font-semibold {groupColors[card.group]}">
									{card.group}
								</span>
								<span class="rounded px-1.5 py-0.5 text-xs font-bold {vpBadgeColors[card.vpTier]}">
									{card.vpTier} VP
								</span>
							</div>
						</div>

						<!-- Cost display -->
						<div class="mb-2 flex items-baseline gap-2">
							{#if discounted}
								<span class="text-lg font-bold text-amber-400">{netCost}</span>
								<span class="text-sm text-slate-500 line-through">{card.baseCost}</span>
								<span class="text-xs text-emerald-400">−{card.baseCost - netCost}</span>
							{:else}
								<span class="text-lg font-bold text-white">{card.baseCost}</span>
							{/if}
							<span class="text-xs text-slate-500">treasury</span>
						</div>

						<!-- Credits this card gives -->
						{#if card.credits.length > 0}
							<div class="mb-2">
								<p class="mb-1 text-xs text-slate-500">Credits given:</p>
								<div class="flex flex-wrap gap-1">
									{#each card.credits as credit (credit.targetCardId)}
										{@const targetCard = CARD_MAP.get(credit.targetCardId)}
										{#if targetCard}
											<span class="rounded bg-slate-700 px-1.5 py-0.5 text-xs text-slate-300">
												{targetCard.name} −{credit.creditAmount}
											</span>
										{/if}
									{/each}
								</div>
							</div>
						{/if}

						<!-- Description (truncated) -->
						<p class="mb-2 line-clamp-2 flex-1 text-xs text-slate-400">{card.description}</p>

						<!-- Action -->
						{#if owned}
							<div class="mt-auto flex items-center gap-1 rounded bg-emerald-900/40 px-2 py-1">
								<span class="text-xs font-semibold text-emerald-400">Owned</span>
							</div>
						{:else}
							<button
								onclick={() => purchaseCard(card)}
								disabled={!canBuy(card)}
								class="mt-auto {btnPrimary}"
								title={gameStore.currentPhase !== 12
									? 'Only available in Phase 12'
									: `Cost: ${netCost} treasury`}
							>
								Buy for {netCost}
							</button>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>
