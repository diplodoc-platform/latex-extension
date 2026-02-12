import MarkdownIt from 'markdown-it';
import {describe, expect, it} from 'vitest';

import {transform as latexTransform} from '../src/plugin/transform';

function html(markup: string, opts?: Parameters<typeof latexTransform>[0]) {
    const md = new MarkdownIt();
    md.use(latexTransform({bundle: false, ...opts}), {output: '.'});
    return md.render(markup);
}

function meta(markup: string, opts?: Parameters<typeof latexTransform>[0]) {
    const md = new MarkdownIt();
    md.use(latexTransform({bundle: false, ...opts}), {output: '.'});
    const env: {meta?: {script?: string[]; style?: string[]}} = {};
    md.render(markup, env);
    return env.meta;
}

describe('Latex extension – plugin', () => {
    it('should render inline math', () => {
        const result = html('Text with $x^2$ formula.');
        expect(result).toContain('<span class="yfm-latex"');
        expect(result).toContain('data-content="');
        expect(result).toContain('data-options="');
        expect(result).toContain('x%5E2'); // encoded x^2
        expect(result).toContain('</span>');
    });

    it('should render block math', () => {
        const result = html('$$\nE = mc^2\n$$');
        expect(result).toContain('<p class="yfm-latex"');
        expect(result).toContain('data-content="');
        expect(result).toContain('E%20%3D%20mc%5E2');
        expect(result).toContain('</p>');
    });

    it('should render single-line block math', () => {
        const result = html('$$E = mc^2$$');
        expect(result).toContain('<p class="yfm-latex"');
        expect(result).toContain('E%20%3D%20mc%5E2');
    });

    it('should not treat single $ as inline math', () => {
        const result = html('Price is $5 and $10.');
        expect(result).not.toContain('yfm-latex');
        expect(result).toContain('$5');
        expect(result).toContain('$10');
    });

    it('should not open inline math after space', () => {
        const result = html('$ x$');
        expect(result).not.toContain('yfm-latex');
    });

    it('should add default assets to meta for inline math', () => {
        expect(meta('$x$')).toStrictEqual({
            script: ['_assets/latex-extension.js'],
            style: ['_assets/latex-extension.css'],
        });
    });

    it('should add default assets to meta for block math', () => {
        expect(meta('$$x$$')).toStrictEqual({
            script: ['_assets/latex-extension.js'],
            style: ['_assets/latex-extension.css'],
        });
    });

    it('should add custom runtime (string) to meta', () => {
        expect(meta('$x$', {runtime: '/assets/latex.js'})).toStrictEqual({
            script: ['/assets/latex.js'],
            style: ['/assets/latex.js'],
        });
    });

    it('should add custom runtime (object) to meta', () => {
        expect(
            meta('$x$', {
                runtime: {script: 'latex.js', style: 'latex.css'},
            }),
        ).toStrictEqual({script: ['latex.js'], style: ['latex.css']});
    });

    it('should apply custom classes', () => {
        const result = html('$x$', {classes: 'custom-math'});
        expect(result).toContain('class="custom-math"');
        expect(result).not.toContain('yfm-latex');
    });

    it('should pass katexOptions into data-options', () => {
        const result = html('$x$', {
            katexOptions: {strict: true},
        });
        expect(result).toContain('data-options="');
        // data-options is URL-encoded JSON
        expect(result).toContain('strict'); // option key present
        expect(
            JSON.parse(decodeURIComponent(result.match(/data-options="([^"]+)"/)?.[1] ?? '{}')),
        ).toMatchObject({
            strict: true,
            displayMode: false,
        });
    });

    it('should not add meta when no math', () => {
        expect(meta('Just text.')).toBeUndefined();
    });

    it('should throw when bundle is true and runtime is string', () => {
        const md = new MarkdownIt();
        expect(() => {
            md.use(latexTransform({bundle: true, runtime: '/path'}), {output: '.'});
        }).toThrow(TypeError);
    });
});
