import * as Comlink from "comlink";
import { executeJq } from "../shared/jq";
import { executeHttp } from "../shared/http";

const worker = {
    jq: executeJq,
    http: executeHttp,
};

Comlink.expose(worker);
export type WorkerInterface = typeof worker;
