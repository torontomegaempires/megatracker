<script lang="ts">
	import { goto } from '$app/navigation';
	import { gameStore } from '$lib/stores/game.svelte.js';
	import { hostNet } from '$lib/net/host.svelte.js';
	import { CIVILIZATIONS } from '$lib/data/civilizations.js';
	import type { GameSession, Player, GameVariant } from '$lib/types/game.js';
	import { COMMODITY_TYPES } from '$lib/types/game.js';
	import { createDefaultTokenPool } from '$lib/utils/token-pool.js';
	import { sessionMetaStore } from '$lib/stores/session-meta.svelte.js';

	type Mode = 'landing' | 'create' | 'demo';

	let mode = $state<Mode>('landing');

	// ── Create session fields
	let sessionName = $state('');
	let hostVariant = $state<GameVariant>('Western');
	let hostPlayerName = $state('');
	let hostCivId = $state(CIVILIZATIONS[0].id);
	let creating = $state(false);
	let createError = $state<string | null>(null);

	// ── Demo fields
	let demoPlayerName = $state('');
	let demoCivId = $state(CIVILIZATIONS[0].id);

	const hostCivDef = $derived(CIVILIZATIONS.find((c) => c.id === hostCivId)!);
	const demoCivDef = $derived(CIVILIZATIONS.find((c) => c.id === demoCivId)!);

	const canCreate = $derived(
		sessionName.trim().length > 0 && hostPlayerName.trim().length > 0 && !creating
	);

	async function handleCreateSession() {
		if (!canCreate) return;
		creating = true;
		createError = null;

		try {
			await hostNet.createSession({
				sessionName: sessionName.trim(),
				variant: hostVariant,
				hostPlayerName: hostPlayerName.trim(),
				hostCivId
			});
			goto('/lobby');
		} catch (err) {
			createError =
				err instanceof Error ? err.message : 'Could not create session. Check your internet connection.';
			creating = false;
		}
	}

	function startDemo() {
		if (!demoPlayerName.trim()) return;

		const civ = demoCivDef;
		const playerId = `player-demo-${Date.now()}`;
		const defaultHand = Object.fromEntries(COMMODITY_TYPES.map((t) => [t, 0])) as Record<
			(typeof COMMODITY_TYPES)[number],
			number
		>;

		const player: Player = {
			playerId,
			playerName: demoPlayerName.trim(),
			civilizationId: civ.id,
			civilizationName: civ.name,
			astRanking: civ.astRanking,
			colorHex: civ.colorHex,
			isHost: true,
			peerJsId: 'demo',
			...createDefaultTokenPool(),
			citiesOnBoard: 1,
			citiesInStock: 8,
			shipsOnBoard: 0,
			shipsInStock: 4,
			commodityHand: defaultHand,
			ownedCardIds: [],
			astPosition: 1,
			victoryPoints: 1,
			connectionStatus: 'connected'
		};

		const session: GameSession = {
			sessionId: `demo-${Date.now()}`,
			sessionName: 'Demo Session',
			variant: 'Western',
			status: 'active',
			hostPeerId: 'demo',
			hostPlayerId: playerId,
			players: [player],
			currentPhase: 1,
			currentTurn: 1,
			actionLog: [],
			createdAt: Date.now()
		};

		gameStore.setSession(session);
		gameStore.setMyPlayerId(playerId);
		goto('/dashboard');
	}
</script>

<svelte:head>
	<title>MegaTracker</title>
</svelte:head>

