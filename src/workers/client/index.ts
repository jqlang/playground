import * as Comlink from "comlink";
import type { WorkerInterface } from "./entry";
import { executeJq } from "../shared/jq";
import { executeHttp } from "../shared/http";
import { Snippet, SnippetType } from "@/schemas";

export class JQWorker {
    #worker: Comlink.Remote<WorkerInterface> | null = null;
    #webWorker: Worker | null = null;
    #timeout: number;

    constructor(timeout: number) {
        this.#timeout = timeout;

        // Check if the browser supports Web Workers
        if (window.Worker) {
            this.initializeWorker();
        } else {
            console.warn("Web Workers are not supported in this environment. Falling back to main thread.");
        }
    }

    private initializeWorker(): void {
        try {
            this.#webWorker = new Worker(new URL("/src/workers/client/entry.ts", import.meta.url), { type: "module" });
            this.#worker = Comlink.wrap<WorkerInterface>(this.#webWorker);
        } catch (error) {
            console.error("Failed to initialize Web Worker:", error);
        }
    }

    async run(input: SnippetType): Promise<string> {
        // Validate input using Zod
        const validatedInput = Snippet.parse(input);
        const timeoutPromise = this.createTimeoutPromise();

        let resultPromise: Promise<string>;
        if (this.#worker) {
            resultPromise = this.runWithWorker(validatedInput);
        } else {
            resultPromise = this.runWithoutWorker(validatedInput);
        }

        return Promise.race([resultPromise, timeoutPromise]);
    }

    private createTimeoutPromise(): Promise<never> {
        return new Promise<never>((_, reject) => {
            setTimeout(() => {
                this.terminate();
                reject(new Error('Operation timed out'));
            }, this.#timeout);
        });
    }

    private runWithWorker(input: SnippetType): Promise<string> {
        if (input.http) {
            return this.#worker!.http(input.http, input.query, input.options);
        } else {
            return this.#worker!.jq(input.json!, input.query, input.options);
        }
    }

    private runWithoutWorker(input: SnippetType): Promise<string> {
        if (input.http) {
            return executeHttp(input.http, input.query, input.options);
        } else {
            return executeJq(input.json!, input.query, input.options);
        }
    }

    terminate(): void {
        if (this.#webWorker) {
            this.#webWorker.terminate();
            this.#webWorker = null;
            this.#worker = null;
        }
    }
}
