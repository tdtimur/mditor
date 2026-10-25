import { describe, expect, it } from 'vitest';
import {
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
	toggleTaskList
} from './commands.js';
import { handleEnterKey, handleTabKey, resolveShortcut } from './keyboard.js';

describe('commands', () => {
	it('toggles bold wrapping and unwrapping', () => {
		const wrapped = toggleBold({ value: 'hello world', selectionStart: 0, selectionEnd: 5 });
		expect(wrapped).toEqual({
			value: '**hello** world',
			selectionStart: 2,
			selectionEnd: 7
		});

		const unwrapped = toggleBold(wrapped);
		expect(unwrapped).toEqual({
			value: 'hello world',
			selectionStart: 0,
			selectionEnd: 5
		});
	});

	it('inserts placeholder when bold/italic/strikethrough/inlineCode have empty selection', () => {
		expect(toggleBold({ value: '', selectionStart: 0, selectionEnd: 0 }).value).toBe(
			'**bold text**'
		);
		expect(toggleItalic({ value: '', selectionStart: 0, selectionEnd: 0 }).value).toBe(
			'*italic text*'
		);
		expect(toggleStrikethrough({ value: '', selectionStart: 0, selectionEnd: 0 }).value).toBe(
			'~~strikethrough text~~'
		);
		expect(toggleInlineCode({ value: '', selectionStart: 0, selectionEnd: 0 }).value).toBe(
			'`code`'
		);
	});

	it('wraps and unwraps fenced code blocks', () => {
		const wrapped = toggleCodeBlock({
			value: 'const x = 1;',
			selectionStart: 0,
			selectionEnd: 12
		});
		expect(wrapped.value).toBe('```\nconst x = 1;\n```');

		const unwrapped = toggleCodeBlock({
			value: wrapped.value,
			selectionStart: 0,
			selectionEnd: wrapped.value.length
		});
		expect(unwrapped.value).toBe('const x = 1;');
	});

	it('cycles heading levels and supports explicit heading level', () => {
		let state = { value: 'Title', selectionStart: 5, selectionEnd: 5 };
		state = cycleHeading(state);
		expect(state.value).toBe('### Title');
		state = cycleHeading(state);
		expect(state.value).toBe('## Title');
		state = cycleHeading(state);
		expect(state.value).toBe('# Title');
		state = cycleHeading(state);
		expect(state.value).toBe('Title');

		const h2 = cycleHeading({ value: 'Section', selectionStart: 0, selectionEnd: 7 }, 2);
		expect(h2.value).toBe('## Section');
	});

	it('toggles blockquotes across multiple lines', () => {
		const initial = { value: 'Line 1\nLine 2', selectionStart: 0, selectionEnd: 13 };
		const quoted = toggleBlockquote(initial);
		expect(quoted.value).toBe('> Line 1\n> Line 2');

		const unquoted = toggleBlockquote(quoted);
		expect(unquoted.value).toBe('Line 1\nLine 2');
	});

	it('toggles bullet, ordered, and task lists and converts between them', () => {
		const initial = { value: 'Item A\nItem B', selectionStart: 0, selectionEnd: 13 };
		const bulleted = toggleBulletList(initial);
		expect(bulleted.value).toBe('- Item A\n- Item B');

		const ordered = toggleOrderedList(bulleted);
		expect(ordered.value).toBe('1. Item A\n2. Item B');

		const tasks = toggleTaskList(ordered);
		expect(tasks.value).toBe('- [ ] Item A\n- [ ] Item B');

		const cleared = toggleTaskList(tasks);
		expect(cleared.value).toBe('Item A\nItem B');
	});

	it('inserts links, images, horizontal rules, and tables with helpful selection', () => {
		const link = insertLink({ value: 'Docs', selectionStart: 0, selectionEnd: 4 });
		expect(link.value).toBe('[Docs](url)');
		expect(link.value.slice(link.selectionStart, link.selectionEnd)).toBe('url');

		const image = insertImage({ value: 'Logo', selectionStart: 0, selectionEnd: 4 });
		expect(image.value).toBe('![Logo](image-url)');
		expect(image.value.slice(image.selectionStart, image.selectionEnd)).toBe('image-url');

		const hr = insertHorizontalRule({ value: 'Intro', selectionStart: 5, selectionEnd: 5 });
		expect(hr.value).toBe('Intro\n\n---\n\n');

		const tbl = insertTable({ value: '', selectionStart: 0, selectionEnd: 0 });
		expect(tbl.value).toContain('| Header 1 | Header 2 |');
		expect(tbl.value.slice(tbl.selectionStart, tbl.selectionEnd)).toBe('Header 1');
	});

	it('dispatches via executeCommand', () => {
		const res = executeCommand('bold', { value: 'hi', selectionStart: 0, selectionEnd: 2 });
		expect(res.value).toBe('**hi**');
	});
});

describe('keyboard handlers', () => {
	it('continues and exits bullet, ordered, and task lists on Enter', () => {
		// Continue bullet list
		const bulletCont = handleEnterKey({
			value: '- First',
			selectionStart: 7,
			selectionEnd: 7
		});
		expect(bulletCont?.value).toBe('- First\n- ');

		// Exit empty bullet list
		const bulletExit = handleEnterKey(bulletCont!);
		expect(bulletExit?.value).toBe('- First\n');

		// Continue ordered list with incremented number
		const orderedCont = handleEnterKey({
			value: '1. Step one',
			selectionStart: 11,
			selectionEnd: 11
		});
		expect(orderedCont?.value).toBe('1. Step one\n2. ');

		// Continue task list
		const taskCont = handleEnterKey({
			value: '- [x] Done task',
			selectionStart: 15,
			selectionEnd: 15
		});
		expect(taskCont?.value).toBe('- [x] Done task\n- [ ] ');
	});

	it('indents and outdents lines with Tab and Shift+Tab', () => {
		const indented = handleTabKey(
			{ value: '- item 1\n- item 2', selectionStart: 0, selectionEnd: 17 },
			false
		);
		expect(indented.value).toBe('  - item 1\n  - item 2');

		const outdented = handleTabKey(indented, true);
		expect(outdented.value).toBe('- item 1\n- item 2');
	});

	it('resolves keyboard shortcuts (Mod+B, Mod+I, Mod+K, Mod+Z, Mod+Shift+Z, Mod+Y)', () => {
		const state = { value: 'word', selectionStart: 0, selectionEnd: 4 };

		const boldAction = resolveShortcut({ key: 'b', metaKey: true }, state);
		expect(boldAction).toEqual({
			type: 'command',
			command: 'bold',
			state: { value: '**word**', selectionStart: 2, selectionEnd: 6 }
		});

		const italicAction = resolveShortcut({ key: 'i', ctrlKey: true }, state);
		expect(italicAction?.type).toBe('command');

		const linkAction = resolveShortcut({ key: 'k', metaKey: true }, state);
		expect(linkAction?.type).toBe('command');

		expect(resolveShortcut({ key: 'z', metaKey: true }, state)).toEqual({ type: 'undo' });
		expect(resolveShortcut({ key: 'z', metaKey: true, shiftKey: true }, state)).toEqual({
			type: 'redo'
		});
		expect(resolveShortcut({ key: 'y', ctrlKey: true }, state)).toEqual({ type: 'redo' });
	});
});
