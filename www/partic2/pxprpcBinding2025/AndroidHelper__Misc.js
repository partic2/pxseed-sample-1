define(["require", "exports", "partic2/pxprpcClient/registry", "partic2/pxprpcBinding/rpcregistry"], function (require, exports, registry_1, rpcregistry_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.defaultInvoker = exports.Invoker = void 0;
    exports.ensureDefaultInvoker = ensureDefaultInvoker;
    class Invoker {
        constructor() {
            this.RemoteName = 'AndroidHelper.Misc';
            this.rpc__RemoteFuncs = {};
        }
        async useClient(client) {
            this.rpc__client = client;
            this.rpc__RemoteFuncs = {};
        }
        async ensureFunc(name, typedecl) {
            return await (0, registry_1.getRpcFunctionOn)(this.rpc__client, this.RemoteName + '.' + name, typedecl);
        }
        async close() {
            let __v1 = await this.ensureFunc('close', '->');
            let __v2 = await __v1.call();
        }
        async initCameraFlashLight() {
            let __v1 = await this.ensureFunc('initCameraFlashLight', '->');
            let __v2 = await __v1.call();
        }
        async initNotifyChannel() {
            let __v1 = await this.ensureFunc('initNotifyChannel', '->');
            let __v2 = await __v1.call();
        }
        async hasVibrator() {
            let __v1 = await this.ensureFunc('hasVibrator', '->c');
            let __v2 = await __v1.call();
            return __v2;
        }
        async vibrate(ms, amplitude) {
            let __v1 = await this.ensureFunc('vibrate', 'ii->');
            let __v2 = await __v1.call(ms, amplitude);
        }
        async getClipboardText() {
            let __v1 = await this.ensureFunc('getClipboardText', '->s');
            let __v2 = await __v1.call();
            return __v2;
        }
        async setClipboardText(text) {
            let __v1 = await this.ensureFunc('setClipboardText', 's->');
            let __v2 = await __v1.call(text);
        }
        async getDefaultAudioVolume() {
            let __v1 = await this.ensureFunc('getDefaultAudioVolume', '->i');
            let __v2 = await __v1.call();
            return __v2;
        }
        async setDefaultAudioVolume(vol) {
            let __v1 = await this.ensureFunc('setDefaultAudioVolume', 'i->');
            let __v2 = await __v1.call(vol);
        }
        async getLastLocationInfo(provider) {
            let __v1 = await this.ensureFunc('getLastLocationInfo', 's->o');
            let __v2 = await __v1.call(provider);
            return __v2;
        }
        async packLocation(location, tableSer) {
            let __v1 = await this.ensureFunc('packLocation', 'oc->b');
            let __v2 = await __v1.call(location, tableSer);
            return __v2;
        }
        async requestLocationUpdate(provider) {
            let __v1 = await this.ensureFunc('requestLocationUpdate', 's->o');
            let __v2 = await __v1.call(provider);
            return __v2;
        }
        async cancelLocationUpdate() {
            let __v1 = await this.ensureFunc('cancelLocationUpdate', '->');
            let __v2 = await __v1.call();
        }
        async getLocationProviders() {
            let __v1 = await this.ensureFunc('getLocationProviders', '->s');
            let __v2 = await __v1.call();
            return __v2;
        }
        async getLightsInfo() {
            let __v1 = await this.ensureFunc('getLightsInfo', '->b');
            let __v2 = await __v1.call();
            return __v2;
        }
        async turnOnLight(id) {
            let __v1 = await this.ensureFunc('turnOnLight', 'i->');
            let __v2 = await __v1.call(id);
        }
        async turnOffLight(id) {
            let __v1 = await this.ensureFunc('turnOffLight', 'i->');
            let __v2 = await __v1.call(id);
        }
        async postNotification(notifyId, title, content) {
            let __v1 = await this.ensureFunc('postNotification', 'iss->');
            let __v2 = await __v1.call(notifyId, title, content);
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
//# sourceMappingURL=AndroidHelper__Misc.js.map