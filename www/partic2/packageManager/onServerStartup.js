define(["require", "exports", "partic2/pxprpcClient/registry"], function (require, exports, registry_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.__inited__ = void 0;
    exports.__inited__ = (async () => {
        let client1 = await (await (0, registry_1.getPersistentRegistered)(registry_1.ServerHostWorker1RpcName)).ensureConnected();
        await (0, registry_1.easyCallRemoteJsonFunction)(client1, 'partic2/packageManager/registry', 'sendOnStartupEventForAllPackages', []);
    })();
});
//# sourceMappingURL=onServerStartup.js.map