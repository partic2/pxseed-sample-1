define("partic2/pxprpcClient/bus", ["require", "exports", "pxprpc/extend", "partic2/jsutils1/base", "./registry", "partic2/pxprpcBinding/utils", "partic2/jsutils1/webutils", "partic2/CodeRunner/jsutils2", "pxprpc/backend"], function (require, exports, extend_1, base_1, registry_1, utils_1, webutils_1, jsutils2_1, backend_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.PxprpcIoFromRawStream = exports.RemotePxseedJsIoServer = exports.PxseedJsIoServer = exports.BusHostServer = void 0;
    exports.createIoPxseedJsUrl = createIoPxseedJsUrl;
    let __name__ = base_1.requirejs.getLocalRequireModule(require);
    exports.BusHostServer = new base_1.Ref2(registry_1.ServerHostRpcName);
    class PxseedJsIoServer {
        constructor(name) {
            this.name = name;
            this.pendingAccept = new base_1.ArrayWrap2();
            this.closed = false;
            this.pendingAccept.queueSizeLimit = 5;
            if (PxseedJsIoServer.serving[name] != undefined) {
                PxseedJsIoServer.serving[name].close();
            }
            PxseedJsIoServer.serving[name] = this;
            PxseedJsIoServer.servingChangeEvent.setResult(0);
            PxseedJsIoServer.servingChangeEvent = new base_1.future();
        }
        close() {
            this.pendingAccept.cancelWaiting();
            this.closed = true;
            this.pendingAccept.arr().length = 0;
            delete PxseedJsIoServer.serving[this.name];
            PxseedJsIoServer.servingChangeEvent.setResult(0);
            PxseedJsIoServer.servingChangeEvent = new base_1.future();
        }
        async accept() {
            if (this.closed)
                throw new Error('closed.');
            return await this.pendingAccept.queueBlockShift();
        }
        async connect() {
            if (this.closed)
                throw new Error('closed.');
            let [a, b] = (0, registry_1.createIoPipe)();
            await this.pendingAccept.queueBlockPush(b);
            return a;
        }
        static async connect(name) {
            if (this.serving[name] != undefined) {
                return this.serving[name].connect();
            }
            else {
                return null;
            }
        }
    }
    exports.PxseedJsIoServer = PxseedJsIoServer;
    PxseedJsIoServer.serving = {};
    PxseedJsIoServer.servingChangeEvent = new base_1.future();
    extend_1.defaultFuncMap[__name__ + '.newPxseedJsIoServer'] = new extend_1.RpcExtendServerCallable(async (name) => new PxseedJsIoServer(name)).typedecl('s->o');
    extend_1.defaultFuncMap[__name__ + '.PxseedJsIoServerAccept'] = new extend_1.RpcExtendServerCallable(async (server) => {
        return await server.accept();
    }).typedecl('o->o');
    extend_1.defaultFuncMap[__name__ + '.PxseedJsIoServerConnect'] = new extend_1.RpcExtendServerCallable(async (name) => {
        return await PxseedJsIoServer.connect(name);
    }).typedecl('s->o');
    extend_1.defaultFuncMap[__name__ + '.PxseedJsIoServerPrefixQuery'] = new extend_1.RpcExtendServerCallable(async (prefix) => {
        return new extend_1.TableSerializer().fromArray(Object.keys(PxseedJsIoServer.serving).filter(t1 => t1.startsWith(prefix))).build();
    }).typedecl('s->b');
    extend_1.defaultFuncMap[__name__ + '.PxseedJsIoServerWaitServingChange'] = new extend_1.RpcExtendServerCallable(async () => {
        await PxseedJsIoServer.servingChangeEvent.get();
    }).typedecl('->');
    exports.RemotePxseedJsIoServer = {
        connect: async (name, client1) => {
            if (client1 == undefined) {
                client1 = await (await (0, registry_1.getPersistentRegistered)(exports.BusHostServer.get())).ensureConnected();
            }
            await (await (0, registry_1.getAttachedRemoteRigstryFunction)(client1)).loadModule(__name__);
            let fn = await (0, utils_1.getRpcFunctionOn)(client1, __name__ + '.PxseedJsIoServerConnect', 's->o');
            return new registry_1.IoOverPxprpc(await fn.call(name));
        },
        serve: async (name, cb, client1) => {
            if (client1 == undefined) {
                client1 = await (await (0, registry_1.getPersistentRegistered)(exports.BusHostServer.get())).ensureConnected();
            }
            await (await (0, registry_1.getAttachedRemoteRigstryFunction)(client1)).loadModule(__name__);
            let fn = await (0, utils_1.getRpcFunctionOn)(client1, __name__ + '.newPxseedJsIoServer', 's->o');
            let remoteServer = await fn.call(name);
            fn = await (0, utils_1.getRpcFunctionOn)(client1, __name__ + '.PxseedJsIoServerAccept', 'o->o');
            fn.poll((err, result) => {
                if (err != null) {
                    remoteServer.free();
                    cb.onError?.(err);
                }
                else {
                    cb.onConnect(new registry_1.IoOverPxprpc(result));
                }
            }, remoteServer);
            return { close: () => remoteServer.free() };
        },
        prefixQuery: async (prefix, client1) => {
            if (client1 == undefined) {
                client1 = await (await (0, registry_1.getPersistentRegistered)(exports.BusHostServer.get())).ensureConnected();
            }
            await (await (0, registry_1.getAttachedRemoteRigstryFunction)(client1)).loadModule(__name__);
            let fn = await (0, utils_1.getRpcFunctionOn)(client1, __name__ + '.PxseedJsIoServerPrefixQuery', 's->b');
            return new extend_1.TableSerializer().load(await fn.call(prefix)).toArray();
        },
        waitServingChange: async (client1) => {
            if (client1 == undefined) {
                client1 = await (await (0, registry_1.getPersistentRegistered)(exports.BusHostServer.get())).ensureConnected();
            }
            await (await (0, registry_1.getAttachedRemoteRigstryFunction)(client1)).loadModule(__name__);
            let fn = await (0, utils_1.getRpcFunctionOn)(client1, __name__ + '.PxseedJsIoServerWaitServingChange', '->');
            await fn.call();
        }
    };
    class PxprpcIoFromRawStream {
        constructor(stream) {
            this.stream = stream;
            this.r = new jsutils2_1.ExtendStreamReader(stream[0].getReader());
            this.w = stream[1].getWriter();
        }
        async receive() {
            let buf1 = await this.r.readForNBytes(4);
            let size = new DataView(buf1.buffer).getInt32(0, true);
            return await this.r.readForNBytes(size);
        }
        async send(data) {
            let size = data.reduce((prev, curr) => prev + curr.byteLength, 0);
            let buf1 = new Uint8Array(4);
            new DataView(buf1.buffer).setInt32(0, size, true);
            this.w.write(buf1);
            data.forEach((buf2) => {
                this.w.write(buf2);
            });
        }
        close() {
            this.w.close().catch(() => { });
            this.stream[1].close().catch(() => { });
            this.stream[0].cancel().catch(() => { });
        }
    }
    exports.PxprpcIoFromRawStream = PxprpcIoFromRawStream;
    async function createIoPxseedJsUrl(url) {
        let type = (0, webutils_1.GetUrlQueryVariable2)(url, 'type') ?? 'tcp';
        let { buildTjs } = await new Promise((resolve_1, reject_1) => { require(['partic2/tjshelper/tjsbuilder'], resolve_1, reject_1); });
        let { TjsReaderDataSource, TjsWriterDataSink } = await new Promise((resolve_2, reject_2) => { require(['partic2/tjshelper/tjsutil'], resolve_2, reject_2); });
        if (type === 'tcp') {
            let host = (0, webutils_1.GetUrlQueryVariable2)(url, 'host') ?? '127.0.0.1';
            let port = Number((0, webutils_1.GetUrlQueryVariable2)(url, 'port'));
            let tjs = await buildTjs();
            let conn = await tjs.connect('tcp', host, port);
            return new PxprpcIoFromRawStream([
                new ReadableStream(new TjsReaderDataSource(conn)),
                new WritableStream(new TjsWriterDataSink(conn))
            ]);
        }
        else if (type == 'pipe') {
            let path = (0, webutils_1.GetUrlQueryVariable2)(url, 'pipe');
            (0, base_1.assert)(path != null);
            let tjs = await buildTjs();
            let conn = await tjs.connect('pipe', path);
            return new PxprpcIoFromRawStream([
                new ReadableStream(new TjsReaderDataSource(conn)),
                new WritableStream(new TjsWriterDataSink(conn))
            ]);
        }
        else if (type == 'ws') {
            let target = (0, webutils_1.GetUrlQueryVariable2)(url, 'target');
            (0, base_1.assert)(target != null);
            let io = await new backend_1.WebSocketIo().connect(decodeURIComponent(target));
            return io;
        }
        throw new Error(`Unsupported type ${type}`);
    }
});
