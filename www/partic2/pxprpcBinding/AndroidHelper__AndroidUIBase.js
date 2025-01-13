define(["require", "exports", "./pxprpc_config"], function (require, exports, pxprpc_config_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Invoker = void 0;
    exports.getDefault = getDefault;
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
            let __v1 = this.rpc__RemoteFuncs[name];
            if (__v1 == undefined) {
                __v1 = await this.rpc__client.getFunc(this.RemoteName + '.' + name);
                this.rpc__RemoteFuncs[name] = __v1;
                __v1.typedecl(typedecl);
            }
            return __v1;
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
    let defaultInvoker = null;
    async function getDefault() {
        if (defaultInvoker === null) {
            defaultInvoker = new Invoker();
            await defaultInvoker.useClient(await (0, pxprpc_config_1.getDefaultClient)());
        }
        return defaultInvoker;
    }
});
//# sourceMappingURL=AndroidHelper__AndroidUIBase.js.map