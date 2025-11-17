define(["require", "exports", "pxprpc/extend", "pxprpc/base", "pxprpc/backend", "partic2/jsutils1/base", "partic2/pxprpcClient/registry"], function (require, exports, extend_1, base_1, backend_1, base_2, registry_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.getRpc4XplatjJavaServer = getRpc4XplatjJavaServer;
    exports.getRpc4XplatjCServer = getRpc4XplatjCServer;
    let rpc4XplatjJavaServer = null;
    async function getAndInitRpcForPort(port) {
        let rpcClient = null;
        try {
            if (globalThis.process?.versions?.node != undefined) {
                let { PxprpcIoFromSocket } = await new Promise((resolve_1, reject_1) => { require(['partic2/nodehelper/nodeio'], resolve_1, reject_1); });
                let socket1 = new PxprpcIoFromSocket();
                await socket1.connect({ host: '127.0.0.1', port });
                rpcClient = new extend_1.RpcExtendClient1(new base_1.Client(socket1));
                await rpcClient.init();
            }
        }
        catch (err) {
            (0, base_2.throwIfAbortError)(err);
        }
        finally {
            rpc4XplatjCServer = null;
        }
        try {
            if (await (0, registry_1.getPersistentRegistered)(registry_1.ServerHostRpcName) != null) {
                let conn = await (0, registry_1.getConnectionFromUrl)(`iooverpxprpc:${registry_1.ServerHostRpcName}/${encodeURIComponent(`pxseedjs:partic2/nodehelper/nodeio.createIoPxseedJsUrl?type=tcp&port=${port}`)}`);
                (0, base_2.assert)(conn != null);
                rpcClient = new extend_1.RpcExtendClient1(new base_1.Client(conn));
                await rpcClient.init();
            }
        }
        catch (err) {
            (0, base_2.throwIfAbortError)(err);
        }
        finally {
            rpc4XplatjCServer = null;
        }
        if (rpcClient == null) {
            let wsurl = `${window.location.protocol.replace(/^http/, 'ws')}://${window.location.host}'/pxprpc/${port}`;
            rpcClient = new extend_1.RpcExtendClient1(new base_1.Client(await new backend_1.WebSocketIo().connect(wsurl)));
            await rpcClient.init();
        }
        return rpcClient;
    }
    async function getRpc4XplatjJavaServer() {
        if (rpc4XplatjJavaServer == null) {
            rpc4XplatjJavaServer = await getAndInitRpcForPort(2050);
        }
        return rpc4XplatjJavaServer;
    }
    let rpc4XplatjCServer = null;
    async function getRpc4XplatjCServer() {
        if (rpc4XplatjCServer == null) {
            rpc4XplatjCServer = await getAndInitRpcForPort(2048);
        }
        return rpc4XplatjCServer;
    }
});
//# sourceMappingURL=rpcregistry.js.map