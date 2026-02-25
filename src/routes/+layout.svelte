<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import ConnectionStatus from '$lib/components/ConnectionStatus.svelte';
	import Toast from '$lib/components/Toast.svelte';
	import { gameStore } from '$lib/stores/game.svelte.js';
	import { page } from '$app/stores';

	let { children } = $props();

	const tabs = [
		{ href: '/dashboard', icon: '⚔', label: 'My Nation' },
		{ href: '/nations', icon: '⊞', label: 'Nations' },
		{ href: '/scoreboard', icon: '★', label: 'Scores' },
		{ href: '/action-log', icon: '☰', label: 'Log' }
	];
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<div class="relative flex min-h-screen flex-col bg-slate-950">
	<!-- Persistent connection status indicator -->
	<div class="absolute right-0 top-0 z-50">
		<ConnectionStatus />
	</div>

	<!-- Main content — padded at bottom when nav is visible -->
	<div class:pb-16={gameStore.isActive}>
		{@render children()}
	</div>

	<!-- Bottom tab navigation (game active only) -->
	{#if gameStore.isActive}
		<nav class="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-800 bg-slate-900">
			<div class="grid grid-cols-4">
				{#each tabs as tab (tab.href)}
					<a
						href={tab.href}
						class="flex flex-col items-center py-2 text-xs transition-colors"
						class:text-blue-400={$page.url.pathname === tab.href}
						class:text-slate-500={$page.url.pathname !== tab.href}
					>
						<span class="mb-0.5 text-lg leading-none">{tab.icon}</span>
						{tab.label}
					</a>
				{/each}
			</div>
		</nav>
	{/if}

	<!-- Toast overlay (always mounted, renders nothing when empty) -->
	<Toast />
</div>
