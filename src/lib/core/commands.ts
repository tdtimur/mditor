export interface EditorState {
	value: string;
	selectionStart: number;
	selectionEnd: number;
}

export type ToolbarCommand =
	| 'bold'
	| 'italic'
	| 'strikethrough'
	| 'inlineCode'
	| 'codeBlock'
	| 'heading'
	| 'blockquote'
	| 'horizontalRule'
	| 'link'
	| 'image'
	| 'table'
	| 'bulletList'
	| 'orderedList'
	| 'taskList';

/**
 * Toggles symmetrical inline delimiters (e.g. `**`, `*`, `~~`, `` ` ``) around the current selection.
 */
function toggleInlineFormat(
	state: EditorState,
	delimiter: string,
	placeholder: string
): EditorState {
	const { value, selectionStart, selectionEnd } = state;
	const len = delimiter.length;
	const selected = value.slice(selectionStart, selectionEnd);

	// Case 1: Delimiters are immediately outside the current selection -> unwrap
	const before = value.slice(Math.max(0, selectionStart - len), selectionStart);
	const after = value.slice(selectionEnd, selectionEnd + len);
	if (before === delimiter && after === delimiter) {
		const nextValue =
			value.slice(0, selectionStart - len) + selected + value.slice(selectionEnd + len);
		return {
			value: nextValue,
			selectionStart: selectionStart - len,
			selectionEnd: selectionEnd - len
		};
	}

	// Case 2: Selection itself starts and ends with the delimiter -> unwrap
	if (
		selected.length >= len * 2 &&
		selected.startsWith(delimiter) &&
		selected.endsWith(delimiter)
	) {
		const inner = selected.slice(len, selected.length - len);
		const nextValue = value.slice(0, selectionStart) + inner + value.slice(selectionEnd);
		return {
			value: nextValue,
			selectionStart,
			selectionEnd: selectionStart + inner.length
		};
	}

	// Case 3: Wrap selection (or insert placeholder)
	const textToWrap = selected || placeholder;
	const wrapped = `${delimiter}${textToWrap}${delimiter}`;
	const nextValue = value.slice(0, selectionStart) + wrapped + value.slice(selectionEnd);

	return {
		value: nextValue,
		selectionStart: selectionStart + len,
		selectionEnd: selectionStart + len + textToWrap.length
	};
}

export function toggleBold(state: EditorState): EditorState {
	return toggleInlineFormat(state, '**', 'bold text');
}

export function toggleItalic(state: EditorState): EditorState {
	return toggleInlineFormat(state, '*', 'italic text');
}

export function toggleStrikethrough(state: EditorState): EditorState {
	return toggleInlineFormat(state, '~~', 'strikethrough text');
}

export function toggleInlineCode(state: EditorState): EditorState {
	return toggleInlineFormat(state, '`', 'code');
}

export function toggleCodeBlock(state: EditorState): EditorState {
	const { value, selectionStart, selectionEnd } = state;
	const selected = value.slice(selectionStart, selectionEnd);
	const fence = '```';

	// Check if selection is already wrapped in a fenced code block
	if (selected.startsWith(`${fence}\n`) && selected.endsWith(`\n${fence}`)) {
		const inner = selected.slice(fence.length + 1, selected.length - (fence.length + 1));
		const nextValue = value.slice(0, selectionStart) + inner + value.slice(selectionEnd);
		return {
			value: nextValue,
			selectionStart,
			selectionEnd: selectionStart + inner.length
		};
	}

	const content = selected || 'code';
	const needsLeadingNewline = selectionStart > 0 && value[selectionStart - 1] !== '\n';
	const needsTrailingNewline = selectionEnd < value.length && value[selectionEnd] !== '\n';

	const prefix = `${needsLeadingNewline ? '\n' : ''}${fence}\n`;
	const suffix = `\n${fence}${needsTrailingNewline ? '\n' : ''}`;
	const nextValue =
		value.slice(0, selectionStart) + prefix + content + suffix + value.slice(selectionEnd);

	const contentStart = selectionStart + prefix.length;
	return {
		value: nextValue,
		selectionStart: contentStart,
		selectionEnd: contentStart + content.length
	};
}

