define(["require", "exports", "./pxprpc_config"], function (require, exports, pxprpc_config_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Invoker = void 0;
    exports.getDefault = getDefault;
    class Invoker {
        constructor() {
            this.RemoteName = 'AndroidHelper.Camera2';
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
        async closeAllOpenedResource() {
            let __v1 = await this.ensureFunc('closeAllOpenedResource', '->');
            let __v2 = await __v1.call();
        }
        async getBaseCamerasInfo() {
            let __v1 = await this.ensureFunc('getBaseCamerasInfo', '->b');
            let __v2 = await __v1.call();
            return __v2;
        }
        async close() {
            let __v1 = await this.ensureFunc('close', '->');
            let __v2 = await __v1.call();
        }
        async openCamera(id) {
            let __v1 = await this.ensureFunc('openCamera', 's->o');
            let __v2 = await __v1.call(id);
            return __v2;
        }
        async closeCamera(cam) {
            let __v1 = await this.ensureFunc('closeCamera', 'o->');
            let __v2 = await __v1.call(cam);
        }
        async setCaptureConfig1(camWrap, imageWidth, imageHeight, flashMode, autoFocusMode) {
            let __v1 = await this.ensureFunc('setCaptureConfig1', 'oiiii->');
            let __v2 = await __v1.call(camWrap, imageWidth, imageHeight, flashMode, autoFocusMode);
        }
        async setRenderTarget(cam, sur) {
            let __v1 = await this.ensureFunc('setRenderTarget', 'oo->');
            let __v2 = await __v1.call(cam, sur);
        }
        async getCaptureConfigKeyConst() {
            let __v1 = await this.ensureFunc('getCaptureConfigKeyConst', '->b');
            let __v2 = await __v1.call();
            return __v2;
        }
        async getCaptureConfigValueConst() {
            let __v1 = await this.ensureFunc('getCaptureConfigValueConst', '->b');
            let __v2 = await __v1.call();
            return __v2;
        }
        async prepareCaptureRequest(camWrap, capReq) {
            let __v1 = await this.ensureFunc('prepareCaptureRequest', 'oo->');
            let __v2 = await __v1.call(camWrap, capReq);
        }
        async requestAutoFocusAndAdjust(camWrap, x, y, width, height) {
            let __v1 = await this.ensureFunc('requestAutoFocusAndAdjust', 'oiiii->');
            let __v2 = await __v1.call(camWrap, x, y, width, height);
        }
        async requestDigitScale(camWrap, l, t, r, b) {
            let __v1 = await this.ensureFunc('requestDigitScale', 'oiiii->');
            let __v2 = await __v1.call(camWrap, l, t, r, b);
        }
        async requestContinuousCapture(camWrap) {
            let __v1 = await this.ensureFunc('requestContinuousCapture', 'o->');
            let __v2 = await __v1.call(camWrap);
        }
        async stopContinuousCapture(camWrap) {
            let __v1 = await this.ensureFunc('stopContinuousCapture', 'o->');
            let __v2 = await __v1.call(camWrap);
        }
        async requestOnceCapture(camWrap) {
            let __v1 = await this.ensureFunc('requestOnceCapture', 'o->');
            let __v2 = await __v1.call(camWrap);
        }
        async accuireLastestImageData(camDev) {
            let __v1 = await this.ensureFunc('accuireLastestImageData', 'o->o');
            let __v2 = await __v1.call(camDev);
            return __v2;
        }
        async describePlanesInfo(img) {
            let __v1 = await this.ensureFunc('describePlanesInfo', 'o->b');
            let __v2 = await __v1.call(img);
            return __v2;
        }
        async waitForImageAvailable(camDev) {
            let __v1 = await this.ensureFunc('waitForImageAvailable', 'o->o');
            let __v2 = await __v1.call(camDev);
            return __v2;
        }
        async getPlaneBufferData(img, planeIndex) {
            let __v1 = await this.ensureFunc('getPlaneBufferData', 'oi->b');
            let __v2 = await __v1.call(img, planeIndex);
            return __v2;
        }
        async packPlaneData(img) {
            let __v1 = await this.ensureFunc('packPlaneData', 'o->b');
            let __v2 = await __v1.call(img);
            return __v2;
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
//# sourceMappingURL=AndroidHelper__Camera2.js.map