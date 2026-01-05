define(["require", "exports", "partic2/pxprpcClient/registry", "partic2/pxprpcBinding/rpcregistry"], function (require, exports, registry_1, rpcregistry_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.defaultInvoker = exports.Invoker = void 0;
    exports.ensureDefaultInvoker = ensureDefaultInvoker;
    class Invoker {
        constructor() {
            this.RemoteName = 'AndroidHelper.IntentReceiver';
            this.rpc__RemoteFuncs = {};
        }
        async useClient(client) {
            this.rpc__client = client;
            this.rpc__RemoteFuncs = {};
        }
        async ensureFunc(name, typedecl) {
            return await (0, registry_1.getRpcFunctionOn)(this.rpc__client, this.RemoteName + '.' + name, typedecl);
        }
        async init() {
            let __v1 = await this.ensureFunc('init', '->');
            let __v2 = await __v1.call();
        }
        async close() {
            let __v1 = await this.ensureFunc('close', '->');
            let __v2 = await __v1.call();
        }
        async queueIntent(event, data) {
            let __v1 = await this.ensureFunc('queueIntent', 'sb->');
            let __v2 = await __v1.call(event, data);
        }
        async waitIntents(timeoutSec) {
            let __v1 = await this.ensureFunc('waitIntents', 'i->b');
            let __v2 = await __v1.call(timeoutSec);
            return __v2;
        }
        async eventDispatcher() {
            let __v1 = await this.ensureFunc('eventDispatcher', '->o');
            let __v2 = await __v1.call();
            return __v2;
        }
        async startListenEvent(action) {
            let __v1 = await this.ensureFunc('startListenEvent', 's->');
            let __v2 = await __v1.call(action);
        }
        async stopListenEvent(action) {
            let __v1 = await this.ensureFunc('stopListenEvent', 's->');
            let __v2 = await __v1.call(action);
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
//# sourceMappingURL=AndroidHelper__IntentReceiver.js.map