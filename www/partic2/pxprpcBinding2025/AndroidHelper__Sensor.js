define(["require", "exports", "partic2/pxprpcClient/registry", "partic2/pxprpcBinding/rpcregistry"], function (require, exports, registry_1, rpcregistry_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.defaultInvoker = exports.Invoker = void 0;
    exports.ensureDefaultInvoker = ensureDefaultInvoker;
    class Invoker {
        constructor() {
            this.RemoteName = 'AndroidHelper.Sensor';
            this.rpc__RemoteFuncs = {};
        }
        async useClient(client) {
            this.rpc__client = client;
            this.rpc__RemoteFuncs = {};
        }
        async ensureFunc(name, typedecl) {
            return await (0, registry_1.getRpcFunctionOn)(this.rpc__client, this.RemoteName + '.' + name, typedecl);
        }
        async getSensorList(filter) {
            let __v1 = await this.ensureFunc('getSensorList', 'i->o');
            let __v2 = await __v1.call(filter);
            return __v2;
        }
        async listSensorFilter() {
            let __v1 = await this.ensureFunc('listSensorFilter', '->s');
            let __v2 = await __v1.call();
            return __v2;
        }
        async getUid() {
            let __v1 = await this.ensureFunc('getUid', '->s');
            let __v2 = await __v1.call();
            return __v2;
        }
        async setUid(uid) {
            let __v1 = await this.ensureFunc('setUid', 's->');
            let __v2 = await __v1.call(uid);
        }
        async self() {
            let __v1 = await this.ensureFunc('self', '->o');
            let __v2 = await __v1.call();
            return __v2;
        }
        async sensorStart(sensor, samplePeriod) {
            let __v1 = await this.ensureFunc('sensorStart', 'oi->i');
            let __v2 = await __v1.call(sensor, samplePeriod);
            return __v2;
        }
        async sensorStop(sensor) {
            let __v1 = await this.ensureFunc('sensorStop', 'o->');
            let __v2 = await __v1.call(sensor);
        }
        async sensorStopAll() {
            let __v1 = await this.ensureFunc('sensorStopAll', '->');
            let __v2 = await __v1.call();
        }
        async getRunningSensor() {
            let __v1 = await this.ensureFunc('getRunningSensor', '->o');
            let __v2 = await __v1.call();
            return __v2;
        }
        async sendorListNames(sensorList) {
            let __v1 = await this.ensureFunc('sendorListNames', 'o->s');
            let __v2 = await __v1.call(sensorList);
            return __v2;
        }
        async onSensorChanged(event) {
            let __v1 = await this.ensureFunc('onSensorChanged', 'o->');
            let __v2 = await __v1.call(event);
        }
        async packSensorEvent(event) {
            let __v1 = await this.ensureFunc('packSensorEvent', 'o->b');
            let __v2 = await __v1.call(event);
            return __v2;
        }
        async onAccuracyChanged(sensor, accuracy) {
            let __v1 = await this.ensureFunc('onAccuracyChanged', 'oi->');
            let __v2 = await __v1.call(sensor, accuracy);
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
//# sourceMappingURL=AndroidHelper__Sensor.js.map