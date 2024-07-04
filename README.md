# Diplodoc Latex extension

[![NPM version](https://img.shields.io/npm/v/@diplodoc/latex-extension.svg?style=flat)](https://www.npmjs.org/package/@diplodoc/latex-extension)

This is extension for Diplodoc platform which adds support for Latex syntax using [katex](https://katex.org/) library.

Extension contains some parts:
- [Prepared Katex runtime](#prepared-katex-runtime)
- [MarkdownIt transform plugin](#markdownit-transform-plugin)
- [React hook and component for smart control of Katex](#react-hook-and-component-for-smart-control-of-katex)

## Quickstart
Attach plugin to transformer

```js
import latex from '@diplodoc/latex-extension';
import transform from '@diplodoc/transform';

const {result} = await transform(`
### Inline latex

Some text $c = \pm\sqrt{a^2 + b^2}$

### Block latex

$$
c = \pm\sqrt{a^2 + b^2}
$$
`, {
    plugins: [
        latex.transform()
    ]
});
```

Add latex runtime to your final page

```html
<html>
    <head>
        <link rel="stylesheet" href="_assets/latex-extension.css" />
        <!-- Read more about '_assets/latex-extension.js' in 'MarkdownIt transform plugin' section -->
        <script src="_assets/latex-extension.js" async />
        <script>
            // Read more about 'latexJsonp' in 'Prepared Katex runtime' section
            window.latexJsonp = window.latexJsonp || [];
            window.latexJsonp.push((latex) => {
                window.addEventListener('load', function() {
                    latex.run();
                });
            });
        </script>
    </head>
    <body style="background: #000">
        ${result.html}
    </body>
</html>
```

## Prepared Katex runtime

Katex - is most popular and fast implementation of rendering tex/latex formulas.

The problem with Katex is that it has big bundle size.
The most expected behavior is loading it asynchronously.

**Prepared Katex runtime** designed to solve this problem.
We add `latexJsonp` global callback to handle Katex loading.

Also, we limit exposed Katex API by next methods:
- **run(options: [KatexOptions](https://katex.org/docs/options) & [RunOptions](#run-options))** - start formula rendering

Usage example:
```js
window.latexJsonp = window.latexJsonp || [];

// This callback will be called when runtime is loaded
window.latexJsonp.push((latex) => {
    latex.run();
});

// You can configure more that one callback
window.latexJsonp.push((latex) => {
    console.log('Render diagrams');
});
```

### Run options
- `querySelector` - The query selector to use when finding elements to render.<br>
  (Default: `.yfm-latex`)<br>

- `nodes` - The nodes to render. If this is set, `querySelector` will be ignored.<br>

- `sanitize` - The function to remove dangerous content from final html.<br>
  (Default: `identity`)<br>

### Security
By default runtime uses Katex [security recomendations](https://katex.org/docs/security).<br>
But there is extra option for extended sanitize. You feel free to use your own sanitizer:

```js
import dompurify from 'dompurify';
import domready from 'domready';

window.latexJsonp = window.latexJsonp || [];
window.latexJsonp.push((latex) => {
    domready(() => latex.run({
        sanitize: dompurify.sanitize
    }));
});
```

## MarkdownIt transform plugin

Plugin for [@diplodoc/transform](https://github.com/diplodoc-platform/transform) package.

Configuration:
- `runtime` - name of runtime script which will be exposed in results `script` and `style` sections.<br>
  If `bundle` option was disabled then can be plain string. Otherwise should be string record.<br/>
  **Default**:
  ```json
  {
    "script": "_assets/latex-extension.js",
    "style": "_assets/latex-extension.css"
  }
  ```

- `bundle` - boolean flag to enable/disable copying of bundled runtime to target directory.<br>
  Where target directory is `<transformer output option>/<plugin runtime option>`<br>
  **Should be disabled for clientside usage**<br>
  **Default**: true<br>

- `validate` - boolean flag to enable/disable build validation.<br>
  Useful for serverside prebuild tools like [@diplodoc/cli](https://github.com/diplodoc-platform/cli)
  **Should be disabled for clientside usage**<br>
  **Default**: true<br>

- `classes` - additional classes which will be added to Latex formula container.<br>
  (Example: `my-own-class and-other-class`)<br>

- `katexOptions` - [katex](https://katex.org/docs/options) rendering option

## React hook and component for smart control of Katex

Simplifies Katex control with react

```tsx
import React from 'react'
import { transform } from '@diplodoc/transform'
import latex from '@diplodoc/latex-extension/plugin'
import { LatexRuntime } from '@diplodoc/latex-extension/react'

const LATEX_RUNTIME = 'extension:latex';

const Doc: React.FC = ({ content }) => {
    const result = transform(content, {
      plugins: [
        // Initialize plugin for client/server rendering
        latex.transform({
          // Do not touch file system
          bundle: false,
          // Set custom runtime name for searching in result scripts
          runtime: LATEX_RUNTIME
        })
      ]
    })

    // Load katex only if one or more formulas should be rendered
    if (result.script.includes(LATEX_RUNTIME)) {
      import('@diplodoc/latex-extension/runtime')
    }

    if (result.style.includes(LATEX_RUNTIME)) {
      import('@diplodoc/latex-extension/runtime/styles')
    }

    return <div dangerouslySetInnerHTML={{ __html: result.html }} />
}

export const App: React.FC = ({ theme }) => {
    return <>
        <Doc content={`
            $$
            c = \pm\sqrt{a^2 + b^2}
            $$
        `}/>
        <KatexRuntime />
    </>
}
```
