import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},

			// SPA mode — blueprint B2. The build output is a static folder and no Node
			// server exists at runtime, so nothing is generated per-route at build time.
			// `fallback` is the single document that boots the app for every URL; without
			// it a build with no prerendered pages fails, and a hard refresh on
			// /change-controls/CC-001 would 404.
			adapter: adapter({ fallback: 'index.html' })
		})
	]
});
