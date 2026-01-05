define(["require", "exports", "pxprpc/extend", "pxprpc/base", "partic2/pxprpcClient/registry", "partic2/jsutils1/webutils", "partic2/tjshelper/httpprot", "partic2/tjshelper/tjsbuilder", "partic2/jsutils1/base", "partic2/CodeRunner/JsEnviron", "partic2/pxprpcClient/rpcworker"], function (require, exports, extend_1, base_1, registry_1, webutils_1, httpprot_1, tjsbuilder_1, base_2, JsEnviron_1, rpcworker_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.serverCommandRegistry = exports.wsPipe = exports.defaultHttpHandler = exports.defaultRouter = exports.rootConfig = exports.config = exports.subprocessMagic = exports.__name__ = void 0;
    exports.loadConfig = loadConfig;
    exports.saveConfig = saveConfig;
    exports.setupHttpServerHandler = setupHttpServerHandler;
    exports.pxseedRunStartupModules = pxseedRunStartupModules;
    exports.serverCommand = serverCommand;
    exports.getConnectionForServerHost = getConnectionForServerHost;
    exports.initNotebookCodeEnv = initNotebookCodeEnv;
    exports.__name__ = base_2.requirejs.getLocalRequireModule(require);
    if (!registry_1.rpcWorkerInitModule.includes(exports.__name__)) {
        registry_1.rpcWorkerInitModule.push(exports.__name__);
        registry_1.rpcWorkerInitModule.push(webutils_1.path.join(exports.__name__, '..', 'httponrpc'));
    }
    exports.subprocessMagic = '--subprocessrnd197izpzgbvbhglw0w';
    ;
    exports.config = {
        pxseedBase: '/pxseed',
        listenOn: { host: '127.0.0.1', port: 2081 },
        initModule: [],
        pxprpcKey: null,
        deamonMode: {
            enabled: false,
            subprocessConfig: []
        },
        //pxprpcKey should be secret.
        blockFilesMatch: ['^/+www/+pxseedServer2023/+config\\.json$']
    };
    exports.rootConfig = { ...exports.config };
    async function loadConfig() {
        let tjs = await (0, tjsbuilder_1.buildTjs)();
        try {
            let configData = await tjs.readFile((0, webutils_1.getWWWRoot)() + '/pxseedServer2023/config.json');
            console.warn(`config file ${(0, webutils_1.getWWWRoot)() + '/pxseedServer2023/config.json'} found. `);
            let readinConfig = JSON.parse(new TextDecoder().decode(configData));
            exports.rootConfig = Object.assign(readinConfig);
            if (globalThis.process != undefined) {
                let subprocessAt = process.argv.indexOf(exports.subprocessMagic);
                if (subprocessAt >= 0) {
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
            else {
                Object.assign(exports.config, exports.rootConfig);
            }
        }
        catch (e) {
            console.warn(`config file not found, write to ${(0, webutils_1.getWWWRoot)() + '/pxseedServer2023/config.json'}`);
            exports.config.pxprpcKey = (0, base_2.GenerateRandomString)(8);
            await saveConfig(exports.config);
        }
    }
    async function saveConfig(newConfig) {
        let tjs = await (0, tjsbuilder_1.buildTjs)();
        let configFd = await tjs.open((0, webutils_1.getWWWRoot)() + '/pxseedServer2023/config.json', 'w');
        try {
            await configFd.write(new TextEncoder().encode(JSON.stringify(newConfig)));
        }
        finally {
            configFd.close();
        }
    }
    exports.defaultRouter = new httpprot_1.SimpleHttpServerRouter();
    exports.defaultHttpHandler = {
        onfetch: exports.defaultRouter.onfetch,
        onwebsocket: exports.defaultRouter.onwebsocket
    };
    async function pxprpcHandler(ctl) {
        let pass = false;
        if (exports.config.pxprpcKey === null) {
            pass = true;
        }
        else {
            if (decodeURIComponent((0, webutils_1.GetUrlQueryVariable2)(ctl.request.url ?? '', 'key') ?? '') === exports.config.pxprpcKey) {
                pass = true;
            }
            else {
                pass = false;
            }
        }
        if (pass) {
            let serv = new extend_1.RpcExtendServer1(new base_1.Server(await ctl.accept()));
            //mute error
            serv.serve().catch(() => { });
        }
    }
    exports.wsPipe = new Map();
    async function wsPipeHandler(ctl) {
        let url = ctl.request.url;
        if (url == undefined)
            return;
        let id = (0, webutils_1.GetUrlQueryVariable2)(url, 'id');
        if (id == undefined)
            return;
        id = decodeURIComponent(id);
        await serveWsPipe(await ctl.accept(), id);
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
    async function setupHttpServerHandler() {
        let serverworker1 = await (0, registry_1.getPersistentRegistered)(registry_1.ServerHostWorker1RpcName);
        if (serverworker1 == null) {
            serverworker1 = await (0, registry_1.addClient)('webworker:' + registry_1.ServerHostWorker1RpcName);
        }
        exports.defaultRouter.setHandler(exports.config.pxseedBase + '/pxprpc/0', { websocket: pxprpcHandler });
        exports.defaultRouter.setHandler(exports.config.pxseedBase + '/ws/pipe', { websocket: wsPipeHandler });
        let tjs = await (0, tjsbuilder_1.buildTjs)();
        let tjsfs = new JsEnviron_1.TjsSfs();
        tjsfs.from(tjs);
        await tjsfs.ensureInited();
        let { path } = await new Promise((resolve_1, reject_1) => { require(['partic2/jsutils1/webutils'], resolve_1, reject_1); });
        let wwwroot = (0, webutils_1.getWWWRoot)().replace(/\\/g, '/');
        let fileServer = new httpprot_1.SimpleFileServer(new JsEnviron_1.DirAsRootFS(tjsfs, wwwroot));
        fileServer.pathStartAt = (exports.config.pxseedBase + '/www').length;
        exports.defaultRouter.setHandler(exports.config.pxseedBase + '/www', { fetch: fileServer.onfetch });
        let blockFileMatchRegex = exports.config.blockFilesMatch?.map(t1 => new RegExp(t1)) ?? [];
        fileServer.interceptor = async (path) => {
            path = '/www' + path;
            for (let t1 of blockFileMatchRegex) {
                if (t1.test(path)) {
                    return new Response(null, { status: 403 });
                }
            }
            return null;
        };
        fileServer.cacheControl = async (filePath) => {
            if (filePath.endsWith('.js') || filePath === '/index.html') {
                return 'no-cache';
            }
            else {
                return { maxAge: 86400 };
            }
        };
        {
            //For sourcemap
            fileServer = new httpprot_1.SimpleFileServer(new JsEnviron_1.DirAsRootFS(tjsfs, path.join(wwwroot, '..', 'source')));
            fileServer.pathStartAt = (exports.config.pxseedBase + '/source').length;
            exports.defaultRouter.setHandler(exports.config.pxseedBase + '/source', { fetch: fileServer.onfetch });
        }
    }
    async function copyFilesNewer(destDir, srcDir, maxDepth, log) {
        log?.info(`Check directory "${srcDir}"`);
        let { getNodeCompatApi } = await new Promise((resolve_2, reject_2) => { require(['pxseedBuildScript/util'], resolve_2, reject_2); });
        if (maxDepth == undefined) {
            maxDepth = 20;
        }
        if (maxDepth == 0) {
            return;
        }
        const { fs, path } = await getNodeCompatApi();
        await fs.mkdir(destDir, { recursive: true });
        let children = await fs.readdir(srcDir, { withFileTypes: true });
        try {
            await fs.access(destDir);
        }
        catch (e) {
            await fs.mkdir(destDir, { recursive: true });
        }
        for (let t1 of children) {
            if (t1.isDirectory()) {
                await copyFilesNewer(path.join(destDir, t1.name), path.join(srcDir, t1.name), maxDepth - 1);
            }
            else {
                let dest = path.join(destDir, t1.name);
                let src = path.join(srcDir, t1.name);
                let needCopy = false;
                try {
                    let dfile = await fs.stat(dest);
                    let sfile2 = await fs.stat(src);
                    if (dfile.mtimeMs < sfile2.mtimeMs) {
                        needCopy = true;
                    }
                }
                catch (e) {
                    needCopy = true;
                }
                if (needCopy) {
                    log?.info(`update file "${dest}";`);
                    await fs.mkdir(path.dirname(dest), { recursive: true });
                    await fs.copyFile(src, dest);
                }
            }
        }
    }
    exports.serverCommandRegistry = {
        buildPackages: async () => {
            let { processDirectory } = await new Promise((resolve_3, reject_3) => { require(['pxseedBuildScript/buildlib'], resolve_3, reject_3); });
            let { getNodeCompatApi, withConsole } = await new Promise((resolve_4, reject_4) => { require(['pxseedBuildScript/util'], resolve_4, reject_4); });
            let { path, wwwroot } = await getNodeCompatApi();
            let records = [];
            let wrapConsole = { ...globalThis.console };
            wrapConsole.debug = (...msg) => records.push(msg);
            wrapConsole.info = (...msg) => records.push(msg);
            wrapConsole.warn = (...msg) => records.push(msg);
            wrapConsole.error = (...msg) => records.push(msg);
            await copyFilesNewer(wwwroot, path.join(wwwroot, '..', 'copysource'), 16, wrapConsole);
            await withConsole(wrapConsole, () => processDirectory(path.join(wwwroot, '..', 'source')));
            return records.map(t1 => t1.join(' ')).join('\n');
        },
        rebuildPackages: async () => {
            let { processDirectory, cleanBuildStatus } = await new Promise((resolve_5, reject_5) => { require(['pxseedBuildScript/buildlib'], resolve_5, reject_5); });
            let { getNodeCompatApi } = await new Promise((resolve_6, reject_6) => { require(['pxseedBuildScript/util'], resolve_6, reject_6); });
            let { path, wwwroot } = await getNodeCompatApi();
            await cleanBuildStatus(path.join(wwwroot, '..', 'source'));
            await processDirectory(path.join(wwwroot, '..', 'source'));
        },
        getConfig: async () => {
            await loadConfig();
            return exports.config;
        },
        saveConfig: async (param) => {
            await saveConfig(param);
            await loadConfig();
            return 'done';
        }
    };
    function pxseedRunStartupModules() {
        Promise.allSettled(exports.config.initModule.map(mod => base_2.requirejs.promiseRequire(mod)));
        if (exports.config.subprocessIndex == undefined)
            new Promise((resolve_7, reject_7) => { require(['partic2/packageManager/onServerStartup'], resolve_7, reject_7); });
    }
    async function serverCommand(cmd, param) {
        if (exports.serverCommandRegistry[cmd] != undefined) {
            return exports.serverCommandRegistry[cmd](param);
        }
        throw new Error(`No handler for command ${cmd}`);
    }
    //For ServerHost access on Server side
    async function getConnectionForServerHost() {
        if (globalThis.__workerId == undefined) {
            let [c2s, s2c] = (0, registry_1.createIoPipe)();
            new extend_1.RpcExtendServer1(new base_1.Server(s2c)).serve().catch(() => { });
            return c2s;
        }
        else {
            return await (0, rpcworker_1.getRpcClientConnectWorkerParent)();
        }
    }
    (0, registry_1.addClient)('pxseedjs:' + exports.__name__ + '.getConnectionForServerHost', registry_1.ServerHostRpcName).catch(() => { });
    async function initNotebookCodeEnv(_ENV) {
        Object.assign(_ENV, exports.serverCommandRegistry);
    }
});
//# sourceMappingURL=pxseedhttpserver.js.map