define(["require", "exports", "partic2/pxprpcClient/registry", "partic2/pxprpcBinding/rpcregistry"], function (require, exports, registry_1, rpcregistry_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.defaultInvoker = exports.Invoker = void 0;
    exports.ensureDefaultInvoker = ensureDefaultInvoker;
    class Invoker {
        constructor() {
            this.RemoteName = 'AndroidHelper.PrivilegeMisc';
            this.rpc__RemoteFuncs = {};
        }
        async useClient(client) {
            this.rpc__client = client;
            this.rpc__RemoteFuncs = {};
        }
        async ensureFunc(name, typedecl) {
            return await (0, registry_1.getRpcFunctionOn)(this.rpc__client, this.RemoteName + '.' + name, typedecl);
        }
        async isRooted() {
            let __v1 = await this.ensureFunc('isRooted', '->c');
            let __v2 = await __v1.call();
            return __v2;
        }
        async toggleScreen() {
            let __v1 = await this.ensureFunc('toggleScreen', '->');
            let __v2 = await __v1.call();
        }
        async tryUnlockScreen() {
            let __v1 = await this.ensureFunc('tryUnlockScreen', '->');
            let __v2 = await __v1.call();
        }
        async inputKeyEvent(keycode) {
            let __v1 = await this.ensureFunc('inputKeyEvent', 'i->');
            let __v2 = await __v1.call(keycode);
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
//# sourceMappingURL=AndroidHelper__PrivilegeMisc.js.map