import {
	defineMDitorElement,
	ensureMDitorStyles,
	MDitorElement
} from './mditor-element.svelte.js';

defineMDitorElement('md-itor');

export { defineMDitorElement, ensureMDitorStyles, MDitorElement };
export { MDitor } from '../index.js';
export {
	katexExtension,
	mermaidExtension,
	prismExtension,
	type KatexExtensionOptions,
	type MermaidExtensionOptions,
	type PrismExtensionOptions
} from '../extensions/index.js';
export default MDitorElement;
