define(["require", "exports", "./pxprpc_config"], function (require, exports, pxprpc_config_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Invoker = void 0;
    exports.getDefault = getDefault;
    class Invoker {
        constructor() {
            this.RemoteName = 'AndroidHelper.SurfaceManager';
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
        async newSurface(width, height) {
            let __v1 = await this.ensureFunc('newSurface', 'ii->o');
            let __v2 = await __v1.call(width, height);
            return __v2;
        }
        async getOpenglTexName(sur) {
            let __v1 = await this.ensureFunc('getOpenglTexName', 'o->i');
            let __v2 = await __v1.call(sur);
            return __v2;
        }
        async listImageFormatConst() {
            let __v1 = await this.ensureFunc('listImageFormatConst', '->b');
            let __v2 = await __v1.call();
            return __v2;
        }
        async listPixelFormatConst() {
            let __v1 = await this.ensureFunc('listPixelFormatConst', '->b');
            let __v2 = await __v1.call();
            return __v2;
        }
        async newImageReader(width, height, format) {
            let __v1 = await this.ensureFunc('newImageReader', 'iii->o');
            let __v2 = await __v1.call(width, height, format);
            return __v2;
        }
        async getImageInfo2(img) {
            let __v1 = await this.ensureFunc('getImageInfo2', 'o->iiis');
            let __v2 = await __v1.call(img);
            return __v2;
        }
        async getImageInfo(img) {
            let __v1 = await this.ensureFunc('getImageInfo', 'o->b');
            let __v2 = await __v1.call(img);
            return __v2;
        }
        async newSurfaceFromImageReader(reader) {
            let __v1 = await this.ensureFunc('newSurfaceFromImageReader', 'o->o');
            let __v2 = await __v1.call(reader);
            return __v2;
        }
        async waitForImageAvailable(reader) {
            let __v1 = await this.ensureFunc('waitForImageAvailable', 'o->o');
            let __v2 = await __v1.call(reader);
            return __v2;
        }
        async accuireLastestImage(reader) {
            let __v1 = await this.ensureFunc('accuireLastestImage', 'o->o');
            let __v2 = await __v1.call(reader);
            return __v2;
        }
        async acquireNextImage(reader) {
            let __v1 = await this.ensureFunc('acquireNextImage', 'o->o');
            let __v2 = await __v1.call(reader);
            return __v2;
        }
        async describePlanesInfo(img) {
            let __v1 = await this.ensureFunc('describePlanesInfo', 'o->b');
            let __v2 = await __v1.call(img);
            return __v2;
        }
        async getPlaneBufferData(img, planeIndex) {
            let __v1 = await this.ensureFunc('getPlaneBufferData', 'oi->b');
            let __v2 = await __v1.call(img, planeIndex);
            return __v2;
        }
        async getPlaneBufferDataRange(img, planeIndex, offset, len) {
            let __v1 = await this.ensureFunc('getPlaneBufferDataRange', 'oiii->b');
            let __v2 = await __v1.call(img, planeIndex, offset, len);
            return __v2;
        }
        async packPlaneData(planes) {
            let __v1 = await this.ensureFunc('packPlaneData', 'o->b');
            let __v2 = await __v1.call(planes);
            return __v2;
        }
        async toPNG(img, quality) {
            let __v1 = await this.ensureFunc('toPNG', 'oi->b');
            let __v2 = await __v1.call(img, quality);
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
//# sourceMappingURL=AndroidHelper__SurfaceManager.js.map