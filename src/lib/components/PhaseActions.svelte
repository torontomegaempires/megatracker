<script lang="ts">
	import type { Player, TokenTransfer, CommodityType } from '../types/game.js';
	import { COMMODITY_TYPES } from '../types/game.js';
	import {
		buildTaxTransfer,
		buildCityConstructionTransfer,
		buildCardPurchaseTransfer,
		applyTransfer
	} from '../utils/token-pool.js';
	import { CALAMITIES } from '../data/calamities.js';
	import { COMMODITY_MAP, calcCommoditySetValue } from '../data/commodities.js';

	interface Props {
		player: Player;
		phase: number;
		onTransfer: (transfers: TokenTransfer[]) => void;
		onFieldUpdate: (patch: Partial<Player>, description: string) => void;
	}

	let { player, phase, onTransfer, onFieldUpdate }: Props = $props();

	// ── Phase 2 — Population Expansion ──────────────────────────────────────────
	let expandAmount = $state(player.populationOnBoard);
	$effect(() => {
		// Reset when phase or player changes — default = populationOnBoard
		void phase;
		expandAmount = player.populationOnBoard;
	});

	// ── Phase 3 — Movement ───────────────────────────────────────────────────────
	let shipOption = $state<'a' | 'b' | 'c'>('a');

	// ── Phase 4 — Conflict (pending model) ───────────────────────────────────────
	let pendingLosses = $state(0);
	let pendingPlunder = $state(0); // tokens (multiples of 3)
	let pendingCityLoss = $state(0);
	let varLoss = $state(1);

	// ── Phase 7 — Trade (commodity hand editor) ───────────────────────────────────
	let commodityDraft = $state<Record<CommodityType, number>>(
		Object.fromEntries(COMMODITY_TYPES.map((c) => [c, 0])) as Record<CommodityType, number>
	);
	$effect(() => {
		commodityDraft = { ...player.commodityHand };
	});

	const handTotal = $derived(
		COMMODITY_TYPES.reduce((acc, c) => {
			const def = COMMODITY_MAP.get(c);
			if (!def) return acc;
			return acc + calcCommoditySetValue(def.faceValue, commodityDraft[c]);
		}, 0)
	);

	// ── Phase 8 — Calamity Selection ─────────────────────────────────────────────
	let selectedCalamity = $state(CALAMITIES[0].calamityId);

	// ── Phase 9 — Calamity Resolution ────────────────────────────────────────────
	let calamityPopLoss = $state(0);
	let calamityTreasuryLoss = $state(0);
	let calamityCityLoss = $state(0);

	// ── Phase 11 — Civ Advances ──────────────────────────────────────────────────
	let cardPayment = $state(0);

	// ── Helpers ───────────────────────────────────────────────────────────────────

	function phase1CollectTax() {
		const transfer = buildTaxTransfer(player.citiesOnBoard);
		if (transfer.amount === 0) return;
		const check = applyTransfer(player, transfer);
		if (!check.ok) {
			alert(`Tax revolt! ${check.error}`);
			return;
		}
		onTransfer([transfer]);
	}

	function phase2Expand() {
		if (expandAmount <= 0) return;
		onTransfer([{ from: 'populationInStock', to: 'populationOnBoard', amount: expandAmount }]);
	}

	function phase3BuildShip() {
		if (shipOption === 'a') {
			onTransfer([{ from: 'populationOnBoard', to: 'populationInStock', amount: 2 }]);
		} else if (shipOption === 'b') {
			onTransfer([
				{ from: 'populationOnBoard', to: 'populationInStock', amount: 1 },
				{ from: 'inTreasury', to: 'populationInStock', amount: 1 }
			]);
		} else {
			onTransfer([{ from: 'inTreasury', to: 'populationInStock', amount: 2 }]);
		}
		onFieldUpdate(
			{ shipsOnBoard: player.shipsOnBoard + 1, shipsInStock: player.shipsInStock - 1 },
			`${player.playerName} built a ship.`
		);
	}

	function phase3PayMaintenance() {
		const amount = player.shipsOnBoard;
		if (amount === 0) return;
		onTransfer([{ from: 'inTreasury', to: 'populationInStock', amount }]);
	}

	function phase3DestroyShip() {
		if (player.shipsOnBoard === 0) return;
		onFieldUpdate(
			{ shipsOnBoard: player.shipsOnBoard - 1, shipsInStock: player.shipsInStock + 1 },
			`${player.playerName} destroyed a ship (returned to stock).`
		);
	}

	function phase4AddLoss(n: number) {
		pendingLosses += n;
	}

	function phase4AddVarLoss() {
		if (varLoss > 0) pendingLosses += varLoss;
	}

	function phase4AddPlunder() {
		pendingPlunder += 3;
	}

	function phase4AddCityLoss() {
		if (pendingCityLoss < player.citiesOnBoard) pendingCityLoss++;
	}

	function phase4Reset() {
		pendingLosses = 0;
		pendingPlunder = 0;
		pendingCityLoss = 0;
	}

	function phase4Confirm() {
		const transfers: TokenTransfer[] = [];
		if (pendingLosses > 0) {
			transfers.push({ from: 'populationOnBoard', to: 'populationInStock', amount: pendingLosses });
		}
		if (pendingPlunder > 0) {
			transfers.push({ from: 'populationInStock', to: 'inTreasury', amount: pendingPlunder });
		}
		if (transfers.length > 0) onTransfer(transfers);
		if (pendingCityLoss > 0) {
			onFieldUpdate(
				{
					citiesOnBoard: player.citiesOnBoard - pendingCityLoss,
					citiesInStock: player.citiesInStock + pendingCityLoss
				},
				`${player.playerName} lost ${pendingCityLoss} city/cities in conflict.`
			);
		}
		phase4Reset();
	}

	function phase5BuildCity() {
		if (player.citiesInStock === 0) return;
		const transfer = buildCityConstructionTransfer(6);
		const check = applyTransfer(player, transfer);
		if (!check.ok) {
			alert(check.error);
			return;
		}
		onTransfer([transfer]);
		onFieldUpdate(
			{ citiesOnBoard: player.citiesOnBoard + 1, citiesInStock: player.citiesInStock - 1 },
			`${player.playerName} built a city (6 population returned to stock).`
		);
	}

	function phase5WildernessCity() {
		if (player.citiesInStock === 0) return;
		const transfer = buildCityConstructionTransfer(12);
		const check = applyTransfer(player, transfer);
		if (!check.ok) {
			alert(check.error);
			return;
		}
		onTransfer([transfer]);
		onFieldUpdate(
			{ citiesOnBoard: player.citiesOnBoard + 1, citiesInStock: player.citiesInStock - 1 },
			`${player.playerName} built a wilderness city (12 population returned to stock).`
		);
	}

	function phase6BuyGold() {
		if (player.inTreasury < 15) return;
		onTransfer([{ from: 'inTreasury', to: 'populationInStock', amount: 15 }]);
		const newHand = { ...player.commodityHand };
		newHand['Gold'] = Math.min(9, (newHand['Gold'] ?? 0) + 1);
		onFieldUpdate(
			{ commodityHand: newHand },
			`${player.playerName} bought 1 Gold commodity (15 treasury).`
		);
	}

	function phase7UpdateHand() {
		onFieldUpdate(
			{ commodityHand: { ...commodityDraft } },
			`${player.playerName} updated commodity hand.`
		);
	}

	function phase8RecordCalamity() {
		const calamity = CALAMITIES.find((c) => c.calamityId === selectedCalamity);
		if (!calamity) return;
		onFieldUpdate({}, `Calamity: ${calamity.name} recorded for ${player.playerName}.`);
	}

	function phase9ResolveCalamity() {
		const transfers: TokenTransfer[] = [];
		if (calamityPopLoss > 0) {
			transfers.push({
				from: 'populationOnBoard',
				to: 'populationInStock',
				amount: calamityPopLoss
			});
		}
		if (calamityTreasuryLoss > 0) {
			transfers.push({
				from: 'inTreasury',
				to: 'populationInStock',
				amount: calamityTreasuryLoss
			});
		}
		if (transfers.length > 0) {
			onTransfer(transfers);
		}
		if (calamityCityLoss > 0) {
			onFieldUpdate(
				{
					citiesOnBoard: Math.max(0, player.citiesOnBoard - calamityCityLoss),
					citiesInStock: player.citiesInStock + calamityCityLoss
				},
				`${player.playerName} lost ${calamityCityLoss} city/cities to calamity.`
			);
		}
	}

	function phase11PayCivAdvance() {
		if (cardPayment <= 0) return;
		const transfer = buildCardPurchaseTransfer(cardPayment);
		const check = applyTransfer(player, transfer);
		if (!check.ok) {
			alert(check.error);
			return;
		}
		onTransfer([transfer]);
	}

	function phase12AdvanceAst() {
		onFieldUpdate(
			{ astPosition: player.astPosition + 1 },
			`${player.playerName} advanced on the AST track to position ${player.astPosition + 1}.`
		);
	}

	const panelClass = 'rounded-lg border border-slate-700 bg-slate-800 p-4';
	const labelClass = 'text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3';
	const btnPrimary =
		'rounded bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-500 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed';
	const btnSecondary =
		'rounded bg-slate-600 px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-slate-500 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed';
	const inputClass = 'w-20 rounded bg-slate-700 px-2 py-1 text-center text-sm text-white';
