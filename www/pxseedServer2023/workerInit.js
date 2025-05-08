define(["require", "exports", "partic2/nodehelper/env", "partic2/pxprpcClient/registry", "fs/promises", "partic2/jsutils1/webutils"], function (require, exports, env_1, registry_1, fs, webutils_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.rootConfig = exports.config = exports.__name__ = void 0;
    exports.loadConfig = loadConfig;
    exports.saveConfig = saveConfig;
    //init for any worker of pxseedServer2023, usually setup helper and pxprpc server
    (0, env_1.setupEnv)();
    exports.__name__ = 'pxseedServer2023/workerInit';
    if (!registry_1.rpcWorkerInitModule.includes(exports.__name__)) {
        registry_1.rpcWorkerInitModule.push(exports.__name__);
    }
    ;
    exports.config = {
        pxseedBase: '/pxseed',
        pxprpcPath: '/pxprpc/0',
        wsPipePath: '/ws/pipe',
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
    async function loadConfig() {
        try {
            let configData = await fs.readFile((0, webutils_1.getWWWRoot)() + '/pxseedServer2023/config.json');
            console.log(`config file ${(0, webutils_1.getWWWRoot)() + '/pxseedServer2023/config.json'} found. `);
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
            console.log(`config file not found, write to ${(0, webutils_1.getWWWRoot)() + '/pxseedServer2023/config.json'}`);
            await fs.writeFile((0, webutils_1.getWWWRoot)() + '/pxseedServer2023/config.json', new TextEncoder().encode(JSON.stringify(exports.config)));
        }
    }
    async function saveConfig(newConfig) {
        await fs.writeFile((0, webutils_1.getWWWRoot)() + '/pxseedServer2023/config.json', JSON.stringify(newConfig));
    }
});
//# sourceMappingURL=workerInit.js.map