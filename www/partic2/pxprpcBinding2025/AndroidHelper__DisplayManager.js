define(["require", "exports", "partic2/pxprpcClient/registry", "partic2/pxprpcBinding/rpcregistry"], function (require, exports, registry_1, rpcregistry_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.defaultInvoker = exports.Invoker = void 0;
    exports.ensureDefaultInvoker = ensureDefaultInvoker;
    class Invoker {
        constructor() {
            this.RemoteName = 'AndroidHelper.DisplayManager';
            this.rpc__RemoteFuncs = {};
        }
        async useClient(client) {
            this.rpc__client = client;
            this.rpc__RemoteFuncs = {};
        }
        async ensureFunc(name, typedecl) {
            return await (0, registry_1.getRpcFunctionOn)(this.rpc__client, this.RemoteName + '.' + name, typedecl);
        }
        async listDisplayStaticConst() {
            let __v1 = await this.ensureFunc('listDisplayStaticConst', '->b');
            let __v2 = await __v1.call();
            return __v2;
        }
        async getDevicesInfo() {
            let __v1 = await this.ensureFunc('getDevicesInfo', '->b');
            let __v2 = await __v1.call();
            return __v2;
        }
        async getCurrentDisplaySize() {
            let __v1 = await this.ensureFunc('getCurrentDisplaySize', '->ii');
            let __v2 = await __v1.call();
            return __v2;
        }
        async getCurrentDisplayDevice() {
            let __v1 = await this.ensureFunc('getCurrentDisplayDevice', '->i');
            let __v2 = await __v1.call();
            return __v2;
        }
        async viewReadPixels(v) {
            let __v1 = await this.ensureFunc('viewReadPixels', 'o->o');
            let __v2 = await __v1.call(v);
            return __v2;
        }
        async getCurrentMainView() {
            let __v1 = await this.ensureFunc('getCurrentMainView', '->o');
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
//# sourceMappingURL=AndroidHelper__DisplayManager.js.map