define(["require", "exports", "./pxprpc_config"], function (require, exports, pxprpc_config_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Invoker = void 0;
    exports.getDefault = getDefault;
    class Invoker {
        constructor() {
            this.RemoteName = 'AndroidHelper.Wifi';
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
        async scan() {
            let __v1 = await this.ensureFunc('scan', '->');
            let __v2 = await __v1.call();
        }
        async getScanResult() {
            let __v1 = await this.ensureFunc('getScanResult', '->o');
            let __v2 = await __v1.call();
            return __v2;
        }
        async packScanResult(l) {
            let __v1 = await this.ensureFunc('packScanResult', 'o->b');
            let __v2 = await __v1.call(l);
            return __v2;
        }
        async getWifiInfo1() {
            let __v1 = await this.ensureFunc('getWifiInfo1', '->b');
            let __v2 = await __v1.call();
            return __v2;
        }
        async getState() {
            let __v1 = await this.ensureFunc('getState', '->b');
            let __v2 = await __v1.call();
            return __v2;
        }
        async setWifiEnable(enable) {
            let __v1 = await this.ensureFunc('setWifiEnable', 'c->');
            let __v2 = await __v1.call(enable);
        }
        async disconnect() {
            let __v1 = await this.ensureFunc('disconnect', '->');
            let __v2 = await __v1.call();
        }
        async connectTo(ssid, psk) {
            let __v1 = await this.ensureFunc('connectTo', 'ss->');
            let __v2 = await __v1.call(ssid, psk);
        }
        async startWifiAp(ssid, psk) {
            let __v1 = await this.ensureFunc('startWifiAp', 'ss->');
            let __v2 = await __v1.call(ssid, psk);
        }
        async stopWifiAp() {
            let __v1 = await this.ensureFunc('stopWifiAp', '->');
            let __v2 = await __v1.call();
        }
        async p2pInit() {
            let __v1 = await this.ensureFunc('p2pInit', '->o');
            let __v2 = await __v1.call();
            return __v2;
        }
        async p2pStartDiscover() {
            let __v1 = await this.ensureFunc('p2pStartDiscover', '->');
            let __v2 = await __v1.call();
        }
        async p2pStopDiscover() {
            let __v1 = await this.ensureFunc('p2pStopDiscover', '->');
            let __v2 = await __v1.call();
        }
        async p2pGetPeersList() {
            let __v1 = await this.ensureFunc('p2pGetPeersList', '->o');
            let __v2 = await __v1.call();
            return __v2;
        }
        async describeP2pPeersInfo(peers) {
            let __v1 = await this.ensureFunc('describeP2pPeersInfo', 'o->b');
            let __v2 = await __v1.call(peers);
            return __v2;
        }
        async p2pConnect(addr) {
            let __v1 = await this.ensureFunc('p2pConnect', 's->');
            let __v2 = await __v1.call(addr);
        }
        async p2pCancelConnect() {
            let __v1 = await this.ensureFunc('p2pCancelConnect', '->');
            let __v2 = await __v1.call();
        }
        async p2pDisconnect() {
            let __v1 = await this.ensureFunc('p2pDisconnect', '->');
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
//# sourceMappingURL=AndroidHelper__Wifi.js.map