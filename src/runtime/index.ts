import type {ExposedAPI} from '../types';

import katex from 'katex';
import 'katex/dist/katex.css';

const jsonp = (window.latexJsonp = window.latexJsonp || []);
const queue = jsonp.splice(0, jsonp.length);
const attr = (element: Element, name: string) =>
    decodeURIComponent(element.getAttribute(name) || '');

jsonp.push = function (...args) {
    args.forEach((callback) => {
        queue.push(callback);
        unqueue();
    });

    return queue.length;
};

let processing = false;
async function lock(action: () => Promise<void> | void): Promise<void> {
    processing = true;
    await action();
    processing = false;
}

function unqueue() {
    if (!processing && queue.length) {
        call(queue.shift() as Callback);
    }
}

function identity(content: string) {
    return content;
}

async function call(callback: Callback): Promise<void> {
    await lock(() =>
        callback({
            run: async ({
                querySelector = '.yfm-latex',
                nodes,
                sanitize = identity,
                ...rest
            } = {}) => {
                const nodesList: Element[] = Array.from(
                    nodes || document.querySelectorAll(querySelector),
                );

                for (const element of nodesList) {
                    const content = attr(element, 'data-content');
                    const options = JSON.parse(attr(element, 'data-options') || '{}');

                    element.innerHTML = sanitize(
                        katex.renderToString(content, {
                            ...options,
                            ...rest,
                        }),
                    );
                }
            },
        } as ExposedAPI),
    );

    unqueue();
}

unqueue();
