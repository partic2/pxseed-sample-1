define("partic2/pxprpcClient/registry", ["require", "exports", "partic2/jsutils1/base", "partic2/jsutils1/webutils", "pxprpc/backend", "pxprpc/base", "pxprpc/extend", "./rpcworker", "partic2/pxprpcBinding/utils"], function (require, exports, base_1, webutils_1, backend_1, base_2, extend_1, rpcworker_1, utils_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.persistent = exports.ServiceWorker = exports.WebWorker1RpcName = exports.ServerHostWorker1RpcName = exports.ServerHostRpcName = exports.__internal__ = exports.IoOverPxprpc = exports.ClientInfo = exports.RpcWorker = exports.rpcWorkerInitModule = exports.RpcSerializeMagicMark = exports.__name__ = void 0;
    exports.createIoPipe = createIoPipe;
    exports.getAttachedRemoteRigstryFunction = getAttachedRemoteRigstryFunction;
    exports.getConnectionFromUrl = getConnectionFromUrl;
    exports.getRegistered = getRegistered;
    exports.listRegistered = listRegistered;
    exports.getPersistentRegistered = getPersistentRegistered;
    exports.listPersistentRegistered = listPersistentRegistered;
    exports.setIsServingRpcName = setIsServingRpcName;
    exports.getIsServingRpcName = getIsServingRpcName;
    exports.isServerHost = isServerHost;
    exports.addClient = addClient;
    exports.removeClient = removeClient;
    exports.importRemoteModule = importRemoteModule;
    exports.easyCallRemoteJsonFunction = easyCallRemoteJsonFunction;
    exports.__name__ = base_1.requirejs.getLocalRequireModule(require);
    exports.RpcSerializeMagicMark = '__DUz66NYkWuMdex9k2mvwBbYN__';
    exports.rpcWorkerInitModule = [];
    extend_1.defaultFuncMap[exports.__name__ + '.loadModule'] = new extend_1.RpcExtendServerCallable(async (name) => { await new Promise((resolve_1, reject_1) => { require([name], resolve_1, reject_1); }); }).typedecl('s->');
    extend_1.defaultFuncMap[exports.__name__ + '.unloadModule'] = new extend_1.RpcExtendServerCallable(async (name) => base_1.requirejs.undef(name)).typedecl('s->');
    extend_1.defaultFuncMap[exports.__name__ + '.getDefined'] = new extend_1.RpcExtendServerCallable(async () => base_1.requirejs.getDefined()).typedecl('s->o');
    extend_1.defaultFuncMap[exports.__name__ + '.getConnectionFromUrl'] = new extend_1.RpcExtendServerCallable(async (url) => {
        return await getConnectionFromUrl(url);
    }).typedecl('s->o');
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
    class RemoteObjectPoolDefaultImpl extends Map {
        delete(key) {
            let t1 = this.get(key);
            if (t1 != null && typeof t1.close === 'function') {
                t1.close();
            }
            return super.delete(key);
        }
        close() {
            for (let t1 of this.keys()) {
                this.delete(t1);
            }
        }
    }
    extend_1.defaultFuncMap[exports.__name__ + '.freeObjectInRemoteObjectPool'] = new extend_1.RpcExtendServerCallable(async (objectPool, id) => {
        objectPool.delete(id);
    }).typedecl('os->');
    extend_1.defaultFuncMap[exports.__name__ + '.allocateRemoteObjectPool'] = new extend_1.RpcExtendServerCallable(async () => {
        return new RemoteObjectPoolDefaultImpl();
    }).typedecl('->o');
    function unpackExtraBytesArray(extraBytes) {
        if (extraBytes.length == 0)
            return [];
        let bytesArray = new Array();
        let ser = new base_2.Serializer().prepareUnserializing(extraBytes);
        let count = ser.getVarint();
        for (let t1 = 0; t1 < count; t1++) {
            bytesArray.push(ser.getBytes());
        }
        return bytesArray;
    }
    function packExtraBytesArray(bytesArray) {
        let ser = new base_2.Serializer().prepareSerializing(32);
        ser.putVarint(bytesArray.length);
        bytesArray.forEach((val) => ser.putBytes(val));
        return ser.build();
    }
    extend_1.defaultFuncMap[exports.__name__ + '.callJsonFunction'] = new extend_1.RpcExtendServerCallable(async (requestJson, extraBytes, objectPool) => {
        try {
            let extraBytesArray = unpackExtraBytesArray(extraBytes);
            let request = JSON.parse(requestJson, (key, value) => {
                if (typeof value === 'object' && value !== null) {
                    if (value[exports.RpcSerializeMagicMark] === true) {
                        if (value.t === 'Uint8Array') {
                            return extraBytesArray[value.i];
                        }
                        else if (value.t === 'ArrayBuffer') {
                            return extraBytesArray[value.i].buffer;
                        }
                        else if (value.v instanceof Array) {
                            return new globalThis[value.t](...value.v);
                        }
                        else if (value.t === 'Int8Array') {
                            return new Int8Array(extraBytesArray[value.i].buffer);
                        }
                    }
                    else if (value[exports.RpcSerializeMagicMark] != undefined) {
                        let markProp = value[exports.RpcSerializeMagicMark];
                        if (markProp.t === 'RpcRemoteObject') {
                            return objectPool.get(markProp.id);
                        }
                        else {
                            return value;
                        }
                    }
                    else {
                        return value;
                    }
                }
                else {
                    return value;
                }
            });
            let thisObject = {};
            if (request.module != undefined) {
                thisObject = await new Promise((resolve_2, reject_2) => { require([request.module], resolve_2, reject_2); });
            }
            else if (request.object != undefined) {
                thisObject = objectPool.get(request.object);
            }
            extraBytesArray = new Array();
            return [
                JSON.stringify({ result: (await thisObject[request.method](...request.params)) ?? null }, (key, value) => {
                    if (value instanceof Uint8Array) {
                        extraBytesArray.push(value);
                        return { [exports.RpcSerializeMagicMark]: true, t: 'Uint8Array', i: extraBytesArray.length - 1 };
                    }
                    else if (value instanceof ArrayBuffer) {
                        extraBytesArray.push(new Uint8Array(value));
                        return { [exports.RpcSerializeMagicMark]: true, t: 'ArrayBuffer', i: extraBytesArray.length - 1 };
                    }
                    else if (value instanceof Int8Array) {
                        extraBytesArray.push(new Uint8Array(value.buffer, value.byteOffset, value.byteLength));
                        return { [exports.RpcSerializeMagicMark]: true, t: 'Int8Array', i: extraBytesArray.length - 1 };
                    }
                    else if (typeof value === 'object' && value !== null && value[exports.RpcSerializeMagicMark] != undefined) {
                        let markProp = value[exports.RpcSerializeMagicMark];
                        if (markProp.id === undefined) {
                            markProp.id = (0, base_1.GenerateRandomString)(8);
                        }
                        if (objectPool != null) {
                            objectPool.set(markProp.id, value);
                        }
                        return { [exports.RpcSerializeMagicMark]: { t: 'RpcRemoteObject', ...markProp } };
                    }
                    else {
                        return value;
                    }
                }),
                packExtraBytesArray(extraBytesArray)
            ];
        }
        catch (err) {
            return [JSON.stringify({ error: {
                        message: err.message,
                        stack: err.stack
                    }
                }), new base_2.Serializer().prepareSerializing(1).putVarint(0).build()
            ];
        }
    }).typedecl('sbo->sb');
    class RpcWorker {
        constructor(workerId) {
            this.initDone = new base_1.future();
            this.workerId = '';
            this.workerId = workerId ?? (0, base_1.GenerateRandomString)();
        }
        async ensureConnection() {
            if (RpcWorker.connectingMutex[this.workerId] == undefined) {
                RpcWorker.connectingMutex[this.workerId] = new base_1.mutex();
            }
            let mtx = RpcWorker.connectingMutex[this.workerId];
            return await mtx.exec(async () => {
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
                        await this.wt.call('partic2/pxprpcClient/rpcworker', '__internalInitRpcWorker', [exports.rpcWorkerInitModule, rpcworker_1.rpcId.get()]);
                        this.conn = await new backend_1.WebMessage.Connection().connect(this.wt.workerId, 500);
                    }
                }
                return this.conn;
            });
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
    RpcWorker.connectingMutex = {};
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
            await fn.loadModule(name);
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
        toJSON() {
            return { name: this.name, url: this.url };
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
    let remoteObjectPoolFree = globalThis.FinalizationRegistry ? new FinalizationRegistry((v) => {
        v[1].freeObjectInRemoteObjectPool({ [exports.RpcSerializeMagicMark]: { id: v[0], t: 'RpcRemoteObject' } });
    }) : null;
    class RemoteRegistryFunctionImpl {
        constructor() {
            this.funcs = [];
        }
        async loadModule(name) {
            return this.funcs[0].call(name);
        }
        async callJsonFunction(moduleNameOrThisObject, functionName, params, objectPool) {
            let request = {
                method: functionName,
                params: params
            };
            if (typeof moduleNameOrThisObject === 'object' && moduleNameOrThisObject[exports.RpcSerializeMagicMark] != undefined) {
                request.object = moduleNameOrThisObject[exports.RpcSerializeMagicMark].id;
            }
            else {
                request.module = moduleNameOrThisObject;
            }
            if (objectPool == undefined) {
                if (this.defaultObjectPool == undefined) {
                    this.defaultObjectPool = await this.allocateRemoteObjectPool();
                }
                objectPool = this.defaultObjectPool;
            }
            let extraBytesArray = new Array();
            let requestJson = JSON.stringify(request, (key, value) => {
                if (value instanceof Uint8Array) {
                    extraBytesArray.push(value);
                    return { [exports.RpcSerializeMagicMark]: true, t: 'Uint8Array', i: extraBytesArray.length - 1 };
                }
                else if (value instanceof ArrayBuffer) {
                    extraBytesArray.push(new Uint8Array(value));
                    return { [exports.RpcSerializeMagicMark]: true, t: 'ArrayBuffer', i: extraBytesArray.length - 1 };
                }
                else if (value instanceof Int8Array) {
                    extraBytesArray.push(new Uint8Array(value.buffer, value.byteOffset, value.byteLength));
                    return { [exports.RpcSerializeMagicMark]: true, t: 'Int8Array', i: extraBytesArray.length - 1 };
                }
                return value;
            });
            let [responseJson, extraBytes] = await this.funcs[7].call(requestJson, packExtraBytesArray(extraBytesArray), objectPool);
            extraBytesArray = unpackExtraBytesArray(extraBytes);
            let response = JSON.parse(responseJson, (key, value) => {
                if (typeof value === 'object' && value !== null) {
                    if (value[exports.RpcSerializeMagicMark] === true) {
                        if (value.t === 'Uint8Array') {
                            return extraBytesArray[value.i];
                        }
                        else if (value.t === 'ArrayBuffer') {
                            return extraBytesArray[value.i].buffer;
                        }
                        else if (value.v instanceof Array) {
                            return new globalThis[value.t](...value.v);
                        }
                        else if (value.t === 'Int8Array') {
                            return new Int8Array(extraBytesArray[value.i].buffer);
                        }
                    }
                    else if (value[exports.RpcSerializeMagicMark] != undefined) {
                        let markProp = value[exports.RpcSerializeMagicMark];
                        let funcs = this;
                        if (markProp.t === 'RpcRemoteObject') {
                            let p = new Proxy(value, {
                                get(target, p) {
                                    //Avoid triggle by Promise.resolve
                                    if (p === 'then')
                                        return undefined;
                                    if (p === exports.RpcSerializeMagicMark)
                                        return target[p];
                                    if (p === 'close')
                                        return async () => funcs.freeObjectInRemoteObjectPool(target);
                                    return async (...params) => {
                                        return await funcs.callJsonFunction(target, p, params);
                                    };
                                }
                            });
                            remoteObjectPoolFree?.register(p, [value[exports.RpcSerializeMagicMark].id, funcs]);
                            return p;
                        }
                        else {
                            return value;
                        }
                    }
                    else {
                        return value;
                    }
                }
                else {
                    return value;
                }
            });
            if (response.error != undefined) {
                let remoteErr = new RemoteCallFunctionError(response.error.message);
                remoteErr.remoteStack = response.error.stack;
                throw remoteErr;
            }
            return response.result;
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
        async allocateRemoteObjectPool() {
            return await this.funcs[10].call();
        }
        async freeObjectInRemoteObjectPool(object, objectPool) {
            objectPool = objectPool ?? this.defaultObjectPool;
            if (objectPool != undefined) {
                await this.funcs[11].call(objectPool ?? this.defaultObjectPool, object[exports.RpcSerializeMagicMark].id);
            }
        }
        async ensureInit() {
            if (this.funcs.length == 0) {
                this.funcs = [
                    await (0, utils_1.getRpcFunctionOn)(this.client1, exports.__name__ + '.loadModule', 's->'),
                    await (0, utils_1.getRpcFunctionOn)(this.client1, exports.__name__ + '.getConnectionFromUrl', 's->o'),
                    await (0, utils_1.getRpcFunctionOn)(this.client1, 'pxprpc_pp.io_send', 'ob->'),
                    await (0, utils_1.getRpcFunctionOn)(this.client1, 'pxprpc_pp.io_receive', 'o->b'),
                    await (0, utils_1.getRpcFunctionOn)(this.client1, 'builtin.jsExec', 'so->o'),
                    await (0, utils_1.getRpcFunctionOn)(this.client1, 'builtin.bufferData', 'o->b'), //[5]
                    await (0, utils_1.getRpcFunctionOn)(this.client1, 'builtin.anyToString', 'o->s'),
                    await (0, utils_1.getRpcFunctionOn)(this.client1, exports.__name__ + '.callJsonFunction', 'sbo->sb'),
                    await (0, utils_1.getRpcFunctionOn)(this.client1, exports.__name__ + '.unloadModule', 's->'),
                    await (0, utils_1.getRpcFunctionOn)(this.client1, exports.__name__ + '.runJsonResultCode', 's->s'),
                    await (0, utils_1.getRpcFunctionOn)(this.client1, exports.__name__ + '.allocateRemoteObjectPool', '->o'), //[10]
                    await (0, utils_1.getRpcFunctionOn)(this.client1, exports.__name__ + '.freeObjectInRemoteObjectPool', 'os->')
                ];
            }
        }
    }
    const attachedRemoteRigstryFunctionName = exports.__name__ + '.RemoteRegistryFunction';
    async function getAttachedRemoteRigstryFunction(client1) {
        let f = (0, utils_1.getRpcLocalVariable)(client1, attachedRemoteRigstryFunctionName);
        if (f == undefined) {
            f = new RemoteRegistryFunctionImpl();
            f.client1 = client1;
            await f.ensureInit();
            (0, utils_1.setRpcLocalVariable)(client1, attachedRemoteRigstryFunctionName, f);
        }
        return f;
    }
    exports.__internal__ = {
        isPxseedWorker: false,
        isServingRpcName: {}
    };
    async function getConnectionFromUrl(url) {
        let url2 = new URL(url);
        if (url2.protocol == 'pxpwebmessage:') {
            if (exports.__internal__.isPxseedWorker) {
                let fn = await getAttachedRemoteRigstryFunction((await (0, rpcworker_1.getRpcClientConnectWorkerParent)()));
                let remoteIo = await fn.getConnectionFromUrl(url);
                return new IoOverPxprpc(remoteIo);
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
            await exports.persistent.load();
            let cinfo = getRegistered(firstRpcName);
            let rpcClient = null;
            if (cinfo == undefined) {
                rpcClient = new extend_1.RpcExtendClient1(new base_2.Client((await getConnectionFromUrl(firstRpcName))));
                await rpcClient.init();
            }
            else {
                rpcClient = await cinfo.ensureConnected();
            }
            let fn = await getAttachedRemoteRigstryFunction(rpcClient);
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
            let swu = await new Promise((resolve_3, reject_3) => { require(['partic2/jsutils1/webutilssw'], resolve_3, reject_3); });
            let worker = await swu.ensureServiceWorkerInstalled();
            backend_1.WebMessage.bind(worker.port);
            await worker.call('partic2/pxprpcClient/rpcworker', '__internalInitRpcWorker', [exports.rpcWorkerInitModule]);
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
                return (await new Promise((resolve_4, reject_4) => { require([moduleName], resolve_4, reject_4); }))[functionName](url2.toString());
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
    //NOTE:this function will call addDefaultPxseedJsBuiltinRpcClient, which may connect ServerHost internal.
    //     So don't use this function directly when connecting to ServerHost, use persistent.load() instead.
    async function getPersistentRegistered(name) {
        await exports.persistent.load();
        await addDefaultPxseedJsBuiltinRpcClient();
        return registered.get(name);
    }
    //See also getPersistentRegistered
    async function listPersistentRegistered() {
        await exports.persistent.load();
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
            await exports.persistent.load();
            let rpc = getRegistered(name);
            if (rpc != undefined) {
                await easyCallRemoteJsonFunction(await rpc.ensureConnected(), exports.__name__, 'setIsServingRpcName', [name, true]);
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
    async function addClient(url, name) {
        name = (name == undefined || name === '') ? url.toString() : name;
        await exports.persistent.load();
        let clie = registered.get(name);
        if (clie == undefined) {
            //Skip if existed, To avoid connection lost unexpectedly.
            clie = new ClientInfo(name, url);
        }
        clie.url = url;
        registered.set(name, clie);
        await exports.persistent.save();
        return clie;
    }
    async function removeClient(name) {
        await exports.persistent.load();
        let clie = registered.get(name);
        if (clie != undefined) {
            clie.disconnect().catch(() => { });
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
    exports.persistent = {
        save: async function () {
            let config = await (0, webutils_1.GetPersistentConfig)(exports.__name__);
            config.registered = Array.from(registered.entries()).map(v => ({ name: v[0], url: v[1].url }));
            await (0, webutils_1.SavePersistentConfig)(exports.__name__);
        },
        load: async function () {
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
        let r = await funcs.callJsonFunction(moduleName, funcName, args);
        return r;
    }
    let addingDefaultPxseedJsBuiltinRpcClient = new base_1.mutex();
    async function addDefaultPxseedJsBuiltinRpcClient() {
        await addingDefaultPxseedJsBuiltinRpcClient.exec(async () => {
            if (globalThis.location != undefined && ['http:', 'https:'].includes(globalThis.location.protocol)) {
                if (getRegistered(exports.ServiceWorker) == null) {
                    await addClient('serviceworker:1', exports.ServiceWorker);
                }
            }
            if (getRegistered(exports.WebWorker1RpcName) == null) {
                await addClient('webworker:' + exports.__name__ + '/worker/1', exports.WebWorker1RpcName);
            }
            if (getRegistered(exports.ServerHostRpcName) != null && getRegistered(exports.ServerHostWorker1RpcName) == null && !exports.__internal__.isPxseedWorker) {
                await addClient('iooverpxprpc:' + exports.ServerHostRpcName + '/' +
                    encodeURIComponent('webworker:' + exports.__name__ + '/worker/1'), exports.ServerHostWorker1RpcName);
            }
        });
    }
});
