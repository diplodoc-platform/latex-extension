import transform from '@diplodoc/transform';
import latex from '@diplodoc/latex-extension';
import {readFile} from 'node:fs/promises';

(async () => {
    const content = await readFile('./README.md', 'utf8');
    const {result} = await transform(content, {
        output: './build',
        plugins: [latex.transform()],
    });

    const styles = result.meta.style
        .map((style) => {
            return `<link rel="stylesheet" href="${style}" />`;
        })
        .join('\n');

    const scripts = result.meta.script
        .map((script) => {
            return `<script src="${script}" async></script>`;
        })
        .join('\n');

    const html = `
<html>
    <head>
        ${styles}
        ${scripts}
        <script>
            window.latexJsonp = window.latexJsonp || [];
            window.latexJsonp.push(function(latex) {
                window.addEventListener('load', function() {
                    latex.run();
                });
            });
        </script>
    </head>
    <body style="background: #FFF">
        ${result.html}
    </body>
</html>
    `;

    console.log(html);
})();
