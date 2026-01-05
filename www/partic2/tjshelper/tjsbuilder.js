//build tjs interface on supported platform
define(["require", "exports"], function (require, exports) {
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
        else if (globalThis.process?.versions?.node != undefined) {
            let tjsonnode = await new Promise((resolve_1, reject_1) => { require(['partic2/nodehelper/tjsadapt'], resolve_1, reject_1); });
            builtTjs = await tjsonnode.tjsFrom();
        }
        if (builtTjs == null) {
            try {
                let { getPersistentRegistered, ServerHostWorker1RpcName } = await new Promise((resolve_2, reject_2) => { require(['partic2/pxprpcClient/registry'], resolve_2, reject_2); });
                let rpc = await getPersistentRegistered(ServerHostWorker1RpcName);
                if (rpc != null) {
                    let { tjsFrom } = await new Promise((resolve_3, reject_3) => { require(['./tjsonjserpc'], resolve_3, reject_3); });
                    let { Invoker } = await new Promise((resolve_4, reject_4) => { require(['partic2/pxprpcBinding/JseHelper__JseIo'], resolve_4, reject_4); });
                    let inv = new Invoker();
                    await inv.useClient(await rpc.ensureConnected());
                    builtTjs = await tjsFrom(inv);
                }
            }
            catch (err) { }
            ;
        }
        if (builtTjs == null) {
            throw new Error('Unsupported platform');
        }
        return builtTjs;
    }
});
//# sourceMappingURL=tjsbuilder.js.map