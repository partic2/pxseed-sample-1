define(["require", "exports", "ws", "partic2/jsutils1/base", "http", "path", "pxprpc/extend", "pxprpc/base", "koa", "koa-router", "fs/promises", "koa-files", "partic2/jsutils1/webutils", "child_process", "./workerInit"], function (require, exports, ws_1, base_1, http_1, path_1, extend_1, base_2, koa_1, koa_router_1, fs, koa_files_1, webutils_1, child_process_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ensureInit = exports.config = exports.koaRouter = exports.koaServ = exports.httpServ = exports.WsServer = exports.__name__ = void 0;
    exports.nodeRun = nodeRun;
    exports.__name__ = 'pxseedServer2023/entry';
    class NodeWsIo {
        constructor(ws) {
            this.ws = ws;
            this.priv__cached = new base_1.ArrayWrap2([]);
            this.closed = false;
            ws.on('message', (data, isBin) => {
                if (data instanceof ArrayBuffer) {
                    this.priv__cached.queueBlockPush(new Uint8Array(data));
                }
                else if (data instanceof Buffer) {
                    this.priv__cached.queueBlockPush(data);
                }
                else if (data instanceof Array) {
                    this.priv__cached.queueBlockPush(new Uint8Array((0, base_1.ArrayBufferConcat)(data)));
                }
                else {
                    throw new Error('Unknown data type');
                }
            });
            ws.on('close', (code, reason) => {
                this.closed = true;
                this.priv__cached.cancelWaiting();
            });
        }
        async receive() {
            try {
                let wsdata = await this.priv__cached.queueBlockShift();
                return wsdata;
            }
            catch (e) {
                if (e instanceof base_1.CanceledError && this.closed) {
                    this.ws.close();
                    throw new Error('closed.');
                }
                else {
                    this.ws.close();
                    throw e;
                }
            }
        }
        async send(data) {
            this.ws.send((0, base_1.ArrayBufferConcat)(data));
        }
        close() {
            this.ws.close();
            this.closed = true;
            this.priv__cached.cancelWaiting();
        }
    }
    exports.WsServer = {
        ws: new ws_1.WebSocketServer({ noServer: true }),
        handle: function (req, socket, head) {
            let url = new URL(req.url, `http://${req.headers.host}`);
            if (url.pathname in this.router) {
                this.ws.handleUpgrade(req, socket, head, (client, req) => {
                    this.router[url.pathname](new NodeWsIo(client), req.url, req.headers);
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
        deamonMode: {
            enabled: false,
            subprocessConfig: []
        }
    };
    let noderunJs = (0, webutils_1.getWWWRoot)() + '/noderun.js';
    function nodeRun(moduleName, args) {
        console.info(noderunJs, moduleName, ...args);
        (0, child_process_1.spawn)(process.execPath, [noderunJs, moduleName, ...args], {
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
                let rootConfig = JSON.parse(new TextDecoder().decode(configData));
                let subprocessAt = process.argv.indexOf('--subprocess');
                if (process.argv[2] == exports.__name__ && subprocessAt >= 0) {
                    //This is subprocee spawn by deamon.
                    let subprocessIndex = Number(process.argv[subprocessAt + 1]);
                    Object.assign(exports.config, rootConfig, rootConfig.deamonMode.subprocessConfig[subprocessIndex]);
                    exports.config.deamonMode.enabled = false;
                    exports.config.deamonMode.subprocessConfig = [];
                }
                else {
                    Object.assign(exports.config, rootConfig);
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
                if (exports.config.pxprpcCheckOrigin === false) {
                    pass = true;
                }
                if (!pass && headers.origin != undefined) {
                    let originUrl = new URL(headers.origin);
                    for (let t1 of [exports.config.listenOn.host, ...exports.config.pxprpcCheckOrigin]) {
                        if (originUrl.hostname === t1) {
                            pass = true;
                        }
                        ;
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
            exports.koaRouter.get(exports.config.pxseedBase + '/www/:filepath(.+)', async (ctx, next) => {
                let filepath = ctx.params.filepath;
                let savedPath = ctx.path;
                ctx.path = `/www/${filepath}`;
                await next();
                ctx.path = savedPath;
                if (filepath === 'pxseedInit.js') {
                    ctx.set('Cache-Control', 'no-cache');
                }
            }, pxseedFilesServer);
            //for sourcemap, optional.
            exports.koaRouter.get(exports.config.pxseedBase + '/source/:filepath(.+)', async (ctx, next) => {
                let filepath = ctx.params.filepath;
                let savedPath = ctx.path;
                ctx.path = `/source/${filepath}`;
                await next();
                ctx.path = savedPath;
            }, pxseedFilesServer);
            exports.ensureInit.setResult(0);
            console.info(`package manager url:`);
            console.info(`http://${exports.config.listenOn.host}:${exports.config.listenOn.port}${exports.config.pxseedBase}/www/index.html?__jsentry=partic2%2fpackageManager%2fwebui`);
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
            for (let t1 = 0; t1 < exports.config.deamonMode.subprocessConfig.length; t1++) {
                nodeRun(exports.__name__, ['--subprocess', String(t1)]);
            }
        }
    })();
});
//# sourceMappingURL=entry.js.map