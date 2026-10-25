import type { MDitorExtension } from '../types.js';

export interface KatexRenderOptions {
	displayMode?: boolean;
	throwOnError?: boolean;
	[key: string]: unknown;
}

export interface KatexLike {
	renderToString(tex: string, options?: KatexRenderOptions): string;
}

export interface KatexExtensionOptions {
	/**
	 * Optional KaTeX instance. If omitted, `window.katex` will be used when available.
	 */
	katex?: KatexLike;
	/**
	 * Whether KaTeX should throw on invalid TeX syntax (defaults to `false`).
	 */
	throwOnError?: boolean;
	/**
	 * Additional options forwarded to `katex.renderToString`.
	 */
	katexOptions?: KatexRenderOptions;
}

const KATEX_TAGS = [
	'math',
	'semantics',
	'mrow',
	'mi',
	'mo',
	'mn',
	'msup',
	'msub',
	'msubsup',
	'mfrac',
	'msqrt',
	'mroot',
	'mtable',
	'mtr',
	'mtd',
	'mtext',
	'mspace',
	'mpadded',
	'menclose',
	'mstyle',
	'mover',
	'munder',
	'munderover',
	'annotation',
	'svg',
	'path',
	'line',
	'g'
];

const KATEX_ATTRS = [
	'style',
	'class',
	'aria-hidden',
	'xmlns',
	'viewBox',
	'd',
	'preserveAspectRatio',
	'encoding',
	'mathvariant',
	'stretchy',
	'fence',
	'separator',
	'accent',
	'accentunder',
	'columnalign',
	'rowspacing',
	'columnspacing',
	'width',
	'height'
];

function decodeHtmlEntities(input: string): string {
	return input
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'");
}

function resolveKatex(options: KatexExtensionOptions): KatexLike | undefined {
	if (options.katex) {
		return options.katex;
	}
	if (typeof window !== 'undefined') {
		return (window as unknown as { katex?: KatexLike }).katex;
	}
	return undefined;
}

/**
 * Built-in extension for rendering LaTeX math expressions via KaTeX.
 * Supports:
 * - Fenced code blocks (` ```math `, ` ```latex `, ` ```katex `)
 * - Display math (`$$...$$`)
 * - Inline math (`$...$`)
 */
export function katexExtension(options: KatexExtensionOptions = {}): MDitorExtension {
	const { throwOnError = false, katexOptions = {} } = options;

	return {
		name: 'katex',
		sanitizeConfig: {
			addTags: KATEX_TAGS,
			addAttrs: KATEX_ATTRS
		},
		transformHtml(html: string): string {
			const katex = resolveKatex(options);
			if (!katex) {
				return html;
			}

			const renderTex = (tex: string, displayMode: boolean): string => {
				try {
					return katex.renderToString(decodeHtmlEntities(tex.trim()), {
						...katexOptions,
						displayMode,
						throwOnError
					});
				} catch {
					return tex;
				}
			};

			// 1. Replace fenced ```math / ```latex / ```katex blocks first
			let processed = html.replace(
				/<pre><code class="language-(?:math|latex|katex)">([\s\S]*?)<\/code><\/pre>/g,
				(_, tex: string) => renderTex(tex, true)
			);

			// 2. Temporarily shield remaining <pre> and <code> blocks so math delimiters inside code are untouched
			const codePlaceholders: string[] = [];
			processed = processed.replace(/<(pre|code)\b[^>]*>[\s\S]*?<\/\1>/gi, (match) => {
				const token = `<!--MDITOR_CODE_${codePlaceholders.length}-->`;
				codePlaceholders.push(match);
				return token;
			});

			// 3. Render display math: $$...$$
			processed = processed.replace(/\$\$([\s\S]+?)\$\$/g, (_, tex: string) =>
				renderTex(tex, true)
			);

			// 4. Render inline math: $...$ (single line, non-empty, not starting/ending with space)
			processed = processed.replace(
				/(^|[^\\$])\$(?!\s)([^$\n]+?)(?<!\s)\$/g,
				(_, prefix: string, tex: string) => `${prefix}${renderTex(tex, false)}`
			);

			// 5. Restore shielded <pre> and <code> blocks
			processed = processed.replace(
				/<!--MDITOR_CODE_(\d+)-->/g,
				(_, indexStr: string) => codePlaceholders[Number(indexStr)] ?? ''
			);

			return processed;
		}
	};
}
