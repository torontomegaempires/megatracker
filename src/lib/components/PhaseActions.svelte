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

	interface Props {
		player: Player;
		phase: number;
		onTransfer: (transfers: TokenTransfer[]) => void;
		onFieldUpdate: (patch: Partial<Player>, description: string) => void;
	}

	let { player, phase, onTransfer, onFieldUpdate }: Props = $props();

	// ── Phase 2 — Population Expansion ──────────────────────────────────────────
	// Use $derived.by so it stays in sync with player prop changes
	let expandAmount = $state(0);
	$effect(() => {
		// Reset when phase or player changes — sync from prop intentionally
		void phase;
		expandAmount = player.populationInStock;
	});

	// ── Phase 3 — Ship Construction ──────────────────────────────────────────────
	let shipOption = $state<'a' | 'b' | 'c'>('a');

	// ── Phase 4 — Conflict ───────────────────────────────────────────────────────
	let conflictLosses = $state(1);

	// ── Phase 5 — City Construction ──────────────────────────────────────────────
	let cityTokens = $state(6);

	// ── Phase 6 — Trade Card Acquisition ─────────────────────────────────────────
	let extraCards = $state(0);
	const extraCardCost = $derived(extraCards * 15);

	// ── Phase 7 — Trade (commodity hand editor) ───────────────────────────────────
	// Initialize with empty then sync; avoids "captures initial value only" warning
	let commodityDraft = $state<Record<CommodityType, number>>(
		Object.fromEntries(COMMODITY_TYPES.map((c) => [c, 0])) as Record<CommodityType, number>
	);
	$effect(() => {
		commodityDraft = { ...player.commodityHand };
	});

	// ── Phase 8 — Calamity Selection ─────────────────────────────────────────────
	let selectedCalamity = $state(CALAMITIES[0].calamityId);

	// ── Phase 9 — Calamity Resolution ────────────────────────────────────────────
	let calamityPopLoss = $state(0);
	let calamityTreasuryLoss = $state(0);
	let calamityCityLoss = $state(0);

	// ── Phase 12 — Civ Advances ──────────────────────────────────────────────────
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
			onTransfer([{ from: 'inTreasury', to: 'populationInStock', amount: 2 }]);
		} else if (shipOption === 'b') {
			onTransfer([
				{ from: 'inTreasury', to: 'populationInStock', amount: 1 },
				{ from: 'populationOnBoard', to: 'populationInStock', amount: 1 }
			]);
		} else {
			onTransfer([{ from: 'populationOnBoard', to: 'populationInStock', amount: 2 }]);
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

	function phase4RecordLosses() {
		if (conflictLosses <= 0) return;
		onTransfer([{ from: 'populationOnBoard', to: 'populationInStock', amount: conflictLosses }]);
	}

	function phase4CityWin() {
		onTransfer([{ from: 'populationInStock', to: 'inTreasury', amount: 3 }]);
	}

	function phase4CityLoss() {
		if (player.citiesOnBoard === 0) return;
		onFieldUpdate(
			{ citiesOnBoard: player.citiesOnBoard - 1, citiesInStock: player.citiesInStock + 1 },
			`${player.playerName} lost a city in conflict.`
		);
		const available = Math.min(6, player.populationInStock);
		if (available > 0) {
			onTransfer([{ from: 'populationInStock', to: 'populationOnBoard', amount: available }]);
		}
	}

	function phase5BuildCity() {
		if (player.citiesInStock === 0) return;
		if (cityTokens <= 0) return;
		const transfer = buildCityConstructionTransfer(cityTokens);
		const check = applyTransfer(player, transfer);
		if (!check.ok) {
			alert(check.error);
			return;
		}
		onTransfer([transfer]);
		onFieldUpdate(
			{ citiesOnBoard: player.citiesOnBoard + 1, citiesInStock: player.citiesInStock - 1 },
			`${player.playerName} built a city (${cityTokens} tokens returned to stock).`
		);
	}

	function phase6PayExtraCards() {
		if (extraCards === 0) return;
		if (player.inTreasury < extraCardCost) return;
		onTransfer([{ from: 'inTreasury', to: 'populationInStock', amount: extraCardCost }]);
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

	function phase11AdvanceAst() {
		onFieldUpdate(
			{ astPosition: player.astPosition + 1 },
			`${player.playerName} advanced on the AST track to position ${player.astPosition + 1}.`
		);
	}

	function phase12PayCivAdvance() {
		if (cardPayment <= 0) return;
		const transfer = buildCardPurchaseTransfer(cardPayment);
		const check = applyTransfer(player, transfer);
		if (!check.ok) {
			alert(check.error);
			return;
		}
		onTransfer([transfer]);
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
			Move tokens from stock → board. Must expand as many as possible.
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
		<!-- Ship Construction -->
		<p class="mb-3 text-sm text-slate-300">Choose construction method and build a ship.</p>
		<div class="mb-3 space-y-2">
			<label class="flex items-center gap-2 text-sm text-slate-300">
				<input type="radio" bind:group={shipOption} value="a" class="accent-blue-500" />
				Option A: 2 treasury → stock
			</label>
			<label class="flex items-center gap-2 text-sm text-slate-300">
				<input type="radio" bind:group={shipOption} value="b" class="accent-blue-500" />
				Option B: 1 treasury + 1 board → stock
			</label>
			<label class="flex items-center gap-2 text-sm text-slate-300">
				<input type="radio" bind:group={shipOption} value="c" class="accent-blue-500" />
				Option C: 2 board → stock
			</label>
		</div>
		<div class="flex gap-2">
			<button
				onclick={phase3BuildShip}
				disabled={player.shipsInStock === 0}
				class={btnPrimary}
			>
				Build Ship ({player.shipsOnBoard}/{player.shipsOnBoard + player.shipsInStock})
			</button>
			<button
				onclick={phase3PayMaintenance}
				disabled={player.shipsOnBoard === 0}
				class={btnSecondary}
			>
				Pay Maintenance ({player.shipsOnBoard})
			</button>
		</div>

	{:else if phase === 4}
		<!-- Conflict -->
		<p class="mb-3 text-sm text-slate-300">Record token losses and city changes from conflict.</p>
		<div class="mb-3 space-y-3">
			<div>
				<p class="mb-1 text-xs text-slate-400">Population losses (board → stock):</p>
				<div class="flex items-center gap-2">
					<button
						onclick={() => (conflictLosses = Math.max(1, conflictLosses - 1))}
						class={btnSecondary}
						aria-label="Decrease losses"
					>−</button>
					<input
						type="number"
						bind:value={conflictLosses}
						min="1"
						max={player.populationOnBoard}
						class={inputClass}
						aria-label="Population losses"
					/>
					<button
						onclick={() =>
							(conflictLosses = Math.min(player.populationOnBoard, conflictLosses + 1))}
						class={btnSecondary}
						aria-label="Increase losses"
					>+</button>
					<button
						onclick={phase4RecordLosses}
						disabled={conflictLosses <= 0 || player.populationOnBoard === 0}
						class={btnPrimary}
					>Record Losses</button>
				</div>
			</div>
			<div class="flex gap-2">
				<button onclick={phase4CityWin} class={btnSecondary}>City Win (+3 treasury)</button>
				<button
					onclick={phase4CityLoss}
					disabled={player.citiesOnBoard === 0}
					class={btnSecondary}
				>City Lost (−1 city)</button>
			</div>
		</div>

	{:else if phase === 5}
		<!-- City Construction -->
		<p class="mb-3 text-sm text-slate-300">
			Remove tokens from area to build a city. Tokens return to stock.
		</p>
		<div class="mb-3 flex items-center gap-2">
			<button
				onclick={() => (cityTokens = Math.max(1, cityTokens - 1))}
				class={btnSecondary}
				aria-label="Decrease tokens"
			>−</button>
			<label for="city-tokens" class="text-sm text-slate-400">Tokens in area:</label>
			<input
				id="city-tokens"
				type="number"
				bind:value={cityTokens}
				min="1"
				max={player.populationOnBoard}
				class={inputClass}
			/>
			<button
				onclick={() => (cityTokens = Math.min(player.populationOnBoard, cityTokens + 1))}
				class={btnSecondary}
				aria-label="Increase tokens"
			>+</button>
		</div>
		{#if player.citiesInStock === 0}
			<p class="mb-2 text-xs text-amber-400">No cities in stock — maximum cities already built.</p>
		{/if}
		<p class="mb-2 text-xs text-slate-500">
			Cities: {player.citiesOnBoard} on board, {player.citiesInStock} in stock
		</p>
		<button
			onclick={phase5BuildCity}
			disabled={player.citiesInStock === 0 || cityTokens <= 0}
			class={btnPrimary}
		>Build City</button>

	{:else if phase === 6}
		<!-- Trade Card Acquisition -->
		<p class="mb-3 text-sm text-slate-300">
			Extra cards cost 15 treasury each (moved to stock).
		</p>
		<div class="mb-3 flex items-center gap-2">
			<button
				onclick={() => (extraCards = Math.max(0, extraCards - 1))}
				class={btnSecondary}
				aria-label="Fewer extra cards"
			>−</button>
			<label for="extra-cards" class="text-sm text-slate-400">Extra cards:</label>
			<input
				id="extra-cards"
				type="number"
				bind:value={extraCards}
				min="0"
				class={inputClass}
			/>
			<button
				onclick={() => (extraCards = extraCards + 1)}
				class={btnSecondary}
				aria-label="More extra cards"
			>+</button>
		</div>
		<p class="mb-2 text-xs text-slate-500">
			Cost: {extraCardCost} treasury · Available: {player.inTreasury}
		</p>
		<button
			onclick={phase6PayExtraCards}
			disabled={extraCards === 0 || player.inTreasury < extraCardCost}
			class={btnPrimary}
		>
			Pay {extraCardCost} for {extraCards} Extra Card{extraCards !== 1 ? 's' : ''}
		</button>

	{:else if phase === 7}
		<!-- Trade -->
		<p class="mb-3 text-sm text-slate-300">Update your commodity hand after trading.</p>
		<div class="mb-3 grid grid-cols-3 gap-1.5">
			{#each COMMODITY_TYPES as commodity (commodity)}
				<div class="flex items-center gap-1 rounded bg-slate-700 px-2 py-1">
					<span class="flex-1 text-xs text-slate-300">{commodity}</span>
					<button
						onclick={() =>
							(commodityDraft[commodity] = Math.max(0, commodityDraft[commodity] - 1))}
						class="h-5 w-5 rounded text-xs font-bold text-slate-400 hover:text-white"
						aria-label="Decrease {commodity}"
					>−</button>
					<span class="w-4 text-center text-xs font-bold text-white"
						>{commodityDraft[commodity]}</span
					>
					<button
						onclick={() =>
							(commodityDraft[commodity] = Math.min(9, commodityDraft[commodity] + 1))}
						class="h-5 w-5 rounded text-xs font-bold text-slate-400 hover:text-white"
						aria-label="Increase {commodity}"
					>+</button>
				</div>
			{/each}
		</div>
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
						{calamity.name} ({calamity.type === 'tradeable' ? 'T' : 'NT'}, Sev {calamity.severity})
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
				Verify you meet all city and advance requirements for your current era before advancing in
				Phase 11.
			</p>
		</div>

	{:else if phase === 11}
		<!-- AST Advancement -->
		<p class="mb-3 text-sm text-slate-300">Advance your position on the AST track.</p>
		<p class="mb-3 text-sm text-slate-400">
			Current position: <span class="font-bold text-white">{player.astPosition}</span>
		</p>
		<button onclick={phase11AdvanceAst} class={btnPrimary}>+1 AST Step</button>

	{:else if phase === 12}
		<!-- Civilisation Advances -->
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
			onclick={phase12PayCivAdvance}
			disabled={cardPayment <= 0 || player.inTreasury < cardPayment}
			class={btnPrimary}
		>Pay {cardPayment} for Advances</button>
	{/if}
</div>
