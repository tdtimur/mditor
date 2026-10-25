import { describe, expect, it } from 'vitest';
import { EditorHistory } from './history.js';

describe('EditorHistory', () => {
	it('tracks snapshots and supports undo and redo', () => {
		const history = new EditorHistory({ value: '', selectionStart: 0, selectionEnd: 0 });
		expect(history.canUndo).toBe(false);
		expect(history.canRedo).toBe(false);

		history.push({ value: '# Hello', selectionStart: 7, selectionEnd: 7 });
		history.push({ value: '# Hello\nWorld', selectionStart: 13, selectionEnd: 13 });

		expect(history.canUndo).toBe(true);
		expect(history.undo()?.value).toBe('# Hello');
		expect(history.canRedo).toBe(true);

		expect(history.undo()?.value).toBe('');
		expect(history.canUndo).toBe(false);

		expect(history.redo()?.value).toBe('# Hello');
		expect(history.redo()?.value).toBe('# Hello\nWorld');
		expect(history.canRedo).toBe(false);
	});

	it('clears redo branch when a new edit is pushed after undo', () => {
		const history = new EditorHistory({ value: 'a', selectionStart: 1, selectionEnd: 1 });
		history.push({ value: 'ab', selectionStart: 2, selectionEnd: 2 });
		history.push({ value: 'abc', selectionStart: 3, selectionEnd: 3 });

		history.undo();
		expect(history.current?.value).toBe('ab');

		history.push({ value: 'abX', selectionStart: 3, selectionEnd: 3 });
		expect(history.canRedo).toBe(false);
		expect(history.undo()?.value).toBe('ab');
	});

	it('enforces maxSize cap on history stack', () => {
		const history = new EditorHistory({ value: '0', selectionStart: 1, selectionEnd: 1 }, 3);
		history.push({ value: '1', selectionStart: 1, selectionEnd: 1 });
		history.push({ value: '2', selectionStart: 1, selectionEnd: 1 });
		history.push({ value: '3', selectionStart: 1, selectionEnd: 1 });

		expect(history.undo()?.value).toBe('2');
		expect(history.undo()?.value).toBe('1');
		expect(history.undo()).toBeNull();
	});
});
