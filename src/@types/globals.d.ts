import type {ExposedAPI} from '../types';

declare global {
    const PACKAGE: string;
    const RUNTIME: string[];

    interface Window {
        latexJsonp: Callback[];
    }

    type Callback = (exposed: ExposedAPI) => void | Promise<void>;
}
