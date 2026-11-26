define("pxseedServer2023/pxseedhttpserver", ["require", "exports", "pxprpc/extend", "pxprpc/base", "partic2/pxprpcClient/registry", "partic2/jsutils1/webutils", "partic2/tjshelper/httpprot", "partic2/tjshelper/tjsbuilder", "partic2/jsutils1/base", "partic2/CodeRunner/JsEnviron", "partic2/pxprpcClient/rpcworker"], function (require, exports, extend_1, base_1, registry_1, webutils_1, httpprot_1, tjsbuilder_1, base_2, JsEnviron_1, rpcworker_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.serverCommandRegistry = exports.defaultHttpHandler = exports.defaultRouter = exports.blockStaticFileAccessIf = exports.rootConfig = exports.config = exports.__name__ = void 0;
    exports.setupServerPxprpcClient = setupServerPxprpcClient;
    exports.loadConfig = loadConfig;
    exports.saveConfig = saveConfig;
    exports.setupHttpServerHandler = setupHttpServerHandler;
    exports.pxseedRunStartupModules = pxseedRunStartupModules;
    exports.serverCommand = serverCommand;
    exports.getConnectionForServerHost = getConnectionForServerHost;
    exports.__serverHostSetServerInformation = __serverHostSetServerInformation;
    exports.__serverHostGetServerInformation = __serverHostGetServerInformation;
    exports.__serverHostBroadcastToQueryServerInformation = __serverHostBroadcastToQueryServerInformation;
    exports.__name__ = base_2.requirejs.getLocalRequireModule(require);
    if (!registry_1.rpcWorkerInitModule.includes(exports.__name__)) {
        registry_1.rpcWorkerInitModule.push(exports.__name__);
    }
    ;
    exports.config = {
        pxseedBase: '/pxseed',
        listenOn: { host: '0.0.0.0', port: 2081 },
        initModule: [],
        pxprpcKey: null,
        deamonMode: {
            enabled: false,
            subprocessConfig: []
        },
        serveSourceDirectory: false
    };
    exports.rootConfig = { ...exports.config };
    exports.blockStaticFileAccessIf = new Map();
    exports.blockStaticFileAccessIf.set(exports.__name__ + '.keepPxprpcKeySecret', async (path) => /^\/+www\/+pxseedServer2023\/+config\.json$/.test(path));
    async function setupServerPxprpcClient() {
        await (0, registry_1.addClient)({ url: 'pxseedjs:' + exports.__name__ + '.getConnectionForServerHost', name: registry_1.ServerHostRpcName });
        await (0, registry_1.addClient)({ url: 'webworker:partic2/pxprpcClient/registry/worker/1', name: registry_1.ServerHostWorker1RpcName });
        registry_1.rpcWorkerInitModule.push({ module: exports.__name__, func: 'setupServerPxprpcClient' });
    }
    async function loadConfig() {
        await setupServerPxprpcClient();
        let tjs = await (0, tjsbuilder_1.buildTjs)();
        try {
            let configData = await tjs.readFile((0, webutils_1.getWWWRoot)() + '/pxseedServer2023/config.json');
            console.warn(`config file ${(0, webutils_1.getWWWRoot)() + '/pxseedServer2023/config.json'} found. `);
            let readinConfig = JSON.parse(new TextDecoder().decode(configData));
            exports.rootConfig = Object.assign(readinConfig);
            Object.assign(exports.config, exports.rootConfig);
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
    async function setupHttpServerHandler() {
        let serverworker1 = await (0, registry_1.getPersistentRegistered)(registry_1.ServerHostWorker1RpcName);
        if (serverworker1 == null) {
            await (0, registry_1.addClient)({ url: 'webworker:' + registry_1.ServerHostWorker1RpcName, name: registry_1.ServerHostWorker1RpcName, persistent: true });
            serverworker1 = await (0, registry_1.getRegistered)(registry_1.ServerHostWorker1RpcName);
        }
        exports.defaultRouter.setHandler(exports.config.pxseedBase + '/pxprpc/0', { websocket: pxprpcHandler });
        let tjs = await (0, tjsbuilder_1.buildTjs)();
        let tjsfs = new JsEnviron_1.TjsSfs();
        tjsfs.from(tjs);
        await tjsfs.ensureInited();
        let { path } = await new Promise((resolve_1, reject_1) => { require(['partic2/jsutils1/webutils'], resolve_1, reject_1); });
        let wwwroot = (0, webutils_1.getWWWRoot)().replace(/\\/g, '/');
        let fileServer = new httpprot_1.SimpleFileServer(new JsEnviron_1.DirAsRootFS(tjsfs, wwwroot));
        fileServer.pathStartAt = (exports.config.pxseedBase + '/www').length;
        fileServer.interceptor = async (path) => {
            path = '/www' + path;
            for (let t1 of exports.blockStaticFileAccessIf.values()) {
                if (await t1(path)) {
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
        let wwwOnFetch = async (req) => {
            let resp = await fileServer.onfetch(req);
            let pxseedserveropt = (0, webutils_1.GetUrlQueryVariable2)(req.url, '__pxseedserveropt');
            if (pxseedserveropt != null) {
                let opt = decodeURIComponent(pxseedserveropt).split(' ');
                if (opt.includes('coi')) {
                    //Cross Origin Isolation
                    resp.headers.append('Cross-Origin-Opener-Policy', 'same-origin');
                    resp.headers.append('Cross-Origin-Embedder-Policy', 'require-corp');
                }
            }
            return resp;
        };
        exports.defaultRouter.setHandler(exports.config.pxseedBase + '/www', { fetch: wwwOnFetch });
        if (exports.config.serveSourceDirectory) {
            //For sourcemap
            let soourceFileServer = new httpprot_1.SimpleFileServer(new JsEnviron_1.DirAsRootFS(tjsfs, path.join(wwwroot, '..', 'source')));
            soourceFileServer.pathStartAt = (exports.config.pxseedBase + '/source').length;
            exports.defaultRouter.setHandler(exports.config.pxseedBase + '/source', { fetch: soourceFileServer.onfetch });
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
        __workerBuildPackages: async () => {
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
        buildPackages: async () => {
            let mod1 = await (0, registry_1.importRemoteModule)(await (await (0, registry_1.getPersistentRegistered)(registry_1.ServerHostWorker1RpcName)).ensureConnected(), exports.__name__);
            return mod1.serverCommand('__workerBuildPackages', {});
        },
        __workerRebuildPackages: async () => {
            let { processDirectory, cleanBuildStatus } = await new Promise((resolve_5, reject_5) => { require(['pxseedBuildScript/buildlib'], resolve_5, reject_5); });
            let { getNodeCompatApi, withConsole } = await new Promise((resolve_6, reject_6) => { require(['pxseedBuildScript/util'], resolve_6, reject_6); });
            let { path, wwwroot } = await getNodeCompatApi();
            let records = [];
            let wrapConsole = { ...globalThis.console };
            wrapConsole.debug = (...msg) => records.push(msg);
            wrapConsole.info = (...msg) => records.push(msg);
            wrapConsole.warn = (...msg) => records.push(msg);
            wrapConsole.error = (...msg) => records.push(msg);
            await withConsole(wrapConsole, async () => {
                await cleanBuildStatus(path.join(wwwroot));
                await processDirectory(path.join(wwwroot, '..', 'source'));
            });
            return records.map(t1 => t1.join(' ')).join('\n');
        },
        rebuildPackages: async () => {
            let mod1 = await (0, registry_1.importRemoteModule)(await (await (0, registry_1.getPersistentRegistered)(registry_1.ServerHostWorker1RpcName)).ensureConnected(), exports.__name__);
            return mod1.serverCommand('__workerRebuildPackages', {});
        },
        getConfig: async () => {
            await loadConfig();
            return exports.config;
        },
        saveConfig: async (param) => {
            await saveConfig(param);
            await loadConfig();
            return 'done';
        },
        //restartListener:close the server socket and restart it. Implemented by 
    };
    function pxseedRunStartupModules() {
        Promise.allSettled(exports.config.initModule.map(mod => new Promise((resolve_7, reject_7) => { require([mod], resolve_7, reject_7); })));
        if (exports.config.subprocessIndex == undefined)
            new Promise((resolve_8, reject_8) => { require(['partic2/packageManager/onServerStartup'], resolve_8, reject_8); });
    }
    async function serverCommand(cmd, param) {
        if (exports.serverCommandRegistry[cmd] != undefined) {
            return exports.serverCommandRegistry[cmd](param);
        }
        throw new Error(`No handler for command ${cmd}`);
    }
    //For ServerHost access on Server side
    async function getConnectionForServerHost() {
        let parent = await (0, rpcworker_1.getRpcClientConnectWorkerParent)();
        if (parent == null) {
            let [c2s, s2c] = (0, registry_1.createIoPipe)();
            new extend_1.RpcExtendServer1(new base_1.Server(s2c)).serve().catch(() => { });
            return c2s;
        }
        else {
            return parent;
        }
    }
    //Server information API should only used through "./clientFunction" module
    let serverInformation = new Array();
    let udpBroadcastEndpoint = null;
    let cachedRemoteServerInformation = {};
    async function ensureUdpBroadcastEndpoint() {
        if (udpBroadcastEndpoint != null)
            return;
        let tjs = await (0, tjsbuilder_1.buildTjs)();
        udpBroadcastEndpoint = await tjs.listen('udp', '0.0.0.0', exports.config.listenOn?.port ?? 2081);
        await udpBroadcastEndpoint.setBroadcast(true);
        (async () => {
            let { utf8conv } = await new Promise((resolve_9, reject_9) => { require(['partic2/CodeRunner/jsutils2'], resolve_9, reject_9); });
            while (udpBroadcastEndpoint != null) {
                let recvBuf = new Uint8Array(1000);
                let rinfo = await udpBroadcastEndpoint.recv(recvBuf);
                let remoteAddr = rinfo.addr;
                let msg = utf8conv(new Uint8Array(recvBuf.buffer, 0, rinfo.nread));
                if (msg == '?') {
                    for (let t1 of serverInformation) {
                        udpBroadcastEndpoint.send(utf8conv(t1), remoteAddr);
                    }
                }
                else {
                    let source = 'udp://' + remoteAddr.ip + ':' + remoteAddr.port;
                    if (cachedRemoteServerInformation[source] == undefined) {
                        cachedRemoteServerInformation[source] = [];
                    }
                    cachedRemoteServerInformation[source].push(msg);
                }
            }
        })();
    }
    async function __serverHostSetServerInformation(info) {
        await ensureUdpBroadcastEndpoint();
        (0, base_2.assert)(!info.includes('?'), '"?" is reserved for broadcast query.');
        serverInformation = info;
    }
    async function __serverHostGetServerInformation() {
        return serverInformation;
    }
    async function __serverHostBroadcastToQueryServerInformation(waitSecond) {
        let { utf8conv } = await new Promise((resolve_10, reject_10) => { require(['partic2/CodeRunner/jsutils2'], resolve_10, reject_10); });
        waitSecond = waitSecond ?? 1;
        await ensureUdpBroadcastEndpoint();
        cachedRemoteServerInformation = {};
        udpBroadcastEndpoint.send(utf8conv('?'), { family: 4, ip: '255.255.255.255', port: exports.config.listenOn?.port ?? 2081 });
        if (exports.config.broadcastUdpPorts != undefined) {
            for (let k1 of exports.config.broadcastUdpPorts) {
                udpBroadcastEndpoint.send(utf8conv('?'), { family: 4, ip: '255.255.255.255', port: k1 });
            }
        }
        await (0, base_2.sleep)(waitSecond * 1000);
        let result = cachedRemoteServerInformation;
        cachedRemoteServerInformation = {};
        return result;
    }
});
