import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import { sveltekit } from '@sveltejs/kit/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit(),
		VitePWA({
			registerType: 'autoUpdate',
			// Inline the SW registration script into the <head> instead of a separate module
			injectRegister: 'auto',
			// Cache all static assets produced by the build
			workbox: {
				globPatterns: ['**/*.{js,css,html,svg,ico,woff2,webp,png}'],
				// SPA fallback: any navigation not in the precache returns index.html
				navigateFallback: '/index.html',
				// Don't intercept _app/ internals or the SW itself
				navigateFallbackDenylist: [/^\/_app\//, /\/sw\.js$/]
			},
			includeAssets: ['favicon.svg', 'icons/icon.svg'],
			manifest: {
				name: 'MegaTracker',
				short_name: 'MegaTracker',
				description: 'Mega Empires session companion — up to 18 players via WebRTC',
				theme_color: '#0f172a',
				background_color: '#0f172a',
				display: 'standalone',
				orientation: 'portrait',
				scope: '/',
				start_url: '/',
				icons: [
					{
						src: '/icons/icon.svg',
						sizes: '192x192',
						type: 'image/svg+xml',
						purpose: 'any'
					},
					{
						src: '/icons/icon.svg',
						sizes: '512x512',
						type: 'image/svg+xml',
						purpose: 'any maskable'
					}
				]
			}
		})
	],
	// PeerJS requires these Node.js globals to be available in the browser bundle
	define: {
		global: 'globalThis'
	},
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'client',
					browser: {
						enabled: true,
						provider: playwright(),
						instances: [{ browser: 'chromium', headless: true }]
					},
					include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					exclude: ['src/lib/server/**']
				}
			},

			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
});
