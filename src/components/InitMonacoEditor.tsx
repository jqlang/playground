import { loader } from '@monaco-editor/react';

let monacoConfigured = false;

export const InitMonacoEditor = async () => {
    if (!monacoConfigured) {
        if (typeof window !== 'undefined') {
            // Use self-hosted pre-built Monaco files (copied from node_modules/monaco-editor/min/vs)
            // Workers need absolute URLs, so we construct from window.location.origin
            loader.config({
                paths: {
                    vs: `${window.location.origin}/monaco-editor/min/vs`
                }
            });
            monacoConfigured = true;
        }
    }
};
