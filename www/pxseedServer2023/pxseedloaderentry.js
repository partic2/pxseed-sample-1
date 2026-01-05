define(["require", "exports", "partic2/jsutils1/base", "pxprpc/extend", "partic2/tjshelper/tjsenv", "pxprpc/base", "partic2/pxprpcClient/registry", "partic2/tjshelper/jseiorpcserver", "partic2/tjshelper/httpprot", "partic2/tjshelper/tjsbuilder", "partic2/jsutils1/webutils", "partic2/pxprpcBinding/pxprpc_rtbridge", "./pxseedhttpserver", "pxprpc/backend", "partic2/packageManager/misc", "partic2/tjshelper/tjsenv"], function (require, exports, base_1, extend_1, tjsenv_1, base_2, registry_1, jseiorpcserver_1, httpprot_1, tjsbuilder_1, webutils_1, pxprpc_rtbridge_1, pxseedhttpserver, backend_1, misc_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.__inited__ = exports.pxprpcJavaRtbClient = exports.pxprpcRuntimeBridgeClient = void 0;
    exports.ensurePxprpcJavaRtbClient = ensurePxprpcJavaRtbClient;
    exports.getLoaderInfo = getLoaderInfo;
    exports.openWebviewForEntry = openWebviewForEntry;
    let __name__ = base_1.requirejs.getLocalRequireModule(require);
    exports.pxprpcRuntimeBridgeClient = null;
    exports.pxprpcJavaRtbClient = null;
    let cachedLoaderInfo = null;
    async function ensurePxprpcJavaRtbClient() {
        if (exports.pxprpcJavaRtbClient !== null)
            return exports.pxprpcJavaRtbClient;
        let io1 = await tjsenv_1.PxprpcRtbIo.connect('/pxprpc/runtime_bridge/java/0');
        (0, base_1.assert)(io1 != null, '/pxprpc/runtime_bridge/java/0 connect failed.');
        exports.pxprpcJavaRtbClient = await new extend_1.RpcExtendClient1(new base_2.Client(io1)).init();
        return exports.pxprpcJavaRtbClient;
    }
    async function getLoaderInfo() {
        let __v1 = await (0, registry_1.getRpcFunctionOn)(exports.pxprpcRuntimeBridgeClient, 'pxprpc_PxseedLoader.getLoaderInfo', '->b');
        let __v2 = await __v1.call();
        cachedLoaderInfo = new extend_1.TableSerializer().load(__v2).toMapArray()[0];
        return cachedLoaderInfo;
    }
    async function openWebviewForEntry(entryUrl) {
        try {
            let loaderInfo = await getLoaderInfo();
            if (loaderInfo.hostFlags.includes(' __ANDROID__ ')) {
                let openHttpUrl = await (0, registry_1.getRpcFunctionOn)(await ensurePxprpcJavaRtbClient(), 'AndroidHelper.Intent.openHttpUrl', 'ss->');
                openHttpUrl.call(entryUrl, '');
            }
            else {
                await (0, misc_1.openUrlInBrowser)(entryUrl, { appMode: true });
            }
        }
        catch (err) {
            console.error(err);
        }
    }
    exports.__inited__ = (async () => {
        (0, base_1.assert)(globalThis.__pxprpc4tjs__ != undefined);
        let io1 = await tjsenv_1.PxprpcRtbIo.connect('/pxprpc/runtime_bridge/0');
        (0, base_1.assert)(io1 != null);
        exports.pxprpcRuntimeBridgeClient = await new extend_1.RpcExtendClient1(new base_2.Client(io1)).init();
        await jseiorpcserver_1.inited;
        registry_1.rpcWorkerInitModule.push('partic2/tjshelper/jseiorpcserver');
        let pxseedBase = '/pxseed';
        let http = new httpprot_1.HttpServer();
        http.onfetch = pxseedhttpserver.defaultRouter.onfetch;
        http.onwebsocket = pxseedhttpserver.defaultRouter.onwebsocket;
        let wwwroot = (0, webutils_1.getWWWRoot)().replace(/\\/g, '/');
        let tjs = await (0, tjsbuilder_1.buildTjs)();
        await pxseedhttpserver.loadConfig();
        if (pxseedhttpserver.config.pxseedBase != undefined) {
            pxseedBase = pxseedhttpserver.config.pxseedBase;
        }
        try {
            let tjsState = JSON.parse(new TextDecoder().decode(await tjs.readFile(webutils_1.path.join(wwwroot, __name__, '..', 'state', 'pxseedloader.json'))));
            console.warn('pxseedloader state detecting...');
            if (tjsState.listenOn != undefined) {
                console.warn('try to connect pxseedloader instance ' + `ws://${tjsState.listenOn.host}:${tjsState.listenOn.port}${tjsState.pxseedBase}/pxprpc/runtime_bridge`);
                let wsio1 = await new backend_1.WebSocketIo().connect(`ws://${tjsState.listenOn.host}:${tjsState.listenOn.port}${tjsState.pxseedBase}/pxprpc/runtime_bridge`);
                console.warn(`connected...`);
                await wsio1.send([new TextEncoder().encode('/pxprpc/runtime_bridge/0')]);
                try {
                    let client1 = await new extend_1.RpcExtendClient1(new base_2.Client(wsio1)).init();
                    let invoker1 = new pxprpc_rtbridge_1.Invoker();
                    await invoker1.useClient(client1);
                    console.warn('pxseedloader instance detected, send request_ui event.');
                    await invoker1.variable_set('pxseedloader.event.request_ui', String((0, base_1.GetCurrentTime)().getTime()));
                    tjs.exit(0);
                }
                finally {
                    wsio1.close();
                }
            }
        }
        catch (err) {
            console.warn(err);
            console.warn('No pxseedloader instance detected, create a new one.');
        }
        let rtbtunnel = async function (ws) {
            let rtbc = null;
            try {
                let target = new TextDecoder().decode(await ws.receive());
                rtbc = await tjsenv_1.PxprpcRtbIo.connect(target);
                if (rtbc == null) {
                    ws.close();
                }
                else {
                    await Promise.race([(async () => {
                            while (true) {
                                ws.send(await rtbc.receive());
                            }
                        })(), (async () => {
                            while (true) {
                                rtbc.send([await ws.receive()]);
                            }
                        })()]);
                }
            }
            catch (err) {
                console.error(err);
            }
            finally {
                ws.close();
                if (rtbc != null) {
                    rtbc.close();
                }
            }
        };
        pxseedhttpserver.defaultRouter.setHandler(pxseedBase + '/pxprpc/runtime_bridge', {
            websocket: async (ctl) => {
                let ws = await ctl.accept();
                rtbtunnel(ws);
            }
        });
        let ssoc = null;
        let port1 = pxseedhttpserver.config.listenOn.port;
        for (; port1 < 20000; port1 += 2048) {
            try {
                ssoc = await tjs.listen('tcp', pxseedhttpserver.config.listenOn.host, port1);
                break;
            }
            catch (err) { }
        }
        if (ssoc == null) {
            console.error('No available tcp port to bind');
            tjs.exit(0);
            return;
        }
        pxseedhttpserver.config.listenOn.port = port1;
        base_1.Task.fork(http.serveTjs(ssoc)).run();
        await tjs.makeDir(webutils_1.path.join(wwwroot, __name__, '..', 'state'), { recursive: true });
        let pxseedloaderStateFile = await tjs.open(webutils_1.path.join(wwwroot, __name__, '..', 'state', 'pxseedloader.json'), 'w');
        try {
            await pxseedloaderStateFile.write(new TextEncoder().encode(JSON.stringify(pxseedhttpserver.config)));
        }
        catch (err) {
            console.error(err.toString());
        }
        console.warn('serving on :' + port1);
        let webuientry = 'partic2/packageManager/webui';
        let entryUrl = `http://127.0.0.1:${port1}${pxseedBase}/www/index.html?__jsentry=pxseedServer2023%2fwebentry&__redirectjsentry=${encodeURIComponent(webuientry)}&__pxprpcKey=${pxseedhttpserver.config.pxprpcKey}`;
        console.warn('entry url:' + entryUrl);
        await pxseedhttpserver.setupHttpServerHandler();
        pxseedhttpserver.pxseedRunStartupModules();
        try {
            let invoker1 = new pxprpc_rtbridge_1.Invoker();
            await invoker1.useClient(exports.pxprpcRuntimeBridgeClient);
            let onChange = await invoker1.variable_on_change();
            onChange.poll((err, result) => {
                if (err !== null)
                    return;
                if (result === 'pxseedloader.event.request_ui') {
                    openWebviewForEntry(entryUrl);
                }
            });
            await invoker1.variable_set('pxseedloader.event.request_ui', String((0, base_1.GetCurrentTime)().getTime()));
        }
        finally {
        }
    })();
});
//# sourceMappingURL=pxseedloaderentry.js.map