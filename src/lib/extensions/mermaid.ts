import type { MDitorExtension } from '../types.js';

export interface MermaidRunOptions {
	nodes?: ArrayLike<HTMLElement>;
	querySelector?: string;
	suppressErrors?: boolean;
}

export interface MermaidLike {
	initialize?(config: Record<string, unknown>): void;
	run?(options?: MermaidRunOptions): Promise<void> | void;
	init?(config?: Record<string, unknown>, nodes?: Element | NodeListOf<Element> | Element[]): void;
}

export interface MermaidExtensionOptions {
	/**
	 * Optional Mermaid instance. If omitted, `window.mermaid` will be used when available.
	 */
	mermaid?: MermaidLike;
	/**
	 * Optional configuration passed to `mermaid.initialize({ startOnLoad: false, ...config })`.
	 */
	config?: Record<string, unknown>;
}

function resolveMermaid(options: MermaidExtensionOptions): MermaidLike | undefined {
	if (options.mermaid) {
		return options.mermaid;
	}
	if (typeof window !== 'undefined') {
		return (window as unknown as { mermaid?: MermaidLike }).mermaid;
	}
	return undefined;
}

/**
 * Built-in extension for rendering ` ```mermaid ` diagrams inside the preview container.
 */
export function mermaidExtension(options: MermaidExtensionOptions = {}): MDitorExtension {
	let initialized = false;

	return {
		name: 'mermaid',
		sanitizeConfig: {
			addTags: [
				'div',
				'svg',
				'g',
				'path',
				'rect',
				'circle',
				'line',
				'polygon',
				'polyline',
				'text',
				'tspan',
				'marker',
				'defs',
				'style',
				'foreignObject'
			],
			addAttrs: [
				'class',
				'id',
				'style',
				'viewBox',
				'd',
				'transform',
				'fill',
				'stroke',
				'width',
				'height',
				'x',
				'y',
				'rx',
				'ry',
				'cx',
				'cy',
				'r',
				'x1',
				'y1',
				'x2',
				'y2',
				'points',
				'marker-end',
				'marker-start',
				'data-processed'
			]
		},
		transformHtml(html: string): string {
			return html.replace(
				/<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g,
				(_, diagramCode: string) => `<div class="mermaid">${diagramCode.trim()}</div>`
			);
		},
		async afterRender(container: HTMLElement): Promise<void> {
			const nodes = Array.from(container.querySelectorAll<HTMLElement>('.mermaid'));
			if (nodes.length === 0) {
				return;
			}

			const mermaid = resolveMermaid(options);
			if (!mermaid) {
				return;
			}

			if (!initialized && mermaid.initialize) {
				mermaid.initialize({ startOnLoad: false, ...options.config });
				initialized = true;
			}

			if (typeof mermaid.run === 'function') {
				await mermaid.run({ nodes, suppressErrors: true });
			} else if (typeof mermaid.init === 'function') {
				mermaid.init(undefined, nodes);
			}
		}
	};
}
