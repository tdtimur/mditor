<script lang="ts">
	import { tick } from 'svelte';
	import './styles/mditor.css';
	import type { MDitorMode, MDitorProps } from './types.js';
	import { renderMarkdown, renderMarkdownSync, runAfterRender } from './core/renderer.js';
	import { executeCommand, type EditorState, type ToolbarCommand } from './core/commands.js';
	import { handleEnterKey, handleTabKey, resolveShortcut } from './core/keyboard.js';
	import { EditorHistory } from './core/history.js';
	import { TOOLBAR_ITEMS } from './components/icons.js';

	let {
		value = $bindable(''),
		html = $bindable(''),
		extensions = [],
		sanitize = true,
		placeholder = 'Write a comment or drag your files here...',
		mode = $bindable<MDitorMode>('write'),
		readonly = false,
		disabled = false,
		ariaLabel = 'Markdown editor',
		class: className = '',
		onchange
	}: MDitorProps = $props();

	let textareaEl = $state<HTMLTextAreaElement | null>(null);
	let previewEl = $state<HTMLDivElement | null>(null);
	let fullscreen = $state(false);

	const history = new EditorHistory({
		value,
		selectionStart: value.length,
		selectionEnd: value.length
	});
	let canUndo = $state(false);
	let canRedo = $state(false);

	let renderVersion = 0;

	function syncHistoryFlags(): void {
		canUndo = history.canUndo;
		canRedo = history.canRedo;
	}

	function updateRenderedHtml(currentMarkdown: string, emitChange = false): void {
		const currentVersion = ++renderVersion;
		const syncResult = renderMarkdownSync(currentMarkdown, { extensions, sanitize });
		html = syncResult;
		if (emitChange) {
			onchange?.({ value: currentMarkdown, html: syncResult });
		}

		const hasTransformHooks = extensions.some((ext) => typeof ext.transformHtml === 'function');
		if (hasTransformHooks) {
			void renderMarkdown(currentMarkdown, { extensions, sanitize }).then((asyncResult) => {
				if (currentVersion === renderVersion && asyncResult !== syncResult) {
					html = asyncResult;
					if (emitChange) {
						onchange?.({ value: currentMarkdown, html: asyncResult });
					}
				}
			});
		}
	}

	// Keep `html` synchronized when `value`, `extensions`, or `sanitize` change externally
	$effect(() => {
		const currentMarkdown = value;
		// Track reactive dependencies
		void extensions;
		void sanitize;
		updateRenderedHtml(currentMarkdown, false);
	});

	// Run extension `afterRender` hooks when preview DOM updates
	$effect(() => {
		const currentHtml = html;
		const currentMode = mode;
		const activeExtensions = extensions;
		if (currentMode === 'preview' && previewEl && activeExtensions.length > 0) {
			void currentHtml;
			void runAfterRender(previewEl, activeExtensions);
		}
	});

	function getEditorState(): EditorState {
		return {
			value,
			selectionStart: textareaEl?.selectionStart ?? value.length,
			selectionEnd: textareaEl?.selectionEnd ?? value.length
		};
	}

	async function applyEditorState(nextState: EditorState, recordHistory = true): Promise<void> {
		const savedScrollTop = textareaEl?.scrollTop;
		const savedScrollLeft = textareaEl?.scrollLeft;
		value = nextState.value;
		if (recordHistory) {
			history.push(nextState);
			syncHistoryFlags();
		}
		updateRenderedHtml(nextState.value, true);

		await tick();
		if (textareaEl && mode === 'write') {
			textareaEl.setSelectionRange(nextState.selectionStart, nextState.selectionEnd);
			textareaEl.focus({ preventScroll: true });
			if (savedScrollTop !== undefined) {
				textareaEl.scrollTop = savedScrollTop;
			}
			if (savedScrollLeft !== undefined) {
				textareaEl.scrollLeft = savedScrollLeft;
			}
		}
	}

	function handleInput(event: Event): void {
		const target = event.currentTarget as HTMLTextAreaElement;
		const nextState: EditorState = {
			value: target.value,
			selectionStart: target.selectionStart ?? target.value.length,
			selectionEnd: target.selectionEnd ?? target.value.length
		};
		value = nextState.value;
		history.push(nextState);
		syncHistoryFlags();
		updateRenderedHtml(nextState.value, true);
	}

	function handleToolbarAction(command: ToolbarCommand): void {
		if (disabled || readonly) return;
		const currentState = getEditorState();
		history.push(currentState);
		const nextState = executeCommand(command, currentState);
		void applyEditorState(nextState, true);
	}

	function handleUndo(): void {
		if (disabled || readonly) return;
		const previous = history.undo();
		syncHistoryFlags();
		if (previous) {
			void applyEditorState(previous, false);
		}
	}

	function handleRedo(): void {
		if (disabled || readonly) return;
		const next = history.redo();
		syncHistoryFlags();
		if (next) {
			void applyEditorState(next, false);
		}
	}

	function toggleFullscreen(): void {
		fullscreen = !fullscreen;
	}

	function handleKeyDown(event: KeyboardEvent): void {
		if (event.key === 'Escape' && fullscreen) {
			event.preventDefault();
			fullscreen = false;
			return;
		}

		if (disabled || readonly) return;

		const currentState = getEditorState();

		// Check Ctrl/Cmd+B, Ctrl/Cmd+I, Ctrl/Cmd+K, Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z, Ctrl/Cmd+Y
		const shortcut = resolveShortcut(event, currentState);
		if (shortcut) {
			event.preventDefault();
			if (shortcut.type === 'undo') {
				handleUndo();
			} else if (shortcut.type === 'redo') {
				handleRedo();
			} else {
				history.push(currentState);
				void applyEditorState(shortcut.state, true);
			}
			return;
		}

		// Smart list continuation on Enter
		if (
			event.key === 'Enter' &&
			!event.shiftKey &&
			!event.metaKey &&
			!event.ctrlKey &&
			!event.altKey
		) {
			const nextState = handleEnterKey(currentState);
			if (nextState) {
				event.preventDefault();
				history.push(currentState);
				void applyEditorState(nextState, true);
			}
			return;
		}

		// Indentation on Tab / Shift+Tab
		if (event.key === 'Tab' && !event.metaKey && !event.ctrlKey && !event.altKey) {
			event.preventDefault();
			history.push(currentState);
			const nextState = handleTabKey(currentState, event.shiftKey);
			void applyEditorState(nextState, true);
		}
	}
