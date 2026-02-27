<script lang="ts">
	import { onMount } from 'svelte';
	import { CARDS } from '$lib/data/cards.js';
	import { CARD_MAP } from '$lib/data/cards.js';
	import { CALAMITIES } from '$lib/data/calamities.js';
	import { COMMODITIES, calcCommoditySetValue } from '$lib/data/commodities.js';
	import type { CivilizationCard } from '$lib/types/game.js';

	// ── Search & Filters ───────────────────────────────────────────────────────
	let query = $state('');
	let cardGroup = $state('All');
	let cardDeck = $state('All');
	let expandedCardId = $state<string | null>(null);
	let expandedCalamityId = $state<string | null>(null);

	// ── Phase data ─────────────────────────────────────────────────────────────
	const PHASES = [
		{
			num: 1,
			name: 'Tax Collection',
			transfer: 'inStock → inTreasury',
			detail: '2 tokens per city. Skip if no player has cities. Tax revolt flag if inStock insufficient.'
		},
		{
			num: 2,
			name: 'Population Expansion',
			transfer: 'inStock → onBoard',
			detail:
				'Default expand amount = populationOnBoard; max = min(populationOnBoard, populationInStock). Must expand as many as possible.'
		},
		{
			num: 3,
			name: 'Movement',
			transfer: 'Varies per ship action',
			detail:
				'Build ship: 2 pop / 1 pop + 1 treasury / 2 treasury. Maintain: 1 pop / 1 treasury. Destroy: ship → stock, no token cost. Built ships must maintain or destroy same turn.'
		},
		{
			num: 4,
			name: 'Conflict',
			transfer: 'onBoard → inStock (losses); inStock → inTreasury (plunder)',
			detail:
				'Preset loss buttons: 1–6, or variable. Plunder: +3 inTreasury (via inStock→inTreasury). City Loss: −1 city. All pending, shown as running totals; applied on Confirm.'
		},
		{
			num: 5,
			name: 'Build Cities',
			transfer: 'populationOnBoard → inStock',
			detail:
				'Build City: 6 population + 1 city. Wilderness City: 12 population + 1 city. Max 9 cities total.'
		},
		{
			num: 6,
			name: 'Trade Card Acquisition',
			transfer: 'inTreasury → inStock (15 per Gold)',
			detail:
				'Eligible trade cards = citiesOnBoard. "Buy Gold": 15 inTreasury → inStock, +1 Gold added to commodity hand. Dealing order: fewest cities first; AST ranking breaks ties.'
		},
		{
			num: 7,
			name: 'Trade',
			transfer: 'Field updates only',
			detail:
				'Players negotiate commodity exchanges. Update commodity hand. Record calamity cards held in calamityHand. Display shows commodity rank (1–9) and running set value.'
		},
		{
			num: 8,
			name: 'Calamity Selection',
			transfer: 'No token movement',
			detail:
				'Skip if all players ≤ limit. Limit: 1–8 players = 2 calamities; 9–18 = 3 calamities (max 2 Major / non-tradeable). Players over limit discard until at limit.'
		},
		{
			num: 9,
			name: 'Calamity Resolution',
			transfer: 'onBoard → inStock / inTreasury → inStock / citiesOnBoard → citiesInStock',
			detail:
				'Resolve each held calamity. Population loss: onBoard → inStock. Treasury loss: inTreasury → inStock. City loss: citiesOnBoard → citiesInStock.'
		},
		{
			num: 10,
			name: 'AST Advancement Eligibility',
			transfer: 'None',
			detail:
				'Check AST advancement requirements for each player. No token movement. Determines who may advance in Phase 12.'
		},
		{
			num: 11,
			name: 'Civilization Advances',
			transfer: 'inTreasury → inStock',
			detail:
				'Purchase civilization advance cards. Cost paid from inTreasury → inStock. Credits from owned cards reduce cost. Cannot overpay; excess commodity value forfeited.'
		},
		{
			num: 12,
			name: 'AST Advancement',
			transfer: 'Field update only',
			detail:
				'Eligible players advance their AST position. Each step grants 5 VP. First player to enter Late Iron Age earns a 5 VP bonus.'
		}
	];

	// ── Commodity set values ───────────────────────────────────────────────────
	const SET_COUNTS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;
	const commodityRows = COMMODITIES.map((c) => ({
		...c,
		setValues: SET_COUNTS.map((n) => calcCommoditySetValue(c.faceValue, n))
	}));

	// Group commodities by face value for display
	const uniqueFaceValues = [...new Set(COMMODITIES.map((c) => c.faceValue))].sort((a, b) => a - b);

	// ── Card credit inverse lookup ─────────────────────────────────────────────
	// creditedBy[cardId] = list of { fromCard, amount } — owned cards that reduce cost
	const creditedBy: Record<string, Array<{ fromCard: CivilizationCard; amount: number }>> = {};
	for (const card of CARDS) {
		for (const credit of card.credits) {
			if (!creditedBy[credit.targetCardId]) creditedBy[credit.targetCardId] = [];
			creditedBy[credit.targetCardId].push({ fromCard: card, amount: credit.creditAmount });
		}
	}

	// ── Derived filtered lists ─────────────────────────────────────────────────
	const filteredCards = $derived(
		CARDS.filter((c) => {
			if (cardGroup !== 'All' && c.group !== cardGroup) return false;
			if (cardDeck !== 'All' && c.deck !== cardDeck) return false;
			if (query) {
				const q = query.toLowerCase();
				return (
					c.name.toLowerCase().includes(q) ||
					c.description.toLowerCase().includes(q) ||
					c.specialAbilityDescription.toLowerCase().includes(q) ||
					c.group.toLowerCase().includes(q)
				);
			}
			return true;
		})
	);

	const filteredCalamities = $derived(
		!query
			? [...CALAMITIES]
			: CALAMITIES.filter((c) => {
					const q = query.toLowerCase();
					return (
						c.name.toLowerCase().includes(q) ||
						c.description.toLowerCase().includes(q) ||
						c.resolutionSteps.toLowerCase().includes(q)
					);
				})
	);

	const majorCalamities = $derived(filteredCalamities.filter((c) => c.type === 'non-tradeable'));
	const minorCalamities = $derived(filteredCalamities.filter((c) => c.type === 'tradeable'));

	// ── Helpers ────────────────────────────────────────────────────────────────
	const GROUP_BADGE: Record<string, string> = {
		Arts: 'bg-purple-900/60 text-purple-300',
		Crafts: 'bg-amber-900/60 text-amber-300',
		Sciences: 'bg-blue-900/60 text-blue-300',
		Religion: 'bg-rose-900/60 text-rose-300',
		Civics: 'bg-green-900/60 text-green-300'
	};

	const VP_TIER_BADGE: Record<number, string> = {
		1: 'bg-slate-700 text-slate-300',
		3: 'bg-yellow-900/60 text-yellow-300',
		6: 'bg-orange-900/60 text-orange-300'
	};

	const GROUPS = ['All', 'Arts', 'Crafts', 'Sciences', 'Religion', 'Civics'];
	const DECKS = ['All', 'Western', 'Eastern'];

	function scrollTo(id: string) {
		history.pushState(null, '', '#' + id);
		document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
	}

	function toggleCard(id: string) {
		expandedCardId = expandedCardId === id ? null : id;
	}

	function toggleCalamity(id: string) {
		expandedCalamityId = expandedCalamityId === id ? null : id;
	}

	onMount(() => {
		if (window.location.hash) {
			const el = document.querySelector(window.location.hash);
			if (el) el.scrollIntoView({ behavior: 'smooth' });
		}
	});
