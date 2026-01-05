define(["require", "exports", "partic2/jsutils1/base", "partic2/pxprpcClient/registry", "partic2/jsutils1/webutils", "partic2/CodeRunner/jsutils2", "partic2/tjshelper/tjsbuilder", "pxseedBuildScript/util"], function (require, exports, base_1, registry_1, webutils_1, jsutils2_1, tjsbuilder_1, util_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.__name__ = void 0;
    exports.cleanWWW = cleanWWW;
    exports.ensureCodeUpdated = ensureCodeUpdated;
    exports.getServerWWWRoot = getServerWWWRoot;
    exports.processDirectoryContainFile = processDirectoryContainFile;
    exports.findBrowserExecutable = findBrowserExecutable;
    exports.openUrlInBrowser = openUrlInBrowser;
    let servShell = null;
    exports.__name__ = 'partic2/packageManager/misc';
    let remoteModule = {
        misc: new jsutils2_1.Singleton(async () => {
            return await (0, registry_1.importRemoteModule)(await (await (0, registry_1.getPersistentRegistered)(registry_1.ServerHostWorker1RpcName)).ensureConnected(), 'partic2/packageManager/misc');
        })
    };
    async function cleanWWW(dir) {
        //Client side missing.
        let { dirname, join } = await new Promise((resolve_1, reject_1) => { require(['path'], resolve_1, reject_1); });
        let { readdir, rm, rmdir } = await new Promise((resolve_2, reject_2) => { require(['fs/promises'], resolve_2, reject_2); });
        let log = base_1.logger.getLogger(exports.__name__);
        let wwwDir = join(dirname(dirname(dirname(__dirname))), 'www');
        let sourceDir = join(dirname(dirname(dirname(__dirname))), 'source');
        //clean .js .d.ts .tsbuildinfo .js.map and empty directory
        dir = dir ?? wwwDir;
        let children = await readdir(dir, { withFileTypes: true });
        let emptyDir = true;
        for (let t1 of children) {
            if (t1.name.endsWith('.js') || t1.name.endsWith('.d.ts') || t1.name.endsWith('.tsbuildinfo') || t1.name.endsWith('.js.map')) {
                log.debug(`delete ${join(dir, t1.name)}`);
                await rm(join(dir, t1.name));
            }
            else if (t1.isDirectory()) {
                let r1 = await cleanWWW(join(dir, t1.name));
                if (r1.emptyDir) {
                    log.debug(`delete ${join(dir, t1.name)}`);
                    await rmdir(join(dir, t1.name));
                }
                else {
                    emptyDir = false;
                }
            }
            else {
                emptyDir = false;
            }
        }
        return { emptyDir };
    }
    let config1 = undefined;
    async function ensureCodeUpdated(opt) {
        if (globalThis.process?.versions?.node != undefined) {
            let { dirname, join } = await new Promise((resolve_3, reject_3) => { require(['path'], resolve_3, reject_3); });
            let { processDirectory } = await new Promise((resolve_4, reject_4) => { require(['pxseedBuildScript/buildlib'], resolve_4, reject_4); });
            config1 = await (0, webutils_1.GetPersistentConfig)(exports.__name__);
            if (config1.lastCodeUpateTime == undefined) {
                config1.lastCodeUpateTime = 0;
            }
            if ((0, base_1.DateDiff)((0, base_1.GetCurrentTime)(), new Date(config1.lastCodeUpateTime), 'second') > 20) {
                let sourceDir = join(dirname(dirname(dirname(__dirname))), 'source');
                await processDirectory(sourceDir);
                config1.lastCodeUpateTime = (0, base_1.GetCurrentTime)().getTime();
                await (0, webutils_1.SavePersistentConfig)(exports.__name__);
            }
            if (opt.reload == true) {
                let serverConfig = await new Promise((resolve_5, reject_5) => { require(['pxseedServer2023/pxseedhttpserver'], resolve_5, reject_5); });
                if (serverConfig.config.subprocessIndex != undefined) {
                    (async () => {
                        await (0, base_1.sleep)(100);
                        let clientFunc = await new Promise((resolve_6, reject_6) => { require(['pxseedServer2023/clientFunction'], resolve_6, reject_6); });
                        clientFunc.restartSubprocessSelf();
                    })();
                }
            }
        }
        else {
            let misc = await remoteModule.misc.get();
            config1 = await (0, webutils_1.GetPersistentConfig)(exports.__name__);
            if (config1.lastCodeUpateTime == undefined) {
                config1.lastCodeUpateTime = 0;
            }
            if ((0, base_1.DateDiff)((0, base_1.GetCurrentTime)(), new Date(config1.lastCodeUpateTime), 'second') > 20) {
                await misc.ensureCodeUpdated(opt);
                config1.lastCodeUpateTime = (0, base_1.GetCurrentTime)().getTime();
                await (0, webutils_1.SavePersistentConfig)(exports.__name__);
                if (opt.reload == true) {
                    await (0, base_1.sleep)(300);
                    window.location.reload();
                }
            }
        }
    }
    async function getServerWWWRoot() {
        if (globalThis.process?.versions?.node != undefined) {
            return (0, webutils_1.getWWWRoot)();
        }
        else {
            let misc = await remoteModule.misc.get();
            return await misc.getServerWWWRoot();
        }
    }
    async function processDirectoryContainFile(file) {
        if (globalThis.process?.versions?.node != undefined) {
            let { dirname, join } = await new Promise((resolve_7, reject_7) => { require(['path'], resolve_7, reject_7); });
            let { access } = await new Promise((resolve_8, reject_8) => { require(['fs/promises'], resolve_8, reject_8); });
            let { processDirectory } = await new Promise((resolve_9, reject_9) => { require(['pxseedBuildScript/buildlib'], resolve_9, reject_9); });
            let sourceDir = join(dirname(dirname(dirname(__dirname))), 'source');
            let splitPath = file.split(/[\\\/]/);
            let pkgPath = null;
            for (let t1 of base_1.ArrayWrap2.IntSequence(splitPath.length, -1)) {
                try {
                    await access(join(...splitPath.slice(0, t1), 'pxseed.config.json'));
                    pkgPath = join(...splitPath.slice(0, t1));
                    break;
                }
                catch (e) {
                }
            }
            let pkgName = null;
            if (pkgPath != null) {
                await processDirectory(pkgPath);
                pkgName = pkgPath.substring(sourceDir.length + 1).replace(/\\/g, '/');
            }
            return { sourceRoot: sourceDir, outputRoot: join(dirname(sourceDir), 'www'), pkgName };
        }
        else {
            let misc = await remoteModule.misc.get();
            return await misc.processDirectoryContainFile(file);
        }
    }
    async function findBrowserExecutableWin32() {
        let tjs = await (0, tjsbuilder_1.buildTjs)();
        let { fs, path } = await (0, util_1.getNodeCompatApi)();
        let chromiumPath = [['Google', 'Chrome', 'Application', 'chrome.exe'], ['Chromium', 'Application', 'chrome.exe'], ['Microsoft', 'Edge', 'Application', 'msedge.exe']];
        let geckoPath = [['Mozilla Firefox', 'firefox.exe']];
        let ProgramFilePrefix = Array.from(new Set([tjs.env['LOCALAPPDATA'], tjs.env['PROGRAMFILES'], tjs.env['PROGRAMFILES(X86)']].filter(t1 => t1 != undefined)));
        for (let t1 of ProgramFilePrefix) {
            let existed = false;
            for (let tpath of chromiumPath) {
                let exePath = path.join(t1, ...tpath);
                await tjs.stat(exePath).then(() => existed = true, () => existed = false);
                if (existed) {
                    return { type: 'chromium', exePath };
                }
            }
            for (let tpath of geckoPath) {
                let exePath = path.join(t1, ...tpath);
                await tjs.stat(exePath).then(() => existed = true, () => existed = false);
                if (existed) {
                    return { type: 'gecko', exePath };
                }
            }
        }
        return null;
    }
    async function findBrowserExecutabeLinux() {
        //Check PATH environment variable
        let tjs = await (0, tjsbuilder_1.buildTjs)();
        let { fs, path } = await (0, util_1.getNodeCompatApi)();
        let paths = (tjs.env['PATH'] ?? '').split(':');
        let chromiumName = ['chrome', 'chromium', 'microsoft-edge'];
        let geckoName = ['firefox'];
        for (let tpath of paths) {
            let existed = false;
            for (let tname of chromiumName) {
                let exePath = path.join(tpath, tname);
                await tjs.stat(exePath).then(() => existed = true, () => existed = false);
                if (existed) {
                    return { type: 'chromium', exePath };
                }
            }
            for (let tname of geckoName) {
                let exePath = path.join(tpath, tname);
                await tjs.stat(exePath).then(() => existed = true, () => existed = false);
                if (existed) {
                    return { type: 'chromium', exePath };
                }
            }
        }
        return null;
    }
    async function findBrowserExecutable() {
        let tjs = await (0, tjsbuilder_1.buildTjs)();
        let platform = tjs.system.platform;
        if (platform === 'windows') {
            return await findBrowserExecutableWin32();
        }
        else if (platform === 'linux') {
            return await findBrowserExecutabeLinux();
        }
        else {
            //Unsupport yet;
            return null;
        }
    }
    async function openUrlInBrowser(url, opts) {
        let browser = await findBrowserExecutable();
        (0, base_1.assert)(browser !== null, "Can't found an available browser.");
        let tjs = await (0, tjsbuilder_1.buildTjs)();
        let args = [browser.exePath];
        if (opts?.appMode === true && browser.type == 'chromium') {
            args.push('--app=' + url);
        }
        else {
            //TODO: Firefox appMode support.
            args.push(url);
        }
        tjs.spawn(args);
    }
});
//# sourceMappingURL=misc.js.map