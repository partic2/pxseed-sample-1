define(["require", "exports", "./pxseedhttpserver", "partic2/jsutils1/base", "pxprpc/base", "stream", "http", "path", "partic2/jsutils1/webutils", "child_process", "ws", "partic2/nodehelper/nodeio", "pxprpc/extend", "pxprpc/backend", "./pxseedhttpserver", "partic2/nodehelper/env"], function (require, exports, pxseedhttpserver_1, base_1, base_2, stream_1, http_1, path_1, webutils_1, child_process_1, ws_1, nodeio_1, extend_1, backend_1, pxseedhttpserver_2) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.__inited__ = exports.httpOnRequest = exports.httpServ = exports.WsServer = exports.ensureInit = exports.config = exports.__name__ = void 0;
    exports.nodeRun = nodeRun;
    exports.createNewEntryUrlWithPxprpcKey = createNewEntryUrlWithPxprpcKey;
    exports.startServer = startServer;
    Object.defineProperty(exports, "config", { enumerable: true, get: function () { return pxseedhttpserver_1.config; } });
    exports.__name__ = 'pxseedServer2023/nodeentry';
    exports.ensureInit = new base_1.future();
    exports.WsServer = {
        ws: new ws_1.WebSocketServer({ noServer: true }),
        handle: async function (req, socket, head) {
            let url = new URL(req.url, `http://${req.headers.host}`);
            let request = new Request(url, {
                method: req.method,
                headers: Object.entries(req.headers).map(t1 => {
                    if (typeof t1[1] !== 'string') {
                        return [t1[0], (t1[1] ?? '').toString()];
                    }
                    else {
                        return t1;
                    }
                })
            });
            let accepted = false;
            await pxseedhttpserver_2.defaultHttpHandler.onwebsocket({
                request,
                accept: async () => {
                    accepted = true;
                    return new Promise((resolve) => this.ws.handleUpgrade(req, socket, head, (client) => {
                        resolve(new nodeio_1.NodeWsConnectionAdapter2(client));
                    }));
                }
            });
            if (!accepted) {
                if (url.pathname in this.router) {
                    this.ws.handleUpgrade(req, socket, head, (client, req) => {
                        this.router[url.pathname](new nodeio_1.NodeWsConnectionAdapter2(client), req.url, req.headers);
                    });
                }
                else {
                    socket.end();
                }
            }
        },
        //compatibility ONLY
        router: {}
    };
    exports.WsServer.ws.on('error', (err) => console.log(err));
    exports.httpServ = new http_1.Server();
    //To keep compatibility with old Koa server, koa server can override it and deligate request to default handler.
    exports.httpOnRequest = new base_1.Ref2(async (nodereq, noderes) => {
        let url = new URL(nodereq.url, `http://${nodereq.headers.host}`);
        let req = new Request(url, {
            method: nodereq.method,
            headers: Object.entries(nodereq.headers).map(t1 => {
                if (typeof t1[1] !== 'string') {
                    return [t1[0], (t1[1] ?? '').toString()];
                }
                else {
                    return t1;
                }
            }),
            body: ['GET', 'HEAD'].includes(nodereq.method ?? '') ? undefined : new ReadableStream(new nodeio_1.NodeReadableDataSource(nodereq)),
            duplex: 'half'
        });
        let resp = await pxseedhttpserver_2.defaultHttpHandler.onfetch(req);
        resp.headers.forEach((v, k) => {
            noderes.setHeader(k, v);
        });
        noderes.statusCode = resp.status;
        if (resp.body != null) {
            stream_1.Readable.fromWeb(resp.body).pipe(noderes, { end: true });
        }
        else {
            noderes.end();
        }
    });
    let noderunJs = (0, webutils_1.getWWWRoot)() + '/noderun.js';
    function nodeRun(moduleName, args) {
        console.info(noderunJs, moduleName, ...args);
        let subproc = (0, child_process_1.spawn)(process.execPath, [noderunJs, moduleName, ...args], {
            stdio: 'pipe'
        });
        subproc.stdout.on('data', function (data) {
            console.info('[CHILD PROCESS OUTPUT]:\n', new TextDecoder().decode(data));
        });
        subproc.stderr.on('data', function (data) {
            console.warn('[CHILD PROCESS ERROR]:', new TextDecoder().decode(data));
        });
        return subproc;
    }
    async function createNewEntryUrlWithPxprpcKey(jsentry, urlarg) {
        let accessHost = pxseedhttpserver_1.config.listenOn.host;
        if (accessHost == '0.0.0.0') {
            accessHost = '127.0.0.1';
        }
        let launcherUrl = `http://${accessHost}:${pxseedhttpserver_1.config.listenOn.port}${pxseedhttpserver_1.config.pxseedBase}/www/index.html?__jsentry=pxseedServer2023%2fwebentry&__redirectjsentry=${encodeURIComponent(jsentry)}`;
        if (pxseedhttpserver_1.config.pxprpcKey != null) {
            launcherUrl += `&__pxprpcKey=${encodeURIComponent(pxseedhttpserver_1.config.pxprpcKey)}`;
        }
        if (urlarg != undefined) {
            launcherUrl += '&' + urlarg;
        }
        return launcherUrl;
    }
    function doExit() {
        console.info('exiting...');
        webutils_1.lifecycle.dispatchEvent(new Event('pause'));
        webutils_1.lifecycle.dispatchEvent(new Event('exit'));
        setTimeout(() => process.exit(), 3000);
    }
    async function runCommand(cmd, cwd) {
        let process = (0, child_process_1.spawn)(cmd, { shell: true, stdio: 'pipe', cwd });
        let stdoutbuffer = [];
        process.stdout.on('data', (chunk) => {
            stdoutbuffer.push(chunk);
        });
        process.stderr.on('data', (chunk) => {
            stdoutbuffer.push(chunk);
        });
        await new Promise((resolve => {
            process.on('close', resolve);
        }));
        return stdoutbuffer.join('');
    }
    async function startServer() {
        //(await import('inspector')).open(9229,'127.0.0.1',true);
        console.info('argv', process.argv);
        await (0, pxseedhttpserver_1.loadConfig)();
        exports.httpServ.on('upgrade', (req, socket, head) => {
            exports.WsServer.handle(req, socket, head);
        });
        exports.httpServ.on('request', (req, res) => {
            exports.httpOnRequest.get()(req, res);
        });
        async function doListen() {
            let p = new base_1.future();
            const cb = (err) => {
                if (!p.done) {
                    exports.httpServ.close(() => p.setResult(err));
                }
            };
            exports.httpServ.once('error', cb);
            exports.httpServ.listen(pxseedhttpserver_1.config.listenOn.port, pxseedhttpserver_1.config.listenOn.host, 8, () => {
                exports.httpServ.off('error', cb);
                p.setResult(null);
            });
            return p.get();
        }
        let listenSucc = false;
        let maxListenPort = pxseedhttpserver_1.config.listenOn.port + 4;
        for (; pxseedhttpserver_1.config.listenOn.port < maxListenPort; pxseedhttpserver_1.config.listenOn.port++) {
            let t1 = await doListen();
            if (t1 == null) {
                listenSucc = true;
                break;
            }
            if (t1.code !== 'EADDRINUSE') {
                throw t1;
            }
        }
        if (!listenSucc)
            throw new Error('No available listen port.');
        console.log(JSON.stringify(pxseedhttpserver_1.config, undefined, 2));
        exports.ensureInit.setResult(0);
        console.info(`pxseed server entry url:`);
        let launcherUrl = await createNewEntryUrlWithPxprpcKey('partic2/packageManager/webui');
        console.info(launcherUrl);
        webutils_1.lifecycle.addEventListener('exit', () => {
            console.info('close http server');
            exports.httpServ.close((err) => {
                console.info('http server closed');
            });
        });
        if (pxseedhttpserver_1.config.deamonMode.enabled) {
            let subprocs = [];
            for (let t1 = 0; t1 < pxseedhttpserver_1.config.deamonMode.subprocessConfig.length; t1++) {
                let subprocess = nodeRun(exports.__name__, [pxseedhttpserver_1.subprocessMagic, String(t1)]);
                subprocs.push(subprocess);
            }
            pxseedhttpserver_1.serverCommandRegistry.subprocessWaitExitCode = async (index) => {
                let subp = subprocs[index];
                if (subp.exitCode != null) {
                    return subp.exitCode;
                }
                else {
                    return new Promise((resolve) => subp.once('exit', (exitCode) => { resolve(exitCode ?? -1); }));
                }
            };
            pxseedhttpserver_1.serverCommandRegistry.subprocessRestart = async (index) => {
                if (subprocs[index].exitCode == null) {
                    let subCfg = pxseedhttpserver_1.rootConfig.deamonMode.subprocessConfig[index];
                    let client1 = new extend_1.RpcExtendClient1(new base_2.Client(await new backend_1.WebSocketIo().connect(`ws://127.0.0.1:${subCfg.listenOn.port}${subCfg.pxseedBase ?? pxseedhttpserver_1.config.pxseedBase}/pxprpc/0?key=${encodeURIComponent(subCfg.pxprpcKey ?? pxseedhttpserver_1.config.pxprpcKey ?? '')}`)));
                    await client1.init();
                    let { PxseedServer2023Function } = await new Promise((resolve_1, reject_1) => { require(['./clientFunction'], resolve_1, reject_1); });
                    let func = new PxseedServer2023Function();
                    await func.init(client1);
                    await func.exit();
                    await (0, base_1.sleep)(1500);
                }
                if (subprocs[index].exitCode == null) {
                    subprocs[index].kill();
                    await (0, base_1.sleep)(500);
                }
                let subprocess = nodeRun(exports.__name__, [pxseedhttpserver_1.subprocessMagic, String(index)]);
                subprocs[index] = subprocess;
            };
        }
    }
    exports.__inited__ = (async () => {
        if (!('__workerId' in globalThis)) {
            await startServer();
            exports.ensureInit.setResult(0);
        }
        pxseedhttpserver_1.serverCommandRegistry.buildEnviron = async () => {
            return runCommand(`${process.execPath} ${(0, path_1.join)((0, webutils_1.getWWWRoot)(), '..', 'script', 'buildEnviron.js')}`);
        };
        pxseedhttpserver_1.serverCommandRegistry.exit = async () => {
            return doExit();
        };
        await (0, pxseedhttpserver_1.setupHttpServerHandler)();
        (0, pxseedhttpserver_1.pxseedRunStartupModules)();
    })();
});
//# sourceMappingURL=nodeentry.js.map