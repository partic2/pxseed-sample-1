define(["require", "exports", "partic2/jsutils1/base", "pxprpc/extend", "pxprpc/base", "pxprpc/backend", "partic2/pxprpcClient/registry", "partic2/jsutils1/webutils"], function (require, exports, base_1, extend_1, base_2, backend_1, registry_1, webutils_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.wsPipeApi = exports.PxseedServer2023Function = void 0;
    exports.wsPipeConnectDirectly = wsPipeConnectDirectly;
    exports.wsPipeConnectPxprpc = wsPipeConnectPxprpc;
    exports.wsPipeServe = wsPipeServe;
    exports.wsPipeConnect = wsPipeConnect;
    exports.wsPipeConnectPxseedJsUrl = wsPipeConnectPxseedJsUrl;
    exports.getServerConfig = getServerConfig;
    exports.restartSubprocessSelf = restartSubprocessSelf;
    class PxseedServer2023Function {
        async exit() {
            await this.serverCommand('exit');
        }
        async subprocessWaitExitCode(index) {
            return (await (0, registry_1.getRpcFunctionOn)(this.client1, 'pxseedServer2023.subprocess.waitExitCode', 'i->i')).call(index);
        }
        async subprocessRestart(index) {
            return (await (0, registry_1.getRpcFunctionOn)(this.client1, 'pxseedServer2023.subprocess.restart', 'i->')).call(index);
        }
        async connectWsPipe(id) {
            return (await (0, registry_1.getRpcFunctionOn)(this.client1, 'pxseedServer2023.connectWsPipe', 's->o')).call(id);
        }
        async serverCommand(cmd) {
            return (await (0, registry_1.getRpcFunctionOn)(this.client1, 'pxseedServer2023.serverCommand', 's->s')).call(cmd);
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
            return JSON.parse(await this.serverCommand('getConfig'));
        }
        async saveConfig(cfg) {
            return await this.serverCommand(`saveConfig ${JSON.stringify(cfg)}`);
        }
        async init(client1) {
            this.client1 = client1;
        }
    }
    exports.PxseedServer2023Function = PxseedServer2023Function;
    //To be standardized BEGIN
    async function wsPipeConnectDirectly(id) {
        if (exports.wsPipeApi.wsUrl == undefined) {
            if ('pxseedServer2023/pxseedhttpserver' in (await base_1.requirejs.getDefined())) {
                let { rootConfig } = await new Promise((resolve_1, reject_1) => { require(['pxseedServer2023/pxseedhttpserver'], resolve_1, reject_1); });
                exports.wsPipeApi.wsUrl = `ws://${rootConfig.listenOn.host}:${rootConfig.listenOn.port}${rootConfig.pxseedBase}/pxprpc/0`;
            }
            else {
                exports.wsPipeApi.wsUrl = (await (await new Promise((resolve_2, reject_2) => { require(['./webentry'], resolve_2, reject_2); })).getPxseedUrl()).wsPipeUrl;
            }
        }
        return new backend_1.WebSocketIo().connect(exports.wsPipeApi.wsUrl + `?id=${id}`);
    }
    async function wsPipeConnectPxprpc(id) {
        let { PxseedServer2023Function } = await new Promise((resolve_3, reject_3) => { require(["./clientFunction"], resolve_3, reject_3); });
        let fn = new PxseedServer2023Function();
        await fn.init(await (0, registry_1.getRegistered)(registry_1.ServerHostRpcName).ensureConnected());
        let pipe2 = await fn.connectWsPipe(id);
        return pipe2;
    }
    exports.wsPipeApi = {
        connect: wsPipeConnectDirectly,
        wsUrl: undefined
    };
    function wsPipeServe(serverName, onConnection) {
        return base_1.Task.fork(function* () {
            let servIo = yield* base_1.Task.yieldWrap(exports.wsPipeApi.connect('/server/' + serverName));
            let ser = new base_2.Serializer().prepareSerializing(16);
            let serveTime = (0, base_1.GetCurrentTime)().getTime();
            let serveAnnounce = ser.putString('serve').putLong(BigInt(serveTime)).build();
            servIo.send([serveAnnounce]);
            try {
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
                        let connIo = yield* base_1.Task.yieldWrap(exports.wsPipeApi.connect('/connection/' + connectionName));
                        yield connIo.send([new base_2.Serializer().prepareSerializing(16).putString('connect').putString(serverName).build()]);
                        base_1.Task.fork(onConnection(connIo)).run();
                    }
                }
            }
            finally {
                servIo.close();
            }
        }).run();
    }
    async function wsPipeConnect(serverName) {
        let connectionId = (0, base_1.GenerateRandomString)();
        let needClose = new Set();
        try {
            let connIo = await exports.wsPipeApi.connect('/connection/' + connectionId);
            needClose.add(connIo);
            let servIo = await exports.wsPipeApi.connect('/server/' + serverName);
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
    async function wsPipeConnectPxseedJsUrl(url) {
        let servName = decodeURIComponent((0, webutils_1.GetUrlQueryVariable2)(url, 'serverName') ?? '');
        return wsPipeConnect(servName);
    }
    //To be standardized END
    async function getServerConfig() {
        if ('pxseedServer2023/pxseedhttpserver' in await base_1.requirejs.getDefined()) {
            let serv = await new Promise((resolve_4, reject_4) => { require(['pxseedServer2023/pxseedhttpserver'], resolve_4, reject_4); });
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
    ;
    (async () => {
        if (await (0, registry_1.getPersistentRegistered)(registry_1.ServerHostRpcName) != null) {
            exports.wsPipeApi.connect = wsPipeConnectPxprpc;
        }
    })();
});
//# sourceMappingURL=clientFunction.js.map