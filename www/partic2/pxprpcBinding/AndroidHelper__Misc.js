define(["require", "exports", "./pxprpc_config"], function (require, exports, pxprpc_config_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Invoker = void 0;
    exports.getDefault = getDefault;
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
            let __v1 = this.rpc__RemoteFuncs[name];
            if (__v1 == undefined) {
                __v1 = await this.rpc__client.getFunc(this.RemoteName + '.' + name);
                this.rpc__RemoteFuncs[name] = __v1;
                __v1.typedecl(typedecl);
            }
            return __v1;
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
    let defaultInvoker = null;
    async function getDefault() {
        if (defaultInvoker === null) {
            defaultInvoker = new Invoker();
            await defaultInvoker.useClient(await (0, pxprpc_config_1.getDefaultClient)());
        }
        return defaultInvoker;
    }
});
//# sourceMappingURL=AndroidHelper__Misc.js.map