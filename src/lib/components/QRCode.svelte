<script lang="ts">
	interface Props {
		url: string;
		size?: number;
	}

	let { url, size = 200 }: Props = $props();

	let canvas = $state<HTMLCanvasElement | undefined>(undefined);
	let error = $state<string | null>(null);

	$effect(() => {
		if (!canvas || !url) return;
		import('qrcode').then(({ default: QRCode }) => {
			QRCode.toCanvas(canvas!, url, {
				width: size,
				margin: 2,
				color: { dark: '#ffffff', light: '#0f172a' }
			}).catch((e: unknown) => {
				error = e instanceof Error ? e.message : 'Failed to generate QR code.';
			});
		});
	});
</script>

{#if error}
	<div
		class="flex items-center justify-center rounded bg-slate-800 text-xs text-red-400"
		style="width:{size}px;height:{size}px"
	>
		{error}
	</div>
{:else}
	<canvas bind:this={canvas} class="rounded" style="width:{size}px;height:{size}px"></canvas>
{/if}
