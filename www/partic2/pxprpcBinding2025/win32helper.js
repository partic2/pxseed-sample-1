define(["require", "exports", "pxprpc/extend", "partic2/pxprpcClient/registry", "partic2/pxprpcBinding/rpcregistry"], function (require, exports, extend_1, registry_1, rpcregistry_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.defaultInvoker = exports.Invoker = void 0;
    exports.ensureDefaultInvoker = ensureDefaultInvoker;
    class Invoker {
        constructor() {
            this.rpc__RemoteFuncs = {};
        }
        async useClient(client) {
            this.rpc__client = client;
            this.rpc__RemoteFuncs = {};
        }
        async TakeScreenShot(memchunk) {
            let __v1 = await (0, registry_1.getRpcFunctionOn)(this.rpc__client, 'pxprpc_win32helpers.TakeScreenShot', 'o->i');
            let __v2 = await __v1.call(memchunk);
            return __v2;
        }
        async GetKeyState(keys) {
            let __v1 = await (0, registry_1.getRpcFunctionOn)(this.rpc__client, 'pxprpc_win32helpers.GetKeyState', 'b->b');
            let t1 = new Uint8Array(keys);
            let __v2 = await __v1.call(t1);
            return __v2;
        }
        async CreateKeyboardEventListener() {
            let __v1 = await (0, registry_1.getRpcFunctionOn)(this.rpc__client, 'pxprpc_win32helpers.CreateKeyboardEventListener', '->o');
            let __v2 = await __v1.call();
            return __v2;
        }
        async PullKeyboardEvent(listener) {
            let __v1 = await (0, registry_1.getRpcFunctionOn)(this.rpc__client, 'pxprpc_win32helpers.PullKeyboardEvent', 'o->i');
            let __v2 = await __v1.call(listener);
            return __v2;
        }
        async EnumWindows() {
            let __v1 = await (0, registry_1.getRpcFunctionOn)(this.rpc__client, 'pxprpc_win32helpers.EnumWindows', '->b');
            let __v2 = await __v1.call();
            let t1 = new extend_1.TableSerializer().load(__v2);
            return t1.toMapArray();
        }
        async SetWindowZIndex(hwnd, pos) {
            let __v1 = await (0, registry_1.getRpcFunctionOn)(this.rpc__client, 'pxprpc_win32helpers.SetWindowZIndex', 'ls->');
            let __v2 = await __v1.call(hwnd, pos);
            return;
        }
    }
    exports.Invoker = Invoker;
    exports.defaultInvoker = null;
    async function ensureDefaultInvoker() {
        if (exports.defaultInvoker == null) {
            exports.defaultInvoker = new Invoker();
            exports.defaultInvoker.useClient(await (0, rpcregistry_1.getRpc4XplatjCServer)());
        }
    }
});
//# sourceMappingURL=win32helper.js.map