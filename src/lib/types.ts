/**
 * Configuration additions for DOMPurify sanitization requested by an extension.
 */
export interface ExtensionSanitizeConfig {
	/** Additional HTML/MathML/SVG tag names to permit during sanitization. */
	addTags?: string[];
	/** Additional HTML/MathML/SVG attribute names to permit during sanitization. */
	addAttrs?: string[];
}

/**
 * Extension interface for customizing MDitor's HTML output and DOM behavior.
 */
export interface MDitorExtension {
	/** Unique identifier for the extension (e.g. 'katex', 'prism', 'mermaid'). */
	name: string;
	/**
	 * Transforms the generated HTML string before/after sanitization.
	 * Useful for synchronous or asynchronous string-level processing such as
	 * KaTeX rendering, PrismJS syntax highlighting, or injecting custom classes/attributes.
	 */
	transformHtml?: (html: string) => string | Promise<string>;
	/**
	 * Invoked after the preview HTML has been mounted into the preview DOM container.
	 * Useful for DOM-based libraries such as Mermaid (`mermaid.run()`).
	 */
	afterRender?: (container: HTMLElement) => void | Promise<void>;
	/**
	 * Optional sanitizer allowlist additions required by this extension's HTML output.
	 */
	sanitizeConfig?: ExtensionSanitizeConfig;
}

/**
 * Controls HTML sanitization behavior:
 * - `true` (default): Sanitize HTML with DOMPurify.
 * - `false`: Disable HTML sanitization (discouraged; only use with trusted content).
 * - `(html: string) => string`: Custom sanitizer function override.
 */
export type SanitizeOption = boolean | ((html: string) => string);

/**
 * Options for the core Markdown-to-HTML rendering pipeline.
 */
export interface RenderMarkdownOptions {
	/** Active extensions to apply during rendering. */
	extensions?: MDitorExtension[];
	/** Sanitization configuration (defaults to `true`). */
	sanitize?: SanitizeOption;
}

/**
 * Payload emitted when the editor content or rendered HTML changes.
 */
export interface MDitorChangePayload {
	/** Raw Markdown text. */
	value: string;
	/** Rendered and sanitized HTML string. */
	html: string;
}

/**
 * Active mode of the MDitor interface.
 */
export type MDitorMode = 'write' | 'preview';

/**
 * Props accepted by the `<MDitor />` component.
 */
export interface MDitorProps {
	/** Raw Markdown string (bindable). */
	value?: string;
	/** Rendered HTML output string (bindable / read-out). */
	html?: string;
	/** List of extensions to process HTML output and preview DOM. */
	extensions?: MDitorExtension[];
	/** Sanitization configuration (`true` by default). */
	sanitize?: SanitizeOption;
	/** Placeholder text shown when the editor is empty. */
	placeholder?: string;
	/** Initial or controlled editor mode (`'write'` or `'preview'`). */
	mode?: MDitorMode;
	/** Whether the editor textarea is read-only. */
	readonly?: boolean;
	/** Whether the editor is disabled. */
	disabled?: boolean;
	/** Accessible label for the Markdown textarea. */
	ariaLabel?: string;
	/** Additional CSS class names for the root container. */
	class?: string;
	/** Callback fired whenever `value` or `html` updates from user interaction. */
	onchange?: (payload: MDitorChangePayload) => void;
}
