define(["require", "exports", "pxprpc/extend", "pxprpc/base", "partic2/jsutils1/base", "partic2/tjshelper/tjsbuilder", "partic2/tjshelper/tjsutil"], function (require, exports, extend_1, base_1, base_2, tjsbuilder_1, tjsutil_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.getRpc4RuntimeBridge0 = getRpc4RuntimeBridge0;
    exports.getRpc4RuntimeBridgeJava0 = getRpc4RuntimeBridgeJava0;
    let pxseedLoaderRuntimeBridge0Client = null;
    async function getRpc4RuntimeBridge0() {
        if (pxseedLoaderRuntimeBridge0Client == null || !pxseedLoaderRuntimeBridge0Client.baseClient.isRunning()) {
            if (globalThis.__pxprpc4tjs__ != undefined) {
                let { PxprpcRtbIo } = await new Promise((resolve_1, reject_1) => { require(['partic2/tjshelper/tjsenv'], resolve_1, reject_1); });
                let io1 = await PxprpcRtbIo.connect('/pxprpc/runtime_bridge/0');
                (0, base_2.assert)(io1 != null, 'pxprpc runtimebridge connect failed.');
                pxseedLoaderRuntimeBridge0Client = await new extend_1.RpcExtendClient1(new base_1.Client(io1)).init();
            }
            else {
                let tjs = await (0, tjsbuilder_1.buildTjs)();
                let conn = await tjs.connect('tcp', '127.0.0.1', 2048);
                let io1 = new tjsutil_1.PxprpcIoFromTjsStream(conn, conn, conn);
                pxseedLoaderRuntimeBridge0Client = await new extend_1.RpcExtendClient1(new base_1.Client(io1)).init();
            }
        }
        return pxseedLoaderRuntimeBridge0Client;
    }
    let pxseedLoaderRuntimeBridgeJava0Client = null;
    async function getRpc4RuntimeBridgeJava0() {
        if (pxseedLoaderRuntimeBridgeJava0Client == null || !pxseedLoaderRuntimeBridgeJava0Client.baseClient.isRunning()) {
            if (globalThis.__pxprpc4tjs__ != undefined) {
                let { PxprpcRtbIo } = await new Promise((resolve_2, reject_2) => { require(['partic2/tjshelper/tjsenv'], resolve_2, reject_2); });
                let io1 = await PxprpcRtbIo.connect('/pxprpc/runtime_bridge/java/0');
                (0, base_2.assert)(io1 != null, 'pxprpc runtimebridge connect failed.');
                pxseedLoaderRuntimeBridgeJava0Client = await new extend_1.RpcExtendClient1(new base_1.Client(io1)).init();
            }
            else {
                let tjs = await (0, tjsbuilder_1.buildTjs)();
                let conn = await tjs.connect('tcp', '127.0.0.1', 2050);
                let io1 = new tjsutil_1.PxprpcIoFromTjsStream(conn, conn, conn);
                pxseedLoaderRuntimeBridgeJava0Client = await new extend_1.RpcExtendClient1(new base_1.Client(io1)).init();
            }
        }
        return pxseedLoaderRuntimeBridgeJava0Client;
    }
});
//# sourceMappingURL=rpcregistry.js.map