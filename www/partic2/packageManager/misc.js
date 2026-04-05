define(["require", "exports", "partic2/jsutils1/base", "partic2/jsutils1/webutils", "partic2/CodeRunner/jsutils2", "partic2/tjshelper/tjsbuilder", "pxseedBuildScript/util", "partic2/CodeRunner/JsEnviron", "./registry"], function (require, exports, base_1, webutils_1, jsutils2_1, tjsbuilder_1, util_1, JsEnviron_1, registry_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.__name__ = void 0;
    exports.cleanWWW = cleanWWW;
    exports.findPxseedPackageContainFile = findPxseedPackageContainFile;
    exports.findBrowserExecutable = findBrowserExecutable;
    exports.openUrlInBrowser = openUrlInBrowser;
    exports.serverConsoleLog = serverConsoleLog;
    exports.addSystemStartupCommand = addSystemStartupCommand;
    exports.patchPxseedServerFiles = patchPxseedServerFiles;
    exports.generatePxseedServerFilesPatch = generatePxseedServerFilesPatch;
    exports.buildPackageContainFile = buildPackageContainFile;
    exports.__miscBuildFunctionEventListener = __miscBuildFunctionEventListener;
    exports.waitBuildWatcherEvent = waitBuildWatcherEvent;
    exports.startFileSystemWatcherAutoBuild = startFileSystemWatcherAutoBuild;
    exports.stopFileSystemWatcherAutoBuild = stopFileSystemWatcherAutoBuild;
    exports.__name__ = 'partic2/packageManager/misc';
    async function cleanWWW(dir) {
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
    async function findPxseedPackageContainFile(file) {
        let { fs, path, wwwroot } = await (0, util_1.getNodeCompatApi)();
        let { dirname, join } = path;
        let { access } = fs;
        let { processDirectory } = await new Promise((resolve_3, reject_3) => { require(['pxseedBuildScript/buildlib'], resolve_3, reject_3); });
        let sourceDir = join(dirname(dirname(dirname(__dirname))), 'source');
        let splitPath = file.split(/[\\\/]/);
        let pkgPath = null;
        for (let t1 of base_1.ArrayWrap2.IntSequence(splitPath.length, -1)) {
            try {
                let testConfig = join(...splitPath.slice(0, t1), 'pxseed.config.json');
                if (wwwroot.startsWith('/')) {
                    testConfig = '/' + testConfig;
                }
                await access(testConfig);
                pkgPath = join(testConfig, '..');
                break;
            }
            catch (e) {
            }
        }
        let pkgName = null;
        if (pkgPath != null) {
            pkgName = pkgPath.substring(sourceDir.length + 1).replace(/\\/g, '/');
        }
        return { sourceRoot: sourceDir, outputRoot: join(dirname(sourceDir), 'www'), pkgName, pkgPath };
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
        let chromiumName = ['google-chrome', 'chromium', 'microsoft-edge'];
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
    async function serverConsoleLog(msg) {
        console.info(msg);
    }
    async function addSystemStartupCommandWindows(name, cmd) {
        let tjs1 = await (0, tjsbuilder_1.buildTjs)();
        let dir1 = `${tjs1.env['APPDATA']}\\Microsoft\\Windows\\Start Menu\\Programs\\Startup`;
        let file1 = await tjs1.open(`${dir1}\\pxseed-${name}.bat`, 'w');
        try {
            await file1.write((0, jsutils2_1.utf8conv)(cmd));
        }
        finally {
            file1.close().catch(() => { });
        }
    }
    async function addSystemStartupCommandLinux(name, cmd) {
        let tjs1 = await (0, tjsbuilder_1.buildTjs)();
        let dir1 = `${tjs1.env['HOME']}/.config/autostart`;
        const desktopFile = [
            '[Desktop Entry]',
            'Type=Application',
            'Version=1.0',
            `Name=pxseed-${name}`,
            `Comment=pxseed-${name} startup script`,
            `Exec=${cmd}`,
            'StartupNotify=false',
            'Terminal=false'
        ].join('\n');
        let file1 = await tjs1.open(`${dir1}/pxseed-${name}.desktop`, 'w');
        try {
            await file1.write((0, jsutils2_1.utf8conv)(desktopFile));
        }
        finally {
            file1.close().catch(() => { });
        }
        await tjs1.chmod(`${dir1}/pxseed-${name}.desktop`, 0o777);
    }
    async function addSystemStartupCommand(name, cmd) {
        let tjs = await (0, tjsbuilder_1.buildTjs)();
        let platform = tjs.system.platform;
        if (platform === 'windows') {
            await addSystemStartupCommandWindows(name, cmd);
        }
        else if (platform === 'linux') {
            await addSystemStartupCommandLinux(name, cmd);
        }
        else {
            throw new Error('Unsupported platform');
        }
    }
    //Patch files in PXSEED_HOME from remote patch file.
    async function patchPxseedServerFiles(patchIndexUrl) {
        let resp = await webutils_1.defaultHttpClient.fetch(patchIndexUrl);
        let { path } = await new Promise((resolve_4, reject_4) => { require(['partic2/jsutils1/webutils'], resolve_4, reject_4); });
        (0, base_1.assert)(resp.ok);
        let patchIndex = await resp.json();
        let fetchIndexRootUrl = new URL(patchIndexUrl);
        if (patchIndex.fetchRoot.startsWith('.')) {
            fetchIndexRootUrl.pathname = path.join(fetchIndexRootUrl.pathname, '..', patchIndex.fetchRoot);
        }
        else if (patchIndex.fetchRoot.startsWith('/')) {
            fetchIndexRootUrl.pathname = patchIndex.fetchRoot;
        }
        else {
            fetchIndexRootUrl = new URL(patchIndex.fetchRoot);
        }
        await (0, JsEnviron_1.ensureDefaultFileSystem)();
        let fs = JsEnviron_1.defaultFileSystem;
        let pxseedHome = path.join((0, JsEnviron_1.getSimpleFileSysteNormalizedWWWRoot)(), '..');
        for (let t1 of patchIndex.files) {
            try {
                let needUpdate = true;
                if (t1.lastModified > 0) {
                    try {
                        let statRes = await fs.stat(pxseedHome + '/' + t1.path);
                        if (statRes.mtime.getTime() >= t1.lastModified)
                            needUpdate = false;
                    }
                    catch (err) {
                        (0, base_1.throwIfAbortError)(err);
                    }
                    ;
                }
                if (needUpdate) {
                    let url2 = new URL(fetchIndexRootUrl);
                    url2.pathname += '/' + t1.path;
                    let file1 = await webutils_1.defaultHttpClient.fetch(url2.toString());
                    if (file1.ok && file1.body != null) {
                        await file1.body.pipeTo(JsEnviron_1.simpleFileSystemHelper.getFileSystemWritableStream(fs, pxseedHome + '/' + t1.path));
                    }
                }
            }
            catch (err) {
                console.error(err);
                (0, base_1.throwIfAbortError)(err);
            }
        }
    }
    //Generate patch files from patchDir relative the PXSEED_HOME
    async function generatePxseedServerFilesPatch(patchDir) {
        let { path } = await new Promise((resolve_5, reject_5) => { require(['partic2/jsutils1/webutils'], resolve_5, reject_5); });
        await (0, JsEnviron_1.ensureDefaultFileSystem)();
        let fs = JsEnviron_1.defaultFileSystem;
        let pxseedHome = path.join((0, JsEnviron_1.getSimpleFileSysteNormalizedWWWRoot)(), '..');
        let patchIndex = {
            fetchRoot: '../../../..',
            files: new Array,
        };
        async function iterDir(dir, depth) {
            if (depth == 0)
                return;
            let children = await fs.listdir(dir);
            for (let t1 of children) {
                if (t1.name.startsWith('.'))
                    continue;
                let fullpath = dir + '/' + t1.name;
                if (t1.type === 'dir') {
                    await iterDir(fullpath, depth - 1);
                }
                else {
                    patchIndex.files.push({ path: fullpath.substring(pxseedHome.length + 1), lastModified: (await fs.stat(fullpath)).mtime.getTime() });
                }
            }
        }
        for (let t1 of patchDir) {
            await iterDir(pxseedHome + '/' + t1, 30);
        }
        await fs.writeAll(pxseedHome + '/www/' + exports.__name__ + '/PxseedServerFilesPatch.json', (0, jsutils2_1.utf8conv)(JSON.stringify(patchIndex)));
    }
    let buildWatcher = {
        event: new base_1.future(),
        fsw: null,
        pendingBuildingTask: new Set()
    };
    async function buildPackageContainFile(file) {
        let r = await findPxseedPackageContainFile(file);
        if (r.pkgName != null) {
            await (0, registry_1.buildPackageAndNotfiy)(r.pkgName);
        }
        return r;
    }
    function __miscBuildFunctionEventListener(pkgName) {
        buildWatcher.event.setResult([{ event: 'build', pkgName }]);
        buildWatcher.event = new base_1.future();
    }
    async function waitBuildWatcherEvent() {
        if (registry_1.listener.onBuild.find(t1 => t1.module === exports.__name__) == undefined) {
            registry_1.listener.onBuild.push({ module: exports.__name__, function: '__miscBuildFunctionEventListener' });
        }
        return buildWatcher.event.get();
    }
    let fileSystemWatcherAutoBuildDebounceCall = new jsutils2_1.DebounceCall(async () => {
        let copy = Array.from(buildWatcher.pendingBuildingTask);
        buildWatcher.pendingBuildingTask.clear();
        for (let t1 of copy) {
            await (0, registry_1.buildPackageAndNotfiy)(t1);
        }
    }, 1000);
    async function startFileSystemWatcherAutoBuild() {
        if (buildWatcher.fsw == null) {
            let nfs = await new Promise((resolve_6, reject_6) => { require(['fs'], resolve_6, reject_6); });
            let { fs, path, wwwroot } = await (0, util_1.getNodeCompatApi)();
            let sourceRoot = path.join(wwwroot, '..', 'source');
            buildWatcher.fsw = nfs.watch(sourceRoot, { recursive: true }, async (ev, fn) => {
                if (fn != null && fn.match(/[\\\/]\./) == null) {
                    let { pkgName } = await findPxseedPackageContainFile(path.join(sourceRoot, fn));
                    if (pkgName != null) {
                        buildWatcher.pendingBuildingTask.add(pkgName);
                        await fileSystemWatcherAutoBuildDebounceCall.call();
                    }
                }
            });
        }
    }
    async function stopFileSystemWatcherAutoBuild() {
        if (buildWatcher.fsw != null) {
            buildWatcher.fsw.close();
            buildWatcher.fsw = null;
        }
    }
});
//# sourceMappingURL=misc.js.map