define(["require", "exports", "partic2/pxprpcClient/registry", "partic2/pxprpcBinding/rpcregistry"], function (require, exports, registry_1, rpcregistry_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.defaultInvoker = exports.Invoker = void 0;
    exports.ensureDefaultInvoker = ensureDefaultInvoker;
    class Invoker {
        constructor() {
            this.RemoteName = 'AndroidHelper.Intent';
            this.rpc__RemoteFuncs = {};
        }
        async useClient(client) {
            this.rpc__client = client;
            this.rpc__RemoteFuncs = {};
        }
        async ensureFunc(name, typedecl) {
            return await (0, registry_1.getRpcFunctionOn)(this.rpc__client, this.RemoteName + '.' + name, typedecl);
        }
        async requestInstallApk(apkPath) {
            let __v1 = await this.ensureFunc('requestInstallApk', 's->');
            let __v2 = await __v1.call(apkPath);
        }
        async requestOpenTelephone(tel) {
            let __v1 = await this.ensureFunc('requestOpenTelephone', 's->');
            let __v2 = await __v1.call(tel);
        }
        async requestSendShortMessage(tel, body) {
            let __v1 = await this.ensureFunc('requestSendShortMessage', 'ss->');
            let __v2 = await __v1.call(tel, body);
        }
        async requestSendOthers(filePath, mime, chooserTitle) {
            let __v1 = await this.ensureFunc('requestSendOthers', 'sss->');
            let __v2 = await __v1.call(filePath, mime, chooserTitle);
        }
        async requestOpenByDefaultHandler(uris) {
            let __v1 = await this.ensureFunc('requestOpenByDefaultHandler', 's->');
            let __v2 = await __v1.call(uris);
        }
        async requestOpenSetting(setting) {
            let __v1 = await this.ensureFunc('requestOpenSetting', 's->');
            let __v2 = await __v1.call(setting);
        }
        async getSettingProviderList() {
            let __v1 = await this.ensureFunc('getSettingProviderList', '->s');
            let __v2 = await __v1.call();
            return __v2;
        }
        async requestOpenApplication(packageName, componentName, action) {
            let __v1 = await this.ensureFunc('requestOpenApplication', 'sss->');
            let __v2 = await __v1.call(packageName, componentName, action);
        }
        async requestEnableBluetooth() {
            let __v1 = await this.ensureFunc('requestEnableBluetooth', '->');
            let __v2 = await __v1.call();
        }
        async requestBluetoothDicoverable(durationSec) {
            let __v1 = await this.ensureFunc('requestBluetoothDicoverable', 'i->');
            let __v2 = await __v1.call(durationSec);
        }
        async requestImageCapture(imagePath) {
            let __v1 = await this.ensureFunc('requestImageCapture', 's->i');
            let __v2 = await __v1.call(imagePath);
            return __v2;
        }
        async getContentUriForFile(path) {
            let __v1 = await this.ensureFunc('getContentUriForFile', 's->s');
            let __v2 = await __v1.call(path);
            return __v2;
        }
        async getUriForFile(path) {
            let __v1 = await this.ensureFunc('getUriForFile', 's->s');
            let __v2 = await __v1.call(path);
            return __v2;
        }
        async requestSystemAlertWindowPermission() {
            let __v1 = await this.ensureFunc('requestSystemAlertWindowPermission', '->c');
            let __v2 = await __v1.call();
            return __v2;
        }
        async requestOpenUniversalTypeFile(path) {
            let __v1 = await this.ensureFunc('requestOpenUniversalTypeFile', 's->');
            let __v2 = await __v1.call(path);
        }
        async getMimeTypeFromUri(uri) {
            let __v1 = await this.ensureFunc('getMimeTypeFromUri', 's->s');
            let __v2 = await __v1.call(uri);
            return __v2;
        }
        async openHttpUrl(url, flag) {
            let __v1 = await this.ensureFunc('openHttpUrl', 'ss->');
            let __v2 = await __v1.call(url);
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
//# sourceMappingURL=AndroidHelper__Intent.js.map