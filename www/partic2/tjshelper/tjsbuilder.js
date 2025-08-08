//build tjs interface on supported platform
define(["require", "exports", "partic2/pxprpcClient/registry", "pxprpc/backend"], function (require, exports, registry_1, backend_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.XplatjDefaultRpcName = void 0;
    exports.buildTjs = buildTjs;
    let builtTjs = null;
    exports.XplatjDefaultRpcName = 'xplatj pxprpc 2050';
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
                let rpc = await (0, registry_1.getPersistentRegistered)(registry_1.ServerHostWorker1RpcName);
                if (rpc != null) {
                    let { tjsFrom } = await new Promise((resolve_2, reject_2) => { require(['./tjsonjserpc'], resolve_2, reject_2); });
                    let { Invoker } = await new Promise((resolve_3, reject_3) => { require(['partic2/pxprpcBinding/JseHelper__JseIo'], resolve_3, reject_3); });
                    let inv = new Invoker();
                    await inv.useClient(await rpc.ensureConnected());
                    builtTjs = await tjsFrom(inv);
                }
            }
            catch (err) { }
            ;
        }
        if (builtTjs == null && globalThis.location != undefined) {
            let rpc = await (0, registry_1.getPersistentRegistered)(exports.XplatjDefaultRpcName);
            if (rpc == null) {
                try {
                    let wsio = new backend_1.WebSocketIo();
                    let protocol = globalThis.location.protocol.replace(/^http/, 'ws');
                    let { host, port } = globalThis.location;
                    let url = `${protocol}//${host}/pxprpc/2050`;
                    await wsio.connect(url);
                    wsio.close();
                    rpc = await (0, registry_1.addClient)(url, exports.XplatjDefaultRpcName);
                }
                catch (err) { }
            }
            if (rpc != null) {
                let { tjsFrom } = await new Promise((resolve_4, reject_4) => { require(['./tjsonjserpc'], resolve_4, reject_4); });
                let { Invoker } = await new Promise((resolve_5, reject_5) => { require(['partic2/pxprpcBinding/JseHelper__JseIo'], resolve_5, reject_5); });
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