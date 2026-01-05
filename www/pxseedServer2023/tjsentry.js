define(["require", "exports", "partic2/jsutils1/base", "pxprpc/extend", "partic2/tjshelper/tjsenv", "pxprpc/base", "partic2/pxprpcClient/registry", "partic2/tjshelper/jseiorpcserver", "partic2/tjshelper/httpprot", "partic2/tjshelper/tjsbuilder", "partic2/jsutils1/webutils", "./pxseedhttpserver", "partic2/tjshelper/tjsenv"], function (require, exports, base_1, extend_1, tjsenv_1, base_2, registry_1, jseiorpcserver_1, httpprot_1, tjsbuilder_1, webutils_1, pxseedhttpserver) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.__inited__ = exports.pxprpcRuntimeBridgeClient = void 0;
    exports.getLoaderInfo = getLoaderInfo;
    let __name__ = base_1.requirejs.getLocalRequireModule(require);
    exports.pxprpcRuntimeBridgeClient = null;
    async function getLoaderInfo() {
        let __v1 = await (0, registry_1.getRpcFunctionOn)(exports.pxprpcRuntimeBridgeClient, 'pxprpc_PxseedLoader.getLoaderInfo', '->b');
        let __v2 = await __v1.call();
        return new extend_1.TableSerializer().load(__v2).toMapArray()[0];
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
        await pxseedhttpserver.setupHttpServerHandler();
        pxseedhttpserver.pxseedRunStartupModules();
        console.info('serving on :' + port1);
        let webuientry = 'partic2/packageManager/webui';
        let entryUrl = `http://127.0.0.1:${port1}${pxseedBase}/www/index.html?__jsentry=pxseedServer2023%2fwebentry&__redirectjsentry=${encodeURIComponent(webuientry)}&__pxprpcKey=${pxseedhttpserver.config.pxprpcKey}`;
        console.info('entry url:' + entryUrl);
    })();
});
//# sourceMappingURL=tjsentry.js.map