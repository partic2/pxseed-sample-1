define(["require", "exports", "partic2/pxprpcClient/registry", "partic2/pxprpcBinding/rpcregistry"], function (require, exports, registry_1, rpcregistry_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.defaultInvoker = exports.Invoker = void 0;
    exports.ensureDefaultInvoker = ensureDefaultInvoker;
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
            return await (0, registry_1.getRpcFunctionOn)(this.rpc__client, this.RemoteName + '.' + name, typedecl);
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
    exports.defaultInvoker = null;
    async function ensureDefaultInvoker() {
        if (exports.defaultInvoker == null) {
            exports.defaultInvoker = new Invoker();
            exports.defaultInvoker.useClient(await (0, rpcregistry_1.getRpc4XplatjJavaServer)());
        }
    }
});
//# sourceMappingURL=AndroidHelper__Wifi.js.map