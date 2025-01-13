define(["require", "exports", "./pxprpc_config"], function (require, exports, pxprpc_config_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Invoker = void 0;
    exports.getDefault = getDefault;
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
            let __v1 = this.rpc__RemoteFuncs[name];
            if (__v1 == undefined) {
                __v1 = await this.rpc__client.getFunc(this.RemoteName + '.' + name);
                this.rpc__RemoteFuncs[name] = __v1;
                __v1.typedecl(typedecl);
            }
            return __v1;
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
    let defaultInvoker = null;
    async function getDefault() {
        if (defaultInvoker === null) {
            defaultInvoker = new Invoker();
            await defaultInvoker.useClient(await (0, pxprpc_config_1.getDefaultClient)());
        }
        return defaultInvoker;
    }
});
//# sourceMappingURL=AndroidHelper__Sensor.js.map