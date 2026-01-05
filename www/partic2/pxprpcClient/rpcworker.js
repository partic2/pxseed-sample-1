define(["require", "exports", "pxprpc/backend", "pxprpc/base", "pxprpc/extend", "partic2/jsutils1/base"], function (require, exports, backend_1, base_1, extend_1, base_2) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.__internal__ = exports.rpcId = void 0;
    exports.getRpcClientConnectWorkerParent = getRpcClientConnectWorkerParent;
    exports.reloadRpcWorker = reloadRpcWorker;
    const __name__ = base_2.requirejs.getLocalRequireModule(require);
    //Security Vulnerable?. this value can be use to communicate cross-origin.
    exports.rpcId = new base_2.Ref2(globalThis.__workerId ?? (0, base_2.GenerateRandomString)(8));
    //If loaded in window.
    if (globalThis.window?.postMessage != undefined) {
        if (globalThis.window.opener != null) {
            backend_1.WebMessage.bind({
                postMessage: (data, opt) => globalThis.window.opener.postMessage(data, { targetOrigin: '*', ...opt }),
                addEventListener: () => { },
                removeEventListener: () => { }
            });
        }
        if (globalThis.window.parent != undefined && globalThis.window.self != globalThis.window.parent) {
            backend_1.WebMessage.bind({
                postMessage: (data, opt) => globalThis.window.parent.postMessage(data, { targetOrigin: '*', ...opt }),
                addEventListener: () => { },
                removeEventListener: () => { }
            });
        }
        backend_1.WebMessage.postMessageOptions.targetOrigin = '*';
    }
    if (globalThis.addEventListener != undefined || globalThis.postMessage != undefined) {
        let msgport = {
            addEventListener: () => { },
            removeEventListener: () => { },
            postMessage: () => { }
        };
        if (globalThis.addEventListener != undefined) {
            msgport.addEventListener = globalThis.addEventListener.bind(globalThis);
            msgport.removeEventListener = globalThis.removeEventListener.bind(globalThis);
        }
        if (globalThis.postMessage != undefined) {
            msgport.postMessage = globalThis.postMessage.bind(globalThis);
        }
        backend_1.WebMessage.bind(msgport);
    }
    let bootModules = new Set();
    //Save current loaded module as boot modules, which will not be 'undef' by reloadRpcWorker.
    //Only the last savedAsBootModules valid.
    async function savedAsBootModules() {
        Object.keys(await base_2.requirejs.getDefined()).forEach(modName => {
            bootModules.add(modName);
        });
    }
    exports.__internal__ = {
        savedAsBootModules, initRpcWorker,
        rpcServer: new backend_1.WebMessage.Server((conn) => new extend_1.RpcExtendServer1(new base_1.Server(conn)).serve().catch(() => { }))
    };
    exports.__internal__.rpcServer.listen(exports.rpcId.get());
    exports.rpcId.watch((r, prev) => {
        exports.__internal__.rpcServer.close();
        exports.__internal__.rpcServer.listen(exports.rpcId.get());
    });
    //Almost only used by './registry'
    let rpcWorkerInited = false;
    let workerParentRpcId = '';
    async function initRpcWorker(workerInitModule, workerParentRpcIdIn) {
        if (!rpcWorkerInited) {
            rpcWorkerInited = true;
            await Promise.allSettled(workerInitModule.map(v => new Promise((resolve_1, reject_1) => { require([v], resolve_1, reject_1); })));
            let { rpcWorkerInitModule } = await new Promise((resolve_2, reject_2) => { require(['./registry'], resolve_2, reject_2); });
            rpcWorkerInitModule.push(...workerInitModule);
            await savedAsBootModules();
        }
        if (workerParentRpcIdIn != undefined) {
            workerParentRpcId = workerParentRpcIdIn;
            let { __internal__ } = await new Promise((resolve_3, reject_3) => { require(['./registry'], resolve_3, reject_3); });
            __internal__.isPxseedWorker = true;
        }
    }
    let workerParentRpcClient = null;
    async function getRpcClientConnectWorkerParent(opt) {
        if (workerParentRpcId === '')
            return null;
        if (opt?.forceReconnect) {
            workerParentRpcClient = null;
        }
        if (workerParentRpcClient != null)
            return workerParentRpcClient;
        let wm = new backend_1.WebMessage.Connection();
        await wm.connect(workerParentRpcId, 3000);
        workerParentRpcClient = await new extend_1.RpcExtendClient1(new base_1.Client(wm)).init();
        return workerParentRpcClient;
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