/**
 * Helper to operate on the full lines touched by the current selection.
 */
function transformSelectedLines(
	state: EditorState,
	transformer: (lines: string[]) => string[]
): EditorState {
	const { value, selectionStart, selectionEnd } = state;
	const lineStart = value.lastIndexOf('\n', Math.max(0, selectionStart - 1)) + 1;
	const nextNewline = value.indexOf('\n', selectionEnd);
	const lineEnd = nextNewline === -1 ? value.length : nextNewline;

	const block = value.slice(lineStart, lineEnd);
	const lines = block.split('\n');
	const transformedLines = transformer(lines);
	const replacement = transformedLines.join('\n');

	const nextValue = value.slice(0, lineStart) + replacement + value.slice(lineEnd);
	return {
		value: nextValue,
		selectionStart: lineStart,
		selectionEnd: lineStart + replacement.length
	};
}

/**
 * Cycles heading level on the current line(s): none -> H1 -> H2 -> H3 -> none,
 * or sets a specific heading level if `level` (1-6) is provided.
 */
export function cycleHeading(state: EditorState, level?: number): EditorState {
	const { selectionStart, selectionEnd } = state;
	const isCollapsed = selectionStart === selectionEnd;

	const result = transformSelectedLines(state, (lines) =>
		lines.map((line) => {
			const match = line.match(/^(#{1,6})\s+(.*)$/);
			if (level !== undefined) {
				const targetPrefix = `${'#'.repeat(Math.min(6, Math.max(1, level)))} `;
				if (match && match[1].length === level) {
					return match[2];
				}
				return `${targetPrefix}${match ? match[2] : line}`;
			}

			if (!match) {
				return `### ${line}`;
			}
			const currentLevel = match[1].length;
			if (currentLevel === 3) {
				return `## ${match[2]}`;
			}
			if (currentLevel === 2) {
				return `# ${match[2]}`;
			}
			return match[2];
		})
	);

	if (isCollapsed) {
		return {
			value: result.value,
			selectionStart: result.selectionEnd,
			selectionEnd: result.selectionEnd
		};
	}
	return result;
}

export function toggleBlockquote(state: EditorState): EditorState {
	return transformSelectedLines(state, (lines) => {
		const allQuoted = lines.every((line) => /^>\s?/.test(line));
		return lines.map((line) => (allQuoted ? line.replace(/^>\s?/, '') : `> ${line}`));
	});
}

const LIST_PREFIX_REGEX = /^(\s*)(?:[-*+]\s+\[[ xX]\]\s+|[-*+]\s+|\d+\.\s+)/;

export function toggleBulletList(state: EditorState): EditorState {
	return transformSelectedLines(state, (lines) => {
		const allBulleted = lines.every((line) => /^\s*[-*+]\s+(?!\[[ xX]\]\s)/.test(line));
		return lines.map((line) => {
			if (allBulleted) {
				return line.replace(/^(\s*)[-*+]\s+/, '$1');
			}
			if (LIST_PREFIX_REGEX.test(line)) {
				return line.replace(LIST_PREFIX_REGEX, '$1- ');
			}
			return `- ${line}`;
		});
	});
}

export function toggleOrderedList(state: EditorState): EditorState {
	return transformSelectedLines(state, (lines) => {
		const allOrdered = lines.every((line) => /^\s*\d+\.\s+/.test(line));
		return lines.map((line, idx) => {
			if (allOrdered) {
				return line.replace(/^(\s*)\d+\.\s+/, '$1');
			}
			if (LIST_PREFIX_REGEX.test(line)) {
				return line.replace(LIST_PREFIX_REGEX, `$1${idx + 1}. `);
			}
			return `${idx + 1}. ${line}`;
		});
	});
}

export function toggleTaskList(state: EditorState): EditorState {
	return transformSelectedLines(state, (lines) => {
		const allTask = lines.every((line) => /^\s*[-*+]\s+\[[ xX]\]\s+/.test(line));
		return lines.map((line) => {
			if (allTask) {
				return line.replace(/^(\s*)[-*+]\s+\[[ xX]\]\s+/, '$1');
			}
			if (LIST_PREFIX_REGEX.test(line)) {
				return line.replace(LIST_PREFIX_REGEX, '$1- [ ] ');
			}
			return `- [ ] ${line}`;
		});
	});
}

export function insertHorizontalRule(state: EditorState): EditorState {
	const { value, selectionStart, selectionEnd } = state;
	const needsLeadingNewline = selectionStart > 0 && value[selectionStart - 1] !== '\n';
	const prefix = needsLeadingNewline ? '\n\n' : '';
	const rule = `${prefix}---\n\n`;
	const nextValue = value.slice(0, selectionStart) + rule + value.slice(selectionEnd);
	const cursor = selectionStart + rule.length;

	return {
		value: nextValue,
		selectionStart: cursor,
		selectionEnd: cursor
	};
}

export function insertLink(state: EditorState): EditorState {
	const { value, selectionStart, selectionEnd } = state;
	const selected = value.slice(selectionStart, selectionEnd);
	const label = selected || 'link text';
	const urlPlaceholder = 'url';
	const snippet = `[${label}](${urlPlaceholder})`;

	const nextValue = value.slice(0, selectionStart) + snippet + value.slice(selectionEnd);
	const urlStart = selectionStart + label.length + 3; // after `[label](`
	return {
		value: nextValue,
		selectionStart: urlStart,
		selectionEnd: urlStart + urlPlaceholder.length
	};
}

export function insertImage(state: EditorState): EditorState {
	const { value, selectionStart, selectionEnd } = state;
	const selected = value.slice(selectionStart, selectionEnd);
	const alt = selected || 'alt text';
	const urlPlaceholder = 'image-url';
	const snippet = `![${alt}](${urlPlaceholder})`;

	const nextValue = value.slice(0, selectionStart) + snippet + value.slice(selectionEnd);
	const urlStart = selectionStart + alt.length + 4; // after `![alt](`
	return {
		value: nextValue,
		selectionStart: urlStart,
		selectionEnd: urlStart + urlPlaceholder.length
	};
}

export function insertTable(state: EditorState): EditorState {
	const { value, selectionStart, selectionEnd } = state;
	const needsLeadingNewline = selectionStart > 0 && value[selectionStart - 1] !== '\n';
	const prefix = needsLeadingNewline ? '\n\n' : '';
	const table = [
		'| Header 1 | Header 2 |',
		'| -------- | -------- |',
		'| Cell 1   | Cell 2   |',
		'| Cell 3   | Cell 4   |'
	].join('\n');
	const insertion = `${prefix}${table}\n`;
	const nextValue = value.slice(0, selectionStart) + insertion + value.slice(selectionEnd);

	const headerStart = selectionStart + prefix.length + 2; // Select 'Header 1'
	return {
		value: nextValue,
		selectionStart: headerStart,
		selectionEnd: headerStart + 'Header 1'.length
	};
}

/**
 * Executes a toolbar command by name against an EditorState.
 */
export function executeCommand(command: ToolbarCommand, state: EditorState): EditorState {
	switch (command) {
		case 'bold':
			return toggleBold(state);
		case 'italic':
			return toggleItalic(state);
		case 'strikethrough':
			return toggleStrikethrough(state);
		case 'inlineCode':
			return toggleInlineCode(state);
		case 'codeBlock':
			return toggleCodeBlock(state);
		case 'heading':
			return cycleHeading(state);
		case 'blockquote':
			return toggleBlockquote(state);
		case 'horizontalRule':
			return insertHorizontalRule(state);
		case 'link':
			return insertLink(state);
		case 'image':
			return insertImage(state);
		case 'table':
			return insertTable(state);
		case 'bulletList':
			return toggleBulletList(state);
		case 'orderedList':
			return toggleOrderedList(state);
		case 'taskList':
			return toggleTaskList(state);
	}
}
