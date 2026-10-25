import MDitor from './MDitor.svelte';

export default MDitor;
export { MDitor };

export type {
	ExtensionSanitizeConfig,
	MDitorChangePayload,
	MDitorExtension,
	MDitorMode,
	MDitorProps,
	RenderMarkdownOptions,
	SanitizeOption
} from './types.js';

export {
	parseMarkdown,
	renderMarkdown,
	renderMarkdownSync,
	runAfterRender,
	sanitizeHtml
} from './core/renderer.js';

export {
	cycleHeading,
	executeCommand,
	insertHorizontalRule,
	insertImage,
	insertLink,
	insertTable,
	toggleBlockquote,
	toggleBold,
	toggleBulletList,
	toggleCodeBlock,
	toggleInlineCode,
	toggleItalic,
	toggleOrderedList,
	toggleStrikethrough,
	toggleTaskList,
	type EditorState,
	type ToolbarCommand
} from './core/commands.js';

export { EditorHistory } from './core/history.js';
