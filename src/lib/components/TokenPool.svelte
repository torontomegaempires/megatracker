<script lang="ts">
	import type { Player, TokenBucket } from '../types/game.js';
	import { tokenPoolTotal, TOKEN_POOL_TOTAL, applyTransfer, bucketLabel } from '../utils/token-pool.js';

	interface Props {
		player: Pick<Player, 'populationOnBoard' | 'populationInStock' | 'inTreasury'>;
		/** If provided, enables transfer controls */
		onTransfer?: (from: TokenBucket, to: TokenBucket, amount: number) => void;
		readonly?: boolean;
	}

	let { player, onTransfer, readonly = false }: Props = $props();

	let transferFrom = $state<TokenBucket>('populationInStock');
	let transferTo = $state<TokenBucket>('inTreasury');
	let transferAmount = $state(1);
	let transferError = $state<string | null>(null);

	const total = $derived(tokenPoolTotal(player));
	const isValid = $derived(total === TOKEN_POOL_TOTAL);

	function handleTransfer() {
		if (!onTransfer) return;
		transferError = null;

		const result = applyTransfer(player, {
			from: transferFrom,
			to: transferTo,
			amount: transferAmount
		});

		if (!result.ok) {
			transferError = result.error;
			return;
		}

		onTransfer(transferFrom, transferTo, transferAmount);
	}

	const BUCKETS: { key: TokenBucket; label: string; color: string }[] = [
		{ key: 'populationOnBoard', label: 'On Board', color: 'bg-blue-600' },
		{ key: 'populationInStock', label: 'In Stock', color: 'bg-slate-500' },
		{ key: 'inTreasury', label: 'Treasury', color: 'bg-amber-500' }
	];
</script>

<div class="rounded-lg border border-slate-700 bg-slate-800 p-4">
	<div class="mb-3 flex items-center justify-between">
		<h3 class="text-sm font-semibold uppercase tracking-wide text-slate-400">Token Pool</h3>
		<span
			class="rounded px-2 py-0.5 text-sm font-bold"
			class:text-green-400={isValid}
			class:text-red-400={!isValid}
		>
			{total} / {TOKEN_POOL_TOTAL}
		</span>
	</div>

	<!-- Bucket display -->
	<div class="mb-4 grid grid-cols-3 gap-2">
		{#each BUCKETS as bucket (bucket.key)}
			<div class="flex flex-col items-center rounded-md bg-slate-700 p-3">
				<span class="mb-1 text-2xl font-bold text-white">{player[bucket.key]}</span>
				<div class="mb-1 h-1.5 w-full rounded-full bg-slate-600">
					<div
						class="h-1.5 rounded-full transition-all {bucket.color}"
						style:width="{Math.round((player[bucket.key] / TOKEN_POOL_TOTAL) * 100)}%"
					></div>
				</div>
				<span class="text-xs text-slate-400">{bucket.label}</span>
			</div>
		{/each}
	</div>

	<!-- Transfer controls -->
	{#if !readonly && onTransfer}
		<div class="border-t border-slate-700 pt-3">
			<p class="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">Transfer</p>

			<div class="mb-2 flex items-center gap-2">
				<select
					bind:value={transferFrom}
					class="flex-1 rounded bg-slate-700 px-2 py-1.5 text-sm text-white"
				>
					{#each BUCKETS as b (b.key)}
						<option value={b.key}>{b.label}</option>
					{/each}
				</select>
				<span class="text-slate-400">→</span>
				<select
					bind:value={transferTo}
					class="flex-1 rounded bg-slate-700 px-2 py-1.5 text-sm text-white"
				>
					{#each BUCKETS as b (b.key)}
						<option value={b.key}>{b.label}</option>
					{/each}
				</select>
			</div>

			<div class="flex items-center gap-2">
				<button
					onclick={() => (transferAmount = Math.max(1, transferAmount - 1))}
					class="rounded bg-slate-600 px-2 py-1 text-sm font-bold text-white hover:bg-slate-500 active:scale-95"
				>−</button>
				<input
					type="number"
					bind:value={transferAmount}
					min="1"
					max={TOKEN_POOL_TOTAL}
					class="w-16 rounded bg-slate-700 px-2 py-1 text-center text-sm text-white"
				/>
				<button
					onclick={() => (transferAmount = transferAmount + 1)}
					class="rounded bg-slate-600 px-2 py-1 text-sm font-bold text-white hover:bg-slate-500 active:scale-95"
				>+</button>
				<button
					onclick={handleTransfer}
					class="flex-1 rounded bg-blue-600 px-3 py-1 text-sm font-semibold text-white hover:bg-blue-500 active:scale-95"
				>
					Move {transferAmount} {bucketLabel(transferFrom)} → {bucketLabel(transferTo)}
				</button>
			</div>

			{#if transferError}
				<p class="mt-2 text-xs text-red-400">{transferError}</p>
			{/if}
		</div>
	{/if}
</div>
