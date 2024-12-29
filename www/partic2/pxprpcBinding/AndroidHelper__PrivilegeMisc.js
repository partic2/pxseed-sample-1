define(["require", "exports", "./pxprpc_config"], function (require, exports, pxprpc_config_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Invoker = void 0;
    exports.getDefault = getDefault;
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
            let __v1 = this.rpc__RemoteFuncs[name];
            if (__v1 == undefined) {
                __v1 = await this.rpc__client.getFunc(this.RemoteName + '.' + name);
                this.rpc__RemoteFuncs[name] = __v1;
                __v1.typedecl(typedecl);
            }
            return __v1;
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
    let defaultInvoker = null;
    async function getDefault() {
        if (defaultInvoker === null) {
            defaultInvoker = new Invoker();
            await defaultInvoker.useClient(await (0, pxprpc_config_1.getDefaultClient)());
        }
        return defaultInvoker;
    }
});
//# sourceMappingURL=AndroidHelper__PrivilegeMisc.js.map