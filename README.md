# MDitor

MDitor is a lightweight, user-friendly Markdown editor inspired by GitLab's Markdown editor. It is written in **Svelte 5** with TypeScript and published as both a **Svelte component** (`mditor`) and a **Web Component** (`mditor/element`), with optional tree-shakeable extensions (`mditor/extensions`).

---

## Table of Contents

1. [Features](#features)
2. [Installation](#installation)
3. [Usage](#usage)
   - [Svelte 5 Component (`<MDitor />`)](#1-svelte-5-component-mditor-)
   - [Web Component (`<md-itor>`)](#2-web-component-md-itor)
   - [Standalone Rendering Utilities](#3-standalone-rendering-utilities)
4. [API Reference](#api-reference)
   - [Props & Web Component Properties](#props--web-component-properties)
   - [Events](#events)
   - [Toolbar & Keyboard Shortcuts](#toolbar--keyboard-shortcuts)
5. [Extension System](#extension-system)
   - [Built-in Extensions (`katex`, `prism`, `mermaid`)](#built-in-extensions)
   - [Creating Custom Extensions](#creating-custom-extensions)
6. [HTML Sanitization](#html-sanitization)
7. [Styling, Light/Dark Mode & CSS Variables](#styling-lightdark-mode--css-variables)
8. [Development & Publishing](#development--publishing)

---

## Features

- **Writing & Preview Modes**: Switch between authoring raw Markdown and previewing live GitHub Flavored Markdown (GFM) HTML.
- **GitLab-Inspired Toolbar**: Headings, Bold, Italic, Strikethrough, Blockquote, Inline Code, Code Block, Link, Image, Table, Horizontal Rule, Bulleted List, Numbered List, Task List (`- [ ]`), Undo/Redo, and Fullscreen toggle.
- **Smart Keyboard Editing**:
  - `Cmd/Ctrl + B` (Bold), `Cmd/Ctrl + I` (Italic), `Cmd/Ctrl + K` (Link)
  - `Cmd/Ctrl + Z` (Undo), `Cmd/Ctrl + Shift + Z` / `Cmd/Ctrl + Y` (Redo)
  - Smart list auto-continuation on `Enter` for bulleted (`-`, `*`, `+`), numbered (`1.`), and task (`- [ ]`) lists (pressing `Enter` on an empty list item exits the list)
  - Multi-line `Tab` / `Shift + Tab` indentation and outdentation
  - `Esc` to exit Fullscreen mode
- **Safe by Default**: All rendered HTML is sanitized via `DOMPurify` to prevent XSS attacks.
- **Simple, Flexible Extension System**: Process generated HTML strings (`transformHtml`) or run post-render DOM logic (`afterRender`). Includes optional built-in extensions for **KaTeX**, **PrismJS**, and **Mermaid** without bloating the core bundle.
- **Customizable via CSS Variables**: Minimal default styles powered by `--mditor-*` CSS custom properties, responsive mobile layout, automatic device light/dark mode support (`prefers-color-scheme`), and Light DOM Web Component rendering so page stylesheets apply seamlessly.

---

## Installation

### Option 1: Install from GitHub Release Tarball (No Auth or `.npmrc` Required)

Each release attaches a pre-built npm package tarball (`mditor.tgz`). You can install it directly with `npm` without configuring `.npmrc` or tokens, and all dependencies (`marked`, `dompurify`, `svelte`) continue to resolve from the standard public npm registry:

```bash
# Latest release
npm install https://github.com/tdtimur/mditor/releases/latest/download/mditor.tgz

# Or pin a specific release tag
npm install https://github.com/tdtimur/mditor/releases/download/v0.1.2/mditor.tgz
```

### Option 2: GitHub Packages NPM Registry (`@tdtimur/mditor`)

> **Note:** GitHub Packages (`https://npm.pkg.github.com`) requires a GitHub Personal Access Token (classic) with `read:packages` scope even for public packages. Scoping the registry to `@tdtimur:registry` ensures all other packages still install from the default public npm registry (`https://registry.npmjs.org`).

1. Add the `@tdtimur` scope and token to your `.npmrc`:

```ini
@tdtimur:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

2. Install the package:

```bash
npm install @tdtimur/mditor
```

### Option 3: Direct Download (Standalone Web Component Bundle)

Each release also ships a self-contained ES module bundle (`mditor.js`) as a GitHub Release asset:

```
https://github.com/tdtimur/mditor/releases/latest/download/mditor.js
```

The single `mditor.js` file includes the Svelte runtime, `marked`, `DOMPurify`, `<md-itor>` registration, and the built-in extensions (`katexExtension`, `prismExtension`, `mermaidExtension`). No npm or bundler is required:

```html
<script type="module">
	import { mermaidExtension } from './mditor.js';

	const editor = document.querySelector('md-itor');
	editor.extensions = [mermaidExtension()];
</script>

<md-itor value="# Hello from single-file bundle"></md-itor>
```

### Package Entry Points

| Import Path                                           | Target        | Description                                                                                    |
| ----------------------------------------------------- | ------------- | ---------------------------------------------------------------------------------------------- |
| `mditor` (or `@tdtimur/mditor`)                       | Svelte 5      | Exports `<MDitor />` component, rendering helpers, and TypeScript types.                       |
| `mditor/element` (or `@tdtimur/mditor/element`)       | Web Component | Registers `<md-itor>` custom element (resolves to a standalone bundle in non-Svelte projects). |
| `mditor/extensions` (or `@tdtimur/mditor/extensions`) | Both          | Exports `katexExtension`, `prismExtension`, and `mermaidExtension`.                            |

---

## Usage

### 1. Svelte 5 Component (`<MDitor />`)

Pass raw Markdown via `value` (or `bind:value`), and read the rendered, sanitized HTML via `bind:html` or the `onchange` callback:

```svelte
<script lang="ts">
	import MDitor from 'mditor';
	import { mermaidExtension } from 'mditor/extensions';

	let markdown = $state('# Hello MDitor\n\nWrite some **Markdown**!');
	let html = $state('');
</script>

<MDitor
	bind:value={markdown}
	bind:html
	extensions={[mermaidExtension()]}
	placeholder="Write your markdown here..."
	onchange={({ value, html }) => {
		console.log('Markdown:', value);
		console.log('Sanitized HTML:', html);
	}}
/>
```

### 2. Web Component (`<md-itor>`)

Import `mditor/element` to automatically register the `<md-itor>` custom element. You can pass initial Markdown via the `value` attribute or `.value` property, configure `.extensions`, and read `.value` or `.html` at any time:

```html
<!-- Optional: load third-party scripts/styles on the page for extensions -->
<script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>

<md-itor id="editor" value="# Hello from Web Component"></md-itor>

<script type="module">
	import 'mditor/element';
	import { mermaidExtension } from 'mditor/extensions';

	const editor = document.getElementById('editor');

	// Configure extensions
	editor.extensions = [mermaidExtension()];

	// Read formatted HTML or raw Markdown at any time
	console.log(editor.value); // "# Hello from Web Component"
	console.log(editor.html); // "<h1>Hello from Web Component</h1>\n"

	// Listen for live changes
	editor.addEventListener('change', (event) => {
		const { value, html } = event.detail;
		console.log('Updated Markdown:', value);
		console.log('Updated HTML:', html);
	});
</script>
```

#### Registering a Custom Tag Name

If you want to register the Web Component under an additional tag name, use `defineMDitorElement`:

```ts
import { defineMDitorElement } from 'mditor/element';

defineMDitorElement('custom-markdown-editor');
```

### 3. Standalone Rendering Utilities

You can also use MDitor's rendering and sanitization pipeline directly without mounting the editor UI:

```ts
import { renderMarkdown, renderMarkdownSync, sanitizeHtml } from 'mditor';
import { katexExtension } from 'mditor/extensions';

// Synchronous rendering (when all extensions are synchronous)
const htmlSync = renderMarkdownSync('# Title\n\nInline $E=mc^2$', {
	extensions: [katexExtension()]
});

// Asynchronous rendering (supports async transformHtml extensions)
const htmlAsync = await renderMarkdown('# Title', {
	extensions: [katexExtension()],
	sanitize: true
});
```

---

## API Reference

### Props & Web Component Properties

| Prop / Property | HTML Attribute (`<md-itor>`) | Type                                     | Default                                        | Description                                                                                      |
| --------------- | ---------------------------- | ---------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `value`         | `value`                      | `string`                                 | `''`                                           | Raw Markdown text (bindable in Svelte, read/write property on `<md-itor>`).                      |
| `html`          | —                            | `string`                                 | `''`                                           | Rendered and sanitized HTML output (bindable in Svelte, readonly `.html` getter on `<md-itor>`). |
| `extensions`    | —                            | `MDitorExtension[]`                      | `[]`                                           | Array of extensions to transform HTML and enhance the preview DOM.                               |
| `sanitize`      | —                            | `boolean \| ((html: string) => string)`  | `true`                                         | Controls HTML sanitization (`true` = `DOMPurify`, `false` = disabled, or custom function).       |
| `mode`          | `mode`                       | `'write' \| 'preview'`                   | `'write'`                                      | Active tab (`'write'` or `'preview'`). Bindable in Svelte.                                       |
| `placeholder`   | `placeholder`                | `string`                                 | `'Write a comment or drag your files here...'` | Placeholder shown when the editor is empty.                                                      |
| `readonly`      | `readonly`                   | `boolean`                                | `false`                                        | Prevents user edits while allowing text selection and Preview switching.                         |
| `disabled`      | `disabled`                   | `boolean`                                | `false`                                        | Disables the textarea and formatting toolbar.                                                    |
| `ariaLabel`     | `aria-label`                 | `string`                                 | `'Markdown editor'`                            | Accessible label applied to the Markdown `<textarea>`.                                           |
| `class`         | `class`                      | `string`                                 | `''`                                           | Additional CSS class names applied to the root `.mditor` element.                                |
| `onchange`      | —                            | `(payload: MDitorChangePayload) => void` | `undefined`                                    | Svelte callback fired whenever user interaction updates `value` / `html`.                        |

### Events

- **Svelte (`<MDitor />`)**: Pass an `onchange={({ value, html }) => ...}` callback prop, or use `bind:value` and `bind:html`.
- **Web Component (`<md-itor>`)**: Dispatches bubbling, composed `input` and `change` `CustomEvent`s with `event.detail` set to `{ value: string, html: string }`.

### Toolbar & Keyboard Shortcuts

| Action          | Toolbar Command  | Keyboard Shortcut                       | Markdown Syntax            |
| --------------- | ---------------- | --------------------------------------- | -------------------------- |
| Heading         | `heading`        | —                                       | Cycles `### `, `## `, `# ` |
| Bold            | `bold`           | `Cmd/Ctrl + B`                          | `**bold text**`            |
| Italic          | `italic`         | `Cmd/Ctrl + I`                          | `*italic text*`            |
| Strikethrough   | `strikethrough`  | —                                       | `~~strikethrough text~~`   |
| Blockquote      | `blockquote`     | —                                       | `> quote`                  |
| Inline Code     | `inlineCode`     | —                                       | `` `code` ``               |
| Code Block      | `codeBlock`      | —                                       | ` ```\ncode\n``` `         |
| Link            | `link`           | `Cmd/Ctrl + K`                          | `[link text](url)`         |
| Image           | `image`          | —                                       | `![alt text](image-url)`   |
| Table           | `table`          | —                                       | Inserts a 2×2 GFM table    |
| Horizontal Rule | `horizontalRule` | —                                       | `---`                      |
| Bullet List     | `bulletList`     | —                                       | `- item`                   |
| Ordered List    | `orderedList`    | —                                       | `1. item`                  |
| Task List       | `taskList`       | —                                       | `- [ ] task`               |
| Undo            | `undo`           | `Cmd/Ctrl + Z`                          | Reverts last edit          |
| Redo            | `redo`           | `Cmd/Ctrl + Shift + Z` / `Cmd/Ctrl + Y` | Restores undone edit       |
| Fullscreen      | `fullscreen`     | `Esc` (to exit)                         | Toggles fullscreen editor  |

---

## Extension System

### Built-in Extensions

To keep MDitor lightweight for users who only need standard Markdown, third-party libraries (**KaTeX**, **PrismJS**, **Mermaid**) are **not** bundled. Instead, MDitor provides built-in adapters in `mditor/extensions` that automatically detect global scripts (`window.katex`, `window.Prism`, `window.mermaid`) **or** accept the imported library instance in options.

#### 1. KaTeX (`katexExtension`)

Renders inline math (`$...$`), display math (`$$...$$`), and fenced math blocks (` ```math `, ` ```latex `, ` ```katex `). Math delimiters inside `<pre>` and `<code>` blocks are automatically ignored.

**Using CDN `<script>` and `<link>` tags:**

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css" />
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js"></script>
```

```ts
import { katexExtension } from 'mditor/extensions';

const extensions = [
	katexExtension({
		throwOnError: false, // default: false
		katexOptions: { strict: false }
	})
];
```

**Or passing an imported `katex` instance:**

```ts
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { katexExtension } from 'mditor/extensions';

const extensions = [katexExtension({ katex })];
```

#### 2. PrismJS (`prismExtension`)

Highlights fenced code blocks (` ```js `, ` ```ts `, etc.) using Prism grammars.

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/themes/prism.min.css" />
<script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/prism.min.js"></script>
```

```ts
import { prismExtension } from 'mditor/extensions';

// Uses window.Prism automatically, or pass { prism: Prism }
const extensions = [prismExtension()];
```

#### 3. Mermaid (`mermaidExtension`)

Transforms ` ```mermaid ` code blocks into `<div class="mermaid">` containers and renders SVG diagrams when Preview mode is active.

```html
<script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>
```

```ts
import { mermaidExtension } from 'mditor/extensions';

// Uses window.mermaid automatically, or pass { mermaid, config: { theme: 'neutral' } }
const extensions = [
	mermaidExtension({
		config: { theme: 'default' }
	})
];
```

---

### Creating Custom Extensions

Every extension is a plain object conforming to `MDitorExtension`:

```ts
export interface MDitorExtension {
	/** Unique name for the extension. */
	name: string;
	/**
	 * Transforms the generated HTML string before DOMPurify sanitization.
	 * May return a string synchronously or a Promise<string>.
	 */
	transformHtml?: (html: string) => string | Promise<string>;
	/**
	 * Invoked after the sanitized HTML is mounted into the Preview DOM container.
	 * Ideal for DOM-based libraries or interactive widgets.
	 */
	afterRender?: (container: HTMLElement) => void | Promise<void>;
	/**
	 * Extends DOMPurify's allowlist so custom tags or attributes added by
	 * `transformHtml` are preserved during sanitization.
	 */
	sanitizeConfig?: {
		addTags?: string[];
		addAttrs?: string[];
	};
}
```

#### Common Use Case 1: Custom Link Attributes (`target="_blank"` & Custom Classes)

```ts
import type { MDitorExtension } from 'mditor';

export function customLinksExtension(): MDitorExtension {
	return {
		name: 'custom-links',
		sanitizeConfig: {
			addAttrs: ['target', 'rel']
		},
		transformHtml(html) {
			return html.replace(
				/<a href="(https?:\/\/[^"]+)"/g,
				'<a class="md-external-link" target="_blank" rel="noopener noreferrer" href="$1"'
			);
		}
	};
}
```

#### Common Use Case 2: Adding Custom Classes to Tables or Headings

```ts
import type { MDitorExtension } from 'mditor';

export function customTableClassExtension(className = 'table-striped'): MDitorExtension {
	return {
		name: 'custom-table-class',
		transformHtml(html) {
			return html.replace(/<table>/g, `<table class="${className}">`);
		}
	};
}
```

#### Common Use Case 3: Interactive Preview DOM Enhancement (`afterRender`)

```ts
import type { MDitorExtension } from 'mditor';

export function copyCodeBlockExtension(): MDitorExtension {
	return {
		name: 'copy-code-block',
		afterRender(container) {
			const codeBlocks = container.querySelectorAll('pre');
			for (const pre of codeBlocks) {
				if (pre.querySelector('.md-copy-btn')) continue;
				const button = document.createElement('button');
				button.type = 'button';
				button.className = 'md-copy-btn';
				button.textContent = 'Copy';
				button.addEventListener('click', () => {
					void navigator.clipboard.writeText(pre.textContent ?? '');
				});
				pre.appendChild(button);
			}
		}
	};
}
```

---

## HTML Sanitization

MDitor sanitizes all generated HTML output by default (`sanitize={true}`) using `DOMPurify` to protect against XSS attacks (such as `<script>` injection, `onerror` attributes, or `javascript:` URLs).

- **Default (`sanitize={true}`)**: Runs `DOMPurify.sanitize` with standard HTML allowed plus any `sanitizeConfig.addTags` / `sanitizeConfig.addAttrs` declared by active extensions.
- **Custom Sanitizer Function**: Pass your own function to customize sanitization:
  ```svelte
  <MDitor bind:value sanitize={(dirtyHtml) => myCustomPurifier(dirtyHtml)} />
  ```
- **Disabling Sanitization (`sanitize={false}`)**: Bypasses sanitization completely. **Highly discouraged** unless the Markdown input comes exclusively from a trusted source.

---

## Styling, Light/Dark Mode & CSS Variables

MDitor ships with a minimal default stylesheet and uses Light DOM (`shadow: 'none'`) for its Web Component so you can easily customize it from your application's stylesheet.

### Light & Dark Mode

- **Automatic**: By default, MDitor follows the user's OS preference via `@media (prefers-color-scheme: dark)`.
- **Explicit Theme Override**: Set `data-mditor-theme="dark"` or `data-mditor-theme="light"` on `:root`, a parent wrapper, `.mditor`, or `<md-itor>` to force a specific theme regardless of OS settings:
  ```html
  <md-itor data-mditor-theme="dark" value="# Dark Mode Editor"></md-itor>
  ```

### CSS Custom Properties Reference

Override any of these variables in your CSS (on `:root`, `.mditor`, `md-itor`, or a wrapper selector):

| CSS Variable                 | Default (Light)   | Default (Dark)    | Description                                    |
| ---------------------------- | ----------------- | ----------------- | ---------------------------------------------- |
| `--mditor-bg`                | `#ffffff`         | `#18171d`         | Editor & preview background color              |
| `--mditor-surface`           | `#f8f9fa`         | `#222129`         | Header bar & table header background color     |
| `--mditor-border`            | `#dcdcde`         | `#3a3842`         | Border & divider color                         |
| `--mditor-border-focus`      | `#1f75cb`         | `#428fdc`         | Focus ring border color                        |
| `--mditor-text`              | `#1f1e24`         | `#ececef`         | Primary text color                             |
| `--mditor-text-muted`        | `#626168`         | `#9997a3`         | Muted text, placeholder, & inactive icon color |
| `--mditor-accent`            | `#1f75cb`         | `#428fdc`         | Active tab indicator & link color              |
| `--mditor-btn-hover-bg`      | `#ececef`         | `#2e2c36`         | Toolbar button hover background                |
| `--mditor-btn-active-bg`     | `#dcdcde`         | `#3a3842`         | Toolbar button active/pressed background       |
| `--mditor-code-bg`           | `#f0f0f2`         | `#282730`         | Inline code & code block background            |
| `--mditor-blockquote-border` | `#dcdcde`         | `#4c4957`         | Blockquote left border color                   |
| `--mditor-radius`            | `6px`             | `6px`             | Outer border radius                            |
| `--mditor-font-sans`         | System sans-serif | System sans-serif | UI and preview prose font family               |
| `--mditor-font-mono`         | System monospace  | System monospace  | Markdown textarea & code font family           |
| `--mditor-min-height`        | `200px`           | `200px`           | Minimum height of the editor/preview body      |
| `--mditor-padding`           | `12px 16px`       | `12px 16px`       | Inner padding of the textarea and preview area |

#### Custom Theme Example

```css
/* Custom brand colors for both light and dark modes */
:root {
	--mditor-accent: #6e49cb;
	--mditor-border-focus: #6e49cb;
	--mditor-radius: 8px;
	--mditor-min-height: 280px;
}

@media (prefers-color-scheme: dark) {
	:root {
		--mditor-accent: #9b7ff3;
		--mditor-border-focus: #9b7ff3;
	}
}
```

---

## Development & Publishing

```bash
# Start local development server & interactive playground
npm run dev

# Run unit tests (Node) and component/Web Component tests (Headless Chromium)
npm test

# Type-check with svelte-check
npm run check

# Format and lint
npm run format
npm run lint

# Build Svelte library + package
npm run build

# Build standalone browser bundle (outputs dist-bundle/mditor.js)
npm run build:bundle
```

### Releasing

Pushing a version tag (`v*`) triggers `.github/workflows/release.yml`, which automatically runs the test suite, builds both the npm package and `dist-bundle/mditor.js`, creates a GitHub Release with `mditor.js` attached, and publishes the package to GitHub Packages:

```bash
# 1. Bump version in package.json, then commit and tag:
git add package.json
git commit -m "chore: release v0.1.0"
git tag v0.1.0
git push origin main --tags
```

### Live Demo (GitHub Pages)

The interactive playground (`src/routes/+page.svelte`) is automatically built and deployed to GitHub Pages on every push to `main` via `.github/workflows/pages.yml`.
