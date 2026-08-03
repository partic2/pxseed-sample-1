var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
define("partic2/pxprpcClient/registry", ["require", "exports", "partic2/jsutils1/base", "partic2/jsutils1/webutils", "pxprpc/base", "pxprpc/extend", "partic2/CodeRunner/jsutils2", "./pxseedremotefuncs", "./rpcworker", "./pxseedremotefuncs"], function (require, exports, base_1, webutils_1, base_2, extend_1, jsutils2_1, pxseedremotefuncs_1, rpcworker_1, pxseedremotefuncs_2) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ServiceWorkerRpc = exports.WebWorker1Rpc = exports.ServerHostWorker1Rpc = exports.ServerHostRpc = exports.ServiceWorkerRpcName = exports.WebWorker1RpcName = exports.ServerHostWorker1RpcName = exports.ServerHostRpcName = exports.__internal__ = exports.ClientInfo = exports.rpcWorkerInitModule = exports.__name__ = void 0;
    exports.getRegistered = getRegistered;
    exports.listRegistered = listRegistered;
    exports.addClient = addClient;
    exports.removeClient = removeClient;
    exports.getPersistentRegistered = getPersistentRegistered;
    exports.listPersistentRegistered = listPersistentRegistered;
    exports.setIsServingRpcName = setIsServingRpcName;
    exports.getIsServingRpcName = getIsServingRpcName;
    exports.isServerHost = isServerHost;
    exports.persistentClientStore = persistentClientStore;
    __exportStar(pxseedremotefuncs_2, exports);
    exports.__name__ = base_1.requirejs.getLocalRequireModule(require);
    exports.rpcWorkerInitModule = [];
    ;
    class ClientInfo {
        update(args) {
            Object.assign(this, args);
            this.updateAt = new Date().getTime();
            return this;
        }
        constructor() {
            this.client = null;
            this.url = '';
            this.name = '';
            this.persistent = false;
            this.updateAt = 0;
            this.connecting = new base_1.mutex();
        }
        connected() {
            if (this.client === null)
                return false;
            return this.client.baseClient.isRunning();
        }
        async disconnect() {
            this.client?.close();
            this.client = null;
        }
        async ensureConnected() {
            return await this.connecting.exec(async () => {
                if (this.connected()) {
                    return this.client;
                }
                else {
                    let io1 = await (0, pxseedremotefuncs_1.openConnectionFromUrl)(this.url.toString());
                    if (io1 == null) {
                        throw new Error('No protocol handler for ' + this.url);
                    }
                    this.client = new extend_1.RpcExtendClient1(new base_2.Client(io1));
                    await this.client.init();
                    return this.client;
                }
            });
        }
        toJSON() {
            return { name: this.name, url: this.url, persistent: this.persistent };
        }
    }
    exports.ClientInfo = ClientInfo;
    exports.__internal__ = {
        isServingRpcName: {},
    };
    let registered = new Map();
    //Only get current cached registered client. Use "getPersistentRegistered" to get all possible registered client.
    async function getRegistered(name) {
        return registered.get(name);
    }
    //Only get current cached registered client. Use "listPersistentRegistered" to get all possible registered client.
    async function listRegistered() {
        return Array.from(registered.entries());
    }
    async function addClient(args) {
        let { name } = args;
        name = name ?? args.url;
        let clie = registered.get(name);
        if (clie == undefined) {
            //Skip if existed, To avoid connection lost unexpectedly.
            clie = new ClientInfo();
            clie.name = args.name ?? clie.url;
        }
        clie.update(args);
        registered.set(name, clie);
    }
    async function removeClient(name) {
        let clie = registered.get(name);
        if (clie != undefined) {
            clie.disconnect().catch(() => { });
            registered.delete(name);
        }
    }
    // Get client after load persistent clients.
    //NOTE:this function will call addDefaultPxseedJsBuiltinRpcClient, which may connect ServerHost internal.
    //     So don't use this function directly when connecting to ServerHost, use persistent.load() instead.
    async function getPersistentRegistered(name) {
        await persistent.load();
        await addDefaultPxseedJsBuiltinRpcClient();
        return registered.get(name);
    }
    //See also getPersistentRegistered
    async function listPersistentRegistered() {
        await persistent.load();
        await addDefaultPxseedJsBuiltinRpcClient();
        return Array.from(registered.entries());
    }
    async function setIsServingRpcName(name, isServing) {
        let f = exports.__internal__.isServingRpcName[name];
        if (f == undefined) {
            f = new base_1.future();
            exports.__internal__.isServingRpcName[name] = f;
        }
        f.setResult(isServing);
    }
    async function getIsServingRpcName(name) {
        if (exports.__internal__.isServingRpcName[name] == undefined) {
            exports.__internal__.isServingRpcName[name] = new base_1.future();
        }
        try {
            await persistent.load();
            let rpc = await getRegistered(name);
            if (rpc != undefined) {
                await (0, pxseedremotefuncs_1.easyCallRemoteJsonFunction)(await rpc.ensureConnected(), exports.__name__, 'setIsServingRpcName', [name, true]);
            }
            if (!exports.__internal__.isServingRpcName[name].done) {
                exports.__internal__.isServingRpcName[name].setResult(false);
            }
        }
        catch (err) {
            exports.__internal__.isServingRpcName[name].setResult(false);
        }
        ;
        return await exports.__internal__.isServingRpcName[name].get();
    }
    async function isServerHost() {
        return getIsServingRpcName(exports.ServerHostRpcName);
    }
    //"ServerHost" usually refer to the server hosting pxseed web, and shared by all js worker in one pxeed application.
    exports.ServerHostRpcName = 'server host';
    //"ServerHostWorker1" refer to the worker spawn by ServerHost to handle the most remote requests.
    exports.ServerHostWorker1RpcName = 'server host worker 1';
    exports.WebWorker1RpcName = 'webworker 1';
    exports.ServiceWorkerRpcName = 'service worker 1';
    let persistent = {
        save: async function () {
            let config = await (0, webutils_1.GetPersistentConfig)(exports.__name__);
            config.registered = Array.from(registered.values()).filter(t1 => t1.persistent).map(t1 => t1.toJSON());
            await (0, webutils_1.SavePersistentConfig)(exports.__name__, config);
        },
        load: async function () {
            let config = await (0, webutils_1.GetPersistentConfig)(exports.__name__);
            if (config.registered != undefined) {
                config.registered.forEach(item => {
                    let clie = registered.get(item.name);
                    if (clie == undefined) {
                        //Skip if existed, To avoid connection lost unexpected.
                        clie = new ClientInfo();
                    }
                    clie.update(item);
                    clie.persistent = true;
                    registered.set(clie.name, clie);
                });
            }
        }
    };
    async function persistentClientStore(call) {
        return await persistent[call]();
    }
    exports.ServerHostRpc = new jsutils2_1.Singleton(async () => (await getPersistentRegistered(exports.ServerHostRpcName)).ensureConnected());
    exports.ServerHostWorker1Rpc = new jsutils2_1.Singleton(async () => (await getPersistentRegistered(exports.ServerHostWorker1RpcName)).ensureConnected());
    exports.WebWorker1Rpc = new jsutils2_1.Singleton(async () => (await getPersistentRegistered(exports.WebWorker1RpcName)).ensureConnected());
    exports.ServiceWorkerRpc = new jsutils2_1.Singleton(async () => (await getPersistentRegistered(exports.ServiceWorkerRpcName)).ensureConnected());
    let addingDefaultPxseedJsBuiltinRpcClient = new base_1.mutex();
    async function addDefaultPxseedJsBuiltinRpcClient() {
        await addingDefaultPxseedJsBuiltinRpcClient.exec(async () => {
            if (globalThis.location != undefined && ['http:', 'https:'].includes(globalThis.location.protocol)) {
                if (globalThis.navigator?.serviceWorker != undefined && await getRegistered(exports.ServiceWorkerRpcName) == null) {
                    await addClient({ url: 'serviceworker:1', name: exports.ServiceWorkerRpcName });
                }
            }
            if (await getRegistered(exports.WebWorker1RpcName) == null) {
                await addClient({ url: 'webworker:' + exports.__name__ + '/worker/1', name: exports.WebWorker1RpcName });
            }
            if (await getRegistered(exports.ServerHostRpcName) != null && await getRegistered(exports.ServerHostWorker1RpcName) == null && !rpcworker_1.__internal__.isPxseedWorker) {
                await addClient({
                    url: 'iooverpxprpc:' + exports.ServerHostRpcName + '/' +
                        encodeURIComponent('webworker:' + exports.__name__ + '/worker/1'),
                    name: exports.ServerHostWorker1RpcName
                });
            }
        });
    }
});
