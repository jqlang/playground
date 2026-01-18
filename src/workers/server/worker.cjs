const jq = require('jq-wasm');

module.exports = async function({ json, query, options }) {
    const { stdout, stderr } = await jq.raw(json, query, options ?? undefined);
    return stdout + (stderr ? (stdout.length ? "\n" + stderr : stderr) : "");
};
