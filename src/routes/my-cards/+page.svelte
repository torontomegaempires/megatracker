<script lang="ts">
	import { gameStore } from '$lib/stores/game.svelte.js';
	import { goto } from '$app/navigation';
	import { CARD_MAP } from '$lib/data/cards.js';
	import type { CardGroup, CivilisationCard } from '$lib/types/game.js';

	$effect(() => {
		if (!gameStore.session) goto('/');
	});

	const groupColors: Record<CardGroup, string> = {
		Arts: 'border-purple-600',
		Crafts: 'border-amber-600',
		Sciences: 'border-blue-600',
		Religion: 'border-emerald-600',
		Civics: 'border-rose-600'
	};

	const groupBadgeColors: Record<CardGroup, string> = {
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

	const groupOrder: CardGroup[] = ['Arts', 'Crafts', 'Sciences', 'Religion', 'Civics'];

	interface GroupedCards {
		group: CardGroup;
		cards: CivilisationCard[];
	}

	const ownedGroups = $derived.by((): GroupedCards[] => {
		const player = gameStore.myPlayer;
		if (!player) return [];

		const ownedCards = player.ownedCardIds
			.map((id) => CARD_MAP.get(id))
			.filter((c): c is CivilisationCard => c !== undefined);

		return groupOrder
			.map((group) => ({
				group,
				cards: ownedCards
					.filter((c) => c.group === group)
					.sort((a, b) => a.name.localeCompare(b.name))
			}))
			.filter((g) => g.cards.length > 0);
	});

	const totalVp = $derived.by(() => {
		const player = gameStore.myPlayer;
		if (!player) return 0;
		let vp = 0;
		for (const id of player.ownedCardIds) {
			const card = CARD_MAP.get(id);
			if (card) vp += card.vpTier;
		}
		return vp;
	});
</script>

<svelte:head>
	<title>My Cards — MegaTracker</title>
</svelte:head>

<div class="min-h-screen bg-slate-950 text-white">
	<div class="px-4 pb-4 pt-10">
		<div class="mb-4 flex items-center justify-between">
			<h1 class="text-xl font-bold text-white">My Cards</h1>
			{#if gameStore.myPlayer}
				<div class="text-right">
					<p class="text-sm font-bold text-white">{gameStore.myPlayer.ownedCardIds.length} cards</p>
					<p class="text-xs text-amber-400">{totalVp} VP from cards</p>
				</div>
			{/if}
		</div>

		{#if !gameStore.myPlayer || gameStore.myPlayer.ownedCardIds.length === 0}
			<div class="rounded-lg border border-slate-700 bg-slate-800 px-4 py-8 text-center">
				<p class="text-slate-400">No cards owned yet.</p>
				<p class="mt-1 text-xs text-slate-500">Purchase during Phase 12 in the Card Market.</p>
				<a
					href="/market"
					class="mt-3 inline-block rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
				>
					Go to Card Market →
				</a>
			</div>
		{:else}
			<div class="space-y-6">
				{#each ownedGroups as { group, cards } (group)}
					<div>
						<h2 class="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
							{group}
							<span class="ml-1 rounded bg-slate-700 px-1.5 py-0.5 text-slate-300">
								{cards.length}
							</span>
						</h2>
						<div class="space-y-2">
							{#each cards as card (card.cardId)}
								<div
									class="rounded-lg border-l-4 bg-slate-800 p-3 {groupColors[card.group]}"
								>
									<!-- Card header -->
									<div class="mb-2 flex items-start justify-between gap-2">
										<div class="min-w-0 flex-1">
											<h3 class="text-sm font-bold text-white">{card.name}</h3>
											<p class="text-xs text-slate-500">{card.deck} · {card.baseCost} treasury</p>
										</div>
										<div class="flex shrink-0 flex-col items-end gap-1">
											<span
												class="rounded px-1.5 py-0.5 text-xs font-semibold {groupBadgeColors[card.group]}"
											>
												{card.group}
											</span>
											<span
												class="rounded px-1.5 py-0.5 text-xs font-bold {vpBadgeColors[card.vpTier]}"
											>
												{card.vpTier} VP
											</span>
										</div>
									</div>

									<!-- Description -->
									<p class="mb-2 text-xs text-slate-400">{card.description}</p>

									<!-- Special ability -->
									{#if card.specialAbilityDescription}
										<div class="rounded bg-slate-700/60 px-2 py-1.5">
											<p class="text-xs font-semibold text-blue-300">Special Ability</p>
											<p class="text-xs text-slate-300">{card.specialAbilityDescription}</p>
										</div>
									{/if}

									<!-- Calamity modifiers -->
									{#if card.calamityModifiers.length > 0}
										<div class="mt-2 space-y-1">
											{#each card.calamityModifiers as mod (mod.calamityId)}
												<div class="flex items-start gap-1.5 rounded bg-emerald-900/30 px-2 py-1">
													<span class="mt-0.5 text-xs text-emerald-400">⚔</span>
													<p class="text-xs text-emerald-300">{mod.description}</p>
												</div>
											{/each}
										</div>
									{/if}

									<!-- Credits given -->
									{#if card.credits.length > 0}
										<div class="mt-2">
											<p class="mb-1 text-xs text-slate-500">Credits toward:</p>
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
								</div>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>
