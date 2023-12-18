import type {MarkdownItPluginCb} from '@diplodoc/transform/lib/plugins/typings';
import type {RuleBlock} from 'markdown-it/lib/parser_block';
import type {RuleInline} from 'markdown-it/lib/parser_inline';
import type {RenderRule} from 'markdown-it/lib/renderer';
import type {KatexOptions} from 'katex';
import MarkdownIt from 'markdown-it';
import {copy, dynrequire, hidden} from './utils';

// Assumes that there is a "$" at state.src[pos]
function isValidDelim(state: Parameters<RuleInline>[0], pos: number) {
    const result = {
        canOpen: true,
        canClose: true,
    };
    const max = state.posMax;
    const prevChar = pos > 0 ? state.src.charCodeAt(pos - 1) : -1;
    const nextChar = pos + 1 <= max ? state.src.charCodeAt(pos + 1) : -1;

    // Check non-whitespace conditions for opening and closing, and
    // check that closing delimeter isn't followed by a number
    if (
        prevChar === 0x20 /* " " */ ||
        prevChar === 0x09 /* \t */ ||
        (nextChar >= 0x30 /* "0" */ && nextChar <= 0x39) /* "9" */
    ) {
        result.canClose = false;
    }
    if (nextChar === 0x20 /* " " */ || nextChar === 0x09 /* \t */) {
        result.canOpen = false;
    }

    return result;
}

const mathInline: RuleInline = (state, silent) => {
    if (state.src[state.pos] !== '$') {
        return false;
    }

    let res = isValidDelim(state, state.pos);
    if (!res.canOpen) {
        if (!silent) {
            state.pending += '$';
        }
        state.pos += 1;
        return true;
    }

    // First check for and bypass all properly escaped delimieters
    // This loop will assume that the first leading backtick can not
    // be the first character in state.src, which is known since
    // we have found an opening delimieter already.
    const start = state.pos + 1;
    let match = start;
    while ((match = state.src.indexOf('$', match)) !== -1) {
        // Found potential $, look for escapes, pos will point to
        // first non escape when complete
        let pos = match - 1;
        while (state.src[pos] === '\\') {
            pos -= 1;
        }

        // Even number of escapes, potential closing delimiter found
        if ((match - pos) % 2 === 1) {
            break;
        }
        match += 1;
    }

    // No closing delimter found.  Consume $ and continue.
    if (match === -1) {
        if (!silent) {
            state.pending += '$';
        }
        state.pos = start;
        return true;
    }

    // Check if we have empty content, ie: $$.  Do not parse.
    if (match - start === 0) {
        if (!silent) {
            state.pending += '$$';
        }
        state.pos = start + 1;
        return true;
    }

    // Check for valid closing delimiter
    res = isValidDelim(state, match);
    if (!res.canClose) {
        if (!silent) {
            state.pending += '$';
        }
        state.pos = start;
        return true;
    }

    if (!silent) {
        const token = state.push('math_inline', 'math', 0);
        token.markup = '$';
        token.content = state.src.slice(start, match);
    }

    state.pos = match + 1;

    return true;
};

const mathBlock: RuleBlock = (state, start, end, silent) => {
    let found = false;
    let pos = state.bMarks[start] + state.tShift[start];
    let max = state.eMarks[start];

    if (pos + 2 > max) {
        return false;
    }
    if (state.src.slice(pos, pos + 2) !== '$$') {
        return false;
    }

    pos += 2;
    let firstLine = state.src.slice(pos, max);

    if (silent) {
        return true;
    }
    if (firstLine.trim().slice(-2) === '$$') {
        // Single line expression
        firstLine = firstLine.trim().slice(0, -2);
        found = true;
    }

    let lastLine = '',
        lastPos = -1;
    let next = start;
    while (!found) {
        next++;

        if (next >= end) {
            break;
        }

        pos = state.bMarks[next] + state.tShift[next];
        max = state.eMarks[next];

        if (pos < max && state.tShift[next] < state.blkIndent) {
            // non-empty line with negative indent should stop the list:
            break;
        }

        if (state.src.slice(pos, max).trim().slice(-2) === '$$') {
            lastPos = state.src.slice(0, max).lastIndexOf('$$');
            lastLine = state.src.slice(pos, lastPos);
            found = true;
        }
    }

    state.line = next + 1;

    const token = state.push('math_block', 'math', 0);
    token.block = true;
    token.content =
        (firstLine && firstLine.trim() ? firstLine + '\n' : '') +
        state.getLines(start + 1, next, state.tShift[start], true) +
        (lastLine && lastLine.trim() ? lastLine : '');
    token.map = [start, state.line];
    token.markup = '$$';

    return true;
};

