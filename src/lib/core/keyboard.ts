import {
	toggleBold,
	toggleItalic,
	insertLink,
	type EditorState,
	type ToolbarCommand
} from './commands.js';

/**
 * Handles `Enter` key press for automatic Markdown list continuation.
 * Returns a new `EditorState` if list continuation/termination was applied,
 * or `null` if default browser behavior should proceed.
 */
export function handleEnterKey(state: EditorState): EditorState | null {
	const { value, selectionStart, selectionEnd } = state;
	if (selectionStart !== selectionEnd) {
		return null;
	}

	const lineStart = value.lastIndexOf('\n', Math.max(0, selectionStart - 1)) + 1;
	const lineBeforeCursor = value.slice(lineStart, selectionStart);

	// 1. Task list item: `- [ ] item` or `* [x] item`
	const taskMatch = lineBeforeCursor.match(/^(\s*)([-*+])\s+\[[ xX]\]\s+(.*)$/);
	if (taskMatch) {
		const [, indent, bullet, content] = taskMatch;
		if (content.trim().length === 0) {
			// Empty task item -> exit list by clearing prefix on current line
			const nextValue = value.slice(0, lineStart) + value.slice(selectionStart);
			return {
				value: nextValue,
				selectionStart: lineStart,
				selectionEnd: lineStart
			};
		}
		const insertion = `\n${indent}${bullet} [ ] `;
		const nextValue = value.slice(0, selectionStart) + insertion + value.slice(selectionEnd);
		const cursor = selectionStart + insertion.length;
		return {
			value: nextValue,
			selectionStart: cursor,
			selectionEnd: cursor
		};
	}

	// 2. Unordered list item: `- item`, `* item`, `+ item`
	const bulletMatch = lineBeforeCursor.match(/^(\s*)([-*+])\s+(.*)$/);
	if (bulletMatch) {
		const [, indent, bullet, content] = bulletMatch;
		if (content.trim().length === 0) {
			const nextValue = value.slice(0, lineStart) + value.slice(selectionStart);
			return {
				value: nextValue,
				selectionStart: lineStart,
				selectionEnd: lineStart
			};
		}
		const insertion = `\n${indent}${bullet} `;
		const nextValue = value.slice(0, selectionStart) + insertion + value.slice(selectionEnd);
		const cursor = selectionStart + insertion.length;
		return {
			value: nextValue,
			selectionStart: cursor,
			selectionEnd: cursor
		};
	}

	// 3. Ordered list item: `1. item`
	const orderedMatch = lineBeforeCursor.match(/^(\s*)(\d+)\.\s+(.*)$/);
	if (orderedMatch) {
		const [, indent, numStr, content] = orderedMatch;
		if (content.trim().length === 0) {
			const nextValue = value.slice(0, lineStart) + value.slice(selectionStart);
			return {
				value: nextValue,
				selectionStart: lineStart,
				selectionEnd: lineStart
			};
		}
		const nextNumber = Number.parseInt(numStr, 10) + 1;
		const insertion = `\n${indent}${nextNumber}. `;
		const nextValue = value.slice(0, selectionStart) + insertion + value.slice(selectionEnd);
		const cursor = selectionStart + insertion.length;
		return {
			value: nextValue,
			selectionStart: cursor,
			selectionEnd: cursor
		};
	}

	return null;
}

/**
 * Handles `Tab` and `Shift+Tab` indentation / outdentation.
 */
export function handleTabKey(state: EditorState, shiftKey = false): EditorState {
	const { value, selectionStart, selectionEnd } = state;
	const indentUnit = '  ';

	const lineStart = value.lastIndexOf('\n', Math.max(0, selectionStart - 1)) + 1;
	const nextNewline = value.indexOf('\n', selectionEnd);
	const lineEnd = nextNewline === -1 ? value.length : nextNewline;
	const block = value.slice(lineStart, lineEnd);
	const isMultiLine = block.includes('\n');
	const isListLine = /^\s*(?:[-*+]|\d+\.)\s+/.test(block);

	if (!shiftKey && !isMultiLine && !isListLine && selectionStart === selectionEnd) {
		const nextValue = value.slice(0, selectionStart) + indentUnit + value.slice(selectionEnd);
		const cursor = selectionStart + indentUnit.length;
		return {
			value: nextValue,
			selectionStart: cursor,
			selectionEnd: cursor
		};
	}

	const lines = block.split('\n');
	let firstLineDelta = 0;
	let totalDelta = 0;

	const updatedLines = lines.map((line, index) => {
		if (!shiftKey) {
			if (index === 0) firstLineDelta = indentUnit.length;
			totalDelta += indentUnit.length;
			return `${indentUnit}${line}`;
		}

		// Outdent: remove up to 2 leading spaces or 1 leading tab
		let removed = 0;
		let updated = line;
		if (updated.startsWith('\t')) {
			updated = updated.slice(1);
			removed = 1;
		} else if (updated.startsWith('  ')) {
			updated = updated.slice(2);
			removed = 2;
		} else if (updated.startsWith(' ')) {
			updated = updated.slice(1);
			removed = 1;
		}
		if (index === 0) firstLineDelta = -removed;
		totalDelta -= removed;
		return updated;
	});

	const replacement = updatedLines.join('\n');
	const nextValue = value.slice(0, lineStart) + replacement + value.slice(lineEnd);

	return {
		value: nextValue,
		selectionStart: Math.max(lineStart, selectionStart + firstLineDelta),
		selectionEnd: Math.max(lineStart, selectionEnd + totalDelta)
	};
}

export type ShortcutAction =
	| { type: 'command'; command: ToolbarCommand; state: EditorState }
	| { type: 'undo' }
	| { type: 'redo' };

/**
 * Resolves a keyboard shortcut (`Ctrl/Cmd+B`, `Ctrl/Cmd+I`, `Ctrl/Cmd+K`, `Ctrl/Cmd+Z`, `Ctrl/Cmd+Shift+Z`, `Ctrl/Cmd+Y`)
 * into a structured action, or `null` if the key event does not match a shortcut.
 */
export function resolveShortcut(
	event: {
		key: string;
		metaKey?: boolean;
		ctrlKey?: boolean;
		shiftKey?: boolean;
		altKey?: boolean;
	},
	state: EditorState
): ShortcutAction | null {
	const mod = Boolean(event.metaKey || event.ctrlKey);
	if (!mod || event.altKey) {
		return null;
	}

	const key = event.key.toLowerCase();

	if (key === 'z') {
		return event.shiftKey ? { type: 'redo' } : { type: 'undo' };
	}

	if (key === 'y' && !event.shiftKey) {
		return { type: 'redo' };
	}

	if (event.shiftKey) {
		return null;
	}

	if (key === 'b') {
		return { type: 'command', command: 'bold', state: toggleBold(state) };
	}
	if (key === 'i') {
		return { type: 'command', command: 'italic', state: toggleItalic(state) };
	}
	if (key === 'k') {
		return { type: 'command', command: 'link', state: insertLink(state) };
	}

	return null;
}
