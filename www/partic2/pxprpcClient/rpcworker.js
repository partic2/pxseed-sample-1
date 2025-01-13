define(["require", "exports", "pxprpc/backend", "pxprpc/base", "pxprpc/extend", "partic2/jsutils1/base"], function (require, exports, backend_1, base_1, extend_1, base_2) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.savedAsBootModules = savedAsBootModules;
    exports.loadRpcWorkerInitModule = loadRpcWorkerInitModule;
    exports.reloadRpcWorker = reloadRpcWorker;
    const __name__ = base_2.requirejs.getLocalRequireModule(require);
    backend_1.WebMessage.bind(globalThis);
    new backend_1.WebMessage.Server((conn) => {
        //mute error
        new extend_1.RpcExtendServer1(new base_1.Server(conn)).serve().catch(() => { });
    }).listen(__workerId);
    let bootModules = new Set();
    //Save current loaded module as boot modules, which will not be 'undef' by reloadRpcWorker.
    //This function will be called automatically in loadRpcWorkerInitModule.
    //Only the last savedAsBootModules valid.
    async function savedAsBootModules() {
        Object.keys(await base_2.requirejs.getDefined()).forEach(modName => {
            bootModules.add(modName);
        });
    }
    //Almost only used by './registry'
    let rpcWorkerInited = false;
    async function loadRpcWorkerInitModule(workerInitModule) {
        if (!rpcWorkerInited) {
            rpcWorkerInited = true;
            await Promise.allSettled(workerInitModule.map(v => new Promise((resolve_1, reject_1) => { require([v], resolve_1, reject_1); })));
            let { rpcWorkerInitModule } = await new Promise((resolve_2, reject_2) => { require(['./registry'], resolve_2, reject_2); });
            rpcWorkerInitModule.push(...workerInitModule);
            await savedAsBootModules();
        }
    }
    async function reloadRpcWorker() {
        //unload all modules that can be unloaded. In other words, exclude the modules in bootModules
        for (let mod in await base_2.requirejs.getDefined()) {
            if (!bootModules.has(mod)) {
                await base_2.requirejs.undef(mod);
            }
        }
    }
});
//# sourceMappingURL=rpcworker.js.map