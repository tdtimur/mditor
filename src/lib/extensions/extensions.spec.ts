import { describe, expect, it, vi } from 'vitest';
import { renderMarkdownSync } from '../core/renderer.js';
import { katexExtension, type KatexLike } from './katex.js';
import { prismExtension, type PrismLike } from './prism.js';
import { mermaidExtension, type MermaidLike } from './mermaid.js';

describe('built-in extensions (unit)', () => {
	it('katexExtension renders inline ($...$), display ($$...$$), and fenced math blocks while ignoring code blocks', () => {
		const mockKatex: KatexLike = {
			renderToString: vi.fn((tex, opts) =>
				opts?.displayMode
					? `<span class="katex-display">${tex}</span>`
					: `<span class="katex-inline">${tex}</span>`
			)
		};

		const md = [
			'Inline formula $E = mc^2$ and currency $100 or `$not_math$`.',
			'',
			'$$',
			'\\int_0^1 x^2 dx',
			'$$',
			'',
			'```math',
			'a^2 + b^2 = c^2',
			'```'
		].join('\n');

		const html = renderMarkdownSync(md, {
			extensions: [katexExtension({ katex: mockKatex })]
		});

		expect(html).toContain('<span class="katex-inline">E = mc^2</span>');
		expect(html).toContain('<code>$not_math$</code>');
		expect(html).toContain('<span class="katex-display">\\int_0^1 x^2 dx</span>');
		expect(html).toContain('<span class="katex-display">a^2 + b^2 = c^2</span>');
	});

	it('prismExtension highlights fenced code blocks when grammar is available', () => {
		const mockPrism: PrismLike = {
			languages: {
				js: {}
			},
			highlight: vi.fn((code) => `<span class="token keyword">${code.trim()}</span>`)
		};

		const md = '```js\nconst a = 1;\n```\n\n```unknown\nplain\n```';
		const html = renderMarkdownSync(md, {
			extensions: [prismExtension({ prism: mockPrism })]
		});

		expect(html).toContain(
			'<pre class="language-js"><code class="language-js"><span class="token keyword">const a = 1;</span></code></pre>'
		);
		expect(html).toContain('<pre><code class="language-unknown">plain\n</code></pre>');
	});

	it('mermaidExtension transforms fenced mermaid blocks into .mermaid containers', () => {
		const mockMermaid: MermaidLike = {
			initialize: vi.fn(),
			run: vi.fn()
		};

		const md = '```mermaid\ngraph LR;\n  A-->B;\n```';
		const html = renderMarkdownSync(md, {
			extensions: [mermaidExtension({ mermaid: mockMermaid })]
		});

		expect(html).toContain('<div class="mermaid">graph LR;\n  A--&gt;B;</div>');
	});
});