</script>

<svelte:head>
	<title>Rules Reference — MegaTracker</title>
</svelte:head>

<div class="min-h-screen bg-slate-950 pb-8">
	<!-- ── Sticky header ──────────────────────────────────────────────────── -->
	<div class="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
		<div class="flex items-center gap-3 px-4 py-3">
			<h1 class="text-sm font-semibold text-white">Rules Reference</h1>
			<input
				type="search"
				bind:value={query}
				placeholder="Search cards, calamities…"
				aria-label="Search cards and calamities"
				class="ml-auto w-44 rounded-lg bg-slate-800 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
			/>
		</div>

		<!-- Section jump nav -->
		<div class="flex gap-1 overflow-x-auto px-4 pb-2">
			{#each [['phases', 'Phases'], ['token-pool', 'Token Pool'], ['vp', 'Victory Points'], ['cards', 'Cards'], ['calamities', 'Calamities'], ['commodities', 'Commodities'], ['ast', 'AST']] as [id, label] (id)}
				<button
					onclick={() => scrollTo(id)}
					class="shrink-0 rounded bg-slate-800 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-700 hover:text-white"
				>
					{label}
				</button>
			{/each}
		</div>
	</div>

	<div class="mx-auto max-w-2xl px-4">
		<!-- ── Phase Summary ─────────────────────────────────────────────────── -->
		<section id="phases" class="mt-6">
			<h2 class="mb-3 text-base font-bold text-white">Phase Summary</h2>
			<div class="space-y-2">
				{#each PHASES as phase (phase.num)}
					<div class="rounded-lg border border-slate-800 bg-slate-900 p-3">
						<div class="mb-1 flex items-center gap-2">
							<span
								class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-900/60 text-xs font-bold text-blue-300"
							>
								{phase.num}
							</span>
							<span class="font-medium text-white">{phase.name}</span>
						</div>
						<p class="mb-1 text-xs text-slate-300">{phase.detail}</p>
						<p class="text-[10px] text-slate-500">Transfer: {phase.transfer}</p>
					</div>
				{/each}
			</div>
		</section>

		<!-- ── Token Pool ────────────────────────────────────────────────────── -->
		<section id="token-pool" class="mt-8">
			<h2 class="mb-3 text-base font-bold text-white">Token Pool (55-Token Invariant)</h2>
			<div class="rounded-lg border border-amber-800/40 bg-amber-950/20 p-4">
				<p class="mb-3 font-mono text-sm text-amber-300">
					populationOnBoard + populationInStock + inTreasury === 55
				</p>
				<p class="mb-2 text-xs text-slate-300">
					Every player always has exactly 55 tokens distributed across three buckets. Cities and
					ships are <em>not</em> part of the 55.
				</p>
				<div class="mt-3 grid grid-cols-3 gap-2 text-xs">
					<div class="rounded bg-slate-800 p-2 text-center">
						<div class="font-semibold text-blue-300">Population</div>
						<div class="text-slate-400">tokens on map</div>
					</div>
					<div class="rounded bg-slate-800 p-2 text-center">
						<div class="font-semibold text-green-300">Stock</div>
						<div class="text-slate-400">tokens off map</div>
					</div>
					<div class="rounded bg-slate-800 p-2 text-center">
						<div class="font-semibold text-yellow-300">Treasury</div>
						<div class="text-slate-400">tokens held</div>
					</div>
				</div>
				<p class="mt-3 text-xs text-slate-400">
					Starting distribution: Population=1, Stock=54, Treasury=0. All state changes are bucket
					transfers — never direct mutations.
				</p>
			</div>
		</section>

		<!-- ── Victory Points ────────────────────────────────────────────────── -->
		<section id="vp" class="mt-8">
			<h2 class="mb-3 text-base font-bold text-white">Victory Points</h2>
			<div class="rounded-lg border border-slate-800 bg-slate-900 p-4">
				<div class="space-y-2 font-mono text-sm">
					<div class="flex justify-between">
						<span class="text-slate-300">Cities on board</span>
						<span class="text-white">× 1 VP each</span>
					</div>
					<div class="flex justify-between">
						<span class="text-slate-300">Cards with cost &lt; 100</span>
						<span class="text-yellow-300">× 1 VP each</span>
					</div>
					<div class="flex justify-between">
						<span class="text-slate-300">Cards with cost 100–199</span>
						<span class="text-yellow-300">× 3 VP each</span>
					</div>
					<div class="flex justify-between">
						<span class="text-slate-300">Cards with cost ≥ 200</span>
						<span class="text-orange-300">× 6 VP each</span>
					</div>
					<div class="flex justify-between">
						<span class="text-slate-300">AST steps advanced</span>
						<span class="text-blue-300">× 5 VP each</span>
					</div>
					<div class="flex justify-between border-t border-slate-700 pt-2">
						<span class="text-slate-300">First to Late Iron Age</span>
						<span class="text-purple-300">+5 VP bonus</span>
					</div>
				</div>
				<p class="mt-3 text-xs text-slate-500">
					Treasury and commodity hand values do NOT contribute to VP.
				</p>
			</div>
		</section>

		<!-- ── Civilization Cards ─────────────────────────────────────────────── -->
		<section id="cards" class="mt-8">
			<div class="mb-3 flex flex-wrap items-center gap-2">
				<h2 class="text-base font-bold text-white">Civilization Cards</h2>
				<span class="text-xs text-slate-500">({filteredCards.length} shown)</span>
			</div>

			<!-- Filters -->
			<div class="mb-3 flex flex-wrap gap-2">
				<div class="flex gap-1">
					{#each DECKS as deck (deck)}
						<button
							onclick={() => (cardDeck = deck)}
							class="rounded px-2.5 py-1 text-xs transition-colors"
							class:bg-blue-600={cardDeck === deck}
							class:text-white={cardDeck === deck}
							class:bg-slate-800={cardDeck !== deck}
							class:text-slate-400={cardDeck !== deck}
						>
							{deck}
						</button>
					{/each}
				</div>
				<div class="flex flex-wrap gap-1">
					{#each GROUPS as group (group)}
						<button
							onclick={() => (cardGroup = group)}
							class="rounded px-2.5 py-1 text-xs transition-colors"
							class:bg-blue-600={cardGroup === group}
							class:text-white={cardGroup === group}
							class:bg-slate-800={cardGroup !== group}
							class:text-slate-400={cardGroup !== group}
						>
							{group}
						</button>
					{/each}
				</div>
			</div>

			<!-- Card list -->
			{#if filteredCards.length === 0}
				<p class="py-6 text-center text-sm text-slate-500">No cards match your filters.</p>
			{:else}
				<div class="space-y-1.5">
					{#each filteredCards as card (card.cardId)}
						{@const isExpanded = expandedCardId === card.cardId}
						{@const creditsTo = card.credits}
						{@const reducedBy = creditedBy[card.cardId] ?? []}
						<div class="rounded-lg border border-slate-800 bg-slate-900 overflow-hidden">
							<!-- Row header (always visible) -->
							<button
								onclick={() => toggleCard(card.cardId)}
								class="flex w-full items-center gap-2 px-3 py-2.5 text-left"
							>
								<!-- Group colour dot -->
								<span
									class="h-2 w-2 shrink-0 rounded-full"
									style="background: {card.group === 'Arts'
										? '#a855f7'
										: card.group === 'Crafts'
											? '#f59e0b'
											: card.group === 'Sciences'
												? '#3b82f6'
												: card.group === 'Religion'
													? '#f43f5e'
													: '#22c55e'}"
								></span>
								<span class="flex-1 text-sm font-medium text-white">{card.name}</span>
								<span class="text-xs text-slate-400">{card.deck[0]}</span>
								<span class="rounded px-1.5 py-0.5 text-xs {GROUP_BADGE[card.group]}">{card.group}</span>
								<span class="ml-1 rounded px-1.5 py-0.5 text-xs {VP_TIER_BADGE[card.vpTier]}"
									>{card.vpTier} VP</span
								>
								<span class="ml-1 min-w-[3rem] text-right text-xs font-mono text-slate-300"
									>{card.baseCost}T</span
								>
								<span class="ml-1 text-slate-600">{isExpanded ? '▲' : '▼'}</span>
							</button>

							<!-- Expanded details -->
							{#if isExpanded}
								<div class="border-t border-slate-800 px-3 py-3 text-xs space-y-2">
									<p class="text-slate-300">{card.description}</p>
									{#if card.specialAbilityDescription}
										<div class="rounded bg-blue-950/40 px-2 py-1.5 border border-blue-900/30">
											<span class="text-blue-400 font-semibold">Special: </span>
											<span class="text-slate-200">{card.specialAbilityDescription}</span>
										</div>
									{/if}

									<!-- Credits this card grants TO other cards -->
									{#if creditsTo.length > 0}
										<div>
											<p class="text-slate-500 mb-1">Grants credit toward:</p>
											<div class="flex flex-wrap gap-1">
												{#each creditsTo as cr (cr.targetCardId)}
													{@const target = CARD_MAP.get(cr.targetCardId)}
													<span class="rounded bg-green-900/40 border border-green-800/30 px-2 py-0.5 text-green-300">
														{target?.name ?? cr.targetCardId} −{cr.creditAmount}
													</span>
												{/each}
											</div>
										</div>
									{/if}

									<!-- Cards that reduce THIS card's cost -->
									{#if reducedBy.length > 0}
										<div>
											<p class="text-slate-500 mb-1">Cost reduced by owning:</p>
											<div class="flex flex-wrap gap-1">
												{#each reducedBy as rb (rb.fromCard.cardId)}
													<span class="rounded bg-amber-900/40 border border-amber-800/30 px-2 py-0.5 text-amber-300">
														{rb.fromCard.name} −{rb.amount}
													</span>
												{/each}
											</div>
										</div>
									{/if}
								</div>
							{/if}
						</div>
					{/each}
				</div>
			{/if}
		</section>

		<!-- ── Calamities ────────────────────────────────────────────────────── -->
		<section id="calamities" class="mt-8">
			<h2 class="mb-1 text-base font-bold text-white">Calamities</h2>
			<p class="mb-3 text-xs text-slate-500">
				Major = non-tradeable (cannot be passed in trade). Minor = tradeable (can be passed during
				Phase 7).
			</p>

			<!-- Major Calamities -->
			{#if majorCalamities.length > 0}
				<h3 class="mb-2 text-sm font-semibold text-red-400">Major Calamities (non-tradeable)</h3>
				<div class="mb-4 space-y-1.5">
					{#each majorCalamities as cal (cal.calamityId)}
						{@const isExp = expandedCalamityId === cal.calamityId}
						<div class="rounded-lg border border-red-900/30 bg-slate-900 overflow-hidden">
							<button
								onclick={() => toggleCalamity(cal.calamityId)}
								class="flex w-full items-center gap-2 px-3 py-2.5 text-left"
							>
								<span class="h-2 w-2 shrink-0 rounded-full bg-red-500"></span>
								<span class="flex-1 text-sm font-medium text-white">{cal.name}</span>
								<span class="text-xs text-slate-500">Sev {cal.severity}</span>
								{#if cal.mitigatingCardIds.length > 0}
									<span class="text-xs text-green-600">⛨</span>
								{/if}
								<span class="text-slate-600">{isExp ? '▲' : '▼'}</span>
							</button>
							{#if isExp}
								<div class="border-t border-slate-800 px-3 py-3 text-xs space-y-2">
									<p class="text-slate-300">{cal.description}</p>
									<div class="rounded bg-slate-800/60 px-2 py-2">
										<p class="text-slate-400 font-semibold mb-1">Resolution:</p>
										<p class="text-slate-200">{cal.resolutionSteps}</p>
									</div>
									{#if cal.mitigatingCardIds.length > 0}
										<div>
											<p class="text-slate-500 mb-1">Mitigated by:</p>
											<div class="flex flex-wrap gap-1">
												{#each cal.mitigatingCardIds as cardId (cardId)}
													{@const mc = CARD_MAP.get(cardId)}
													<span class="rounded bg-green-900/40 border border-green-800/30 px-2 py-0.5 text-green-300">
														{mc?.name ?? cardId}
													</span>
												{/each}
											</div>
										</div>
									{/if}
								</div>
							{/if}
						</div>
					{/each}
				</div>
			{/if}

			<!-- Minor Calamities -->
			{#if minorCalamities.length > 0}
				<h3 class="mb-2 text-sm font-semibold text-amber-400">Minor Calamities (tradeable)</h3>
				<div class="space-y-1.5">
					{#each minorCalamities as cal (cal.calamityId)}
						{@const isExp = expandedCalamityId === cal.calamityId}
						<div class="rounded-lg border border-amber-900/30 bg-slate-900 overflow-hidden">
							<button
								onclick={() => toggleCalamity(cal.calamityId)}
								class="flex w-full items-center gap-2 px-3 py-2.5 text-left"
							>
								<span class="h-2 w-2 shrink-0 rounded-full bg-amber-500"></span>
								<span class="flex-1 text-sm font-medium text-white">{cal.name}</span>
								<span class="text-xs text-slate-500">Sev {cal.severity}</span>
								{#if cal.mitigatingCardIds.length > 0}
									<span class="text-xs text-green-600">⛨</span>
								{/if}
								<span class="text-slate-600">{isExp ? '▲' : '▼'}</span>
							</button>
							{#if isExp}
								<div class="border-t border-slate-800 px-3 py-3 text-xs space-y-2">
									<p class="text-slate-300">{cal.description}</p>
									<div class="rounded bg-slate-800/60 px-2 py-2">
										<p class="text-slate-400 font-semibold mb-1">Resolution:</p>
										<p class="text-slate-200">{cal.resolutionSteps}</p>
									</div>
									{#if cal.mitigatingCardIds.length > 0}
										<div>
											<p class="text-slate-500 mb-1">Mitigated by:</p>
											<div class="flex flex-wrap gap-1">
												{#each cal.mitigatingCardIds as cardId (cardId)}
													{@const mc = CARD_MAP.get(cardId)}
													<span class="rounded bg-green-900/40 border border-green-800/30 px-2 py-0.5 text-green-300">
														{mc?.name ?? cardId}
													</span>
												{/each}
											</div>
										</div>
									{/if}
								</div>
							{/if}
						</div>
					{/each}
				</div>
			{/if}

			{#if filteredCalamities.length === 0}
				<p class="py-6 text-center text-sm text-slate-500">No calamities match your search.</p>
			{/if}
		</section>

		<!-- ── Commodities ────────────────────────────────────────────────────── -->
		<section id="commodities" class="mt-8">
			<h2 class="mb-1 text-base font-bold text-white">Commodities &amp; Set Values</h2>
			<p class="mb-3 text-xs text-slate-500">
				Set value = face value × n². A set of 3 Iron (f=2) is worth 2 × 9 = 18.
			</p>
			<div class="overflow-x-auto rounded-lg border border-slate-800">
				<table class="w-full text-xs">
					<thead>
						<tr class="border-b border-slate-800 bg-slate-900">
							<th class="py-2 pl-3 pr-2 text-left font-medium text-slate-400">Commodity</th>
							<th class="px-2 py-2 text-center font-medium text-slate-400">f</th>
							{#each SET_COUNTS as n (n)}
								<th class="px-1.5 py-2 text-center font-medium text-slate-500">n={n}</th>
							{/each}
						</tr>
					</thead>
					<tbody>
						{#each commodityRows as row, i (row.type)}
							<tr
								class="border-b border-slate-800/50"
								class:bg-slate-900={i % 2 === 0}
								class:bg-slate-950={i % 2 !== 0}
							>
								<td class="py-1.5 pl-3 pr-2 text-slate-300">{row.type}</td>
								<td class="px-2 py-1.5 text-center text-slate-400">{row.faceValue}</td>
								{#each row.setValues as val, j (j)}
									<td
										class="px-1.5 py-1.5 text-center font-mono"
										class:text-slate-600={val < 10}
										class:text-slate-300={val >= 10 && val < 50}
										class:text-amber-300={val >= 50 && val < 200}
										class:text-orange-300={val >= 200}
									>
										{val}
									</td>
								{/each}
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<!-- Commodity groups by face value -->
			<div class="mt-3 grid grid-cols-3 gap-2">
				{#each uniqueFaceValues as fv (fv)}
					{@const types = COMMODITIES.filter((c) => c.faceValue === fv).map((c) => c.type)}
					<div class="rounded bg-slate-900 border border-slate-800 px-2 py-1.5 text-xs">
						<div class="text-slate-500 mb-0.5">Face value {fv}</div>
						{#each types as t (t)}
							<div class="text-slate-300">{t}</div>
						{/each}
					</div>
				{/each}
			</div>
		</section>

		<!-- ── AST Advancement ───────────────────────────────────────────────── -->
		<section id="ast" class="mt-8 mb-4">
			<h2 class="mb-3 text-base font-bold text-white">AST Advancement</h2>
			<div class="space-y-3">
				<div class="rounded-lg border border-slate-800 bg-slate-900 p-4 text-xs text-slate-300 space-y-2">
					<p>
						Each civilization has an <strong class="text-white">AST ranking</strong> (1–18). Odd ranks
						are Western civilizations; even ranks are Eastern.
					</p>
					<p>
						The <strong class="text-white">AST track</strong> represents historical progress through eras
						(Early Bronze Age → Late Bronze Age → Early Iron Age → Late Iron Age). Players advance
						their <code class="text-blue-300">astPosition</code> when eligible requirements are met.
					</p>
					<p>
						<strong class="text-white">Phase 10</strong> — eligibility is checked. Phase 12 — eligible
						players advance their position.
					</p>
					<p>
						<strong class="text-blue-300">VP from AST: 5 VP × astPosition steps advanced</strong>
						(astPosition − 1, minimum 0).
					</p>
					<p>
						<strong class="text-purple-300">Late Iron Age bonus:</strong> The first (and only) player
						to reach Late Iron Age earns an additional 5 VP. If multiple players enter simultaneously,
						no bonus is awarded.
					</p>
				</div>

				<!-- AST ranking quick reference -->
				<div>
					<p class="mb-2 text-xs font-medium text-slate-400">AST Rankings</p>
					<div class="grid grid-cols-2 gap-1">
						{#each [['Western', 'odd'], ['Eastern', 'even']] as [deck, parity] (deck)}
							<div class="rounded border border-slate-800 bg-slate-900 p-2">
								<p class="mb-1 text-xs font-semibold text-slate-400">{deck} ({parity} ranks)</p>
								<div class="space-y-0.5">
									{#each [1, 2, 3, 4, 5, 6, 7, 8, 9].flatMap((i) => (deck === 'Western' ? [i * 2 - 1] : [i * 2])) as rank (rank)}
										{@const civ = [
											{ rank: 1, name: 'Minoa' },
											{ rank: 2, name: 'Saba' },
											{ rank: 3, name: 'Assyria' },
											{ rank: 4, name: 'Maurya' },
											{ rank: 5, name: 'Celt' },
											{ rank: 6, name: 'Babylon' },
											{ rank: 7, name: 'Carthage' },
											{ rank: 8, name: 'Dravidia' },
											{ rank: 9, name: 'Hatti' },
											{ rank: 10, name: 'Kushan' },
											{ rank: 11, name: 'Rome' },
											{ rank: 12, name: 'Persia' },
											{ rank: 13, name: 'Iberia' },
											{ rank: 14, name: 'Nubia' },
											{ rank: 15, name: 'Hellas' },
											{ rank: 16, name: 'Indus' },
											{ rank: 17, name: 'Egypt' },
											{ rank: 18, name: 'Parthia' }
										].find((c) => c.rank === rank)}
										<div class="flex items-center gap-1.5 text-xs">
											<span class="w-4 text-right text-slate-600">#{rank}</span>
											<span class="text-slate-300">{civ?.name}</span>
										</div>
									{/each}
								</div>
							</div>
						{/each}
					</div>
				</div>

				<p class="text-xs text-slate-600">
					Note: Full AST table (starting eras by player count) should be verified against the
					physical game boards.
				</p>
			</div>
		</section>
	</div>
</div>
