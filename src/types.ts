import type {KatexOptions} from 'katex';

export type RunOptions = KatexOptions & {
    querySelector?: string;
    nodes?: HTMLElement[];
    sanitize?: (content: string) => string;
};

export type ExposedAPI = {
    run: (options?: RunOptions) => Promise<void>;
};
