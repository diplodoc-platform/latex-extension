import type {KatexOptions} from 'katex';

export type RunOptions = KatexOptions & {
    querySelector?: string;
    nodes?: HTMLElement[];
};

export type ExposedAPI = {
    run: (options?: RunOptions) => Promise<void>;
};
