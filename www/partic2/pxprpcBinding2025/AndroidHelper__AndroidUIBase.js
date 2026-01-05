define(["require", "exports", "partic2/pxprpcClient/registry", "partic2/pxprpcBinding/rpcregistry"], function (require, exports, registry_1, rpcregistry_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.defaultInvoker = exports.Invoker = void 0;
    exports.ensureDefaultInvoker = ensureDefaultInvoker;
    class Invoker {
        constructor() {
            this.RemoteName = 'AndroidHelper.AndroidUIBase';
            this.rpc__RemoteFuncs = {};
        }
        async useClient(client) {
            this.rpc__client = client;
            this.rpc__RemoteFuncs = {};
        }
        async ensureFunc(name, typedecl) {
            return await (0, registry_1.getRpcFunctionOn)(this.rpc__client, this.RemoteName + '.' + name, typedecl);
        }
        async dispatchKeyEvent(action, code) {
            let __v1 = await this.ensureFunc('dispatchKeyEvent', 'ii->');
            let __v2 = await __v1.call(action, code);
        }
        async close() {
            let __v1 = await this.ensureFunc('close', '->');
            let __v2 = await __v1.call();
        }
        async indexOf(arr, val) {
            let __v1 = await this.ensureFunc('indexOf', 'oo->i');
            let __v2 = await __v1.call(arr, val);
            return __v2;
        }
        async createTouchPointer(init) {
            let __v1 = await this.ensureFunc('createTouchPointer', 'b->o');
            let __v2 = await __v1.call(init);
            return __v2;
        }
        async dispatchTouchEvent(action, touchPointers) {
            let __v1 = await this.ensureFunc('dispatchTouchEvent', 'io->');
            let __v2 = await __v1.call(action, touchPointers);
        }
        async webViewSetStartScript(script) {
            let __v1 = await this.ensureFunc('webViewSetStartScript', 's->');
            let __v2 = await __v1.call(script);
        }
        async webViewRunJs(script) {
            let __v1 = await this.ensureFunc('webViewRunJs', 's->');
            let __v2 = await __v1.call(script);
        }
        async getCurrentMainContent() {
            let __v1 = await this.ensureFunc('getCurrentMainContent', '->o');
            let __v2 = await __v1.call();
            return __v2;
        }
        async dialogEvent() {
            let __v1 = await this.ensureFunc('dialogEvent', '->o');
            let __v2 = await __v1.call();
            return __v2;
        }
        async dialogSet(dialog, msg, show) {
            let __v1 = await this.ensureFunc('dialogSet', 'osc->');
            let __v2 = await __v1.call(dialog, msg, show);
        }
        async dialogGet(dialog) {
            let __v1 = await this.ensureFunc('dialogGet', 'o->c');
            let __v2 = await __v1.call(dialog);
            return __v2;
        }
        async dialogNew(btn1, id1, btn2, id2) {
            let __v1 = await this.ensureFunc('dialogNew', 'ssss->');
            let __v2 = await __v1.call(btn1, id1, btn2, id2);
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
//# sourceMappingURL=AndroidHelper__AndroidUIBase.js.map