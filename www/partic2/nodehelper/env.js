define(["require", "exports", "./kvdb", "./worker", "./jseio", "partic2/jsutils1/base", "partic2/pxprpcClient/registry"], function (require, exports, kvdb_1, worker_1, jseio_1, base_1, registry_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.setupEnv = setupEnv;
    function setupEnv() {
        (0, kvdb_1.setupImpl)();
        (0, worker_1.setupImpl)();
        (0, jseio_1.setup)();
        if (globalThis.open == undefined) {
            globalThis.open = (async (url, target) => {
                let jscode = '';
                if (url.startsWith('http://') || url.startsWith('https://')) {
                    let resp = await fetch(url);
                    if (resp.ok) {
                        jscode = await resp.text();
                    }
                    else {
                        throw new Error(await resp.text());
                    }
                }
                else if (url.startsWith('file://')) {
                    let path = url.substring(7);
                    let os = await new Promise((resolve_1, reject_1) => { require(['os'], resolve_1, reject_1); });
                    if (os.platform() === 'win32') {
                        path = path.substring(1);
                    }
                    let fs = await new Promise((resolve_2, reject_2) => { require(['fs/promises'], resolve_2, reject_2); });
                    jscode = new TextDecoder().decode(await fs.readFile(path));
                }
                if (target == '_self') {
                    new Function(jscode)();
                }
                else {
                    if (target == '_blank' || target == undefined) {
                        target = (0, base_1.GenerateRandomString)();
                    }
                    let worker = new registry_1.RpcWorker(target);
                    let workerClient = await worker.ensureClient();
                    let workerFuncs = await (0, registry_1.getAttachedRemoteRigstryFunction)(workerClient);
                    await workerFuncs.jsExec(`new Function(${JSON.stringify(jscode)})();`, null);
                }
            });
        }
    }
});
//# sourceMappingURL=env.js.map