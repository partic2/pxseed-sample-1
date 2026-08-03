define("partic2/pxprpcClient/pxseedremotefuncs", ["require", "exports", "partic2/jsutils1/base", "pxprpc/backend", "pxprpc/base", "pxprpc/extend", "partic2/pxprpcBinding/utils", "partic2/jsutils1/webutils"], function (require, exports, base_1, backend_1, base_2, extend_1, utils_1, webutils_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.openConnectionFromUrlImpl = exports.RpcWorker = exports.IoOverPxprpc = exports.RpcSerializeMagicMark = void 0;
    exports.createIoPipe = createIoPipe;
    exports.getAttachedRemoteRigstryFunction = getAttachedRemoteRigstryFunction;
    exports.openConnectionFromUrl = openConnectionFromUrl;
    exports.importRemoteModule = importRemoteModule;
    exports.easyCallRemoteJsonFunction = easyCallRemoteJsonFunction;
    let __name__ = base_1.requirejs.getLocalRequireModule(require);
    exports.RpcSerializeMagicMark = '__DUz66NYkWuMdex9k2mvwBbYN__';
    //These function is in ./registry and now we move it here, But we use the old rpc name for compatibility.
    let rpcFuncPrefix = webutils_1.path.join(__name__, '../registry');
    extend_1.defaultFuncMap[rpcFuncPrefix + '.loadModule'] = new extend_1.RpcExtendServerCallable(async (name) => { await new Promise((resolve_1, reject_1) => { require([name], resolve_1, reject_1); }); }).typedecl('s->');
    extend_1.defaultFuncMap[rpcFuncPrefix + '.unloadModule'] = new extend_1.RpcExtendServerCallable(async (name) => base_1.requirejs.undef(name)).typedecl('s->');
    extend_1.defaultFuncMap[rpcFuncPrefix + '.getDefined'] = new extend_1.RpcExtendServerCallable(async () => base_1.requirejs.getDefined()).typedecl('s->o');
    extend_1.defaultFuncMap[rpcFuncPrefix + '.openConnectionFromUrl'] = new extend_1.RpcExtendServerCallable(async (url) => {
        return await openConnectionFromUrl(url);
    }).typedecl('s->o');
    extend_1.defaultFuncMap[rpcFuncPrefix + '.runJsonResultCode'] = new extend_1.RpcExtendServerCallable(async (code) => {
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
            if (t1 != undefined && t1[exports.RpcSerializeMagicMark].autoClose === true && typeof t1.close === 'function') {
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
    extend_1.defaultFuncMap[rpcFuncPrefix + '.freeObjectInRemoteObjectPool'] = new extend_1.RpcExtendServerCallable(async (objectPool, id) => {
        objectPool.delete(id);
    }).typedecl('os->');
    extend_1.defaultFuncMap[rpcFuncPrefix + '.allocateRemoteObjectPool'] = new extend_1.RpcExtendServerCallable(async () => {
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
    extend_1.defaultFuncMap[rpcFuncPrefix + '.callJsonFunction'] = new extend_1.RpcExtendServerCallable(async (requestJson, extraBytes, objectPool) => {
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
            let callable = thisObject[request.method];
            (0, base_1.assert)(typeof callable === 'function', thisObject.constructor.name + '.' + request.method + ' is not callable');
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
                        let id = (0, base_1.GenerateRandomString)();
                        if (objectPool != null) {
                            objectPool.set(id, value);
                        }
                        return { [exports.RpcSerializeMagicMark]: { t: 'RpcRemoteObject', ...markProp, id } };
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
                                get(target, prop) {
                                    if (prop === exports.RpcSerializeMagicMark)
                                        return target[prop];
                                    //Avoid triggle by Promise.resolve
                                    if (prop === 'then')
                                        return target[prop];
                                    //Avoid triggle by JSON.stringify
                                    if (prop === 'toJSON')
                                        return target[prop];
                                    if (prop === 'close')
                                        return async () => funcs.freeObjectInRemoteObjectPool(target);
                                    return async (...params) => {
                                        return await funcs.callJsonFunction(target, prop, params);
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
        async openConnectionFromUrl(url) {
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
                    await (0, utils_1.getRpcFunctionOn)(this.client1, rpcFuncPrefix + '.loadModule', 's->'),
                    await (0, utils_1.getRpcFunctionOn)(this.client1, rpcFuncPrefix + '.openConnectionFromUrl', 's->o'),
                    await (0, utils_1.getRpcFunctionOn)(this.client1, 'pxprpc_pp.io_send', 'ob->'),
                    await (0, utils_1.getRpcFunctionOn)(this.client1, 'pxprpc_pp.io_receive', 'o->b'),
                    await (0, utils_1.getRpcFunctionOn)(this.client1, 'builtin.jsExec', 'so->o'),
                    await (0, utils_1.getRpcFunctionOn)(this.client1, 'builtin.bufferData', 'o->b'), //[5]
                    await (0, utils_1.getRpcFunctionOn)(this.client1, 'builtin.anyToString', 'o->s'),
                    await (0, utils_1.getRpcFunctionOn)(this.client1, rpcFuncPrefix + '.callJsonFunction', 'sbo->sb'),
                    await (0, utils_1.getRpcFunctionOn)(this.client1, rpcFuncPrefix + '.unloadModule', 's->'),
                    await (0, utils_1.getRpcFunctionOn)(this.client1, rpcFuncPrefix + '.runJsonResultCode', 's->s'),
                    await (0, utils_1.getRpcFunctionOn)(this.client1, rpcFuncPrefix + '.allocateRemoteObjectPool', '->o'), //[10]
                    await (0, utils_1.getRpcFunctionOn)(this.client1, rpcFuncPrefix + '.freeObjectInRemoteObjectPool', 'os->')
                ];
            }
        }
    }
    const attachedRemoteRigstryFunctionName = rpcFuncPrefix + '.RemoteRegistryFunction';
    async function getAttachedRemoteRigstryFunction(client1) {
        if (!(client1 instanceof extend_1.RpcExtendClient1)) {
            client1 = await client1.get();
        }
        let f = (0, utils_1.getRpcLocalVariable)(client1, attachedRemoteRigstryFunctionName);
        if (f == undefined) {
            f = new RemoteRegistryFunctionImpl();
            f.client1 = client1;
            await f.ensureInit();
            (0, utils_1.setRpcLocalVariable)(client1, attachedRemoteRigstryFunctionName, f);
        }
        return f;
    }
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
                        let { rpcWorkerInitModule } = await new Promise((resolve_3, reject_3) => { require(['./registry'], resolve_3, reject_3); });
                        let { rpcId } = await new Promise((resolve_4, reject_4) => { require(['./rpcworker'], resolve_4, reject_4); });
                        await this.wt.call('partic2/pxprpcClient/rpcworker', '__internalInitRpcWorker', [rpcWorkerInitModule, rpcId.get()]);
                        this.conn = await new backend_1.WebMessage.Connection().connect(this.wt.workerId, 500);
                    }
                }
                return this.conn;
            });
        }
    }
    exports.RpcWorker = RpcWorker;
    RpcWorker.connectingMutex = {};
    exports.openConnectionFromUrlImpl = new base_1.Ref2(async function (url) {
        let url2 = new URL(url);
        if (url2.protocol == 'pxpwebmessage:') {
            let { __internal__, getRpcClientConnectWorkerParent } = await new Promise((resolve_5, reject_5) => { require(['./rpcworker'], resolve_5, reject_5); });
            if (__internal__.isPxseedWorker) {
                let fn = await getAttachedRemoteRigstryFunction((await getRpcClientConnectWorkerParent()));
                let remoteIo = await fn.openConnectionFromUrl(url);
                return new IoOverPxprpc(remoteIo);
            }
            else {
                let conn = new backend_1.WebMessage.Connection();
                await conn.connect(url2.pathname, 300);
                return conn;
            }
        }
        else if (url2.protocol == 'webworker:') {
            let { __internal__, getRpcClientConnectWorkerParent } = await new Promise((resolve_6, reject_6) => { require(['./rpcworker'], resolve_6, reject_6); });
            if (__internal__.isPxseedWorker) {
                let fn = await getAttachedRemoteRigstryFunction((await getRpcClientConnectWorkerParent()));
                let remoteIo = await fn.openConnectionFromUrl(url);
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
            let { getRegistered } = await new Promise((resolve_7, reject_7) => { require(['./registry'], resolve_7, reject_7); });
            let cinfo = await getRegistered(firstRpcName);
            let rpcClient = null;
            if (cinfo == undefined) {
                rpcClient = new extend_1.RpcExtendClient1(new base_2.Client((await openConnectionFromUrl(firstRpcName))));
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
            let remoteIo = await fn.openConnectionFromUrl(restRpcPath);
            return new IoOverPxprpc(remoteIo);
        }
        else if (url2.protocol == 'serviceworker:') {
            if (url2.pathname !== '1') {
                throw new Error('Only support default service worker(serviceworker:1)');
            }
            let swu = await new Promise((resolve_8, reject_8) => { require(['partic2/jsutils1/webutilssw'], resolve_8, reject_8); });
            let worker = await swu.ensureServiceWorkerInstalled();
            backend_1.WebMessage.bind(worker.port);
            let { rpcWorkerInitModule } = await new Promise((resolve_9, reject_9) => { require(['./registry'], resolve_9, reject_9); });
            await worker.call('partic2/pxprpcClient/rpcworker', '__internalInitRpcWorker', [rpcWorkerInitModule]);
            return await new backend_1.WebMessage.Connection().connect(worker.workerId, 300);
        }
        else if (url2.protocol == 'pxseedjs:') {
            let { __internal__, getRpcClientConnectWorkerParent } = await new Promise((resolve_10, reject_10) => { require(['./rpcworker'], resolve_10, reject_10); });
            if (__internal__.isPxseedWorker) {
                let fn = await getAttachedRemoteRigstryFunction((await getRpcClientConnectWorkerParent()));
                let remoteIo = await fn.openConnectionFromUrl(url);
                return new IoOverPxprpc(remoteIo);
            }
            else {
                let functionDelim = url2.pathname.lastIndexOf('.');
                let moduleName = url2.pathname.substring(0, functionDelim);
                let functionName = url2.pathname.substring(functionDelim + 1);
                return (await new Promise((resolve_11, reject_11) => { require([moduleName], resolve_11, reject_11); }))[functionName](url2.toString());
            }
        }
        return null;
    });
    async function openConnectionFromUrl(url) {
        return exports.openConnectionFromUrlImpl.get()(url);
    }
    //Before typescript support syntax like <typeof import(T)>, we can only tell module type explicitly.
    //Only support plain JSON parameter and return value.
    async function importRemoteModule(rpc, moduleName) {
        let funcs = null;
        if (!(rpc instanceof extend_1.RpcExtendClient1)) {
            rpc = await rpc.get();
        }
        funcs = await getAttachedRemoteRigstryFunction(rpc);
        let proxyModule = new Proxy({}, {
            get(target, prop) {
                //Avoid triggle by Promise.resolve
                if (prop === 'then')
                    return undefined;
                //Avoid triggle by JSON.stringify
                if (prop === 'toJSON')
                    return undefined;
                if (prop === 'close')
                    return async () => { };
                return async (...params) => {
                    return await funcs.callJsonFunction(moduleName, prop, params);
                };
            }
        });
        return proxyModule;
    }
    async function easyCallRemoteJsonFunction(rpc, moduleName, funcName, args) {
        let funcs = null;
        if (!(rpc instanceof extend_1.RpcExtendClient1)) {
            rpc = await rpc.get();
        }
        funcs = await getAttachedRemoteRigstryFunction(rpc);
        let r = await funcs.callJsonFunction(moduleName, funcName, args);
        return r;
    }
});
