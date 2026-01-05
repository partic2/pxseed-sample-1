define(["require", "exports", "partic2/pxprpcClient/registry", "partic2/pxprpcBinding/rpcregistry"], function (require, exports, registry_1, rpcregistry_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.defaultInvoker = exports.Invoker = void 0;
    exports.ensureDefaultInvoker = ensureDefaultInvoker;
    class Invoker {
        constructor() {
            this.RemoteName = 'AndroidHelper.MediaProjection';
            this.rpc__RemoteFuncs = {};
        }
        async useClient(client) {
            this.rpc__client = client;
            this.rpc__RemoteFuncs = {};
        }
        async ensureFunc(name, typedecl) {
            return await (0, registry_1.getRpcFunctionOn)(this.rpc__client, this.RemoteName + '.' + name, typedecl);
        }
        async mediaProjectionRequest(param, result) {
            let __v1 = await this.ensureFunc('mediaProjectionRequest', 'oo->c');
            let __v2 = await __v1.call(param, result);
            return __v2;
        }
        async startScreenCapture(sur) {
            let __v1 = await this.ensureFunc('startScreenCapture', 'o->');
            let __v2 = await __v1.call(sur);
        }
        async stopScreenCapture() {
            let __v1 = await this.ensureFunc('stopScreenCapture', '->');
            let __v2 = await __v1.call();
        }
        async takeScreenShot() {
            let __v1 = await this.ensureFunc('takeScreenShot', '->b');
            let __v2 = await __v1.call();
            return __v2;
        }
        async takeMainViewShot() {
            let __v1 = await this.ensureFunc('takeMainViewShot', '->b');
            let __v2 = await __v1.call();
            return __v2;
        }
        async requestScreenCapture() {
            let __v1 = await this.ensureFunc('requestScreenCapture', '->c');
            let __v2 = await __v1.call();
            return __v2;
        }
        async close() {
            let __v1 = await this.ensureFunc('close', '->');
            let __v2 = await __v1.call();
        }
    }
    exports.Invoker = Invoker;
    exports.defaultInvoker = null;
    async function ensureDefaultInvoker() {
        if (exports.defaultInvoker == null) {
            exports.defaultInvoker = new Invoker();
            exports.defaultInvoker.useClient(await (0, rpcregistry_1.getRpc4XplatjJavaServer)());
        }
    }
});
//# sourceMappingURL=AndroidHelper__MediaProjection.js.map