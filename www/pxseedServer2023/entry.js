define(["require", "exports", "partic2/jsutils1/base", "http", "path", "pxprpc/extend", "pxprpc/base", "koa", "koa-router", "fs/promises", "koa-files", "partic2/jsutils1/webutils", "child_process", "ws", "partic2/nodehelper/nodeio", "./workerInit"], function (require, exports, base_1, http_1, path_1, extend_1, base_2, koa_1, koa_router_1, fs, koa_files_1, webutils_1, child_process_1, ws_1, nodeio_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ensureInit = exports.rootConfig = exports.config = exports.koaRouter = exports.koaServ = exports.httpServ = exports.WsServer = exports.__name__ = void 0;
    exports.nodeRun = nodeRun;
    exports.__name__ = 'pxseedServer2023/entry';
    exports.WsServer = {
        ws: new ws_1.WebSocketServer({ noServer: true }),
        handle: function (req, socket, head) {
            let url = new URL(req.url, `http://${req.headers.host}`);
            if (url.pathname in this.router) {
                this.ws.handleUpgrade(req, socket, head, (client, req) => {
                    this.router[url.pathname](new nodeio_1.NodeWsIo(client), req.url, req.headers);
                });
            }
            else {
                socket.end();
            }
        },
        router: {}
    };
    exports.WsServer.ws.on('error', (err) => console.log(err));
    exports.httpServ = new http_1.Server();
    exports.koaServ = new koa_1.default();
    exports.koaServ.proxy = true;
    exports.koaRouter = new koa_router_1.default();
    let pxseedFilesServer = (0, koa_files_1.default)((0, path_1.dirname)((0, path_1.dirname)(__dirname)));
    ;
    exports.config = {
        pxseedBase: '/pxseed',
        pxprpcPath: '/pxprpc/0',
        listenOn: { host: '127.0.0.1', port: 8088 },
        initModule: [],
        pxprpcCheckOrigin: ['localhost', '127.0.0.1', '[::1]'],
        pxprpcKey: null,
        deamonMode: {
            enabled: false,
            subprocessConfig: []
        },
        //pxprpcKey should be secret.
        blockFilesMatch: ['^/www/pxseedServer2023/config.json$'],
        serveDirectory: ['www', 'source']
    };
    exports.rootConfig = { ...exports.config };
    let noderunJs = (0, webutils_1.getWWWRoot)() + '/noderun.js';
    function nodeRun(moduleName, args) {
        console.info(noderunJs, moduleName, ...args);
        return (0, child_process_1.spawn)(process.execPath, [noderunJs, moduleName, ...args], {
            stdio: 'inherit'
        });
    }
    exports.ensureInit = new base_1.future();
    ;
    (async () => {
        if (!('__workerId' in globalThis)) {
            //(await import('inspector')).open(9229,'127.0.0.1',true);
            console.info('argv', process.argv);
            try {
                let configData = await fs.readFile(__dirname + '/config.json');
                console.log(`config file ${__dirname + '/config.json'} found. `);
                let readinConfig = JSON.parse(new TextDecoder().decode(configData));
                exports.rootConfig = Object.assign(readinConfig);
                if (globalThis.process == undefined)
                    return null;
                let subprocessAt = process.argv.indexOf('--subprocess');
                if (process.argv[2] == 'pxseedServer2023/entry' && subprocessAt >= 0) {
                    //This is subprocee spawn by deamon.
                    let subprocessIndex = Number(process.argv[subprocessAt + 1]);
                    Object.assign(exports.config, exports.rootConfig, exports.rootConfig.deamonMode.subprocessConfig[subprocessIndex]);
                    exports.config.deamonMode.enabled = false;
                    exports.config.deamonMode.subprocessConfig = [];
                    exports.config.subprocessIndex = subprocessIndex;
                }
                else {
                    Object.assign(exports.config, exports.rootConfig);
                }
            }
            catch (e) {
                console.log(`config file not found, write to ${__dirname + '/config.json'}`);
                await fs.writeFile(__dirname + '/config.json', new TextEncoder().encode(JSON.stringify(exports.config)));
            }
            exports.httpServ.on('upgrade', (req, socket, head) => {
                exports.WsServer.handle(req, socket, head);
            });
            exports.httpServ.on('request', exports.koaServ.callback());
            async function doListen() {
                let p = new base_1.future();
                const cb = (err) => {
                    if (!p.done) {
                        exports.httpServ.close(() => p.setResult(err));
                    }
                };
                exports.httpServ.once('error', cb);
                exports.httpServ.listen(exports.config.listenOn.port, exports.config.listenOn.host, 8, () => {
                    exports.httpServ.off('error', cb);
                    p.setResult(null);
                });
                return p.get();
            }
            let listenSucc = false;
            let maxListenPort = exports.config.listenOn.port + 4;
            for (; exports.config.listenOn.port < maxListenPort; exports.config.listenOn.port++) {
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
            exports.koaServ.use(exports.koaRouter.middleware());
            console.log(JSON.stringify(exports.config, undefined, 2));
            exports.WsServer.router[exports.config.pxseedBase + exports.config.pxprpcPath] = (io, url, headers) => {
                let pass = false;
                if (exports.config.pxprpcCheckOrigin === false || headers.origin == undefined) {
                    pass = true;
                }
                else if (headers.origin != undefined) {
                    let originUrl = new URL(headers.origin);
                    for (let t1 of [exports.config.listenOn.host, ...exports.config.pxprpcCheckOrigin]) {
                        if (originUrl.hostname === t1) {
                            pass = true;
                        }
                        ;
                    }
                }
                if (!pass) {
                    io.close();
                    return;
                }
                pass = false;
                if (exports.config.pxprpcKey === null) {
                    pass = true;
                }
                else {
                    if (decodeURIComponent((0, webutils_1.GetUrlQueryVariable2)(url ?? '', 'key') ?? '') === exports.config.pxprpcKey) {
                        pass = true;
                    }
                    else {
                        pass = false;
                    }
                }
                if (pass) {
                    let serv = new extend_1.RpcExtendServer1(new base_2.Server(io));
                    //mute error
                    serv.serve().catch(() => { });
                }
                else {
                    io.close();
                }
            };
            function doExit() {
                console.info('exiting...');
                webutils_1.lifecycle.dispatchEvent(new Event('pause'));
                webutils_1.lifecycle.dispatchEvent(new Event('exit'));
                setTimeout(() => process.exit(), 3000);
            }
            function doRestart() {
                console.info('TODO: restart is not implemented');
            }
            let blockFilesMatchReg = (exports.config.blockFilesMatch ?? []).map(exp => new RegExp(exp));
            for (let dir1 of exports.config.serveDirectory ?? []) {
                exports.koaRouter.get(exports.config.pxseedBase + `/${dir1}/:filepath(.+)`, async (ctx, next) => {
                    let filepath = ctx.params.filepath;
                    filepath = `/${dir1}/${filepath}`;
                    for (let re1 of blockFilesMatchReg) {
                        if (re1.test(filepath)) {
                            ctx.response.status = 403;
                            ctx.response.body = `File access is blocked by blockFilesMatch rule: ${re1.source}`;
                            return;
                        }
                    }
                    let savedPath = ctx.path;
                    ctx.path = filepath;
                    await next();
                    ctx.path = savedPath;
                    if (filepath === '/www/pxseedInit.js') {
                        ctx.set('Cache-Control', 'no-cache');
                    }
                }, pxseedFilesServer);
            }
            exports.ensureInit.setResult(0);
            console.info(`pxseed server entry url:`);
            let accessHost = exports.config.listenOn.host;
            if (accessHost == '0.0.0.0') {
                accessHost = '127.0.0.1';
            }
            let launcherUrl = `http://${accessHost}:${exports.config.listenOn.port}${exports.config.pxseedBase}/www/index.html?__jsentry=pxseedServer2023%2fwebentry`;
            if (exports.config.pxprpcKey != null) {
                launcherUrl += '&__pxprpcKey=' + encodeURIComponent(exports.config.pxprpcKey);
            }
            console.info(launcherUrl);
            webutils_1.lifecycle.addEventListener('exit', () => {
                console.info('close http server');
                exports.httpServ.close((err) => {
                    console.info('http server closed');
                });
            });
            extend_1.defaultFuncMap['pxseedServer2023.exit'] = new extend_1.RpcExtendServerCallable(async () => {
                doExit();
            }).typedecl('->');
            extend_1.defaultFuncMap['pxseedServer2023.restart'] = new extend_1.RpcExtendServerCallable(async () => {
                doRestart();
            }).typedecl('->');
        }
        Promise.allSettled(exports.config.initModule.map(mod => base_1.requirejs.promiseRequire(mod)));
        if (exports.config.deamonMode.enabled) {
            let subprocs = [];
            for (let t1 = 0; t1 < exports.config.deamonMode.subprocessConfig.length; t1++) {
                let subprocess = nodeRun(exports.__name__, ['--subprocess', String(t1)]);
                subprocs.push(subprocess);
            }
            extend_1.defaultFuncMap['pxseedServer2023.subprocess.waitExitCode'] = new extend_1.RpcExtendServerCallable(async (index) => {
                let subp = subprocs[index];
                if (subp.exitCode != null) {
                    return subp.exitCode;
                }
                else {
                    return new Promise((resolve) => subp.once('exit', (exitCode) => { resolve(exitCode ?? -1); }));
                }
            }).typedecl('i->i');
            extend_1.defaultFuncMap['pxseedServer2023.subprocess.restart'] = new extend_1.RpcExtendServerCallable(async (index) => {
                if (subprocs[index].exitCode == null) {
                    subprocs[index].kill();
                    await (0, base_1.sleep)(1000);
                }
                let subprocess = nodeRun(exports.__name__, ['--subprocess', String(index)]);
                subprocs[index] = subprocess;
            }).typedecl('i->');
            //Usually to used to restart process self.
            extend_1.defaultFuncMap['pxseedServer2023.subprocess.restartOnExit'] = new extend_1.RpcExtendServerCallable(async (index) => {
                console.info('restart', index);
                let task = base_1.Task.fork(function* () {
                    while (subprocs[index].exitCode == null) {
                        yield (0, base_1.sleep)(1000);
                    }
                    let subprocess = nodeRun(exports.__name__, ['--subprocess', String(index)]);
                    subprocs[index] = subprocess;
                }).run();
                return { close: () => {
                        //To avoid abort restart
                        (0, base_1.sleep)(3000).then(() => task.abort());
                    } };
            }).typedecl('i->o');
        }
    })();
});
//# sourceMappingURL=entry.js.map