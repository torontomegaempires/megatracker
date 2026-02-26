<script lang="ts">
	import { goto } from '$app/navigation';
	import { clientNet } from '$lib/net/client.svelte.js';
	import { sessionMetaStore } from '$lib/stores/session-meta.svelte.js';
	import { CIVILIZATIONS } from '$lib/data/civilizations.js';
	import { normalizeRoomCode, isValidRoomCode } from '$lib/utils/room-code.js';

	let roomCode = $state('');
	let playerName = $state('');
	let selectedCiv = $state(CIVILIZATIONS[0].id);
	let joining = $state(false);
	let errorMsg = $state<string | null>(null);

	const selectedCivDef = $derived(CIVILIZATIONS.find((c) => c.id === selectedCiv)!);
	const normalizedCode = $derived(normalizeRoomCode(roomCode));
	const codeValid = $derived(isValidRoomCode(normalizedCode));
	const canJoin = $derived(codeValid && playerName.trim().length > 0 && !joining);

	// Navigate when the client network layer has received a snapshot
	clientNet.onReadyToNavigate((dest) => goto(dest));

	async function handleJoin() {
		if (!canJoin) return;
		joining = true;
		errorMsg = null;

		try {
			await clientNet.joinSession({
				roomCode: normalizedCode,
				playerName: playerName.trim(),
				civId: selectedCiv
			});
			// Navigation happens via onReadyToNavigate callback after snapshot received
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Could not connect. Check the room code.';
			joining = false;
		}
	}

	function handleCodeInput(e: Event) {
		roomCode = normalizeRoomCode((e.target as HTMLInputElement).value);
	}
</script>

<svelte:head>
	<title>Join Session — MegaTracker</title>
</svelte:head>

<div class="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-4">
	<div class="w-full max-w-sm">
		<div class="mb-6 flex items-center gap-3">
			<a href="/" class="text-slate-400 hover:text-white">←</a>
			<h1 class="text-xl font-bold text-white">Join Session</h1>
		</div>

		<div class="rounded-lg border border-slate-700 bg-slate-900 p-5">
			<!-- Room code -->
			<label class="mb-4 block">
				<span class="mb-1 block text-xs font-medium text-slate-400">Room Code</span>
				<input
					type="text"
					value={roomCode}
					oninput={handleCodeInput}
					maxlength={4}
					placeholder="ABCD"
					autocomplete="off"
					autocorrect="off"
					autocapitalize="characters"
					class="w-full rounded bg-slate-800 px-3 py-2.5 text-center font-mono text-2xl font-bold tracking-[0.3em] text-white placeholder-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
					class:ring-2={codeValid}
					class:ring-green-500={codeValid}
				/>
				{#if roomCode.length > 0 && !codeValid}
					<p class="mt-1 text-xs text-red-400">Enter the 4-character code from the host.</p>
				{/if}
			</label>

			<!-- Player name -->
			<label class="mb-4 block">
				<span class="mb-1 block text-xs font-medium text-slate-400">Your Name</span>
				<input
					type="text"
					bind:value={playerName}
					placeholder="Enter your name"
					class="w-full rounded bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
				/>
			</label>

			<!-- Civilization -->
			<label class="mb-4 block">
				<span class="mb-1 block text-xs font-medium text-slate-400">Civilization</span>
				<select
					bind:value={selectedCiv}
					class="w-full rounded bg-slate-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
				>
					{#each CIVILIZATIONS as civ (civ.id)}
						<option value={civ.id}>{civ.name} (#{civ.astRanking} · {civ.deck})</option>
					{/each}
				</select>
			</label>

			<!-- Civ preview -->
			<div
				class="mb-4 flex items-center gap-3 rounded-md border-l-4 bg-slate-800 px-3 py-2"
				style="border-color: {selectedCivDef.colorHex}"
			>
				<div class="h-3 w-3 rounded-full" style="background: {selectedCivDef.colorHex}"></div>
				<span class="text-sm text-white">{selectedCivDef.name}</span>
				<span class="ml-auto text-xs text-slate-500">{selectedCivDef.deck}</span>
			</div>

			{#if errorMsg}
				<p class="mb-3 rounded bg-red-900/30 px-3 py-2 text-sm text-red-400">{errorMsg}</p>
			{/if}

			<!-- Connecting state -->
			{#if joining}
				<div class="mb-3 flex items-center justify-center gap-2 text-sm text-amber-400">
					<span class="h-2 w-2 animate-pulse rounded-full bg-amber-400"></span>
					{#if sessionMetaStore.status === 'connecting'}
						Connecting to PeerJS…
					{:else if sessionMetaStore.status === 'open'}
						Joining session…
					{:else}
						{sessionMetaStore.status}
					{/if}
				</div>
			{/if}

			<button
				onclick={handleJoin}
				disabled={!canJoin}
				class="w-full rounded bg-blue-600 px-4 py-2.5 font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
			>
				{joining ? 'Joining…' : 'Join'}
			</button>
		</div>

		<p class="mt-4 text-center text-xs text-slate-600">
			Ask the host for their 4-character room code.
		</p>
	</div>
</div>
