import type {KatexOptions} from 'katex';

export interface RuntimeObj {
    script: string;
    style: string;
}

export type PluginOptions = {
    runtime: string | RuntimeObj;
    bundle: boolean;
    validate: boolean;
    classes: string;
    katexOptions: KatexOptions;
    onBundle?: (env: {bundled: Set<string>}, output: string, runtime: RuntimeObj) => void;
};

export type NormalizedPluginOptions = Omit<PluginOptions, 'runtime'> & {
    runtime: RuntimeObj;
};
