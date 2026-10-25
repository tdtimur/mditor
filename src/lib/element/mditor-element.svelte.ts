import { mount, unmount } from 'svelte';
import MDitor from '../MDitor.svelte';
import { MDITOR_DEFAULT_CSS } from '../styles/default-css.js';
import { renderMarkdown, renderMarkdownSync } from '../core/renderer.js';
import type { MDitorChangePayload, MDitorExtension, MDitorMode, SanitizeOption } from '../types.js';

const STYLE_ELEMENT_ATTR = 'data-mditor-styles';

/**
 * Injects MDitor's default CSS variables and base styles into `document.head` once.
 */
export function ensureMDitorStyles(doc: Document = document): void {
	if (!doc?.head) return;
	if (doc.head.querySelector(`style[${STYLE_ELEMENT_ATTR}]`)) {
		return;
	}
	const styleEl = doc.createElement('style');
	styleEl.setAttribute(STYLE_ELEMENT_ATTR, '');
	styleEl.textContent = MDITOR_DEFAULT_CSS;
	doc.head.appendChild(styleEl);
}

class ReactiveElementState {
	value = $state('');
	html = $state('');
	extensions = $state<MDitorExtension[]>([]);
	sanitize = $state<SanitizeOption>(true);
	placeholder = $state('Write a comment or drag your files here...');
	mode = $state<MDitorMode>('write');
	readonly = $state(false);
	disabled = $state(false);
	ariaLabel = $state('Markdown editor');
}

/**
 * Custom Element (`<md-itor>`) wrapping `<MDitor />` in Light DOM (`shadow: 'none'`)
 * so external stylesheets (e.g. KaTeX, PrismJS) and `--mditor-*` CSS variables apply directly.
 */
export class MDitorElement extends HTMLElement {
	static get observedAttributes(): string[] {
		return ['value', 'placeholder', 'mode', 'readonly', 'disabled', 'aria-label'];
	}

	readonly #state = new ReactiveElementState();
	#mountedInstance: Record<string, unknown> | null = null;
	#renderVersion = 0;

	constructor() {
		super();
	}

	#syncHtml(): void {
		const version = ++this.#renderVersion;
		const syncHtml = renderMarkdownSync(this.#state.value, {
			extensions: this.#state.extensions,
			sanitize: this.#state.sanitize
		});
		this.#state.html = syncHtml;

		if (this.#state.extensions.some((ext) => typeof ext.transformHtml === 'function')) {
			void renderMarkdown(this.#state.value, {
				extensions: this.#state.extensions,
				sanitize: this.#state.sanitize
			}).then((asyncHtml) => {
				if (version === this.#renderVersion) {
					this.#state.html = asyncHtml;
				}
			});
		}
	}

	connectedCallback(): void {
		ensureMDitorStyles(this.ownerDocument);

		// Read initial attributes if present
		if (this.hasAttribute('value') && !this.#state.value) {
			this.#state.value = this.getAttribute('value') ?? '';
		}
		if (this.hasAttribute('placeholder')) {
			this.#state.placeholder =
				this.getAttribute('placeholder') ?? 'Write a comment or drag your files here...';
		}
		if (this.hasAttribute('mode')) {
			const attrMode = this.getAttribute('mode');
			if (attrMode === 'write' || attrMode === 'preview') {
				this.#state.mode = attrMode;
			}
		}
		if (this.hasAttribute('readonly')) {
			this.#state.readonly = this.getAttribute('readonly') !== 'false';
		}
		if (this.hasAttribute('disabled')) {
			this.#state.disabled = this.getAttribute('disabled') !== 'false';
		}
		if (this.hasAttribute('aria-label')) {
			this.#state.ariaLabel = this.getAttribute('aria-label') ?? 'Markdown editor';
		}

		this.#syncHtml();

		if (!this.#mountedInstance) {
			const state = this.#state;
			const handleChange = (payload: MDitorChangePayload): void => {
				state.value = payload.value;
				state.html = payload.html;
				this.dispatchEvent(
					new CustomEvent<MDitorChangePayload>('input', {
						detail: payload,
						bubbles: true,
						composed: true
					})
				);
				this.dispatchEvent(
					new CustomEvent<MDitorChangePayload>('change', {
						detail: payload,
						bubbles: true,
						composed: true
					})
				);
			};

			this.#mountedInstance = mount(MDitor, {
				target: this,
				props: {
					get value() {
						return state.value;
					},
					set value(v: string) {
						state.value = v;
					},
					get html() {
						return state.html;
					},
					set html(h: string) {
						state.html = h;
					},
					get extensions() {
						return state.extensions;
					},
					get sanitize() {
						return state.sanitize;
					},
					get placeholder() {
						return state.placeholder;
					},
					get mode() {
						return state.mode;
					},
					set mode(m: MDitorMode) {
						state.mode = m;
					},
					get readonly() {
						return state.readonly;
					},
					get disabled() {
						return state.disabled;
					},
					get ariaLabel() {
						return state.ariaLabel;
					},
					onchange: handleChange
				}
			});
		}
	}

	disconnectedCallback(): void {
		if (this.#mountedInstance) {
			void unmount(this.#mountedInstance);
			this.#mountedInstance = null;
		}
	}

	attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
		if (oldValue === newValue) return;
		switch (name) {
			case 'value':
				this.value = newValue ?? '';
				break;
			case 'placeholder':
				this.placeholder = newValue ?? 'Write a comment or drag your files here...';
				break;
			case 'mode':
				if (newValue === 'write' || newValue === 'preview') {
					this.mode = newValue;
				}
				break;
			case 'readonly':
				this.readonly = newValue !== null && newValue !== 'false';
				break;
			case 'disabled':
				this.disabled = newValue !== null && newValue !== 'false';
				break;
			case 'aria-label':
				this.ariaLabel = newValue ?? 'Markdown editor';
				break;
		}
	}

	get value(): string {
		return this.#state.value;
	}

	set value(next: string) {
		this.#state.value = next ?? '';
		this.#syncHtml();
	}

	get html(): string {
		return this.#state.html;
	}

	get extensions(): MDitorExtension[] {
		return this.#state.extensions;
	}

	set extensions(next: MDitorExtension[]) {
		this.#state.extensions = Array.isArray(next) ? next : [];
		this.#syncHtml();
	}

	get sanitize(): SanitizeOption {
		return this.#state.sanitize;
	}

	set sanitize(next: SanitizeOption) {
		this.#state.sanitize = next;
		this.#syncHtml();
	}

	get mode(): MDitorMode {
		return this.#state.mode;
	}

	set mode(next: MDitorMode) {
		if (next === 'write' || next === 'preview') {
			this.#state.mode = next;
		}
	}

	get placeholder(): string {
		return this.#state.placeholder;
	}

	set placeholder(next: string) {
		this.#state.placeholder = next ?? '';
	}

	get readonly(): boolean {
		return this.#state.readonly;
	}

	set readonly(next: boolean) {
		this.#state.readonly = Boolean(next);
	}

	get disabled(): boolean {
		return this.#state.disabled;
	}

	set disabled(next: boolean) {
		this.#state.disabled = Boolean(next);
	}

	get ariaLabel(): string {
		return this.#state.ariaLabel;
	}

	set ariaLabel(next: string) {
		this.#state.ariaLabel = next ?? 'Markdown editor';
	}
}

/**
 * Registers the `<md-itor>` Custom Element if not already defined.
 */
export function defineMDitorElement(tagName = 'md-itor'): void {
	if (typeof customElements !== 'undefined' && !customElements.get(tagName)) {
		customElements.define(tagName, MDitorElement);
	}
}
