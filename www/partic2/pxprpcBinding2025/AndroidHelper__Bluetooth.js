define(["require", "exports", "partic2/pxprpcClient/registry", "partic2/pxprpcBinding/rpcregistry"], function (require, exports, registry_1, rpcregistry_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.defaultInvoker = exports.Invoker = void 0;
    exports.ensureDefaultInvoker = ensureDefaultInvoker;
    class Invoker {
        constructor() {
            this.RemoteName = 'AndroidHelper.Bluetooth';
            this.rpc__RemoteFuncs = {};
        }
        async useClient(client) {
            this.rpc__client = client;
            this.rpc__RemoteFuncs = {};
        }
        async ensureFunc(name, typedecl) {
            return await (0, registry_1.getRpcFunctionOn)(this.rpc__client, this.RemoteName + '.' + name, typedecl);
        }
        async initDefault() {
            let __v1 = await this.ensureFunc('initDefault', '->');
            let __v2 = await __v1.call();
        }
        async close() {
            let __v1 = await this.ensureFunc('close', '->');
            let __v2 = await __v1.call();
        }
        async describeBluetoothAdapterConstant() {
            let __v1 = await this.ensureFunc('describeBluetoothAdapterConstant', '->b');
            let __v2 = await __v1.call();
            return __v2;
        }
        async describeBluetoothDeviceConstant() {
            let __v1 = await this.ensureFunc('describeBluetoothDeviceConstant', '->b');
            let __v2 = await __v1.call();
            return __v2;
        }
        async describeAdapterState() {
            let __v1 = await this.ensureFunc('describeAdapterState', '->b');
            let __v2 = await __v1.call();
            return __v2;
        }
        async setName(name) {
            let __v1 = await this.ensureFunc('setName', 's->');
            let __v2 = await __v1.call(name);
        }
        async self() {
            let __v1 = await this.ensureFunc('self', '->o');
            let __v2 = await __v1.call();
            return __v2;
        }
        async asLeScanListener() {
            let __v1 = await this.ensureFunc('asLeScanListener', '->o');
            let __v2 = await __v1.call();
            return __v2;
        }
        async bluetoothAdapter() {
            let __v1 = await this.ensureFunc('bluetoothAdapter', '->o');
            let __v2 = await __v1.call();
            return __v2;
        }
        async requestBluetoothDicoverable(durationSec) {
            let __v1 = await this.ensureFunc('requestBluetoothDicoverable', 'i->');
            let __v2 = await __v1.call(durationSec);
        }
        async requestEnableBluetooth() {
            let __v1 = await this.ensureFunc('requestEnableBluetooth', '->');
            let __v2 = await __v1.call();
        }
        async createBond(address) {
            let __v1 = await this.ensureFunc('createBond', 's->c');
            let __v2 = await __v1.call(address);
            return __v2;
        }
        async removeBond(address) {
            let __v1 = await this.ensureFunc('removeBond', 's->c');
            let __v2 = await __v1.call(address);
            return __v2;
        }
        async setAllowNoConfirmPairing(b) {
            let __v1 = await this.ensureFunc('setAllowNoConfirmPairing', 'c->');
            let __v2 = await __v1.call(b);
        }
        async setPairPin(address, pin) {
            let __v1 = await this.ensureFunc('setPairPin', 'sb->c');
            let __v2 = await __v1.call(address, pin);
            return __v2;
        }
        async onReceive(context, intent) {
            let __v1 = await this.ensureFunc('onReceive', 'oo->');
            let __v2 = await __v1.call(context, intent);
        }
        async startDiscovery() {
            let __v1 = await this.ensureFunc('startDiscovery', '->');
            let __v2 = await __v1.call();
        }
        async cancelDiscovery() {
            let __v1 = await this.ensureFunc('cancelDiscovery', '->');
            let __v2 = await __v1.call();
        }
        async cleanDiscoveryResults() {
            let __v1 = await this.ensureFunc('cleanDiscoveryResults', '->');
            let __v2 = await __v1.call();
        }
        async describeDiscoveredDevices() {
            let __v1 = await this.ensureFunc('describeDiscoveredDevices', '->b');
            let __v2 = await __v1.call();
            return __v2;
        }
        async describeDiscoveredDevice(address) {
            let __v1 = await this.ensureFunc('describeDiscoveredDevice', 's->b');
            let __v2 = await __v1.call(address);
            return __v2;
        }
        async onLeScan(bluetoothDevice, rssi, scanRecord) {
            let __v1 = await this.ensureFunc('onLeScan', 'oio->');
            let __v2 = await __v1.call(bluetoothDevice, rssi, scanRecord);
        }
        async listenRfcomm(name, uuid) {
            let __v1 = await this.ensureFunc('listenRfcomm', 'ss->o');
            let __v2 = await __v1.call(name, uuid);
            return __v2;
        }
        async listenRfcommSecure(name, uuid) {
            let __v1 = await this.ensureFunc('listenRfcommSecure', 'ss->o');
            let __v2 = await __v1.call(name, uuid);
            return __v2;
        }
        async connectRfcomm(address, uuid) {
            let __v1 = await this.ensureFunc('connectRfcomm', 'ss->o');
            let __v2 = await __v1.call(address, uuid);
            return __v2;
        }
        async connectRfcommSecure(address, uuid) {
            let __v1 = await this.ensureFunc('connectRfcommSecure', 'ss->o');
            let __v2 = await __v1.call(address, uuid);
            return __v2;
        }
        async querySupportUuids(address) {
            let __v1 = await this.ensureFunc('querySupportUuids', 's->b');
            let __v2 = await __v1.call(address);
            return __v2;
        }
        async listenL2cap() {
            let __v1 = await this.ensureFunc('listenL2cap', '->o');
            let __v2 = await __v1.call();
            return __v2;
        }
        async listenL2capSecure() {
            let __v1 = await this.ensureFunc('listenL2capSecure', '->o');
            let __v2 = await __v1.call();
            return __v2;
        }
        async socketAccept(s, timeout) {
            let __v1 = await this.ensureFunc('socketAccept', 'oi->o');
            let __v2 = await __v1.call(s, timeout);
            return __v2;
        }
        async socketRead(s) {
            let __v1 = await this.ensureFunc('socketRead', 'o->b');
            let __v2 = await __v1.call(s);
            return __v2;
        }
        async socketWrite(s, b) {
            let __v1 = await this.ensureFunc('socketWrite', 'ob->');
            let __v2 = await __v1.call(s, b);
        }
        async socketClose(s) {
            let __v1 = await this.ensureFunc('socketClose', 'o->');
            let __v2 = await __v1.call(s);
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
//# sourceMappingURL=AndroidHelper__Bluetooth.js.map