const registerTransforms = (
    md: MarkdownIt,
    {
        runtime,
        bundle,
        output,
    }: Pick<NormalizedPluginOptions, 'bundle' | 'runtime'> & {
        output: string;
    },
) => {
    function applyTransforms<T extends RuleBlock | RuleInline>(match: T): T {
        return ((state: Parameters<T>[0], ...args: any[]) => {
            const {env} = state;

            hidden(env, 'bundled', new Set<string>());

            // @ts-ignore
            const matched = match(state, ...args);

            if (matched) {
                env.meta = env.meta || {};
                env.meta.script = env.meta.script || [];
                env.meta.script.push(runtime.script);
                env.meta.style = env.meta.style || [];
                env.meta.style.push(runtime.style);

                if (bundle && !env.bundled.has(PACKAGE)) {
                    const {dirname, join} = dynrequire('node:path');

                    env.bundled.add(PACKAGE);

                    const root = dirname(require.resolve(join(PACKAGE, 'runtime')));

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
            }

            return matched;
        }) as T;
    }

    md.inline.ruler.after('escape', 'math_inline', applyTransforms(mathInline));
    md.block.ruler.after('blockquote', 'math_block', applyTransforms(mathBlock), {
        alt: ['paragraph', 'reference', 'blockquote', 'list'],
    });
};

export type NormalizedPluginOptions = Omit<PluginOptions, 'runtime'> & {
    runtime: {
        script: string;
        style: string;
    };
};

export type PluginOptions = {
    runtime: string | {
        script: string;
        style: string;
    };
    bundle: boolean;
    validate: boolean;
    classes: string;
    katexOptions: KatexOptions;
};

export function transform(options: Partial<PluginOptions> = {}) {
    const {
        classes = 'yfm-latex',
        bundle = true,
        validate = true,
        katexOptions = {},
    } = options;

    if (bundle && typeof options.runtime === 'string') {
        throw new TypeError('Option `runtime` should be record when `bundle` is enabled.');
    }

    const runtime = typeof options.runtime === 'string'
        ? {script: options.runtime, style: options.runtime}
        : options.runtime || {script: '_assets/latex-extension.js', style: '_assets/latex-extension.css'};

    const render =
        (tag: 'span' | 'p', displayMode: boolean): RenderRule =>
        (tokens, idx) => {
            const content = tokens[idx].content;
            const options = {
                ...katexOptions,
                displayMode,
            };

            if (validate) {
                dynrequire('katex').renderToString(content, {
                    ...options,
                    throwOnError: true,
                });
            }

            const econtent = encodeURIComponent(content);
            const eoptions = encodeURIComponent(JSON.stringify(options));

            return `<${tag} class="${classes}" data-content="${econtent}" data-options="${eoptions}"></${tag}>`;
        };

    const plugin: MarkdownItPluginCb<{output: string}> = function (md: MarkdownIt, {output = '.'}) {
        registerTransforms(md, {
            runtime,
            bundle,
            output,
        });

        md.renderer.rules.math_inline = render('span', false);
        md.renderer.rules.math_block = render('p', true);
    };

    return plugin;
}
