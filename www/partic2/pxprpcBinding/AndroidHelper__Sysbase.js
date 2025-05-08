define(["require", "exports", "./pxprpc_config"], function (require, exports, pxprpc_config_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Invoker = void 0;
    exports.getDefault = getDefault;
    class Invoker {
        constructor() {
            this.RemoteName = 'AndroidHelper.Sysbase';
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
        async newBroadcastReceiver() {
            let __v1 = await this.ensureFunc('newBroadcastReceiver', '->o');
            let __v2 = await __v1.call();
            return __v2;
        }
        async getDefaultContext() {
            let __v1 = await this.ensureFunc('getDefaultContext', '->o');
            let __v2 = await __v1.call();
            return __v2;
        }
        async registerBroadcastReceiver(receiver, filter) {
            let __v1 = await this.ensureFunc('registerBroadcastReceiver', 'os->');
            let __v2 = await __v1.call(receiver, filter);
        }
        async unregisterBroadcastReceiver(receiver) {
            let __v1 = await this.ensureFunc('unregisterBroadcastReceiver', 'o->');
            let __v2 = await __v1.call(receiver);
        }
        async getService(name) {
            let __v1 = await this.ensureFunc('getService', 's->o');
            let __v2 = await __v1.call(name);
            return __v2;
        }
        async newUUID(mostSigBits, leastSigBits) {
            let __v1 = await this.ensureFunc('newUUID', 'll->o');
            let __v2 = await __v1.call(mostSigBits, leastSigBits);
            return __v2;
        }
        async requestExit() {
            let __v1 = await this.ensureFunc('requestExit', '->');
            let __v2 = await __v1.call();
        }
        async deviceInfo() {
            let __v1 = await this.ensureFunc('deviceInfo', '->b');
            let __v2 = await __v1.call();
            return __v2;
        }
        async getMemoryInfo() {
            let __v1 = await this.ensureFunc('getMemoryInfo', '->lllc');
            let __v2 = await __v1.call();
            return __v2;
        }
        async getDataDir() {
            let __v1 = await this.ensureFunc('getDataDir', '->s');
            let __v2 = await __v1.call();
            return __v2;
        }
        async getHostPackageName() {
            let __v1 = await this.ensureFunc('getHostPackageName', '->s');
            let __v2 = await __v1.call();
            return __v2;
        }
        async dumpBundle(b) {
            let __v1 = await this.ensureFunc('dumpBundle', 'o->b');
            let __v2 = await __v1.call(b);
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
//# sourceMappingURL=AndroidHelper__Sysbase.js.map