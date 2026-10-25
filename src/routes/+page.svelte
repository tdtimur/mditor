<script lang="ts">
	import MDitor, { type MDitorExtension } from '../lib/index.js';
	import { katexExtension, mermaidExtension, prismExtension } from '../lib/extensions/index.js';

	const initialMarkdown = `# Welcome to MDitor

MDitor is a lightweight, GitLab-inspired Markdown editor built with **Svelte 5** and packaged as both a Svelte component (\`<MDitor />\`) and a Web Component (\`<md-itor>\`).

Switch to the **Preview** tab above to see **KaTeX**, **PrismJS**, **Mermaid**, and a **custom extension** in action!

---

## 1. KaTeX Math Rendering

Inline math works seamlessly—like Euler's identity $e^{i\\pi} + 1 = 0$ or the quadratic formula $x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$.

Display math blocks are rendered via \`$$...$$\` or \` \`\`\`math \`:

$$
\\int_{-\\infty}^{\\infty} e^{-x^2}\\,dx = \\sqrt{\\pi}
$$

---

## 2. PrismJS Syntax Highlighting

\`\`\`javascript
import MDitor from 'mditor';
import { katexExtension, prismExtension, mermaidExtension } from 'mditor/extensions';

const extensions = [
	katexExtension(),
	prismExtension(),
	mermaidExtension()
];
\`\`\`

---

## 3. Mermaid Diagrams

\`\`\`mermaid
flowchart LR
    A["Raw Markdown"] --> B["marked (GFM)"]
    B --> C["transformHtml()"]
    C --> D["DOMPurify"]
    D --> E["afterRender(container)"]
\`\`\`

---

## 4. Custom Extension & GFM Features

- [x] **Task lists** and GFM tables
- [x] **Custom extension demo**: Type \`::badge[NEW]::\` to render a styled badge: ::badge[NEW]:: ::badge[Svelte 5]::

| Extension | Hook Used | Globals Auto-Detected |
| --------- | --------- | --------------------- |
| \`katexExtension()\` | \`transformHtml\` | \`window.katex\` |
| \`prismExtension()\` | \`transformHtml\` + \`afterRender\` | \`window.Prism\` |
| \`mermaidExtension()\` | \`transformHtml\` + \`afterRender\` | \`window.mermaid\` |
`;

	let markdown = $state(initialMarkdown);
	let html = $state('');
	let theme = $state<'auto' | 'light' | 'dark'>('auto');
	let scriptsReady = $state(0);

	let enableKatex = $state(true);
	let enablePrism = $state(true);
	let enableMermaid = $state(true);
	let enableCustomBadge = $state(true);

	// Custom extension example: turns ::badge[Label]:: into <span class="md-badge">Label</span>
	const badgeExtension: MDitorExtension = {
		name: 'custom-badge',
		sanitizeConfig: {
			addTags: ['span'],
			addAttrs: ['class']
		},
		transformHtml: (rawHtml) =>
			rawHtml.replace(/::badge\[([^\]]+)\]::/g, '<span class="md-badge">$1</span>')
	};

	const activeExtensions = $derived.by<MDitorExtension[]>(() => {
		// Re-evaluate once CDN scripts finish loading in the browser
		void scriptsReady;
		const list: MDitorExtension[] = [];
		if (enableKatex) list.push(katexExtension());
		if (enablePrism) list.push(prismExtension());
		if (enableMermaid) list.push(mermaidExtension());
		if (enableCustomBadge) list.push(badgeExtension);
		return list;
	});

	$effect(() => {
		if (typeof document !== 'undefined') {
			if (theme === 'auto') {
				delete document.documentElement.dataset.mditorTheme;
			} else {
				document.documentElement.dataset.mditorTheme = theme;
			}
		}
	});

	const svelteExampleCode =
		`<script lang="ts">
  import MDitor from 'mditor';
  import {
    katexExtension,
    prismExtension,
    mermaidExtension
  } from 'mditor/extensions';

  let markdown = $state('# Hello MDitor\\n\\nMath: $E = mc^2$');
  let html = $state('');

  const extensions = [
    katexExtension(),
    prismExtension(),
    mermaidExtension()
  ];
<` +
		`/script>

<!-- Load KaTeX, PrismJS, and Mermaid via CDN or npm imports -->
<svelte:head>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css" />
  <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js"><` +
		`/script>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/themes/prism-tomorrow.min.css" />
  <script defer src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/prism.min.js"><` +
		`/script>
  <script defer src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"><` +
		`/script>
</svelte:head>

<MDitor bind:value={markdown} bind:html {extensions} />`;

	const wcExampleCode =
		`<!-- 1. Include third-party stylesheets & scripts (only the ones you need) -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css" />
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js"><` +
		`/script>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/themes/prism-tomorrow.min.css" />
<script defer src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/prism.min.js"><` +
		`/script>
<script defer src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"><` +
		`/script>

<!-- 2. Place the <md-itor> custom element in your HTML -->
<md-itor id="editor" value="# Hello from Web Component"></md-itor>

<!-- 3. Configure extensions & listen for changes in standard JS -->
<script type="module">
  import 'mditor/element';
  import {
    katexExtension,
    prismExtension,
    mermaidExtension
  } from 'mditor/extensions';

  const editor = document.getElementById('editor');
  editor.extensions = [
    katexExtension(),
    prismExtension(),
    mermaidExtension()
  ];

  editor.addEventListener('change', (event) => {
    const { value, html } = event.detail;
    console.log('Raw Markdown:', value);
    console.log('Sanitized HTML:', html);
  });
<` +
		`/script>`;

	const customExtensionCode = `import type { MDitorExtension } from 'mditor';

/**
 * Example 1: String transformation (transformHtml)
 * Converts ::badge[Text]:: into <span class="md-badge">Text</span>
 */
export function badgeExtension(): MDitorExtension {
  return {
    name: 'custom-badge',
    // Allow any custom tags/attributes through DOMPurify
    sanitizeConfig: {
      addTags: ['span'],
      addAttrs: ['class']
    },
    transformHtml(html) {
      return html.replace(
        /::badge\\[([^\\]]+)\\]::/g,
        '<span class="md-badge">$1</span>'
      );
    }
  };
}

/**
 * Example 2: Post-render DOM manipulation (afterRender)
 * Runs on the preview DOM container whenever Preview mode renders
 */
export function externalLinksExtension(): MDitorExtension {
  return {
    name: 'external-links',
    afterRender(container) {
      for (const link of container.querySelectorAll('a[href^="http"]')) {
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer');
      }
    }
  };
}`;
	let docsSectionEl = $state<HTMLElement | null>(null);

	$effect(() => {
		void scriptsReady;
		if (docsSectionEl && typeof window !== 'undefined') {
			const prism = (window as unknown as { Prism?: { highlightAllUnder?: (el: Element) => void } })
				.Prism;
			prism?.highlightAllUnder?.(docsSectionEl);
		}
	});
