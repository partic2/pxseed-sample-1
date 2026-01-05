define(["require", "exports", "partic2/jsutils1/base", "pxprpc/extend", "pxprpc/base", "pxprpc/backend", "partic2/pxprpcClient/registry"], function (require, exports, base_1, extend_1, base_2, backend_1, registry_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.WebsocketPipe = exports.PxseedServer2023Function = void 0;
    exports.getServerConfig = getServerConfig;
    exports.restartSubprocessSelf = restartSubprocessSelf;
    class PxseedServer2023Function {
        async init(client1) {
            this.client1 = client1;
            this.remoteModule = await (0, registry_1.importRemoteModule)(this.client1, 'pxseedServer2023/pxseedhttpserver');
        }
        async exit() {
            await this.serverCommand('exit');
        }
        async subprocessWaitExitCode(index) {
            return this.serverCommand('subprocessWaitExitCode', index);
        }
        async subprocessRestart(index) {
            return this.serverCommand('subprocessRestart', index);
        }
        async serverCommand(cmd, param) {
            return this.remoteModule.serverCommand(cmd, param);
        }
        async buildEnviron() {
            return this.serverCommand('buildEnviron');
        }
        async buildPackages() {
            return this.serverCommand('buildPackages');
        }
        async rebuildPackages() {
            return this.serverCommand('rebuildPackages');
        }
        async getConfig() {
            return await this.serverCommand('getConfig');
        }
        async saveConfig(cfg) {
            return await this.serverCommand('saveConfig', cfg);
        }
    }
    exports.PxseedServer2023Function = PxseedServer2023Function;
    //wsPipe
    class WebsocketPipe {
        constructor(wsUrl) {
            this.wsUrl = wsUrl;
        }
        ;
        directlyConnect(id) {
            return new backend_1.WebSocketIo().connect(this.wsUrl + (this.wsUrl.includes('?') ? '&' : '?') + `id=${encodeURIComponent(id)}`);
        }
        async clientConnect(serverName) {
            let connectionId = (0, base_1.GenerateRandomString)();
            let needClose = new Set();
            try {
                let connIo = await this.directlyConnect('/connection/' + connectionId);
                needClose.add(connIo);
                let servIo = await this.directlyConnect('/server/' + serverName);
                needClose.add(servIo);
                let ser = new base_2.Serializer().prepareSerializing(16);
                let connectTime = (0, base_1.GetCurrentTime)().getTime();
                let connectRequest = ser.putString('connect').putLong(BigInt(connectTime)).putString(connectionId).build();
                await servIo.send([connectRequest]);
                ser = new base_2.Serializer().prepareUnserializing(await connIo.receive());
                while (!(ser.getString() == 'connect' && ser.getString() == serverName)) {
                    ser = new base_2.Serializer().prepareUnserializing(await connIo.receive());
                }
                needClose.delete(connIo);
                return connIo;
            }
            finally {
                for (let t1 of needClose) {
                    t1.close();
                }
            }
        }
        *serverServe(serverName, onConnection) {
            let servIo = yield* base_1.Task.yieldWrap(this.directlyConnect('/server/' + serverName));
            let ser = new base_2.Serializer().prepareSerializing(16);
            let serveTime = (0, base_1.GetCurrentTime)().getTime();
            let serveAnnounce = ser.putString('serve').putLong(BigInt(serveTime)).build();
            servIo.send([serveAnnounce]);
            while (base_1.Task.getAbortSignal() != undefined) {
                let msg = yield* base_1.Task.yieldWrap(servIo.receive());
                ser = new base_2.Serializer().prepareUnserializing(msg);
                let command = ser.getString();
                if (command == 'serve') {
                    let serveOn = ser.getLong();
                    if (serveOn > serveTime) {
                        yield servIo.send([serveAnnounce]);
                    }
                    else {
                        servIo.close();
                        throw new Error('Server name already used.');
                    }
                }
                else if (command == 'connect') {
                    ser.getLong(); //connect time
                    let connectionName = ser.getString();
                    let connIo = yield* base_1.Task.yieldWrap(this.directlyConnect('/connection/' + connectionName));
                    yield connIo.send([new base_2.Serializer().prepareSerializing(16).putString('connect').putString(serverName).build()]);
                    base_1.Task.fork(onConnection(connIo)).run();
                }
            }
        }
    }
    exports.WebsocketPipe = WebsocketPipe;
    async function getServerConfig() {
        if ('pxseedServer2023/pxseedhttpserver' in await base_1.requirejs.getDefined()) {
            let serv = await new Promise((resolve_1, reject_1) => { require(['pxseedServer2023/pxseedhttpserver'], resolve_1, reject_1); });
            return { root: serv.rootConfig, current: serv.config };
        }
        else {
            return null;
        }
    }
    async function restartSubprocessSelf() {
        let { current, root } = (await getServerConfig());
        (0, base_1.assert)(current.subprocessIndex != undefined);
        let client1 = new extend_1.RpcExtendClient1(new base_2.Client(await new backend_1.WebSocketIo().connect(`ws://127.0.0.1:${root.listenOn.port}${root.pxseedBase}/pxprpc/0?key=${encodeURIComponent(root.pxprpcKey ?? '')}`)));
        await client1.init();
        let func = new PxseedServer2023Function();
        await func.init(client1);
        await func.subprocessRestart(current.subprocessIndex);
        process.exit(0);
    }
});
//# sourceMappingURL=clientFunction.js.map