<div class="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-4">
	<div class="w-full max-w-md">
		<!-- Title -->
		<div class="mb-8 text-center">
			<h1 class="text-4xl font-black tracking-tight text-white">
				Mega<span class="text-blue-400">Tracker</span>
			</h1>
			<p class="mt-2 text-sm text-slate-400">Mega Empires companion · up to 18 players via WebRTC</p>
		</div>

		<!-- ── Landing ── -->
		{#if mode === 'landing'}
			<div class="space-y-3">
				<button
					onclick={() => (mode = 'create')}
					class="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-500 active:scale-[0.98]"
				>
					Create Session
				</button>

				<a
					href="/join"
					class="block w-full rounded-lg border border-slate-600 px-4 py-3 text-center font-semibold text-slate-200 hover:bg-slate-800 active:scale-[0.98]"
				>
					Join Session
				</a>

				<button
					onclick={() => (mode = 'demo')}
					class="w-full rounded-lg border border-slate-700 px-4 py-3 font-semibold text-slate-400 hover:bg-slate-900 active:scale-[0.98]"
				>
					Quick Demo (offline)
				</button>

				<a
					href="/rules"
					class="block w-full pt-2 text-center text-xs text-slate-600 hover:text-slate-400"
				>
					📖 Rules Reference
				</a>
			</div>

		<!-- ── Create Session ── -->
		{:else if mode === 'create'}
			<div class="rounded-lg border border-slate-700 bg-slate-900 p-5">
				<div class="mb-4 flex items-center gap-2">
					<button onclick={() => (mode = 'landing')} class="text-slate-400 hover:text-white">←</button>
					<h2 class="font-semibold text-white">Create Session</h2>
				</div>

				<label class="mb-3 block">
					<span class="mb-1 block text-xs font-medium text-slate-400">Session Name</span>
					<input
						type="text"
						bind:value={sessionName}
						placeholder="Friday Night Empires"
						class="w-full rounded bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
					/>
				</label>

				<label class="mb-3 block">
					<span class="mb-1 block text-xs font-medium text-slate-400">Variant</span>
					<select
						bind:value={hostVariant}
						class="w-full rounded bg-slate-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
					>
						<option value="Western">Western</option>
						<option value="Eastern">Eastern</option>
						<option value="Full">Full (18 players)</option>
					</select>
				</label>

				<label class="mb-3 block">
					<span class="mb-1 block text-xs font-medium text-slate-400">Your Name</span>
					<input
						type="text"
						bind:value={hostPlayerName}
						placeholder="Enter your name"
						class="w-full rounded bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
					/>
				</label>

				<label class="mb-4 block">
					<span class="mb-1 block text-xs font-medium text-slate-400">Your Civilization</span>
					<select
						bind:value={hostCivId}
						class="w-full rounded bg-slate-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
					>
						{#each CIVILIZATIONS as civ (civ.id)}
							<option value={civ.id}>{civ.name} (#{civ.astRanking} · {civ.deck})</option>
						{/each}
					</select>
				</label>

				<div
					class="mb-4 flex items-center gap-3 rounded border-l-4 bg-slate-800 px-3 py-2"
					style="border-color: {hostCivDef.colorHex}"
				>
					<div class="h-3 w-3 rounded-full" style="background: {hostCivDef.colorHex}"></div>
					<span class="text-sm text-white">{hostCivDef.name}</span>
					<span class="ml-auto text-xs text-slate-500">AST #{hostCivDef.astRanking}</span>
				</div>

				{#if createError}
					<p class="mb-3 rounded bg-red-900/30 px-3 py-2 text-sm text-red-400">{createError}</p>
				{/if}

				{#if creating}
					<div class="mb-3 flex items-center justify-center gap-2 text-sm text-amber-400">
						<span class="h-2 w-2 animate-pulse rounded-full bg-amber-400"></span>
						{sessionMetaStore.status === 'connecting' ? 'Connecting to PeerJS…' : 'Creating session…'}
					</div>
				{/if}

				<button
					onclick={handleCreateSession}
					disabled={!canCreate}
					class="w-full rounded bg-blue-600 px-4 py-2.5 font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
				>
					{creating ? 'Creating…' : 'Create Session'}
				</button>
			</div>

		<!-- ── Demo ── -->
		{:else if mode === 'demo'}
			<div class="rounded-lg border border-slate-700 bg-slate-900 p-5">
				<div class="mb-4 flex items-center gap-2">
					<button onclick={() => (mode = 'landing')} class="text-slate-400 hover:text-white">←</button>
					<h2 class="font-semibold text-white">Quick Demo</h2>
				</div>

				<label class="mb-3 block">
					<span class="mb-1 block text-xs font-medium text-slate-400">Your Name</span>
					<input
						type="text"
						bind:value={demoPlayerName}
						placeholder="Enter your name"
						class="w-full rounded bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
					/>
				</label>

				<label class="mb-4 block">
					<span class="mb-1 block text-xs font-medium text-slate-400">Civilization</span>
					<select
						bind:value={demoCivId}
						class="w-full rounded bg-slate-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
					>
						{#each CIVILIZATIONS as civ (civ.id)}
							<option value={civ.id}>{civ.name} (#{civ.astRanking})</option>
						{/each}
					</select>
				</label>

				<div
					class="mb-4 flex items-center gap-3 rounded border-l-4 bg-slate-800 px-3 py-2"
					style="border-color: {demoCivDef.colorHex}"
				>
					<div class="h-3 w-3 rounded-full" style="background: {demoCivDef.colorHex}"></div>
					<span class="text-sm text-white">{demoCivDef.name}</span>
				</div>

				<button
					onclick={startDemo}
					disabled={!demoPlayerName.trim()}
					class="w-full rounded bg-slate-600 px-4 py-2.5 font-semibold text-white hover:bg-slate-500 disabled:cursor-not-allowed disabled:opacity-40"
				>
					Start Demo
				</button>
			</div>
		{/if}
	</div>
</div>
