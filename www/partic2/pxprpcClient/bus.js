define(["require", "exports", "pxprpc/extend", "partic2/jsutils1/base", "./registry"], function (require, exports, extend_1, base_1, registry_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.RemotePxseedJsIoServer = exports.PxseedJsIoServer = exports.BusHostServer = void 0;
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
        }
        close() {
            this.pendingAccept.cancelWaiting();
            this.closed = true;
            this.pendingAccept.arr().length = 0;
            delete PxseedJsIoServer.serving[this.name];
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
    exports.RemotePxseedJsIoServer = {
        connect: async (name, client1) => {
            if (client1 == undefined) {
                client1 = await (await (0, registry_1.getPersistentRegistered)(exports.BusHostServer.get())).ensureConnected();
            }
            (await (await (0, registry_1.getAttachedRemoteRigstryFunction)(client1)).loadModule(__name__)).free();
            let fn = await (0, registry_1.getRpcFunctionOn)(client1, __name__ + '.PxseedJsIoServerConnect', 's->o');
            return new registry_1.IoOverPxprpc(await fn.call(name));
        },
        serve: async (name, cb, client1) => {
            if (client1 == undefined) {
                client1 = await (await (0, registry_1.getPersistentRegistered)(exports.BusHostServer.get())).ensureConnected();
            }
            (await (await (0, registry_1.getAttachedRemoteRigstryFunction)(client1)).loadModule(__name__)).free();
            let fn = await (0, registry_1.getRpcFunctionOn)(client1, __name__ + '.newPxseedJsIoServer', 's->o');
            let remoteServer = await fn.call(name);
            fn = await (0, registry_1.getRpcFunctionOn)(client1, __name__ + '.PxseedJsIoServerAccept', 'o->o');
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
            (await (await (0, registry_1.getAttachedRemoteRigstryFunction)(client1)).loadModule(__name__)).free();
            let fn = await (0, registry_1.getRpcFunctionOn)(client1, __name__ + '.PxseedJsIoServerPrefixQuery', 's->b');
            return new extend_1.TableSerializer().load(await fn.call(prefix)).toArray();
        }
    };
});
//# sourceMappingURL=bus.js.map