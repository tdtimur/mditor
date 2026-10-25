import type { ToolbarCommand } from '../core/commands.js';

export interface ToolbarItemConfig {
	command: ToolbarCommand;
	label: string;
	shortcut?: string;
	group: 'inline' | 'block' | 'insert' | 'list';
}

export const TOOLBAR_ITEMS: ToolbarItemConfig[] = [
	{ command: 'heading', label: 'Add heading text', group: 'block' },
	{ command: 'bold', label: 'Add bold text', shortcut: 'Mod+B', group: 'inline' },
	{ command: 'italic', label: 'Add italic text', shortcut: 'Mod+I', group: 'inline' },
	{ command: 'strikethrough', label: 'Add strikethrough text', group: 'inline' },
	{ command: 'blockquote', label: 'Insert a quote', group: 'block' },
	{ command: 'inlineCode', label: 'Insert code', group: 'inline' },
	{ command: 'codeBlock', label: 'Insert code block', group: 'block' },
	{ command: 'link', label: 'Add a link', shortcut: 'Mod+K', group: 'insert' },
	{ command: 'image', label: 'Add an image', group: 'insert' },
	{ command: 'table', label: 'Add a table', group: 'insert' },
	{ command: 'horizontalRule', label: 'Add a horizontal rule', group: 'insert' },
	{ command: 'bulletList', label: 'Add a bullet list', group: 'list' },
	{ command: 'orderedList', label: 'Add a numbered list', group: 'list' },
	{ command: 'taskList', label: 'Add a checklist', group: 'list' }
];
