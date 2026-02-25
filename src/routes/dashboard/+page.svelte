<script lang="ts">
	import { gameStore } from '$lib/stores/game.svelte.js';
	import { sessionMetaStore } from '$lib/stores/session-meta.svelte.js';
	import { hostNet } from '$lib/net/host.svelte.js';
	import { clientNet } from '$lib/net/client.svelte.js';
	import { goto } from '$app/navigation';
	import NationDashboard from '$lib/components/NationDashboard.svelte';
	import PhaseBanner from '$lib/components/PhaseBanner.svelte';
	import PhaseActions from '$lib/components/PhaseActions.svelte';
	import type { Player, TokenTransfer } from '$lib/types/game.js';

	// Redirect to home if no session
	$effect(() => {
		if (!gameStore.session) goto('/');
	});

	let showPhaseDetail = $state(false);
	const isNetworked = $derived(sessionMetaStore.role !== 'none');

	/**
	 * Route a token transfer through the appropriate channel:
	 * - Host: apply locally and broadcast patch to all clients
	 * - Client: send ACTION to host, which validates and broadcasts back
	 * - Demo: apply directly to local store
	 */
	function handleTransfer(transfers: TokenTransfer[]) {
		if (sessionMetaStore.role === 'host') {
			const err = hostNet.applyHostTransfer(transfers);
			if (err) console.error('[dashboard] Transfer error:', err);
		} else if (sessionMetaStore.role === 'client') {
			clientNet.sendTokenTransfer(transfers);
		} else {
			// Demo mode — apply directly
			if (gameStore.myPlayerId) {
				gameStore.applyPlayerTransfers(gameStore.myPlayerId, transfers);
			}
		}
	}

	function handleAdvancePhase() {
		if (sessionMetaStore.role === 'host') {
			hostNet.advancePhase();
		} else {
			gameStore.advancePhase();
		}
	}

	function handleRewindPhase() {
		if (sessionMetaStore.role === 'host') {
			hostNet.rewindPhase();
		} else {
			gameStore.rewindPhase();
		}
	}

	function handleFieldUpdate(patch: Partial<Player>, description: string) {
		if (sessionMetaStore.role === 'host') {
			const err = hostNet.applyHostFieldUpdate(patch, description);
			if (err) console.error('[dashboard] Field update error:', err);
		} else if (sessionMetaStore.role === 'client') {
			clientNet.sendPlayerFieldUpdate(patch, description);
		} else {
			// Demo mode
			if (gameStore.myPlayerId) gameStore.updatePlayerFields(gameStore.myPlayerId, patch);
		}
	}
</script>

<svelte:head>
	<title>Dashboard — MegaTracker</title>
</svelte:head>

{#if gameStore.session && gameStore.myPlayer}
	<div class="flex h-screen flex-col bg-slate-950 text-white">
		<!-- Phase banner (persistent top) -->
		<PhaseBanner
			phase={gameStore.currentPhase}
			turn={gameStore.currentTurn}
			onclick={() => (showPhaseDetail = !showPhaseDetail)}
		/>

		<!-- Phase detail drawer -->
		{#if showPhaseDetail}
			<div class="border-b border-slate-700 bg-slate-900 px-4 py-3">
				<p class="text-sm text-slate-300">
					Phase {gameStore.currentPhase} of 12 · Turn {gameStore.currentTurn}
				</p>
				{#if gameStore.isHost}
					<div class="mt-2 flex gap-2">
						<button
							onclick={handleRewindPhase}
							class="rounded bg-slate-700 px-3 py-1 text-xs font-medium text-slate-200 hover:bg-slate-600"
						>
							← Prev Phase
						</button>
						<button
							onclick={handleAdvancePhase}
							class="rounded bg-blue-700 px-3 py-1 text-xs font-medium text-white hover:bg-blue-600"
						>
							Next Phase →
						</button>
					</div>
				{/if}
				{#if isNetworked}
					<button
						onclick={() => goto('/lobby')}
						class="mt-2 text-xs text-slate-500 hover:text-slate-300"
					>
						← Back to Lobby
					</button>
				{/if}
			</div>
		{/if}

		<!-- Scrollable main area: Nation Dashboard + Phase Actions -->
		<div class="min-h-0 flex-1 overflow-y-auto">
			<NationDashboard
				player={gameStore.myPlayer}
				isHost={gameStore.isHost}
				onTransfer={handleTransfer}
			/>
			<div class="p-3">
				<PhaseActions
					player={gameStore.myPlayer}
					phase={gameStore.currentPhase}
					onTransfer={handleTransfer}
					onFieldUpdate={handleFieldUpdate}
				/>
			</div>
		</div>
	</div>
{:else}
	<div class="flex h-screen items-center justify-center bg-slate-950">
		<p class="text-slate-400">Loading…</p>
	</div>
{/if}
