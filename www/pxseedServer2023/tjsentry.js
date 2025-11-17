define(["require", "exports", "partic2/tjshelper/httpprot", "partic2/tjshelper/tjsbuilder", "partic2/CodeRunner/JsEnviron", "partic2/jsutils1/base", "pxprpc/extend", "pxprpc/base", "partic2/tjshelper/jseiorpcserver", "partic2/jsutils1/webutils", "partic2/pxprpcClient/registry", "partic2/tjshelper/tjsenv"], function (require, exports, httpprot_1, tjsbuilder_1, JsEnviron_1, base_1, extend_1, base_2, jseiorpcserver_1, webutils_1, registry_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.inited = void 0;
    exports.inited = (async () => {
        await jseiorpcserver_1.inited;
        registry_1.rpcWorkerInitModule.push('partic2/tjshelper/jseiorpcserver');
        let pxseedBase = '/pxseed';
        let http = new httpprot_1.HttpServer();
        let router = new httpprot_1.SimpleHttpServerRouter();
        http.onfetch = router.onfetch;
        http.onwebsocket = router.onwebsocket;
        let wwwroot = (0, webutils_1.getWWWRoot)().replace(/\\/g, '/');
        let tjs = await (0, tjsbuilder_1.buildTjs)();
        let tjsfs = new JsEnviron_1.TjsSfs();
        tjsfs.from(tjs);
        await tjsfs.ensureInited();
        let fileServer = new httpprot_1.SimpleFileServer(new JsEnviron_1.DirAsRootFS(tjsfs, webutils_1.path.join(wwwroot)));
        fileServer.pathStartAt = (pxseedBase + '/www').length;
        router.setHandler(pxseedBase + '/www', { fetch: fileServer.onfetch });
        {
            //For sourcemap
            fileServer = new httpprot_1.SimpleFileServer(new JsEnviron_1.DirAsRootFS(tjsfs, webutils_1.path.join(wwwroot, '..', 'source')));
            fileServer.pathStartAt = (pxseedBase + '/source').length;
            router.setHandler(pxseedBase + '/source', { fetch: fileServer.onfetch });
        }
        router.setHandler(pxseedBase + '/pxprpc/0', {
            websocket: async (ctl) => {
                let ws = await ctl.accept();
                let serv = new extend_1.RpcExtendServer1(new base_2.Server(ws));
                serv.serve().catch((err) => console.error(err));
            }
        });
        let ssoc = null;
        let port1 = 2081;
        for (; port1 < 50000; port1 += 2048) {
            try {
                ssoc = await tjs.listen('tcp', '127.0.0.1', 2081);
                break;
            }
            catch (err) { }
        }
        if (ssoc == null) {
            console.error('No available tcp port to bind');
            return;
        }
        base_1.Task.fork(http.serveTjs(ssoc)).run();
        console.info('serving on :' + port1);
        let webuientry = 'partic2/packageManager/webui';
        console.info('entry url:' + `http://127.0.0.1:${port1}${pxseedBase}/www/index.html?__jsentry=pxseedServer2023%2fwebentry&__redirectjsentry=${encodeURIComponent(webuientry)}`);
    })();
});
//# sourceMappingURL=tjsentry.js.map