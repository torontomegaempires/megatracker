<script lang="ts">
	import { PHASES } from '../types/game.js';

	interface Props {
		phase: number;
		turn: number;
		onclick?: () => void;
	}

	let { phase, turn, onclick }: Props = $props();

	const phaseDef = $derived(PHASES.find((p) => p.phase === phase) ?? null);
</script>

<button
	class="w-full cursor-pointer border-b border-slate-700 bg-slate-900 px-4 py-2 text-left hover:bg-slate-800 active:bg-slate-700"
	{onclick}
	aria-label="Phase detail"
>
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-3">
			<span class="rounded bg-blue-600 px-2 py-0.5 text-xs font-bold uppercase text-white">
				Phase {phase}
			</span>
			{#if phaseDef}
				<span class="text-sm font-semibold text-white">{phaseDef.name}</span>
			{/if}
		</div>
		<div class="flex items-center gap-2 text-xs text-slate-400">
			<span>Turn {turn}</span>
			<span class="text-slate-600">›</span>
		</div>
	</div>
	{#if phaseDef}
		<p class="mt-0.5 text-xs text-slate-400">{phaseDef.description}</p>
	{/if}
</button>