</script>

<div class={panelClass}>
	<p class={labelClass}>Phase {phase} Actions</p>

	{#if phase === 1}
		<!-- Tax Collection -->
		<p class="mb-3 text-sm text-slate-300">
			Collect tax: <span class="font-bold text-amber-400">{2 * player.citiesOnBoard}</span> tokens
			({player.citiesOnBoard} cities × 2) from stock → treasury.
		</p>
		{#if player.populationInStock < 2 * player.citiesOnBoard}
			<p class="mb-2 text-xs text-amber-400">
				Warning: insufficient stock — tax revolt may occur!
			</p>
		{/if}
		<button onclick={phase1CollectTax} disabled={player.citiesOnBoard === 0} class={btnPrimary}>
			Collect Tax
		</button>

	{:else if phase === 2}
		<!-- Population Expansion -->
		<p class="mb-3 text-sm text-slate-300">
			Move tokens from stock → board. Default = population on board.
		</p>
		<div class="flex items-center gap-3">
			<button
				onclick={() => (expandAmount = Math.max(0, expandAmount - 1))}
				class={btnSecondary}
				aria-label="Decrease expand amount"
			>−</button>
			<label for="expand-amount" class="text-sm text-slate-400">Amount:</label>
			<input
				id="expand-amount"
				type="number"
				bind:value={expandAmount}
				min="0"
				max={player.populationInStock}
				class={inputClass}
			/>
			<button
				onclick={() => (expandAmount = Math.min(player.populationInStock, expandAmount + 1))}
				class={btnSecondary}
				aria-label="Increase expand amount"
			>+</button>
		</div>
		<p class="mt-1 text-xs text-slate-500">Available in stock: {player.populationInStock}</p>
		<button onclick={phase2Expand} disabled={expandAmount <= 0} class="mt-3 {btnPrimary}">
			Expand Population
		</button>

	{:else if phase === 3}
		<!-- Movement -->
		<p class="mb-2 text-sm text-slate-300">Manage ships this turn.</p>

		<div class="mb-3 rounded-md bg-slate-700/50 p-3">
			<p class="mb-2 text-xs font-semibold text-slate-400">Build Ship — choose cost:</p>
			<div class="mb-2 space-y-1.5">
				<label class="flex items-center gap-2 text-sm text-slate-300">
					<input type="radio" bind:group={shipOption} value="a" class="accent-blue-500" />
					2 population
				</label>
				<label class="flex items-center gap-2 text-sm text-slate-300">
					<input type="radio" bind:group={shipOption} value="b" class="accent-blue-500" />
					1 population + 1 treasury
				</label>
				<label class="flex items-center gap-2 text-sm text-slate-300">
					<input type="radio" bind:group={shipOption} value="c" class="accent-blue-500" />
					2 treasury
				</label>
			</div>
			<button
				onclick={phase3BuildShip}
				disabled={player.shipsInStock === 0}
				class={btnPrimary}
			>
				Build Ship ({player.shipsOnBoard} built / {player.shipsOnBoard + player.shipsInStock} total)
			</button>
		</div>

		<div class="flex flex-wrap gap-2">
			<button
				onclick={phase3PayMaintenance}
				disabled={player.shipsOnBoard === 0}
				class={btnSecondary}
			>
				Maintain All ({player.shipsOnBoard} ships)
			</button>
			<button
				onclick={phase3DestroyShip}
				disabled={player.shipsOnBoard === 0}
				class={btnSecondary}
			>
				Destroy Ship
			</button>
		</div>

	{:else if phase === 4}
		<!-- Conflict — pending totals applied on Confirm -->
		<p class="mb-3 text-sm text-slate-300">Record losses. Changes apply when you press Confirm.</p>

		<div class="mb-3">
			<p class="mb-1.5 text-xs text-slate-400">Add population losses:</p>
			<div class="flex flex-wrap gap-1.5">
				{#each [1, 2, 3, 4, 5, 6] as n (n)}
					<button
						onclick={() => phase4AddLoss(n)}
						class="h-9 w-9 rounded bg-slate-600 text-sm font-bold text-slate-200 hover:bg-slate-500 active:scale-95"
					>
						{n}
					</button>
				{/each}
				<div class="flex items-center gap-1">
					<input
						type="number"
						bind:value={varLoss}
						min="1"
						class="w-14 rounded bg-slate-700 px-2 py-1.5 text-center text-sm text-white"
						aria-label="Variable loss amount"
					/>
					<button onclick={phase4AddVarLoss} class={btnSecondary}>+Add</button>
				</div>
			</div>
		</div>

		<div class="mb-3 flex flex-wrap gap-2">
			<button onclick={phase4AddPlunder} class={btnSecondary}>Plunder City (+3 treasury)</button>
			<button
				onclick={phase4AddCityLoss}
				disabled={pendingCityLoss >= player.citiesOnBoard}
				class={btnSecondary}
			>
				City Loss (−1 city)
			</button>
		</div>

		<div class="mb-3 rounded-md bg-slate-900 p-3 text-sm">
			<p class="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Pending</p>
			<div class="space-y-1">
				<div class="flex justify-between">
					<span class="text-slate-400">Population losses</span>
					<span class="font-bold {pendingLosses > 0 ? 'text-red-400' : 'text-slate-600'}">
						−{pendingLosses}
					</span>
				</div>
				<div class="flex justify-between">
					<span class="text-slate-400">Plunder (treasury gain)</span>
					<span class="font-bold {pendingPlunder > 0 ? 'text-green-400' : 'text-slate-600'}">
						+{pendingPlunder}
					</span>
				</div>
				<div class="flex justify-between">
					<span class="text-slate-400">City losses</span>
					<span class="font-bold {pendingCityLoss > 0 ? 'text-amber-400' : 'text-slate-600'}">
						−{pendingCityLoss}
					</span>
				</div>
			</div>
		</div>

		<div class="flex gap-2">
			<button
				onclick={phase4Confirm}
				disabled={pendingLosses === 0 && pendingPlunder === 0 && pendingCityLoss === 0}
				class={btnPrimary}
			>
				Confirm
			</button>
			<button
				onclick={phase4Reset}
				disabled={pendingLosses === 0 && pendingPlunder === 0 && pendingCityLoss === 0}
				class={btnSecondary}
			>
				Reset
			</button>
		</div>

	{:else if phase === 5}
		<!-- Build Cities -->
		<p class="mb-3 text-sm text-slate-300">
			Remove population tokens from the board to build a city. Tokens return to stock.
		</p>
		{#if player.citiesInStock === 0}
			<p class="mb-2 text-xs text-amber-400">No cities in stock — maximum cities already built.</p>
		{/if}
		<p class="mb-3 text-xs text-slate-500">
			Cities: {player.citiesOnBoard} on board, {player.citiesInStock} in stock ·
			Population: {player.populationOnBoard}
		</p>
		<div class="flex flex-wrap gap-2">
			<button
				onclick={phase5BuildCity}
				disabled={player.citiesInStock === 0 || player.populationOnBoard < 6}
				class={btnPrimary}
			>
				Build City (−6 population)
			</button>
			<button
				onclick={phase5WildernessCity}
				disabled={player.citiesInStock === 0 || player.populationOnBoard < 12}
				class={btnSecondary}
			>
				Wilderness City (−12 population)
			</button>
		</div>

	{:else if phase === 6}
		<!-- Trade Card Acquisition -->
		<p class="mb-2 text-sm text-slate-300">
			Eligible trade cards: <span class="font-bold text-white">{player.citiesOnBoard}</span>
			(1 per city, dealt automatically).
		</p>
		<p class="mb-3 text-sm text-slate-300">
			Buy extra Gold commodity cards for 15 treasury each.
		</p>
		<p class="mb-3 text-xs text-slate-500">
			Treasury: {player.inTreasury} · Gold in hand: {player.commodityHand['Gold'] ?? 0}
		</p>
		<button onclick={phase6BuyGold} disabled={player.inTreasury < 15} class={btnPrimary}>
			Buy Gold (15 treasury)
		</button>

	{:else if phase === 7}
		<!-- Trade -->
		<p class="mb-3 text-sm text-slate-300">Update your commodity hand after trading.</p>
		<div class="mb-3 space-y-1">
			{#each COMMODITY_TYPES as commodity (commodity)}
				{@const def = COMMODITY_MAP.get(commodity)}
				{@const n = commodityDraft[commodity]}
				{@const setValue = def ? calcCommoditySetValue(def.faceValue, n) : 0}
				<div class="grid grid-cols-[1fr_auto_auto] items-center gap-2 rounded bg-slate-700 px-2 py-1.5">
					<div class="min-w-0">
						<span class="text-xs text-slate-200">{commodity}</span>
						{#if def}
							<span class="ml-1 text-[10px] text-slate-500">f={def.faceValue}</span>
						{/if}
					</div>
					<div class="flex items-center gap-1">
						<button
							onclick={() => (commodityDraft[commodity] = Math.max(0, n - 1))}
							class="h-5 w-5 rounded text-xs font-bold text-slate-400 hover:text-white"
							aria-label="Decrease {commodity}"
						>−</button>
						<span class="w-4 text-center text-xs font-bold text-white">{n}</span>
						<button
							onclick={() => (commodityDraft[commodity] = Math.min(9, n + 1))}
							class="h-5 w-5 rounded text-xs font-bold text-slate-400 hover:text-white"
							aria-label="Increase {commodity}"
						>+</button>
					</div>
					<span class="w-12 text-right text-xs {setValue > 0 ? 'font-semibold text-amber-300' : 'text-slate-600'}">
						{setValue > 0 ? setValue : '—'}
					</span>
				</div>
			{/each}
		</div>
		<p class="mb-3 text-sm">
			<span class="text-slate-400">Total hand value:</span>
			<span class="ml-1 font-bold text-amber-400">{handTotal}</span>
		</p>
		<button onclick={phase7UpdateHand} class={btnPrimary}>Update Hand</button>

	{:else if phase === 8}
		<!-- Calamity Selection -->
		<p class="mb-3 text-sm text-slate-300">Record which calamity was drawn.</p>
		<div class="mb-3">
			<label for="calamity-select" class="mb-1 block text-xs text-slate-400">Calamity:</label>
			<select
				id="calamity-select"
				bind:value={selectedCalamity}
				class="w-full rounded bg-slate-700 px-3 py-2 text-sm text-white"
			>
				{#each CALAMITIES as calamity (calamity.calamityId)}
					<option value={calamity.calamityId}>
						{calamity.name} ({calamity.type === 'tradeable' ? 'Minor' : 'Major'}, Sev {calamity.severity})
					</option>
				{/each}
			</select>
		</div>
		{#if selectedCalamity}
			{@const cal = CALAMITIES.find((c) => c.calamityId === selectedCalamity)}
			{#if cal}
				<p class="mb-3 text-xs text-slate-400">{cal.description}</p>
			{/if}
		{/if}
		<button onclick={phase8RecordCalamity} class={btnPrimary}>Record Calamity</button>

	{:else if phase === 9}
		<!-- Calamity Resolution -->
		<p class="mb-3 text-sm text-slate-300">Apply calamity resolution effects.</p>
		<div class="mb-3 space-y-2">
			<div class="flex items-center gap-2">
				<button
					onclick={() => (calamityPopLoss = Math.max(0, calamityPopLoss - 1))}
					class={btnSecondary}
					aria-label="Decrease population loss"
				>−</button>
				<label for="cal-pop" class="w-32 text-xs text-slate-400">Population loss:</label>
				<input
					id="cal-pop"
					type="number"
					bind:value={calamityPopLoss}
					min="0"
					max={player.populationOnBoard}
					class={inputClass}
				/>
				<button
					onclick={() =>
						(calamityPopLoss = Math.min(player.populationOnBoard, calamityPopLoss + 1))}
					class={btnSecondary}
					aria-label="Increase population loss"
				>+</button>
			</div>
			<div class="flex items-center gap-2">
				<button
					onclick={() => (calamityTreasuryLoss = Math.max(0, calamityTreasuryLoss - 1))}
					class={btnSecondary}
					aria-label="Decrease treasury loss"
				>−</button>
				<label for="cal-treasury" class="w-32 text-xs text-slate-400">Treasury loss:</label>
				<input
					id="cal-treasury"
					type="number"
					bind:value={calamityTreasuryLoss}
					min="0"
					max={player.inTreasury}
					class={inputClass}
				/>
				<button
					onclick={() =>
						(calamityTreasuryLoss = Math.min(player.inTreasury, calamityTreasuryLoss + 1))}
					class={btnSecondary}
					aria-label="Increase treasury loss"
				>+</button>
			</div>
			<div class="flex items-center gap-2">
				<button
					onclick={() => (calamityCityLoss = Math.max(0, calamityCityLoss - 1))}
					class={btnSecondary}
					aria-label="Decrease city loss"
				>−</button>
				<label for="cal-cities" class="w-32 text-xs text-slate-400">Cities lost:</label>
				<input
					id="cal-cities"
					type="number"
					bind:value={calamityCityLoss}
					min="0"
					max={player.citiesOnBoard}
					class={inputClass}
				/>
				<button
					onclick={() =>
						(calamityCityLoss = Math.min(player.citiesOnBoard, calamityCityLoss + 1))}
					class={btnSecondary}
					aria-label="Increase city loss"
				>+</button>
			</div>
		</div>
		<button
			onclick={phase9ResolveCalamity}
			disabled={calamityPopLoss === 0 && calamityTreasuryLoss === 0 && calamityCityLoss === 0}
			class={btnPrimary}
		>Apply Resolution</button>

	{:else if phase === 10}
		<!-- AST Eligibility -->
		<p class="mb-3 text-sm text-slate-300">Check eligibility for AST advancement.</p>
		<div class="rounded-md bg-slate-700 p-3">
			<p class="mb-1 text-sm text-slate-300">
				Current AST position: <span class="font-bold text-white">{player.astPosition}</span>
			</p>
			<p class="text-xs text-slate-400">
				Verify you meet all city and advance requirements before advancing in Phase 12.
			</p>
		</div>

	{:else if phase === 11}
		<!-- Civilization Advances -->
		<a
			href="/market"
			class="mb-3 flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-600 active:scale-95"
		>
			<span>🛒</span>
			Go to Card Market →
		</a>
		<p class="mb-3 mt-1 text-xs text-slate-500">Or pay treasury manually:</p>
		<div class="mb-3 flex items-center gap-2">
			<button
				onclick={() => (cardPayment = Math.max(0, cardPayment - 1))}
				class={btnSecondary}
				aria-label="Decrease payment"
			>−</button>
			<label for="card-payment" class="text-sm text-slate-400">Amount:</label>
			<input
				id="card-payment"
				type="number"
				bind:value={cardPayment}
				min="0"
				max={player.inTreasury}
				class={inputClass}
			/>
			<button
				onclick={() => (cardPayment = Math.min(player.inTreasury, cardPayment + 1))}
				class={btnSecondary}
				aria-label="Increase payment"
			>+</button>
		</div>
		<p class="mb-2 text-xs text-slate-500">Treasury available: {player.inTreasury}</p>
		<button
			onclick={phase11PayCivAdvance}
			disabled={cardPayment <= 0 || player.inTreasury < cardPayment}
			class={btnPrimary}
		>Pay {cardPayment} for Advances</button>

	{:else if phase === 12}
		<!-- AST Advancement -->
		<p class="mb-3 text-sm text-slate-300">Advance your position on the AST track.</p>
		<p class="mb-3 text-sm text-slate-400">
			Current position: <span class="font-bold text-white">{player.astPosition}</span>
			· AST VP: <span class="font-bold text-amber-400"
				>{Math.max(0, (player.astPosition - 1) * 5)}</span
			>
		</p>
		<button onclick={phase12AdvanceAst} class={btnPrimary}>+1 AST Step</button>
	{/if}
</div>
