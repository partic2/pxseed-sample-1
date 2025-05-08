define(["require", "exports", "./workerInit", "partic2/jsutils1/base", "pxprpc/base", "http", "path", "pxprpc/base", "koa", "koa-router", "koa-files", "partic2/jsutils1/webutils", "child_process", "ws", "partic2/nodehelper/nodeio", "partic2/pxprpcClient/registry", "pxprpc/extend", "pxprpc/backend", "./workerInit"], function (require, exports, workerInit_1, base_1, base_2, http_1, path_1, base_3, koa_1, koa_router_1, koa_files_1, webutils_1, child_process_1, ws_1, nodeio_1, registry_1, extend_1, backend_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.command = exports.wsPipe = exports.koaRouter = exports.koaServ = exports.httpServ = exports.WsServer = exports.ensureInit = exports.config = exports.__name__ = void 0;
    exports.nodeRun = nodeRun;
    exports.pxprpcHandler = pxprpcHandler;
    exports.wsPipeHandler = wsPipeHandler;
    exports.serveWsPipe = serveWsPipe;
    exports.createNewEntryUrlWithPxprpcKey = createNewEntryUrlWithPxprpcKey;
    exports.startServer = startServer;
    Object.defineProperty(exports, "config", { enumerable: true, get: function () { return workerInit_1.config; } });
    exports.__name__ = 'pxseedServer2023/entry';
    exports.ensureInit = new base_1.future();
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
    function pxprpcHandler(io, url, headers) {
        let pass = false;
        if (workerInit_1.config.pxprpcCheckOrigin === false || headers?.origin == undefined) {
            pass = true;
        }
        else if (headers.origin != undefined) {
            let originUrl = new URL(headers.origin);
            for (let t1 of [workerInit_1.config.listenOn.host, ...workerInit_1.config.pxprpcCheckOrigin]) {
                if (originUrl.hostname === t1) {
                    pass = true;
                    break;
                }
                ;
            }
        }
        if (!pass) {
            io.close();
            return;
        }
        pass = false;
        if (workerInit_1.config.pxprpcKey === null) {
            pass = true;
        }
        else {
            if (decodeURIComponent((0, webutils_1.GetUrlQueryVariable2)(url ?? '', 'key') ?? '') === workerInit_1.config.pxprpcKey) {
                pass = true;
            }
            else {
                pass = false;
            }
        }
        if (pass) {
            let serv = new extend_1.RpcExtendServer1(new base_3.Server(io));
            //mute error
            serv.serve().catch(() => { });
        }
        else {
            io.close();
        }
    }
    exports.wsPipe = new Map();
    async function wsPipeHandler(io, url, headers) {
        if (url == undefined)
            return;
        let id = (0, webutils_1.GetUrlQueryVariable2)(url, 'id');
        if (id == undefined)
            return;
        id = decodeURIComponent(id);
        await serveWsPipe(io, id);
    }
    async function serveWsPipe(io, id) {
        let pipes = exports.wsPipe.get(id);
        if (pipes == undefined) {
            pipes = new Set();
            exports.wsPipe.set(id, pipes);
        }
        pipes.add(io);
        try {
            while (true) {
                let msg = await io.receive();
                for (let t1 of pipes) {
                    if (t1 != io) {
                        await t1.send([msg]);
                    }
                }
            }
        }
        catch (e) {
            pipes.delete(io);
            if (pipes.size == 0) {
                exports.wsPipe.delete(id);
            }
        }
    }
    async function createNewEntryUrlWithPxprpcKey(jsentry, urlarg) {
        let accessHost = workerInit_1.config.listenOn.host;
        if (accessHost == '0.0.0.0') {
            accessHost = '127.0.0.1';
        }
        let launcherUrl = `http://${accessHost}:${workerInit_1.config.listenOn.port}${workerInit_1.config.pxseedBase}/www/index.html?__jsentry=pxseedServer2023%2fwebentry&__redirectjsentry=${encodeURIComponent(jsentry)}`;
        if (workerInit_1.config.pxprpcKey != null) {
            launcherUrl += `&__pxprpcKey=${encodeURIComponent(workerInit_1.config.pxprpcKey)}`;
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
    extend_1.defaultFuncMap['pxseedServer2023.connectWsPipe'] = new extend_1.RpcExtendServerCallable(async (id) => {
        let pipe1 = (0, registry_1.createIoPipe)();
        serveWsPipe(pipe1[0], id);
        return pipe1[1];
    }).typedecl('s->o');
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
    exports.command = {
        buildEnviron: async () => runCommand(`${process.execPath} ${(0, path_1.join)((0, webutils_1.getWWWRoot)(), '..', 'script', 'buildEnviron.js')}`),
        buildPackages: async () => runCommand(`${process.execPath} ${(0, path_1.join)((0, webutils_1.getWWWRoot)(), '..', 'script', 'buildPackages.js')}`),
        rebuildPackages: async () => {
            let t1 = await runCommand(`${process.execPath} ${(0, path_1.join)((0, webutils_1.getWWWRoot)(), '..', 'script', 'cleanPackages.js')}`);
            t1 += await runCommand(`${process.execPath} ${(0, path_1.join)((0, webutils_1.getWWWRoot)(), '..', 'script', 'buildPackages.js')}`);
            return t1;
        },
        subprocessRestart: null,
        exit: async () => {
            doExit();
        }
    };
    extend_1.defaultFuncMap['pxseedServer2023.serverCommand'] = new extend_1.RpcExtendServerCallable(async (cmd) => {
        if (cmd == 'buildEnviron') {
            return runCommand(`${process.execPath} ${(0, path_1.join)((0, webutils_1.getWWWRoot)(), '..', 'script', 'buildEnviron.js')}`);
        }
        else if (cmd == 'buildPackages') {
            return await runCommand(`${process.execPath} ${(0, path_1.join)((0, webutils_1.getWWWRoot)(), '..', 'script', 'buildPackages.js')}`);
        }
        else if (cmd == 'rebuildPackages') {
            let t1 = await runCommand(`${process.execPath} ${(0, path_1.join)((0, webutils_1.getWWWRoot)(), '..', 'script', 'cleanPackages.js')}`);
            t1 += await runCommand(`${process.execPath} ${(0, path_1.join)((0, webutils_1.getWWWRoot)(), '..', 'script', 'buildPackages.js')}`);
            return t1;
        }
        else if (cmd == 'getConfig') {
            await (0, workerInit_1.loadConfig)();
            return JSON.stringify(workerInit_1.config);
        }
        else if (cmd.startsWith('saveConfig ')) {
            let startAt = cmd.indexOf(' ') + 1;
            await (0, workerInit_1.saveConfig)(JSON.parse(cmd.substring(startAt)));
            await (0, workerInit_1.loadConfig)();
            return 'done';
        }
        return '';
    }).typedecl('s->s');
    //Should move to another file?
    async function startServer() {
        //(await import('inspector')).open(9229,'127.0.0.1',true);
        console.info('argv', process.argv);
        await (0, workerInit_1.loadConfig)();
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
            exports.httpServ.listen(workerInit_1.config.listenOn.port, workerInit_1.config.listenOn.host, 8, () => {
                exports.httpServ.off('error', cb);
                p.setResult(null);
            });
            return p.get();
        }
        let listenSucc = false;
        let maxListenPort = workerInit_1.config.listenOn.port + 4;
        for (; workerInit_1.config.listenOn.port < maxListenPort; workerInit_1.config.listenOn.port++) {
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
        console.log(JSON.stringify(workerInit_1.config, undefined, 2));
        exports.WsServer.router[workerInit_1.config.pxseedBase + workerInit_1.config.pxprpcPath] = pxprpcHandler;
        exports.WsServer.router[workerInit_1.config.pxseedBase + workerInit_1.config.wsPipePath] = wsPipeHandler;
        let blockFilesMatchReg = (workerInit_1.config.blockFilesMatch ?? []).map(exp => new RegExp(exp));
        for (let dir1 of workerInit_1.config.serveDirectory ?? []) {
            exports.koaRouter.get(workerInit_1.config.pxseedBase + `/${dir1}/:filepath(.+)`, async (ctx, next) => {
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
        let launcherUrl = await createNewEntryUrlWithPxprpcKey('partic2/packageManager/webui');
        console.info(launcherUrl);
        webutils_1.lifecycle.addEventListener('exit', () => {
            console.info('close http server');
            exports.httpServ.close((err) => {
                console.info('http server closed');
            });
        });
        Promise.allSettled(workerInit_1.config.initModule.map(mod => base_1.requirejs.promiseRequire(mod)));
        if (workerInit_1.config.deamonMode.enabled) {
            let subprocs = [];
            for (let t1 = 0; t1 < workerInit_1.config.deamonMode.subprocessConfig.length; t1++) {
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
            exports.command.subprocessRestart = async (index) => {
                if (subprocs[index].exitCode == null) {
                    let subCfg = workerInit_1.rootConfig.deamonMode.subprocessConfig[index];
                    let client1 = new extend_1.RpcExtendClient1(new base_2.Client(await new backend_1.WebSocketIo().connect(`ws://127.0.0.1:${subCfg.listenOn.port}${subCfg.pxseedBase ?? workerInit_1.config.pxseedBase}${subCfg.pxprpcPath ?? workerInit_1.config.pxprpcPath}?key=${subCfg.pxprpcKey ?? workerInit_1.config.pxprpcKey}`)));
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
                let subprocess = nodeRun(exports.__name__, ['--subprocess', String(index)]);
                subprocs[index] = subprocess;
            };
            extend_1.defaultFuncMap['pxseedServer2023.subprocess.restart'] = new extend_1.RpcExtendServerCallable(exports.command.subprocessRestart).typedecl('i->');
        }
    }
    if (!('__workerId' in globalThis)) {
        startServer().then(() => exports.ensureInit.setResult(0));
    }
});
//# sourceMappingURL=entry.js.map