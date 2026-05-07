define("partic2/pxprpcBinding/rpcregistry", ["require", "exports", "pxprpc/extend", "pxprpc/base", "partic2/jsutils1/base", "pxprpc/backend"], function (require, exports, extend_1, base_1, base_2, backend_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.runtimeBridgeConnector = void 0;
    exports.getRpcConnectedToRuntimeBridge = getRpcConnectedToRuntimeBridge;
    exports.getRpc4RuntimeBridge0 = getRpc4RuntimeBridge0;
    exports.getRpc4RuntimeBridgeJava0 = getRpc4RuntimeBridgeJava0;
    let __name__ = 'partic2/pxprpcBinding/rpcregistry';
    let connectedRpcToRuntimeBridge = {};
    exports.runtimeBridgeConnector = new Array();
    exports.runtimeBridgeConnector.push({ name: __name__ + '.runtimeBridgeDefaultConnector', connect: async (path) => {
            if (globalThis.__pxprpc4tjs__ != undefined) {
                let { PxprpcRtbIo } = await new Promise((resolve_1, reject_1) => { require(['partic2/tjshelper/tjsenv'], resolve_1, reject_1); });
                return await PxprpcRtbIo.connect(path);
            }
            else {
                return null;
            }
        } });
    exports.runtimeBridgeConnector.push({ name: __name__ + '.runtimeBridgePxseedLoaderWebuiConnector', connect: async (path) => {
            let webutils = await new Promise((resolve_2, reject_2) => { require(['partic2/jsutils1/webutils'], resolve_2, reject_2); });
            let wwwroot = webutils.getWWWRoot();
            if (wwwroot.startsWith('http:') || wwwroot.startsWith('https:')) {
                let config = await webutils.GetPersistentConfig('pxseedServer2023/webentry');
                let key = config.pxprpcKey ?? '';
                try {
                    let io1 = await new backend_1.WebSocketIo().connect(webutils.path.join(wwwroot, '..', 'pxprpc', 'runtime_bridge') + '?key=' + key);
                    try {
                        await io1.send([new TextEncoder().encode(path)]);
                        let result = new TextDecoder().decode(await io1.receive());
                        if (result == 'connected') {
                            return io1;
                        }
                        io1.close();
                    }
                    catch (err) {
                        io1.close();
                        (0, base_2.throwIfAbortError)(err);
                    }
                }
                catch (err) {
                    (0, base_2.throwIfAbortError)(err);
                }
            }
            return null;
        } });
    async function getRpcConnectedToRuntimeBridge(path) {
        if (connectedRpcToRuntimeBridge[path] == undefined || !connectedRpcToRuntimeBridge[path].baseClient.isRunning()) {
            if (connectedRpcToRuntimeBridge[path] == undefined) {
                for (let t1 of exports.runtimeBridgeConnector) {
                    try {
                        let io1 = await t1.connect(path);
                        if (io1 != null) {
                            connectedRpcToRuntimeBridge[path] = await new extend_1.RpcExtendClient1(new base_1.Client(io1)).init();
                            break;
                        }
                    }
                    catch (err) {
                        (0, base_2.throwIfAbortError)(err);
                    }
                }
            }
            (0, base_2.assert)(connectedRpcToRuntimeBridge[path] != undefined, 'pxprpc runtimebridge connect failed.');
        }
        return connectedRpcToRuntimeBridge[path];
    }
    async function getRpc4RuntimeBridge0() {
        return getRpcConnectedToRuntimeBridge('/pxprpc/runtime_bridge/0');
    }
    async function getRpc4RuntimeBridgeJava0() {
        return getRpcConnectedToRuntimeBridge('/pxprpc/runtime_bridge/java/0');
    }
});
