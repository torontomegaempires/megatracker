<script lang="ts">
	import { goto } from '$app/navigation';
	import { gameStore } from '$lib/stores/game.svelte.js';
	import { sessionMetaStore } from '$lib/stores/session-meta.svelte.js';
	import { hostNet } from '$lib/net/host.svelte.js';
	import { clientNet } from '$lib/net/client.svelte.js';
	import LobbyPlayer from '$lib/components/LobbyPlayer.svelte';
	import QRCode from '$lib/components/QRCode.svelte';

	// Redirect to home if no session
	$effect(() => {
		if (!gameStore.session) goto('/');
	});

	// Navigate to dashboard when game starts
	$effect(() => {
		if (gameStore.session?.status === 'active') goto('/dashboard');
	});

	// Clients: navigate when host broadcasts game start
	clientNet.onReadyToNavigate((dest) => {
		if (dest === '/dashboard') goto(dest);
	});

	const isHost = $derived(sessionMetaStore.role === 'host');
	const roomCode = $derived(sessionMetaStore.roomCode ?? '');
	const players = $derived(gameStore.session?.players ?? []);
	const myPlayerId = $derived(gameStore.myPlayerId);

	// Join URL for QR code — use current origin
	const joinUrl = $derived(
		typeof window !== 'undefined'
			? `${window.location.origin}/join?code=${roomCode}`
			: `/join?code=${roomCode}`
	);

	let showQR = $state(true);
	let copyLabel = $state('Copy Link');

	async function copyJoinLink() {
		try {
			await navigator.clipboard.writeText(joinUrl);
			copyLabel = 'Copied!';
			setTimeout(() => (copyLabel = 'Copy Link'), 2000);
		} catch {
			copyLabel = 'Copy failed';
		}
	}

	function handleStartGame() {
		if (!isHost) return;
		hostNet.startGame();
	}

	function handleRemovePlayer(playerId: string) {
		if (!isHost) return;
		hostNet.removePlayer(playerId);
	}

	const canStart = $derived(players.length >= 2);
</script>

<svelte:head>
	<title>Lobby — MegaTracker</title>
</svelte:head>

{#if gameStore.session}
	<div class="flex min-h-screen flex-col bg-slate-950 text-white">
		<!-- Header -->
		<div class="border-b border-slate-800 px-4 py-3">
			<div class="flex items-center justify-between">
				<div>
					<h1 class="font-bold text-white">{gameStore.session.sessionName}</h1>
					<p class="text-xs text-slate-400">{gameStore.session.variant} variant · Lobby</p>
				</div>
				{#if isHost}
					<span class="rounded bg-purple-700 px-2 py-1 text-xs font-bold text-white">HOST</span>
				{/if}
			</div>
		</div>

		<div class="flex-1 overflow-y-auto p-4">
			<!-- Room code + QR -->
			{#if isHost}
				<div class="mb-4 rounded-lg border border-slate-700 bg-slate-900 p-4">
					<p class="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Room Code</p>

					<div class="mb-3 flex items-center justify-between">
						<span class="font-mono text-4xl font-black tracking-[0.25em] text-white">
							{roomCode}
						</span>
						<button
							onclick={() => (showQR = !showQR)}
							class="rounded bg-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-600"
						>
							{showQR ? 'Hide QR' : 'Show QR'}
						</button>
					</div>

					{#if showQR}
						<div class="mb-3 flex justify-center">
							<QRCode url={joinUrl} size={180} />
						</div>
					{/if}

					<button
						onclick={copyJoinLink}
						class="w-full rounded bg-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-600"
					>
						{copyLabel}
					</button>
				</div>
			{:else}
				<div class="mb-4 rounded-lg border border-slate-700 bg-slate-900 p-4 text-center">
					<p class="text-sm text-slate-400">Waiting for host to start the game…</p>
					<p class="mt-1 text-xs text-slate-600">Room: <span class="font-mono font-bold text-slate-400">{roomCode}</span></p>
				</div>
			{/if}

			<!-- Player list -->
			<div class="mb-4">
				<p class="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
					Players ({players.length})
				</p>
				<div class="space-y-2">
					{#each players as player (player.playerId)}
						<LobbyPlayer
							{player}
							isMe={player.playerId === myPlayerId}
							canRemove={isHost && !player.isHost && player.playerId !== myPlayerId}
							onRemove={() => handleRemovePlayer(player.playerId)}
						/>
					{/each}
				</div>
			</div>

			{#if players.length < 2}
				<p class="text-center text-xs text-slate-600">
					Waiting for more players to join…
				</p>
			{/if}
		</div>

		<!-- Start game button (host only) -->
		{#if isHost}
			<div class="border-t border-slate-800 p-4">
				<button
					onclick={handleStartGame}
					disabled={!canStart}
					class="w-full rounded-lg bg-green-600 px-4 py-3 font-bold text-white hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-40"
				>
					{canStart ? `Start Game (${players.length} players)` : 'Waiting for players…'}
				</button>
			</div>
		{/if}
	</div>
{:else}
	<div class="flex h-screen items-center justify-center bg-slate-950">
		<p class="text-slate-400">Loading…</p>
	</div>
{/if}
