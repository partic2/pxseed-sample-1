define(["require", "exports", "./tjsenv"], function (require, exports, tjsenv_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    const WorkerThreadMessageMark = '__messageMark_WorkerThread';
    async function afterPostMessageSetup() {
        if (!('close' in globalThis)) {
            globalThis.close = () => { throw new Error('Not implemented'); };
        }
        await tjsenv_1.__inited__;
        await new Promise((resolve_1, reject_1) => { require(['partic2/jsutils1/workerentry'], resolve_1, reject_1); });
    }
    if (globalThis.__PRTBParentPipeServerId != undefined) {
        let parentPipeId = globalThis.__PRTBParentPipeServerId;
        delete globalThis.__PRTBParentPipeServerId;
        (async () => {
            try {
                let conn = await tjsenv_1.PxprpcRtbIo.connect(parentPipeId);
                await conn.send([new TextEncoder().encode(globalThis.__workerId)]);
                globalThis.postMessage = function (msg) {
                    let bin = tjs.engine.serialize(msg);
                    conn.send([bin]);
                };
                afterPostMessageSetup();
                try {
                    while (true) {
                        let msg = await conn.receive();
                        let data = tjs.engine.deserialize(msg);
                        globalThis.dispatchEvent(new MessageEvent('message', { data }));
                    }
                }
                catch (err) {
                    conn = null;
                }
            }
            catch (err) {
            }
        })();
    }
    else if (globalThis.postMessage != undefined) {
        afterPostMessageSetup();
    }
});
//# sourceMappingURL=workerentry.js.map