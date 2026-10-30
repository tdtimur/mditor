import { page } from 'vitest/browser';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import MDitor from './MDitor.svelte';
import type { MDitorExtension } from './types.js';

describe('MDitor.svelte', () => {
	it('renders in write mode and switches to preview mode showing rendered HTML', async () => {
		render(MDitor, {
			value: '# Hello MDitor\n\nThis is **bold**.'
		});

		const textarea = page.getByRole('textbox', { name: 'Markdown editor' });
		await expect.element(textarea).toHaveValue('# Hello MDitor\n\nThis is **bold**.');

		const previewTab = page.getByRole('tab', { name: 'Preview' });
		await previewTab.click();

		await expect.element(page.getByRole('heading', { level: 1 })).toHaveTextContent('Hello MDitor');
	});

	it('applies toolbar formatting commands, supports undo/redo, and fires onchange', async () => {
		const onchange = vi.fn();
		render(MDitor, {
			value: '',
			onchange
		});

		const boldBtn = page.getByRole('button', { name: 'Add bold text' });
		await boldBtn.click();

		const textarea = page.getByRole('textbox', { name: 'Markdown editor' });
		await expect.element(textarea).toHaveValue('**bold text**');
		expect(onchange).toHaveBeenCalledWith(
			expect.objectContaining({
				value: '**bold text**',
				html: expect.stringContaining('<strong>bold text</strong>')
			})
		);

		const undoBtn = page.getByRole('button', { name: 'Undo' });
		await undoBtn.click();
		await expect.element(textarea).toHaveValue('');

		const redoBtn = page.getByRole('button', { name: 'Redo' });
		await redoBtn.click();
		await expect.element(textarea).toHaveValue('**bold text**');
	});

	it('preserves scroll position when inserting items or formatting with long content', async () => {
		const longText = Array.from({ length: 50 }, (_, i) => `Line ${i + 1}`).join('\n');
		const { container } = render(MDitor, {
			value: longText
		});

		const textarea = container.querySelector('textarea')!;
		expect(textarea.scrollHeight).toBeGreaterThan(textarea.clientHeight);

		// 1. Cursor at top (scrollTop = 0): should not scroll down to bottom on toolbar click
		textarea.focus();
		textarea.setSelectionRange(0, 0);
		textarea.scrollTop = 0;

		const linkBtn = page.getByRole('button', { name: 'Add a link' });
		await linkBtn.click();

		expect(textarea.scrollTop).toBe(0);

		// 2. Scrolled down (scrollTop = 300): should preserve scroll position
		textarea.scrollTop = 300;
		const codeBtn = page.getByRole('button', { name: 'Insert code', exact: true });
		await codeBtn.click();

		expect(textarea.scrollTop).toBe(300);
	});

	it('toggles fullscreen mode via the toolbar button', async () => {
		const { container } = render(MDitor, { value: 'Test' });
		const root = container.querySelector('.mditor');
		expect(root?.classList.contains('mditor--fullscreen')).toBe(false);

		const fsBtn = page.getByRole('button', { name: 'Go full screen' });
		await fsBtn.click();
		expect(root?.classList.contains('mditor--fullscreen')).toBe(true);

		const exitBtn = page.getByRole('button', { name: 'Exit full screen' });
		await exitBtn.click();
		expect(root?.classList.contains('mditor--fullscreen')).toBe(false);
	});

	it('executes extension transformHtml and afterRender hooks in preview mode', async () => {
		const afterRenderSpy = vi.fn();
		const testExt: MDitorExtension = {
			name: 'test-ext',
			transformHtml: (html) => html.replace('<p>', '<p data-transformed="yes">'),
			afterRender: (el) => {
				afterRenderSpy(el.querySelector('[data-transformed="yes"]')?.textContent);
			},
			sanitizeConfig: {
				addAttrs: ['data-transformed']
			}
		};

		render(MDitor, {
			value: 'Custom extension content',
			mode: 'preview',
			extensions: [testExt]
		});

		await expect.element(page.getByText('Custom extension content')).toBeInTheDocument();
		expect(afterRenderSpy).toHaveBeenCalledWith('Custom extension content');
	});
});
