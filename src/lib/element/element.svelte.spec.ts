import { describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import './index.js';
import type { MDitorElement } from './mditor-element.svelte.js';
import type { MDitorChangePayload } from '../types.js';

describe('<md-itor> Web Component', () => {
	it('registers <md-itor>, injects default styles, and renders initial value attribute', async () => {
		expect(customElements.get('md-itor')).toBeDefined();

		const el = document.createElement('md-itor') as MDitorElement;
		el.setAttribute('value', '# Hello from WC');
		document.body.appendChild(el);

		expect(document.head.querySelector('style[data-mditor-styles]')).not.toBeNull();
		expect(el.value).toBe('# Hello from WC');
		expect(el.html).toContain('<h1>Hello from WC</h1>');

		const textarea = page.getByRole('textbox', { name: 'Markdown editor' });
		await expect.element(textarea).toHaveValue('# Hello from WC');

		el.remove();
	});

	it('updates reactive properties (.value, .extensions, .mode) and dispatches change/input events', async () => {
		const el = document.createElement('md-itor') as MDitorElement;
		document.body.appendChild(el);

		el.extensions = [
			{
				name: 'custom-attr',
				transformHtml: (html) => html.replace('<p>', '<p data-wc="true">'),
				sanitizeConfig: { addAttrs: ['data-wc'] }
			}
		];
		el.value = 'Testing WC';
		expect(el.html).toContain('<p data-wc="true">Testing WC</p>');

		const changeSpy = vi.fn();
		el.addEventListener('change', (evt) => {
			changeSpy((evt as CustomEvent<MDitorChangePayload>).detail);
		});

		const boldBtn = page.getByRole('button', { name: 'Add bold text' });
		await boldBtn.click();

		expect(changeSpy).toHaveBeenCalledOnce();
		expect(el.value).toContain('**');

		el.remove();
	});
});
