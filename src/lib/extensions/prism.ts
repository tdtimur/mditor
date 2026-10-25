import type { MDitorExtension } from '../types.js';

export type PrismGrammar = Record<string, unknown>;

export interface PrismLike {
	languages: Record<string, PrismGrammar | undefined>;
	highlight(text: string, grammar: PrismGrammar, language: string): string;
	highlightAllUnder?(container: Element): void;
}

export interface PrismExtensionOptions {
	/**
	 * Optional PrismJS instance. If omitted, `window.Prism` will be used when available.
	 */
	prism?: PrismLike;
}

function decodeHtmlEntities(input: string): string {
	return input
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'");
}

function resolvePrism(options: PrismExtensionOptions): PrismLike | undefined {
	if (options.prism) {
		return options.prism;
	}
	if (typeof window !== 'undefined') {
		return (window as unknown as { Prism?: PrismLike }).Prism;
	}
	return undefined;
}

/**
 * Built-in extension for syntax highlighting fenced code blocks via PrismJS.
 */
export function prismExtension(options: PrismExtensionOptions = {}): MDitorExtension {
	return {
		name: 'prism',
		sanitizeConfig: {
			addTags: ['span'],
			addAttrs: ['class', 'style', 'tabindex']
		},
		transformHtml(html: string): string {
			const prism = resolvePrism(options);
			if (!prism) {
				return html;
			}

			return html.replace(
				/<pre><code class="language-([a-zA-Z0-9_-]+)">([\s\S]*?)<\/code><\/pre>/g,
				(fullMatch, lang: string, encodedCode: string) => {
					const grammar = prism.languages?.[lang];
					if (!grammar) {
						return fullMatch;
					}
					const rawCode = decodeHtmlEntities(encodedCode);
					const highlighted = prism.highlight(rawCode, grammar, lang);
					return `<pre class="language-${lang}"><code class="language-${lang}">${highlighted}</code></pre>`;
				}
			);
		},
		afterRender(container: HTMLElement): void {
			const prism = resolvePrism(options);
			if (prism?.highlightAllUnder) {
				prism.highlightAllUnder(container);
			}
		}
	};
}
