import type {PluginOptions, RuntimeObj} from './types';

import {dirname, join} from 'node:path';
import {copyFileSync, mkdirSync} from 'node:fs';

import {transform as baseTransform} from './transform';

function copy(from: string, to: string) {
    mkdirSync(dirname(to), {recursive: true});
    copyFileSync(from, to);
}

export function onBundle(env: {bundled: Set<string>}, output: string, runtime: RuntimeObj) {
    env.bundled.add(PACKAGE);

    const root = join(__dirname, '..', 'runtime');

    RUNTIME.forEach((file) => {
        switch (true) {
            case file === 'index.js':
                return copy(join(root, file), join(output, runtime.script));
            case file === 'index.css':
                return copy(join(root, file), join(output, runtime.style));
            default:
                return copy(join(root, file), join(output, dirname(runtime.script), file));
        }
    });
}

export const transform = (options?: Partial<Omit<PluginOptions, 'onBundle'>>) => {
    return baseTransform({...options, onBundle});
};
