import { Marked } from 'marked';
import createDOMPurify, { type Config as DOMPurifyConfig, type WindowLike } from 'dompurify';
import type { MDitorExtension, RenderMarkdownOptions, SanitizeOption } from '../types.js';

const markedInstance = new Marked({
	gfm: true,
	breaks: false
});

/**
 * Collects merged DOMPurify ADD_TAGS and ADD_ATTR from active extensions.
 */
function buildPurifyConfig(extensions: MDitorExtension[]): DOMPurifyConfig {
	const addTags = new Set<string>(['input']);
	const addAttrs = new Set<string>(['type', 'checked', 'disabled', 'class', 'id', 'aria-hidden']);

	for (const ext of extensions) {
		if (ext.sanitizeConfig?.addTags) {
			for (const tag of ext.sanitizeConfig.addTags) {
				addTags.add(tag);
			}
		}
		if (ext.sanitizeConfig?.addAttrs) {
			for (const attr of ext.sanitizeConfig.addAttrs) {
				addAttrs.add(attr);
			}
		}
	}

	return {
		ADD_TAGS: Array.from(addTags),
		ADD_ATTR: Array.from(addAttrs)
	};
}

/**
 * Fallback sanitizer for non-DOM (SSR/Node) environments where `window` is unavailable.
 * In browser environments, DOMPurify is always used.
 */
function sanitizeFallbackSSR(html: string): string {
	return html
		.replace(
			/<(script|iframe|object|embed|applet|meta|link|base|form)\b[^>]*>([\s\S]*?<\/\1>)?/gi,
			''
		)
		.replace(/<(script|iframe|object|embed|applet|meta|link|base|form)\b[^>]*\/?>/gi, '')
		.replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
		.replace(
			/\s+(href|src|xlink:href|action|formaction)\s*=\s*(?:"\s*(?:javascript|vbscript|data:text\/html)[^"]*"|'\s*(?:javascript|vbscript|data:text\/html)[^']*'|(?:\s*(?:javascript|vbscript|data:text\/html)[^\s>]*))/gi,
			''
		);
}

/**
 * Sanitizes an HTML string according to the `sanitize` option and extension configurations.
 */
export function sanitizeHtml(
	html: string,
	sanitize: SanitizeOption = true,
	extensions: MDitorExtension[] = []
): string {
	if (sanitize === false) {
		return html;
	}

	if (typeof sanitize === 'function') {
		return sanitize(html);
	}

	if (typeof window !== 'undefined' && typeof window.document !== 'undefined') {
		const purifier =
			typeof createDOMPurify.sanitize === 'function'
				? createDOMPurify
				: createDOMPurify(window as unknown as WindowLike);
		const config = buildPurifyConfig(extensions);
		return purifier.sanitize(html, config) as string;
	}

	return sanitizeFallbackSSR(html);
}

/**
 * Parses raw Markdown into HTML using `marked` (GFM enabled).
 */
export function parseMarkdown(markdown: string): string {
	if (!markdown) return '';
	return markedInstance.parse(markdown, { async: false }) as string;
}

/**
 * Synchronous Markdown rendering pipeline:
 * 1. Parse Markdown with `marked` (GFM)
 * 2. Run synchronous `transformHtml` hooks from `extensions`
 * 3. Sanitize resulting HTML via `DOMPurify` (unless overridden)
 *
 * Note: If an extension's `transformHtml` returns a Promise, use `renderMarkdown` instead.
 */
export function renderMarkdownSync(markdown: string, options: RenderMarkdownOptions = {}): string {
	const { extensions = [], sanitize = true } = options;
	let html = parseMarkdown(markdown);

	for (const ext of extensions) {
		if (ext.transformHtml) {
			const transformed = ext.transformHtml(html);
			if (typeof transformed === 'string') {
				html = transformed;
			}
		}
	}

	return sanitizeHtml(html, sanitize, extensions);
}

/**
 * Asynchronous Markdown rendering pipeline:
 * 1. Parse Markdown with `marked` (GFM)
 * 2. Sequentially run `transformHtml` hooks (sync or async) from `extensions`
 * 3. Sanitize resulting HTML via `DOMPurify` (unless overridden)
 */
export async function renderMarkdown(
	markdown: string,
	options: RenderMarkdownOptions = {}
): Promise<string> {
	const { extensions = [], sanitize = true } = options;
	let html = parseMarkdown(markdown);

	for (const ext of extensions) {
		if (ext.transformHtml) {
			html = await ext.transformHtml(html);
		}
	}

	return sanitizeHtml(html, sanitize, extensions);
}

/**
 * Runs `afterRender` hooks for all provided extensions on the preview DOM container.
 */
export async function runAfterRender(
	container: HTMLElement,
	extensions: MDitorExtension[] = []
): Promise<void> {
	for (const ext of extensions) {
		if (ext.afterRender) {
			await ext.afterRender(container);
		}
	}
}
