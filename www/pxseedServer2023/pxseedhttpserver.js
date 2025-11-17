define(["require", "exports", "pxprpc/extend", "pxprpc/base", "partic2/pxprpcClient/registry", "partic2/jsutils1/webutils", "partic2/tjshelper/httpprot", "partic2/tjshelper/tjsbuilder", "partic2/jsutils1/base"], function (require, exports, extend_1, base_1, registry_1, webutils_1, httpprot_1, tjsbuilder_1, base_2) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.defaultHttpHandler = exports.defaultRouter = exports.rootConfig = exports.config = exports.subprocessMagic = exports.__name__ = void 0;
    exports.loadConfig = loadConfig;
    exports.saveConfig = saveConfig;
    exports.__name__ = base_2.requirejs.getLocalRequireModule(require);
    if (!registry_1.rpcWorkerInitModule.includes(exports.__name__)) {
        registry_1.rpcWorkerInitModule.push(exports.__name__);
    }
    exports.subprocessMagic = '--subprocessrnd197izpzgbvbhglw0w';
    ;
    exports.config = {
        pxseedBase: '/pxseed',
        listenOn: { host: '127.0.0.1', port: 2081 },
        initModule: [],
        pxprpcCheckOrigin: ['localhost', '127.0.0.1', '[::1]'],
        pxprpcKey: null,
        deamonMode: {
            enabled: false,
            subprocessConfig: []
        },
        //pxprpcKey should be secret.
        blockFilesMatch: ['^/www/pxseedServer2023/config\\.json$'],
        serveDirectory: ['www', 'source']
    };
    exports.rootConfig = { ...exports.config };
    async function loadConfig() {
        let tjs = await (0, tjsbuilder_1.buildTjs)();
        try {
            let configData = await tjs.readFile((0, webutils_1.getWWWRoot)() + '/pxseedServer2023/config.json');
            console.log(`config file ${(0, webutils_1.getWWWRoot)() + '/pxseedServer2023/config.json'} found. `);
            let readinConfig = JSON.parse(new TextDecoder().decode(configData));
            exports.rootConfig = Object.assign(readinConfig);
            if (globalThis.process == undefined)
                return null;
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
        catch (e) {
            console.log(`config file not found, write to ${(0, webutils_1.getWWWRoot)() + '/pxseedServer2023/config.json'}`);
            await saveConfig(exports.config);
        }
        exports.defaultRouter.setHandler(exports.config.pxseedBase + '/pxprpc/0', { websocket: pxprpcHandler });
        exports.defaultRouter.setHandler(exports.config.pxseedBase + '/ws/pipe', { websocket: wsPipeHandler });
    }
    async function saveConfig(newConfig) {
        let tjs = await (0, tjsbuilder_1.buildTjs)();
        let configFd = await tjs.open((0, webutils_1.getWWWRoot)() + '/pxseedServer2023/config.json', 'w');
        try {
            await configFd.write(new TextEncoder().encode(JSON.stringify(exports.config)));
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
        if (exports.config.pxprpcCheckOrigin === false || ctl.request.headers.get('origin') == undefined) {
            pass = true;
        }
        else if (ctl.request.headers.get('origin') != undefined) {
            let originUrl = new URL(ctl.request.headers.get('origin'));
            for (let t1 of [exports.config.listenOn.host, ...exports.config.pxprpcCheckOrigin]) {
                if (originUrl.hostname === t1) {
                    pass = true;
                    break;
                }
                ;
            }
        }
        if (!pass) {
            return;
        }
        pass = false;
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
    let wsPipe = new Map();
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
        let pipes = wsPipe.get(id);
        if (pipes == undefined) {
            pipes = new Set();
            wsPipe.set(id, pipes);
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
                wsPipe.delete(id);
            }
        }
    }
});
//# sourceMappingURL=pxseedhttpserver.js.map