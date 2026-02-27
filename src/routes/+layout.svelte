<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import ConnectionStatus from '$lib/components/ConnectionStatus.svelte';
	import Toast from '$lib/components/Toast.svelte';
	import { gameStore } from '$lib/stores/game.svelte.js';
	import { page } from '$app/stores';

	let { children } = $props();

	// ── Screen Wake Lock ─────────────────────────────────────────────────────
	let wakeLock = $state<WakeLockSentinel | null>(null);

	async function requestWakeLock() {
		if (!('wakeLock' in navigator)) return;
		try {
			wakeLock = await navigator.wakeLock.request('screen');
			// Re-acquire when the document becomes visible again (e.g. after tab switch)
			wakeLock.addEventListener('release', () => {
				if (gameStore.isActive && document.visibilityState === 'visible') {
					requestWakeLock();
				}
			});
		} catch {
			// Fail gracefully — iOS < 16.4, Firefox, or permission denied
		}
	}

	function releaseWakeLock() {
		wakeLock?.release().catch(() => {});
		wakeLock = null;
	}

	$effect(() => {
		if (gameStore.isActive) {
			requestWakeLock();
		} else {
			releaseWakeLock();
		}
	});

	// Re-acquire on visibility change (required by spec when tab is re-focused)
	$effect(() => {
		function onVisibilityChange() {
			if (document.visibilityState === 'visible' && gameStore.isActive && !wakeLock) {
				requestWakeLock();
			}
		}
		document.addEventListener('visibilitychange', onVisibilityChange);
		return () => document.removeEventListener('visibilitychange', onVisibilityChange);
	});

	// ── Bottom nav tabs ───────────────────────────────────────────────────────
	const gameTabs = [
		{ href: '/dashboard', icon: '⚔', label: 'Nation' },
		{ href: '/nations', icon: '⊞', label: 'Nations' },
		{ href: '/market', icon: '🛒', label: 'Market' },
		{ href: '/my-cards', icon: '📜', label: 'Cards' },
		{ href: '/scoreboard', icon: '★', label: 'Scores' },
		{ href: '/action-log', icon: '☰', label: 'Log' },
		{ href: '/rules', icon: '📖', label: 'Rules' }
	];
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<div class="relative flex min-h-screen flex-col bg-slate-950">
	<!-- Persistent connection status indicator -->
	<div class="absolute right-0 top-0 z-50">
		<ConnectionStatus />
	</div>

	<!-- Main content — padded at bottom when nav is visible -->
	<div class:pb-20={gameStore.isActive}>
		{@render children()}
	</div>

	<!-- Bottom tab navigation (game active only) -->
	{#if gameStore.isActive}
		<nav
			class="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-800 bg-slate-900"
			style="padding-bottom: env(safe-area-inset-bottom, 0px)"
		>
			<div class="grid grid-cols-7">
				{#each gameTabs as tab (tab.href)}
					<a
						href={tab.href}
						aria-label={tab.label}
						class="flex flex-col items-center py-1.5 text-[10px] transition-colors"
						class:text-blue-400={$page.url.pathname === tab.href}
						class:text-slate-400={$page.url.pathname !== tab.href}
					>
						<span class="mb-0.5 text-base leading-none">{tab.icon}</span>
						{tab.label}
					</a>
				{/each}
			</div>
		</nav>
	{/if}

	<!-- Toast overlay (always mounted, renders nothing when empty) -->
	<Toast />
</div>