</script>

<svelte:head>
	<title>MDitor Playground</title>
	<!-- KaTeX -->
	<link
		rel="stylesheet"
		href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css"
		crossorigin="anonymous"
	/>
	<script
		defer
		src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js"
		crossorigin="anonymous"
		onload={() => scriptsReady++}
	></script>

	<!-- PrismJS -->
	<link
		rel="stylesheet"
		href="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/themes/prism-tomorrow.min.css"
		crossorigin="anonymous"
	/>
	<script
		defer
		src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/prism.min.js"
		crossorigin="anonymous"
		onload={() => scriptsReady++}
	></script>
	<script
		defer
		src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-typescript.min.js"
		crossorigin="anonymous"
		onload={() => scriptsReady++}
	></script>

	<!-- Mermaid -->
	<script
		defer
		src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"
		crossorigin="anonymous"
		onload={() => scriptsReady++}
	></script>
</svelte:head>

<main class="playground" data-mditor-theme={theme === 'auto' ? undefined : theme}>
	<header class="playground__header">
		<div>
			<h1>MDitor Playground</h1>
			<p>GitLab-inspired Markdown editor for Svelte 5 &amp; Web Components</p>
		</div>

		<div class="playground__controls">
			<div class="playground__toggles" role="group" aria-label="Active extensions">
				<span class="playground__label">Extensions:</span>
				<label class="playground__checkbox">
					<input type="checkbox" bind:checked={enableKatex} />
					<span>KaTeX</span>
				</label>
				<label class="playground__checkbox">
					<input type="checkbox" bind:checked={enablePrism} />
					<span>PrismJS</span>
				</label>
				<label class="playground__checkbox">
					<input type="checkbox" bind:checked={enableMermaid} />
					<span>Mermaid</span>
				</label>
				<label class="playground__checkbox">
					<input type="checkbox" bind:checked={enableCustomBadge} />
					<span>Custom Badge</span>
				</label>
			</div>

			<label class="playground__theme-select">
				<span>Theme:</span>
				<select bind:value={theme}>
					<option value="auto">System (Auto)</option>
					<option value="light">Light</option>
					<option value="dark">Dark</option>
				</select>
			</label>
		</div>
	</header>

	<section class="playground__editor">
		<MDitor bind:value={markdown} bind:html extensions={activeExtensions} />
	</section>

	<section class="playground__inspectors">
		<div class="playground__panel">
			<h2>Raw Markdown (<code>bind:value</code>)</h2>
			<pre>{markdown}</pre>
		</div>

		<div class="playground__panel">
			<h2>Sanitized HTML Output (<code>bind:html</code>)</h2>
			<pre>{html}</pre>
		</div>
	</section>

	<section class="playground__docs" bind:this={docsSectionEl}>
		<h2>How to Achieve This Setup</h2>
		<p class="playground__docs-intro">
			MDitor keeps its core bundle tiny by making heavy third-party libraries optional. Load
			<strong>KaTeX</strong>, <strong>PrismJS</strong>, or <strong>Mermaid</strong> via CDN
			<code>&lt;script&gt;</code> tags (auto-detected on <code>window</code>) or pass imported NPM
			instances into the extension helpers.
		</p>

		<div class="playground__code-grid">
			<div class="playground__panel">
				<h3>1. Svelte 5 Usage (<code>&lt;MDitor /&gt;</code>)</h3>
				<pre class="playground__code language-html"><code class="language-html"
						>{svelteExampleCode}</code
					></pre>
			</div>

			<div class="playground__panel">
				<h3>2. Web Component &amp; Standard JS (<code>&lt;md-itor&gt;</code>)</h3>
				<pre class="playground__code language-html"><code class="language-html"
						>{wcExampleCode}</code
					></pre>
			</div>
		</div>

		<div class="playground__panel playground__panel--full">
			<h3>3. Writing Your Own Custom Extension</h3>
			<p class="playground__docs-sub">
				An extension is a simple object with an optional <code>transformHtml(html)</code> string
				hook, an optional <code>afterRender(container)</code> DOM hook, and optional
				<code>sanitizeConfig</code> allowlist rules for <code>DOMPurify</code>:
			</p>
			<pre class="playground__code language-typescript"><code class="language-typescript"
					>{customExtensionCode}</code
				></pre>
		</div>
	</section>
