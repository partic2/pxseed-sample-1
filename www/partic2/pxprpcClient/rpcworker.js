define(["require", "exports", "pxprpc/backend", "pxprpc/base", "pxprpc/extend", "partic2/jsutils1/base", "../jsutils1/webutils"], function (require, exports, backend_1, base_1, extend_1, base_2, webutils_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.__internal__ = void 0;
    exports.reloadRpcWorker = reloadRpcWorker;
    const __name__ = base_2.requirejs.getLocalRequireModule(require);
    backend_1.WebMessage.bind(globalThis);
    let acceptedRpcConnection = new Set();
    new backend_1.WebMessage.Server((conn) => {
        acceptedRpcConnection.add(conn);
        //mute error
        new extend_1.RpcExtendServer1(new base_1.Server(conn)).serve().catch(() => { }).finally(() => acceptedRpcConnection.delete(conn));
    }).listen(__workerId);
    webutils_1.lifecycle.addEventListener('exit', () => {
        for (let t1 of acceptedRpcConnection) {
            t1.close();
        }
    });
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
    exports.__internal__ = {
        savedAsBootModules, loadRpcWorkerInitModule
    };
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