import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
	plugins: [
		svelte({
			compilerOptions: {
				runes: true
			}
		})
	],
	build: {
		emptyOutDir: false,
		outDir: 'dist/element',
		lib: {
			entry: 'src/lib/element/index.ts',
			name: 'MDitorElement',
			formats: ['es'],
			fileName: () => 'bundle.js'
		}
	}
});