</script>

<div class="mditor {fullscreen ? 'mditor--fullscreen' : ''} {className}">
	<div class="mditor__header">
		<div class="mditor__tabs" role="tablist" aria-label="Editor mode">
			<button
				type="button"
				role="tab"
				aria-selected={mode === 'write'}
				class="mditor__tab {mode === 'write' ? 'mditor__tab--active' : ''}"
				onclick={() => (mode = 'write')}
			>
				Write
			</button>
			<button
				type="button"
				role="tab"
				aria-selected={mode === 'preview'}
				class="mditor__tab {mode === 'preview' ? 'mditor__tab--active' : ''}"
				onclick={() => (mode = 'preview')}
			>
				Preview
			</button>
		</div>

		<div class="mditor__toolbar" role="toolbar" aria-label="Formatting options">
			{#each TOOLBAR_ITEMS as item (item.command)}
				<button
					type="button"
					class="mditor__btn"
					title={item.shortcut ? `${item.label} (${item.shortcut})` : item.label}
					aria-label={item.label}
					disabled={disabled || readonly || mode === 'preview'}
					data-command={item.command}
					onmousedown={(e) => e.preventDefault()}
					onclick={() => handleToolbarAction(item.command)}
				>
					{#if item.command === 'heading'}
						<svg viewBox="0 0 16 16" aria-hidden="true">
							<path d="M3 3v10M13 3v10M3 8h10" />
						</svg>
					{:else if item.command === 'bold'}
						<svg viewBox="0 0 16 16" aria-hidden="true">
							<path d="M4 3h5a3 3 0 0 1 0 5H4V3zm0 5h6a2.5 2.5 0 0 1 0 5H4V8z" />
						</svg>
					{:else if item.command === 'italic'}
						<svg viewBox="0 0 16 16" aria-hidden="true">
							<path d="M7 3h5M4 13h5M9.5 3 6.5 13" />
						</svg>
					{:else if item.command === 'strikethrough'}
						<svg viewBox="0 0 16 16" aria-hidden="true">
							<path d="M2.5 8h11M5.5 5a2.5 2 0 0 1 5 0M5 11a2.5 2 0 0 0 5.5 0" />
						</svg>
					{:else if item.command === 'blockquote'}
						<svg viewBox="0 0 16 16" aria-hidden="true">
							<path d="M3 4v8M6 5h7M6 8h5M6 11h6" />
						</svg>
					{:else if item.command === 'inlineCode'}
						<svg viewBox="0 0 16 16" aria-hidden="true">
							<path d="M5.5 5 2.5 8l3 3M10.5 5l3 3-3 3" />
						</svg>
					{:else if item.command === 'codeBlock'}
						<svg viewBox="0 0 16 16" aria-hidden="true">
							<rect x="2" y="2.5" width="12" height="11" rx="1.5" />
							<path d="m6 6-2 2 2 2m4-4 2 2-2 2" />
						</svg>
					{:else if item.command === 'link'}
						<svg viewBox="0 0 16 16" aria-hidden="true">
							<path
								d="M6.5 9.5a3 3 0 0 0 4.2 0l2-2a3 3 0 0 0-4.2-4.2l-1 1M9.5 6.5a3 3 0 0 0-4.2 0l-2 2a3 3 0 0 0 4.2 4.2l1-1"
							/>
						</svg>
					{:else if item.command === 'image'}
						<svg viewBox="0 0 16 16" aria-hidden="true">
							<rect x="2" y="3" width="12" height="10" rx="1.5" />
							<circle cx="5.5" cy="6.5" r="1" />
							<path d="m3 12 3.5-3.5 2.5 2.5 2-2 2 2" />
						</svg>
					{:else if item.command === 'table'}
						<svg viewBox="0 0 16 16" aria-hidden="true">
							<rect x="2" y="3" width="12" height="10" rx="1" />
							<path d="M2 6.5h12M2 10h12M8 3v10" />
						</svg>
					{:else if item.command === 'horizontalRule'}
						<svg viewBox="0 0 16 16" aria-hidden="true">
							<path d="M2 8h12" />
						</svg>
					{:else if item.command === 'bulletList'}
						<svg viewBox="0 0 16 16" aria-hidden="true">
							<circle cx="3" cy="4.5" r="0.8" fill="currentColor" />
							<circle cx="3" cy="8" r="0.8" fill="currentColor" />
							<circle cx="3" cy="11.5" r="0.8" fill="currentColor" />
							<path d="M6 4.5h7M6 8h7M6 11.5h7" />
						</svg>
					{:else if item.command === 'orderedList'}
						<svg viewBox="0 0 16 16" aria-hidden="true">
							<path d="M2.5 4h1v3M2 7h2M2 10.5h2l-2 2.5h2M6 4.5h7M6 8h7M6 11.5h7" />
						</svg>
					{:else if item.command === 'taskList'}
						<svg viewBox="0 0 16 16" aria-hidden="true">
							<rect x="2" y="3" width="3.5" height="3.5" rx="0.5" />
							<path d="m2.2 11 1.2 1.2 2.3-2.4M8 4.5h6M8 11.5h6" />
						</svg>
					{/if}
				</button>
			{/each}

			<span class="mditor__divider" aria-hidden="true"></span>

			<button
				type="button"
				class="mditor__btn"
				title="Undo (Ctrl/Cmd+Z)"
				aria-label="Undo"
				disabled={disabled || readonly || mode === 'preview' || !canUndo}
				data-command="undo"
				onmousedown={(e) => e.preventDefault()}
				onclick={handleUndo}
			>
				<svg viewBox="0 0 16 16" aria-hidden="true">
					<path d="M5 5 2.5 7.5 5 10" />
					<path d="M3 7.5h6.5a3.5 3.5 0 1 1 0 7H7" />
				</svg>
			</button>

			<button
				type="button"
				class="mditor__btn"
				title="Redo (Ctrl/Cmd+Shift+Z)"
				aria-label="Redo"
				disabled={disabled || readonly || mode === 'preview' || !canRedo}
				data-command="redo"
				onmousedown={(e) => e.preventDefault()}
				onclick={handleRedo}
			>
				<svg viewBox="0 0 16 16" aria-hidden="true">
					<path d="m11 5 2.5 2.5L11 10" />
					<path d="M13 7.5H6.5a3.5 3.5 0 1 0 0 7H9" />
				</svg>
			</button>

			<span class="mditor__divider" aria-hidden="true"></span>

			<button
				type="button"
				class="mditor__btn {fullscreen ? 'mditor__btn--active' : ''}"
				title={fullscreen ? 'Exit full screen (Esc)' : 'Go full screen'}
				aria-label={fullscreen ? 'Exit full screen' : 'Go full screen'}
				aria-pressed={fullscreen}
				data-command="fullscreen"
				onclick={toggleFullscreen}
			>
				{#if fullscreen}
					<svg viewBox="0 0 16 16" aria-hidden="true">
						<path d="M6 2.5V6H2.5M10 2.5V6h3.5M6 13.5V10H2.5M10 13.5V10h3.5" />
					</svg>
				{:else}
					<svg viewBox="0 0 16 16" aria-hidden="true">
						<path d="M2.5 6V2.5H6M13.5 6V2.5H10M2.5 10v3.5H6M13.5 10v3.5H10" />
					</svg>
				{/if}
			</button>
		</div>
	</div>

	<div class="mditor__body">
		{#if mode === 'write'}
			<textarea
				bind:this={textareaEl}
				class="mditor__textarea"
				{value}
				{placeholder}
				{readonly}
				{disabled}
				aria-label={ariaLabel}
				oninput={handleInput}
				onkeydown={handleKeyDown}></textarea>
		{:else}
			<div
				bind:this={previewEl}
				class="mditor__preview"
				role="region"
				aria-label="Markdown preview"
			>
				{#if html.trim().length > 0}
					<!-- eslint-disable-next-line svelte/no-at-html-tags -->
					{@html html}
				{:else}
					<p class="mditor__preview-empty">Nothing to preview.</p>
				{/if}
			</div>
		{/if}
	</div>
</div>
