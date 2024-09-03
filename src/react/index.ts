import type {RunOptions} from '../types';

import {useCallback, useEffect, useState} from 'react';

export type RuntimeOptions = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError?: (error: any) => void;
};

export function LatexRuntime(props: RunOptions & RuntimeOptions) {
    const renderLatex = useLatex();

    useEffect(() => {
        renderLatex(props).catch(props.onError || (() => {}));
    });

    return null;
}

export function useLatex() {
    const [latex, setLatex] = useState<Parameters<Callback>[0] | null>(null);
    const render = useCallback(
        async (options?: RunOptions) => {
            if (latex) {
                return latex.run(options);
            }
        },
        [latex],
    );

    useEffect(() => {
        (window.latexJsonp = window.latexJsonp || []).push(setLatex);

        return () => {
            const index = window.latexJsonp.indexOf(setLatex);
            if (index > -1) {
                window.latexJsonp.splice(index, 1);
            }
        };
    }, []);

    return render;
}
