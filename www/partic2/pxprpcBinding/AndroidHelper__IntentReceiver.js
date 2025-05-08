define(["require", "exports", "./pxprpc_config"], function (require, exports, pxprpc_config_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Invoker = void 0;
    exports.getDefault = getDefault;
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
            let __v1 = this.rpc__RemoteFuncs[name];
            if (__v1 == undefined) {
                __v1 = await this.rpc__client.getFunc(this.RemoteName + '.' + name);
                this.rpc__RemoteFuncs[name] = __v1;
                __v1.typedecl(typedecl);
            }
            return __v1;
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
    let defaultInvoker = null;
    async function getDefault() {
        if (defaultInvoker === null) {
            defaultInvoker = new Invoker();
            await defaultInvoker.useClient(await (0, pxprpc_config_1.getDefaultClient)());
        }
        return defaultInvoker;
    }
});
//# sourceMappingURL=AndroidHelper__IntentReceiver.js.map