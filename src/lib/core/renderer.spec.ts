import { describe, expect, it } from 'vitest';
import { parseMarkdown, renderMarkdown, renderMarkdownSync } from './renderer.js';
import type { MDitorExtension } from '../types.js';

describe('renderer (unit)', () => {
	it('returns empty string for empty markdown', async () => {
		expect(parseMarkdown('')).toBe('');
		expect(renderMarkdownSync('')).toBe('');
		expect(await renderMarkdown('')).toBe('');
	});

	it('renders standard GFM markdown features (headings, tables, task lists, strikethrough)', () => {
		const md = [
			'# Heading 1',
			'',
			'Some **bold** and ~~strike~~ text.',
			'',
			'- [ ] Todo item',
			'- [x] Completed item',
			'',
			'| Col A | Col B |',
			'| ----- | ----- |',
			'| 1     | 2     |'
		].join('\n');

		const html = renderMarkdownSync(md);
		expect(html).toContain('<h1>Heading 1</h1>');
		expect(html).toContain('<strong>bold</strong>');
		expect(html).toContain('<del>strike</del>');
		expect(html).toContain('type="checkbox"');
		expect(html).toContain('<table>');
		expect(html).toContain('<td>1</td>');
	});

	it('strips XSS payloads by default', () => {
		const malicious =
			'# Hello\n<script>alert("xss")</script>\n<img src="x" onerror="alert(1)">\n<a href="javascript:alert(2)">Click</a>';
		const html = renderMarkdownSync(malicious);

		expect(html).toContain('<h1>Hello</h1>');
		expect(html).not.toContain('<script>');
		expect(html).not.toContain('onerror');
		expect(html).not.toContain('javascript:');
	});

	it('allows disabling sanitization when sanitize is false', () => {
		const raw = '<div data-custom="123" onclick="noop()">Custom</div>';
		const html = renderMarkdownSync(raw, { sanitize: false });
		expect(html).toContain('onclick="noop()"');
	});

	it('supports custom sanitizer function override', () => {
		const html = renderMarkdownSync('# Title', {
			sanitize: (input) => input.replace('<h1>', '<h1 class="sanitized">')
		});
		expect(html).toContain('<h1 class="sanitized">Title</h1>');
	});

	it('runs synchronous and asynchronous transformHtml extensions in order', async () => {
		const ext1: MDitorExtension = {
			name: 'add-class',
			transformHtml: (html) => html.replace('<p>', '<p class="ext-1">')
		};
		const ext2: MDitorExtension = {
			name: 'async-wrap',
			transformHtml: async (html) => {
				await Promise.resolve();
				return `<section class="ext-2">${html.trim()}</section>`;
			}
		};

		const html = await renderMarkdown('Hello world', {
			extensions: [ext1, ext2]
		});

		expect(html).toContain('<section class="ext-2"><p class="ext-1">Hello world</p></section>');
	});
});
