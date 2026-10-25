import { describe, expect, it } from 'vitest';
import { renderMarkdown, runAfterRender } from './renderer.js';
import type { MDitorExtension } from '../types.js';

describe('renderer (browser DOMPurify & afterRender)', () => {
	it('preserves custom tags and attributes declared in extension sanitizeConfig', async () => {
		const customExt: MDitorExtension = {
			name: 'custom-widget',
			transformHtml: (html) => `${html}<custom-badge data-badge="pro">PRO</custom-badge>`,
			sanitizeConfig: {
				addTags: ['custom-badge'],
				addAttrs: ['data-badge']
			}
		};

		const html = await renderMarkdown('Hello', { extensions: [customExt] });
		expect(html).toContain('<custom-badge data-badge="pro">PRO</custom-badge>');
	});

	it('executes afterRender hooks on a real DOM container', async () => {
		const container = document.createElement('div');
		container.innerHTML = await renderMarkdown('```mermaid\ngraph TD;\nA-->B;\n```');

		const afterRenderExt: MDitorExtension = {
			name: 'dom-enhancer',
			afterRender: (el) => {
				const codeBlock = el.querySelector('code.language-mermaid');
				if (codeBlock) {
					codeBlock.setAttribute('data-rendered', 'true');
				}
			}
		};

		await runAfterRender(container, [afterRenderExt]);
		const codeEl = container.querySelector('code.language-mermaid');
		expect(codeEl?.getAttribute('data-rendered')).toBe('true');
	});
});
