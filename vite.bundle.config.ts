import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

/**
 * Separate Vite build that produces a self-contained ES module bundle at
 * dist-bundle/mditor.js — usable directly in a <script type="module">
 * with no bundler, no Node, no npm.
 */
export default defineConfig({
	plugins: [
		svelte({
			compilerOptions: {
				runes: true
			}
		})
	],
	build: {
		lib: {
			entry: './src/lib/element/index.ts',
			formats: ['es'],
			fileName: 'mditor'
		},
		outDir: 'dist-bundle',
		emptyOutDir: true
	}
});
