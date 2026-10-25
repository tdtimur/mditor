import { describe, expect, it, vi } from 'vitest';
import { renderMarkdown, runAfterRender } from '../core/renderer.js';
import { katexExtension, mermaidExtension, prismExtension } from './index.js';

describe('built-in extensions (browser globals & DOM afterRender)', () => {
	it('auto-detects window.katex, window.Prism, and window.mermaid and executes mermaid.run on DOM nodes', async () => {
		const win = window as unknown as Record<string, unknown>;

		win.katex = {
			renderToString: (tex: string) => `<math><mi>${tex}</mi></math>`
		};
		win.Prism = {
			languages: { ts: {} },
			highlight: (code: string) => `<span class="token">${code.trim()}</span>`,
			highlightAllUnder: vi.fn()
		};
		const mermaidRunSpy = vi.fn();
		const mermaidInitSpy = vi.fn();
		win.mermaid = {
			initialize: mermaidInitSpy,
			run: mermaidRunSpy
		};

		const extensions = [katexExtension(), prismExtension(), mermaidExtension()];
		const md = [
			'Formula: $x$',
			'',
			'```ts',
			'let y = 2;',
			'```',
			'',
			'```mermaid',
			'flowchart TD',
			'  Start --> Stop',
			'```'
		].join('\n');

		const html = await renderMarkdown(md, { extensions });
		expect(html).toContain('<math><mi>x</mi></math>');
		expect(html).toContain('<span class="token">let y = 2;</span>');
		expect(html).toContain('<div class="mermaid">');

		const container = document.createElement('div');
		container.innerHTML = html;
		await runAfterRender(container, extensions);

		expect(mermaidInitSpy).toHaveBeenCalledOnce();
		expect(mermaidRunSpy).toHaveBeenCalledOnce();

		delete win.katex;
		delete win.Prism;
		delete win.mermaid;
	});
});
