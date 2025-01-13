define(["require", "exports", "./pxprpc_config"], function (require, exports, pxprpc_config_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Invoker = void 0;
    exports.getDefault = getDefault;
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
            let __v1 = this.rpc__RemoteFuncs[name];
            if (__v1 == undefined) {
                __v1 = await this.rpc__client.getFunc(this.RemoteName + '.' + name);
                this.rpc__RemoteFuncs[name] = __v1;
                __v1.typedecl(typedecl);
            }
            return __v1;
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
    let defaultInvoker = null;
    async function getDefault() {
        if (defaultInvoker === null) {
            defaultInvoker = new Invoker();
            await defaultInvoker.useClient(await (0, pxprpc_config_1.getDefaultClient)());
        }
        return defaultInvoker;
    }
});
//# sourceMappingURL=AndroidHelper__DisplayManager.js.map