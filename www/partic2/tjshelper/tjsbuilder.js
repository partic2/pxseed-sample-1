//build tjs interface on supported platform
define(["require", "exports", "partic2/pxprpcClient/registry"], function (require, exports, registry_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.buildTjs = buildTjs;
    let builtTjs = null;
    async function buildTjs() {
        if (builtTjs != null) {
            return builtTjs;
        }
        if (globalThis.tjs != undefined) {
            builtTjs = globalThis.tjs;
        }
        else if (globalThis.process?.versions.node != undefined) {
            let tjsonnode = await new Promise((resolve_1, reject_1) => { require(['partic2/nodehelper/tjsadapt'], resolve_1, reject_1); });
            builtTjs = await tjsonnode.tjsFrom();
        }
        else {
            let rpc = await (0, registry_1.getPersistentRegistered)(registry_1.ServerHostWorker1RpcName);
            if (rpc != null) {
                let { tjsFrom } = await new Promise((resolve_2, reject_2) => { require(['./tjsonjserpc'], resolve_2, reject_2); });
                let { Invoker } = await new Promise((resolve_3, reject_3) => { require(['partic2/pxprpcBinding/JseHelper__JseIo'], resolve_3, reject_3); });
                let inv = new Invoker();
                await inv.useClient(await rpc.ensureConnected());
                builtTjs = await tjsFrom(inv);
            }
        }
        if (builtTjs == null) {
            throw new Error('Unsupported platform');
        }
        return builtTjs;
    }
});
//# sourceMappingURL=tjsbuilder.js.map