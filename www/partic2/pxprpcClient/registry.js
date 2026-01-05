define(["require", "exports", "partic2/jsutils1/base", "partic2/jsutils1/webutils", "pxprpc/backend", "pxprpc/base", "pxprpc/extend", "./rpcworker"], function (require, exports, base_1, webutils_1, backend_1, base_2, extend_1, rpcworker_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.persistent = exports.ServiceWorker = exports.WebWorker1RpcName = exports.ServerHostWorker1RpcName = exports.ServerHostRpcName = exports.__internal__ = exports.IoOverPxprpc = exports.ClientInfo = exports.RpcWorker = exports.internalProps = exports.rpcWorkerInitModule = exports.__name__ = void 0;
    exports.getRpcFunctionOn = getRpcFunctionOn;
    exports.createIoPipe = createIoPipe;
    exports.getAttachedRemoteRigstryFunction = getAttachedRemoteRigstryFunction;
    exports.getConnectionFromUrl = getConnectionFromUrl;
    exports.getRegistered = getRegistered;
    exports.listRegistered = listRegistered;
    exports.getPersistentRegistered = getPersistentRegistered;
    exports.listPersistentRegistered = listPersistentRegistered;
    exports.addClient = addClient;
    exports.removeClient = removeClient;
    exports.importRemoteModule = importRemoteModule;
    exports.easyCallRemoteJsonFunction = easyCallRemoteJsonFunction;
    exports.__name__ = base_1.requirejs.getLocalRequireModule(require);
    exports.rpcWorkerInitModule = [];
    extend_1.defaultFuncMap[exports.__name__ + '.loadModule'] = new extend_1.RpcExtendServerCallable(async (name) => {
        return {
            type: 'module',
            value: await base_1.requirejs.promiseRequire(name)
        };
    }).typedecl('s->o');
    extend_1.defaultFuncMap[exports.__name__ + '.unloadModule'] = new extend_1.RpcExtendServerCallable(async (name) => base_1.requirejs.undef(name)).typedecl('s->');
    extend_1.defaultFuncMap[exports.__name__ + '.callJsonFunction'] = new extend_1.RpcExtendServerCallable(async (moduleName, functionName, paramsJson) => {
        try {
            let param = JSON.parse(paramsJson);
            return JSON.stringify([(await (await base_1.requirejs.promiseRequire(moduleName))[functionName](...param)) ?? null]);
        }
        catch (err) {
            return JSON.stringify([null, {
                    message: err.message,
                    stack: err.stack
                }]);
        }
    }).typedecl('sss->s');
    extend_1.defaultFuncMap[exports.__name__ + '.runJsonResultCode'] = new extend_1.RpcExtendServerCallable(async (code) => {
        try {
            return JSON.stringify([await (new Function(code))() ?? null]);
        }
        catch (err) {
            return JSON.stringify([null, {
                    message: err.message,
                    stack: err.stack
                }]);
        }
    }).typedecl('s->s');
    extend_1.defaultFuncMap[exports.__name__ + '.getDefined'] = new extend_1.RpcExtendServerCallable(async () => base_1.requirejs.getDefined()).typedecl('s->o');
    extend_1.defaultFuncMap[exports.__name__ + '.getConnectionFromUrl'] = new extend_1.RpcExtendServerCallable(async (url) => {
        return await getConnectionFromUrl(url);
    }).typedecl('s->o');
    exports.internalProps = Symbol(exports.__name__ + '.internalProps');
    async function getRpcFunctionOn(client, funcName, typ) {
        let attachedFunc = {};
        if (exports.internalProps in client) {
            attachedFunc = client[exports.internalProps];
        }
        else {
            client[exports.internalProps] = attachedFunc;
        }
        if (!(funcName in attachedFunc)) {
            let fn = await client.getFunc(funcName);
            if (fn != null)
                fn.typedecl(typ);
            attachedFunc[funcName] = fn;
        }
        return attachedFunc[funcName];
    }
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
                    if (e instanceof Error && e.message.match(/server not found/) != null) {
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
                    workerInit.__internal__.initRpcWorker(${JSON.stringify(exports.rpcWorkerInitModule)},'${rpcworker_1.rpcId.get()}').then(resolve,reject);
                },reject)`, true);
                    this.conn = await new backend_1.WebMessage.Connection().connect(this.wt.workerId, 500);
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
        async jsServerLoadModule(name) {
            let fn = await getAttachedRemoteRigstryFunction(this.client);
            (await fn.loadModule(name)).free();
        }
        async ensureConnected() {
            try {
                await this.connecting.lock();
                if (this.connected()) {
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
            finally {
                await this.connecting.unlock();
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
    function createIoPipe(opts) {
        opts = opts ?? {
            bufferQueueSize: 5
        };
        let a2b = new base_1.ArrayWrap2();
        let b2a = new base_1.ArrayWrap2();
        let closed = false;
        a2b.queueSizeLimit = opts.bufferQueueSize;
        b2a.queueSizeLimit = opts.bufferQueueSize;
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
                    if (data.length == 1) {
                        s.queueBlockPush(data[0]);
                    }
                    else {
                        s.queueBlockPush(new Uint8Array((0, base_1.ArrayBufferConcat)(data)));
                    }
                },
                close: () => {
                    closed = true;
                    r.cancelWaiting();
                    s.cancelWaiting();
                    a2b.arr().length = 0;
                    b2a.arr().length = 0;
                }
            };
            return tio;
        }
        return [oneSide(a2b, b2a), oneSide(b2a, a2b)];
    }
    class RemoteCallFunctionError extends Error {
        constructor(message) {
            super('REMOTE:' + message);
        }
        toString() {
            return this.message + '\n' + (this.remoteStack ?? '');
        }
    }
    class RemoteRegistryFunctionImpl {
        constructor() {
            this.funcs = [];
        }
        async loadModule(name) {
            return this.funcs[0].call(name);
        }
        async callJsonFunction(module, functionName, params) {
            let [result, error] = JSON.parse(await this.funcs[7].call(module, functionName, JSON.stringify(params)));
            if (error != null) {
                let remoteError = new RemoteCallFunctionError(error.message);
                remoteError.remoteStack = error.stack;
                throw remoteError;
            }
            return result;
        }
        async runJsonResultCode(code) {
            let [result, error] = JSON.parse(await this.funcs[9].call(code));
            if (error != null) {
                let remoteError = new RemoteCallFunctionError(error.message);
                remoteError.remoteStack = error.stack;
                throw remoteError;
            }
            return result;
        }
        async unloadModule(name) {
            return this.funcs[8].call(name);
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
                    await getRpcFunctionOn(this.client1, exports.__name__ + '.loadModule', 's->o'),
                    await getRpcFunctionOn(this.client1, exports.__name__ + '.getConnectionFromUrl', 's->o'),
                    await getRpcFunctionOn(this.client1, 'pxprpc_pp.io_send', 'ob->'),
                    await getRpcFunctionOn(this.client1, 'pxprpc_pp.io_receive', 'o->b'),
                    await getRpcFunctionOn(this.client1, 'builtin.jsExec', 'so->o'),
                    await getRpcFunctionOn(this.client1, 'builtin.bufferData', 'o->b'), //[5]
                    await getRpcFunctionOn(this.client1, 'builtin.anyToString', 'o->s'),
                    await getRpcFunctionOn(this.client1, exports.__name__ + '.callJsonFunction', 'sss->s'),
                    await getRpcFunctionOn(this.client1, exports.__name__ + '.unloadModule', 's->'),
                    await getRpcFunctionOn(this.client1, exports.__name__ + '.runJsonResultCode', 's->s'),
                ];
            }
        }
    }
    async function getAttachedRemoteRigstryFunction(client1) {
        let t1 = new RemoteRegistryFunctionImpl();
        t1.client1 = client1;
        await t1.ensureInit();
        return t1;
    }
    exports.__internal__ = {
        isPxseedWorker: false
    };
    async function getConnectionFromUrl(url) {
        let url2 = new URL(url);
        if (url2.protocol == 'pxpwebmessage:') {
            if (exports.__internal__.isPxseedWorker) {
            }
            else {
                let conn = new backend_1.WebMessage.Connection();
                await conn.connect(url2.pathname, 300);
                return conn;
            }
        }
        else if (url2.protocol == 'webworker:') {
            if (exports.__internal__.isPxseedWorker) {
                let fn = await getAttachedRemoteRigstryFunction((await (0, rpcworker_1.getRpcClientConnectWorkerParent)()));
                let remoteIo = await fn.getConnectionFromUrl(url);
                return new IoOverPxprpc(remoteIo);
            }
            else {
                let workerId = url2.pathname;
                let rpcWorker = new RpcWorker(workerId);
                return await rpcWorker.ensureConnection();
            }
        }
        else if (['ws:', 'wss:'].indexOf(url2.protocol) >= 0) {
            return await new backend_1.WebSocketIo().connect(url);
        }
        else if (url2.protocol == 'iooverpxprpc:') {
            let firstSlash = url2.pathname.indexOf('/');
            let firstRpcName = decodeURIComponent(url2.pathname.substring(0, firstSlash));
            let restRpcPath = url2.pathname.substring(firstSlash + 1);
            let cinfo = await getPersistentRegistered(firstRpcName);
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
            workerInit.__internal__.initRpcWorker(${JSON.stringify(exports.rpcWorkerInitModule)}).then(resolve,reject);
        },reject)`, true);
            return await new backend_1.WebMessage.Connection().connect(worker.workerId, 300);
        }
        else if (url2.protocol == 'pxseedjs:') {
            //For user custom connection factory.
            //potential security issue?
            if (exports.__internal__.isPxseedWorker) {
                let fn = await getAttachedRemoteRigstryFunction((await (0, rpcworker_1.getRpcClientConnectWorkerParent)()));
                let remoteIo = await fn.getConnectionFromUrl(url);
                return new IoOverPxprpc(remoteIo);
            }
            else {
                let functionDelim = url2.pathname.lastIndexOf('.');
                let moduleName = url2.pathname.substring(0, functionDelim);
                let functionName = url2.pathname.substring(functionDelim + 1);
                return (await new Promise((resolve_2, reject_2) => { require([moduleName], resolve_2, reject_2); }))[functionName](url2.toString());
            }
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
        return registered.get(name);
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
    //"ServerHost" usually refer to the server hosting pxseed web, and shared by all js worker in one pxeed application.
    exports.ServerHostRpcName = 'server host';
    //"ServerHostWorker1" refer to the worker spawn by ServerHost to handle the most remote requests.
    exports.ServerHostWorker1RpcName = 'server host worker 1';
    exports.WebWorker1RpcName = 'webworker 1';
    exports.ServiceWorker = 'service worker 1';
    async function addPxseedJsBuiltinClient() {
        if (globalThis.location != undefined && ['http:', 'https:'].includes(globalThis.location.protocol)
            && globalThis.__pxseedInit != undefined) {
            if (getRegistered(exports.ServerHostRpcName) != null && getRegistered(exports.ServerHostWorker1RpcName) == null) {
                await addClient('iooverpxprpc:' + exports.ServerHostRpcName + '/' +
                    encodeURIComponent('webworker:' + exports.__name__ + '/worker/1'), exports.ServerHostWorker1RpcName);
            }
            if (getRegistered(exports.ServiceWorker) == null) {
                await addClient('serviceworker:1', exports.ServiceWorker);
            }
            if (getRegistered(exports.WebWorker1RpcName) == null) {
                await addClient('webworker:' + exports.__name__ + '/worker/1', exports.WebWorker1RpcName);
            }
        }
        else {
            if (getRegistered(exports.ServerHostWorker1RpcName) == null) {
                await addClient('webworker:' + exports.__name__ + '/worker/1', exports.ServerHostWorker1RpcName);
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
            if (config.registered != undefined) {
                config.registered.forEach(item => {
                    let { name, url } = item;
                    name = (name == undefined || name === '') ? url.toString() : name;
                    let clie = registered.get(name);
                    if (clie == undefined) {
                        //Skip if existed, To avoid connection lost unexpected.
                        clie = new ClientInfo(name, url);
                    }
                    clie.url = url;
                    registered.set(name, clie);
                });
            }
            await addPxseedJsBuiltinClient();
        }
    };
    //Before typescript support syntax like <typeof import(T)>, we can only tell module type explicitly.
    //Only support plain JSON parameter and return value.
    async function importRemoteModule(rpc, moduleName) {
        let funcs = null;
        funcs = await getAttachedRemoteRigstryFunction(rpc);
        let proxyModule = new Proxy({}, {
            get(target, p) {
                //Avoid triggle by Promise.resolve
                if (p === 'then')
                    return undefined;
                return async (...params) => {
                    return await funcs.callJsonFunction(moduleName, p, params);
                };
            }
        });
        return proxyModule;
    }
    async function easyCallRemoteJsonFunction(rpc, moduleName, funcName, args) {
        let funcs = null;
        funcs = await getAttachedRemoteRigstryFunction(rpc);
        return funcs.callJsonFunction(moduleName, funcName, args);
    }
});
//# sourceMappingURL=registry.js.map