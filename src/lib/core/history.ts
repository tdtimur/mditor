import type { EditorState } from './commands.js';

/**
 * Lightweight Undo/Redo history stack for Markdown editor snapshots.
 */
export class EditorHistory {
	private stack: EditorState[] = [];
	private index = -1;
	private readonly maxSize: number;

	constructor(initialState?: EditorState, maxSize = 100) {
		this.maxSize = Math.max(2, maxSize);
		if (initialState) {
			this.stack = [{ ...initialState }];
			this.index = 0;
		}
	}

	/**
	 * Records a new editor snapshot, clearing any redo history after the current index.
	 * Skips recording if the `value` is identical to the current top snapshot (updating selection only).
	 */
	push(state: EditorState): void {
		const current = this.current;
		if (current && current.value === state.value) {
			this.stack[this.index] = { ...state };
			return;
		}

		// Truncate any forward (redo) entries
		if (this.index < this.stack.length - 1) {
			this.stack = this.stack.slice(0, this.index + 1);
		}

		this.stack.push({ ...state });

		if (this.stack.length > this.maxSize) {
			this.stack.shift();
		} else {
			this.index++;
		}
	}

	/**
	 * Moves one step back in history and returns the previous snapshot, or `null` if unavailable.
	 */
	undo(): EditorState | null {
		if (!this.canUndo) {
			return null;
		}
		this.index--;
		return { ...this.stack[this.index] };
	}

	/**
	 * Moves one step forward in history and returns the next snapshot, or `null` if unavailable.
	 */
	redo(): EditorState | null {
		if (!this.canRedo) {
			return null;
		}
		this.index++;
		return { ...this.stack[this.index] };
	}

	get canUndo(): boolean {
		return this.index > 0;
	}

	get canRedo(): boolean {
		return this.index >= 0 && this.index < this.stack.length - 1;
	}

	get current(): EditorState | null {
		if (this.index < 0 || this.index >= this.stack.length) {
			return null;
		}
		return { ...this.stack[this.index] };
	}

	/**
	 * Resets the history stack with a new initial state.
	 */
	reset(initialState: EditorState): void {
		this.stack = [{ ...initialState }];
		this.index = 0;
	}
}
