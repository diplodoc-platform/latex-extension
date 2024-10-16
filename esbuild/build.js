#!/usr/bin/env node

const esbuild = require('esbuild');
const {inlineScss} = require('esbuild-inline-sass');

const {
    compilerOptions: {target},
} = require('../tsconfig.json');

const common = {
    bundle: true,
    sourcemap: true,
    target: target,
    tsconfig: './tsconfig.json',
};

(async () => {
    const runtimeCommon = {
        entryPoints: ['src/runtime/index.ts'],
        loader: {
            '.svg': 'text',
            '.ttf': 'file',
            '.woff': 'file',
            '.woff2': 'file',
        },
        plugins: [inlineScss()],
    };

    const runtime = await esbuild.build({
        ...common,
        ...runtimeCommon,
        outfile: 'build/runtime/index.js',
        minify: true,
        metafile: true,
    });

    esbuild.build({
        ...common,
        ...runtimeCommon,
        outfile: 'build/runtime/index-browser.js',
        external: ['katex'],
        platform: 'neutral',
    });

    esbuild.build({
        ...common,
        entryPoints: ['src/react/index.ts'],
        outfile: 'build/react/index.js',
        platform: 'neutral',
        external: ['react'],
    });

    const pluginCommon = {
        external: ['markdown-it', 'node:*'],
        define: {
            PACKAGE: JSON.stringify(require('../package.json').name),
            RUNTIME: JSON.stringify(
                Object.keys(runtime.metafile.outputs)
                    .filter((file) => !file.match(/\.map$/))
                    .map((file) => file.replace(/^build\/runtime\//, '')),
            ),
        },
    };

    esbuild.build({
        ...common,
        ...pluginCommon,
        entryPoints: ['src/plugin/index.ts'],
        outfile: 'build/plugin/index.js',
        platform: 'neutral',
        external: [...pluginCommon.external, 'katex'],
    });

    esbuild.build({
        ...common,
        ...pluginCommon,
        entryPoints: ['src/plugin/index-node.ts'],
        outfile: 'build/plugin/index-node.js',
        platform: 'node',
    });
})();
