define(["require", "exports", "partic2/jsutils1/base", "partic2/jsutils1/webutils", "pxprpc/backend", "pxprpc/base", "pxprpc/extend"], function (require, exports, base_1, webutils_1, backend_1, base_2, extend_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.rpcId = exports.persistent = exports.ServiceWorker = exports.WebWorker1RpcName = exports.ServerHostWorker1RpcName = exports.ServerHostRpcName = exports.IoOverPxprpc = exports.ClientInfo = exports.RpcWorker = exports.rpcWorkerInitModule = exports.__name__ = void 0;
    exports.createIoPipe = createIoPipe;
    exports.getAttachedRemoteRigstryFunction = getAttachedRemoteRigstryFunction;
    exports.getConnectionFromUrl = getConnectionFromUrl;
    exports.getRegistered = getRegistered;
    exports.listRegistered = listRegistered;
    exports.getPersistentRegistered = getPersistentRegistered;
    exports.listPersistentRegistered = listPersistentRegistered;
    exports.addClient = addClient;
    exports.removeClient = removeClient;
    exports.addBuiltinClient = addBuiltinClient;
    exports.__name__ = base_1.requirejs.getLocalRequireModule(require);
    exports.rpcWorkerInitModule = [];
    extend_1.defaultFuncMap[exports.__name__ + '.loadModule'] = new extend_1.RpcExtendServerCallable(async (name) => base_1.requirejs.promiseRequire(name)).typedecl('s->o');
    extend_1.defaultFuncMap[exports.__name__ + '.unloadModule'] = new extend_1.RpcExtendServerCallable(async (name) => base_1.requirejs.undef(name)).typedecl('s->o');
    extend_1.defaultFuncMap[exports.__name__ + '.getDefined'] = new extend_1.RpcExtendServerCallable(async () => base_1.requirejs.getDefined()).typedecl('s->o');
    extend_1.defaultFuncMap[exports.__name__ + '.getConnectionFromUrl'] = new extend_1.RpcExtendServerCallable(async (url) => {
        return await getConnectionFromUrl(url);
    }).typedecl('s->o');
    class RpcWorker {
        constructor(workerId) {
            this.initDone = new base_1.future();
            this.workerId = '';
            this.workerId = workerId ?? (0, base_1.GenerateRandomString)();
        }
        async ensureConnection() {
            if (this.conn === undefined) {
                try {
                    this.conn = await new backend_1.WebMessage.Connection().connect(this.workerId, 1000);
                }
                catch (e) {
                    if (e instanceof Error && e.message.match(/server not found/)) {
                        //mute
                    }
                    else {
                        throw e;
                    }
                }
                ;
                if (this.conn === undefined) {
                    this.wt = (0, webutils_1.CreateWorkerThread)(this.workerId);
                    await this.wt.start();
                    backend_1.WebMessage.bind(this.wt.port);
                    await this.wt.runScript(`require(['partic2/pxprpcClient/rpcworker'],function(workerInit){
                    workerInit.loadRpcWorkerInitModule(${JSON.stringify(exports.rpcWorkerInitModule)}).then(resolve,reject);
                },reject)`, true);
                    this.conn = await new backend_1.WebMessage.Connection().connect(this.wt.workerId, 300);
                }
            }
            return this.conn;
        }
        async ensureClient() {
            if (this.conn == undefined) {
                await this.ensureConnection();
            }
            if (this.client == undefined) {
                this.client = await new extend_1.RpcExtendClient1(new base_2.Client(this.conn)).init();
            }
            return this.client;
        }
    }
    exports.RpcWorker = RpcWorker;
    class ClientInfo {
        constructor(name, url) {
            this.name = name;
            this.url = url;
            this.client = null;
        }
        connected() {
            if (this.client === null)
                return false;
            return this.client.conn.isRunning();
        }
        async disconnect() {
            this.client?.close();
            this.client = null;
        }
        async jsServerLoadModule(name) {
            let fn = await getAttachedRemoteRigstryFunction(this.client);
            return fn.loadModule(name);
        }
        async ensureConnected() {
            if (this.client !== null && this.client.conn.isRunning()) {
                return this.client;
            }
            else {
                let io1 = await getConnectionFromUrl(this.url.toString());
                if (io1 == null) {
                    let purl = new URL(this.url);
                    throw new Error('No protocol handler for ' + purl.protocol);
                }
                this.client = new extend_1.RpcExtendClient1(new base_2.Client(io1));
                await this.client.init();
                return this.client;
            }
        }
    }
    exports.ClientInfo = ClientInfo;
    class IoOverPxprpc {
        constructor(remoteIo) {
            this.remoteIo = remoteIo;
        }
        async receive() {
            if (this.funcs == undefined) {
                this.funcs = await getAttachedRemoteRigstryFunction(this.remoteIo.client);
            }
            return await this.funcs.io_receive(this.remoteIo);
        }
        async send(data) {
            if (this.funcs == undefined) {
                this.funcs = await getAttachedRemoteRigstryFunction(this.remoteIo.client);
            }
            return await this.funcs.io_send(this.remoteIo, new Uint8Array((0, base_1.ArrayBufferConcat)(data)));
        }
        close() {
            this.remoteIo.free();
        }
    }
    exports.IoOverPxprpc = IoOverPxprpc;
    function createIoPipe() {
        let a2b = new base_1.ArrayWrap2();
        let b2a = new base_1.ArrayWrap2();
        let closed = false;
        function oneSide(r, s) {
            let tio = {
                isClosed: () => {
                    return closed;
                },
                receive: async () => {
                    if (closed)
                        throw new Error('closed.');
                    return r.queueBlockShift();
                },
                send: async (data) => {
                    if (closed)
                        throw new Error('closed.');
                    for (let t1 of data) {
                        s.queueSignalPush(t1);
                    }
                },
                close: () => {
                    closed = true;
                    r.cancelWaiting();
                    s.cancelWaiting();
                }
            };
            return tio;
        }
        return [oneSide(a2b, b2a), oneSide(b2a, a2b)];
    }
    let attachedRemoteFunction = Symbol('AttachedRemoteRigstryFunction');
    class RemoteRegistryFunctionImpl {
        constructor() {
            this.funcs = [];
        }
        async loadModule(name) {
            return this.funcs[0].call(name);
        }
        async getConnectionFromUrl(url) {
            return this.funcs[1].call(url);
        }
        async io_send(io, data) {
            await this.funcs[2].call(io, data);
            return;
        }
        async io_receive(io) {
            return this.funcs[3].call(io);
        }
        async jsExec(code, obj) {
            return this.funcs[4].call(code, obj);
        }
        async bufferData(obj) {
            return this.funcs[5].call(obj);
        }
        async anyToString(obj) {
            return this.funcs[6].call(obj);
        }
        async ensureInit() {
            if (this.funcs.length == 0) {
                this.funcs = [
                    (await this.client1.getFunc(exports.__name__ + '.loadModule'))?.typedecl('s->o'),
                    (await this.client1.getFunc(exports.__name__ + '.getConnectionFromUrl'))?.typedecl('s->o'),
                    (await this.client1.getFunc('pxprpc_pp.io_send'))?.typedecl('ob->'),
                    (await this.client1.getFunc('pxprpc_pp.io_receive'))?.typedecl('o->b'),
                    (await this.client1.getFunc('builtin.jsExec'))?.typedecl('so->o'),
                    (await this.client1.getFunc('builtin.bufferData'))?.typedecl('o->b'),
                    (await this.client1.getFunc('builtin.anyToString'))?.typedecl('o->s')
                ];
            }
        }
    }
    async function getAttachedRemoteRigstryFunction(client1) {
        if (!(attachedRemoteFunction in client1)) {
            let t1 = new RemoteRegistryFunctionImpl();
            t1.client1 = client1;
            await t1.ensureInit();
            client1[attachedRemoteFunction] = t1;
        }
        return client1[attachedRemoteFunction];
    }
    async function getConnectionFromUrl(url) {
        let url2 = new URL(url);
        if (url2.protocol == 'pxpwebmessage:') {
            let conn = new backend_1.WebMessage.Connection();
            await conn.connect(url2.pathname, 300);
            return conn;
        }
        else if (url2.protocol == 'webworker:') {
            let workerId = url2.pathname;
            let rpcWorker = new RpcWorker(workerId);
            return await rpcWorker.ensureConnection();
        }
        else if (['ws:', 'wss:'].indexOf(url2.protocol) >= 0) {
            return await new backend_1.WebSocketIo().connect(url);
        }
        else if (url2.protocol == 'iooverpxprpc:') {
            let firstSlash = url2.pathname.indexOf('/');
            let firstRpcName = decodeURIComponent(url2.pathname.substring(0, firstSlash));
            let restRpcPath = url2.pathname.substring(firstSlash + 1);
            let cinfo = getRegistered(firstRpcName);
            if (cinfo == null) {
                cinfo = await addClient(firstRpcName, firstRpcName);
            }
            await cinfo.ensureConnected();
            let fn = await getAttachedRemoteRigstryFunction(cinfo.client);
            if (restRpcPath.indexOf('/') >= 0) {
                restRpcPath = 'iooverpxprpc:' + restRpcPath;
            }
            else {
                restRpcPath = decodeURIComponent(restRpcPath);
            }
            let remoteIo = await fn.getConnectionFromUrl(restRpcPath);
            return new IoOverPxprpc(remoteIo);
        }
        else if (url2.protocol == 'serviceworker:') {
            if (url2.pathname !== '1') {
                throw new Error('Only support default service worker(serviceworker:1)');
            }
            let swu = await new Promise((resolve_1, reject_1) => { require(['partic2/jsutils1/webutilssw'], resolve_1, reject_1); });
            let worker = await swu.ensureServiceWorkerInstalled();
            backend_1.WebMessage.bind(worker.port);
            await worker.runScript(`require(['partic2/pxprpcClient/rpcworker'],function(workerInit){
            workerInit.loadRpcWorkerInitModule(${JSON.stringify(exports.rpcWorkerInitModule)}).then(resolve,reject);
        },reject)`, true);
            return await new backend_1.WebMessage.Connection().connect(worker.workerId, 300);
        }
        else if (url2.protocol == 'pxseedjs:') {
            //For user custom connection factory.
            //potential security issue?
            let functionDelim = url2.pathname.lastIndexOf('.');
            let moduleName = url2.pathname.substring(0, functionDelim);
            let functionName = url2.pathname.substring(functionDelim + 1);
            return (await new Promise((resolve_2, reject_2) => { require([moduleName], resolve_2, reject_2); }))[functionName](url2.toString());
        }
        return null;
    }
    let registered = new Map();
    //Only get current cached registered client. Use "getPersistentRegistered" to get all possible registered client.
    function getRegistered(name) {
        return registered.get(name);
    }
    //Only get current cached registered client. Use "listPersistentRegistered" to get all possible registered client.
    function listRegistered() {
        return registered.entries();
    }
    async function getPersistentRegistered(name) {
        await exports.persistent.load();
        return getRegistered(name);
    }
    async function listPersistentRegistered(name) {
        await exports.persistent.load();
        return registered.entries();
    }
    async function addClient(url, name) {
        name = (name == undefined || name === '') ? url.toString() : name;
        let clie = registered.get(name);
        if (clie == undefined) {
            //Skip if existed, To avoid connection lost unexpected.
            clie = new ClientInfo(name, url);
        }
        clie.url = url;
        registered.set(name, clie);
        await exports.persistent.save();
        return clie;
    }
    async function removeClient(name) {
        let clie = registered.get(name);
        if (clie != undefined) {
            clie.disconnect();
            registered.delete(name);
        }
        await exports.persistent.save();
    }
    exports.ServerHostRpcName = 'server host';
    exports.ServerHostWorker1RpcName = 'server host worker 1';
    exports.WebWorker1RpcName = 'webworker 1';
    exports.ServiceWorker = 'service worker 1';
    async function addBuiltinClient() {
        if (globalThis.location != undefined && globalThis.WebSocket != undefined) {
            if (getRegistered(exports.ServerHostRpcName) != null && getRegistered(exports.ServerHostWorker1RpcName) == null) {
                addClient('iooverpxprpc:' + exports.ServerHostRpcName + '/' +
                    encodeURIComponent('webworker:' + exports.__name__ + '/worker/1'), exports.ServerHostWorker1RpcName);
            }
            if (getRegistered(exports.ServiceWorker) == null) {
                addClient('serviceworker:1', exports.ServiceWorker);
            }
            if (getRegistered(exports.WebWorker1RpcName) == null) {
                addClient('webworker:' + exports.__name__ + '/worker/1', exports.WebWorker1RpcName);
            }
        }
        else {
            if (getRegistered(exports.ServerHostWorker1RpcName) == null) {
                addClient('webworker:' + exports.__name__ + '/worker/1', exports.ServerHostWorker1RpcName);
            }
        }
    }
    exports.persistent = {
        save: async function () {
            let config = await (0, webutils_1.GetPersistentConfig)(exports.__name__);
            config.registered = Array.from(registered.entries()).map(v => ({ name: v[0], url: v[1].url }));
            await (0, webutils_1.SavePersistentConfig)(exports.__name__);
        },
        load: async function load() {
            let config = await (0, webutils_1.GetPersistentConfig)(exports.__name__);
            if ('registered' in config) {
                config.registered.forEach(item => {
                    addClient(item.url, item.name);
                });
            }
            await addBuiltinClient();
        }
    };
    //Critical Security Risk. this value can be use to communicate cross-origin.
    exports.rpcId = globalThis.__workerId ?? (0, base_1.GenerateRandomString)();
    if ('window' in globalThis) {
        if (globalThis.window.opener != null) {
            backend_1.WebMessage.bind({
                postMessage: (data, opt) => globalThis.window.opener.postMessage(data, { targetOrigin: '*', ...opt }),
                addEventListener: () => { },
                removeEventListener: () => { }
            });
        }
        if (globalThis.window.parent != undefined && globalThis.window.self != globalThis.window.parent) {
            backend_1.WebMessage.bind({
                postMessage: (data, opt) => globalThis.window.parent.postMessage(data, { targetOrigin: '*', ...opt }),
                addEventListener: () => { },
                removeEventListener: () => { }
            });
        }
        //Critical Security Risk
        new backend_1.WebMessage.Server((conn) => {
            //mute error
            new extend_1.RpcExtendServer1(new base_2.Server(conn)).serve().catch(() => { });
        }).listen(exports.rpcId);
        backend_1.WebMessage.postMessageOptions.targetOrigin = '*';
    }
});
//# sourceMappingURL=registry.js.map