</main>

<style>
	:global(:root) {
		--page-bg: #f4f5f7;
		--page-text: #1f1e24;
		--panel-bg: #ffffff;
		--panel-border: #dcdcde;
		--code-block-bg: #1e1e24;
		--code-block-text: #ececef;
	}

	@media (prefers-color-scheme: dark) {
		:global(:root:not([data-mditor-theme='light'])) {
			--page-bg: #111015;
			--page-text: #ececef;
			--panel-bg: #18171d;
			--panel-border: #3a3842;
		}
	}

	:global(:root[data-mditor-theme='light']) {
		--page-bg: #f4f5f7;
		--page-text: #1f1e24;
		--panel-bg: #ffffff;
		--panel-border: #dcdcde;
	}

	:global(:root[data-mditor-theme='dark']) {
		--page-bg: #111015;
		--page-text: #ececef;
		--panel-bg: #18171d;
		--panel-border: #3a3842;
	}

	:global(body) {
		margin: 0;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
		background-color: var(--page-bg);
		color: var(--page-text);
		transition:
			background-color 0.15s ease,
			color 0.15s ease;
	}

	:global(.md-badge) {
		display: inline-block;
		padding: 2px 8px;
		font-size: 12px;
		font-weight: 600;
		border-radius: 999px;
		background-color: #1f75cb;
		color: #ffffff;
		vertical-align: middle;
	}

	.playground {
		max-width: 1080px;
		margin: 0 auto;
		padding: 32px 20px 64px;
		min-height: 100vh;
		box-sizing: border-box;
	}

	.playground__header {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		align-items: flex-end;
		gap: 16px;
		margin-bottom: 20px;
	}

	.playground__header h1 {
		margin: 0 0 4px;
		font-size: 24px;
	}

	.playground__header p {
		margin: 0;
		opacity: 0.75;
		font-size: 14px;
	}

	.playground__controls {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 16px;
		font-size: 14px;
	}

	.playground__toggles {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 12px;
		padding: 6px 12px;
		background: var(--panel-bg);
		border: 1px solid var(--panel-border);
		border-radius: 6px;
	}

	.playground__label {
		font-weight: 600;
		font-size: 13px;
		opacity: 0.85;
	}

	.playground__theme-select {
		display: inline-flex;
		align-items: center;
		gap: 6px;
	}

	.playground__controls select {
		padding: 5px 8px;
		border-radius: 6px;
		border: 1px solid var(--panel-border);
		background: var(--panel-bg);
		color: var(--page-text);
		font-size: 13px;
	}

	.playground__checkbox {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		cursor: pointer;
		user-select: none;
	}

	.playground__editor {
		margin-bottom: 24px;
	}

	.playground__inspectors {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
		gap: 16px;
		margin-bottom: 36px;
	}

	.playground__panel {
		background: var(--panel-bg);
		border: 1px solid var(--panel-border);
		border-radius: 6px;
		padding: 14px 16px;
		overflow: hidden;
	}

	.playground__panel--full {
		margin-top: 16px;
	}

	.playground__panel h2,
	.playground__panel h3 {
		margin: 0 0 10px;
		font-size: 13px;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		opacity: 0.85;
	}

	.playground__panel pre {
		margin: 0;
		font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
		font-size: 12px;
		line-height: 1.5;
		max-height: 240px;
		overflow: auto;
		white-space: pre-wrap;
		word-break: break-word;
	}

	.playground__docs {
		border-top: 1px solid var(--panel-border);
		padding-top: 28px;
	}

	.playground__docs h2 {
		margin: 0 0 8px;
		font-size: 20px;
	}

	.playground__docs-intro {
		margin: 0 0 20px;
		font-size: 14px;
		line-height: 1.6;
		opacity: 0.85;
	}

	.playground__docs-sub {
		margin: 0 0 12px;
		font-size: 13px;
		line-height: 1.5;
		opacity: 0.85;
	}

	.playground__code-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(380px, 1fr));
		gap: 16px;
	}

	.playground__panel pre.playground__code {
		background-color: var(--code-block-bg);
		color: var(--code-block-text);
		padding: 12px 14px;
		border-radius: 6px;
		max-height: 360px;
		white-space: pre;
		overflow-x: auto;
	}
</style>
