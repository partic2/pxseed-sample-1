define("pxseedBuildScript/buildlib", ["require", "exports", "./loaders", "./util"], function (require, exports, loaders_1, util_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.outputDir = exports.sourceDir = void 0;
    exports.getWWWLastBuildTime = getWWWLastBuildTime;
    exports.setWWWLastBuildTime = setWWWLastBuildTime;
    exports.processDirectoryInRecursive = processDirectoryInRecursive;
    exports.processDirectory = processDirectory;
    exports.cleanPackage = cleanPackage;
    exports.cleanBuildStatus = cleanBuildStatus;
    Object.defineProperty(exports, "sourceDir", { enumerable: true, get: function () { return loaders_1.sourceDir; } });
    Object.defineProperty(exports, "outputDir", { enumerable: true, get: function () { return loaders_1.outputDir; } });
    function makeDefaultStatus() {
        return {
            lastBuildTime: 1,
            lastSuccessBuildTime: 1,
            lastBuildError: [],
            currentBuildError: [],
            subpackages: [],
            loadersData: {}
        };
    }
    async function getWWWLastBuildTime() {
        const { fs, path } = await (0, util_1.getNodeCompatApi)();
        let buildstatusFile = path.join(loaders_1.outputDir, 'pxseedBuildScript', 'data', 'buildstatus.json');
        let status = {};
        try {
            status = await util_1.__internal__.readJson(buildstatusFile);
        }
        catch (err) { }
        return status.WWWLastBuildTime ?? 0;
    }
    //Concurrent file issue if used in multi-thread.
    async function setWWWLastBuildTime(time) {
        const { fs, path } = await (0, util_1.getNodeCompatApi)();
        let buildstatusFile = path.join(loaders_1.outputDir, 'pxseedBuildScript', 'data', 'buildstatus.json');
        let status = {};
        try {
            status = await util_1.__internal__.readJson(buildstatusFile);
        }
        catch (err) { }
        status.WWWLastBuildTime = time ?? new Date().getTime();
        await util_1.__internal__.writeJson(buildstatusFile, status);
    }
    function throwIfAbortError(e) {
        if (e.name === 'AbortError') {
            throw e;
        }
    }
    async function processDirectoryInRecursive(dir, context) {
        await loaders_1.inited;
        context = context ?? {};
        context._ensuredPackages = context._ensuredPackages ?? new Set();
        let startTime = new Date().getTime();
        const { fs, path } = await (0, util_1.getNodeCompatApi)();
        util_1.console.info(`enter ${dir}`);
        let children = await fs.readdir(dir, { withFileTypes: true });
        let hasPxseedConfig = false;
        if (children.find(v => v.name == 'pxseed.config.json')) {
            hasPxseedConfig = true;
            util_1.console.info('pxseed.config.json found');
        }
        if (!hasPxseedConfig) {
            for (let child of children) {
                if (child.isDirectory()) {
                    try {
                        await processDirectoryInRecursive(path.join(dir, child.name), context);
                    }
                    catch (err) {
                        throwIfAbortError(err);
                        util_1.console.warn('recursive pxseed process failed.' + err.toString() + '\n' + err.stack);
                    }
                    ;
                }
            }
        }
        else {
            let pxseedConfig = await util_1.__internal__.readJson(path.join(dir, 'pxseed.config.json'));
            let pstat = makeDefaultStatus();
            try {
                Object.assign(pstat, await util_1.__internal__.readJson(path.join(loaders_1.outputDir, ...pxseedConfig.name.split('/'), '.pxseed.status.json')));
            }
            catch (err) { }
            pstat.pxseedConfig = pxseedConfig;
            let loaders = pxseedConfig.loaders;
            for (let loaderConfig of loaders) {
                try {
                    if (loaderConfig.name === 'ensure') {
                        let packages = loaderConfig.packages;
                        if (packages != undefined) {
                            for (let p1 of packages) {
                                if (!context._ensuredPackages.has(p1)) {
                                    await processDirectoryInRecursive(path.join(loaders_1.sourceDir, p1), context).catch(() => { });
                                    context._ensuredPackages.add(p1);
                                }
                            }
                        }
                    }
                    else if (loaderConfig.name.startsWith('pxseedjs:')) {
                        let pathname = new URL(loaderConfig.name).pathname;
                        let delim = pathname.lastIndexOf('.');
                        let moduleName = pathname.substring(0, delim);
                        let funcName = pathname.substring(delim + 1);
                        try {
                            let mod = await new Promise((resolve_1, reject_1) => { require([moduleName], resolve_1, reject_1); });
                            await mod[funcName](dir, loaderConfig, pstat);
                        }
                        catch (e) {
                            pstat.currentBuildError.push(`Failed to load module with message ${e.toString()}`);
                            throw e;
                        }
                        ;
                    }
                    else {
                        await loaders_1.pxseedBuiltinLoader[loaderConfig.name](dir, loaderConfig, pstat);
                    }
                }
                catch (e) {
                    throwIfAbortError(e);
                    pstat.currentBuildError.push(`loader "${loaderConfig.name}" failed with error ${String(e)}`);
                }
            }
            if (pstat.subpackages.length > 0) {
                for (let t1 of pstat.subpackages) {
                    try {
                        await processDirectoryInRecursive(path.join(dir, t1), context).catch(() => { });
                    }
                    catch (e) {
                        throwIfAbortError(e);
                        util_1.console.warn(`Failed to process subpackage ${t1} with message ${e.toString()}`);
                        pstat.currentBuildError.push(`Failed to process subpackage ${t1} with message ${e.toString()}`);
                    }
                }
                //Don't save ".subpackages" to file.
                pstat.subpackages = [];
            }
            pstat.lastBuildTime = startTime;
            pstat.lastBuildError = pstat.currentBuildError;
            if (pstat.lastBuildError.length == 0) {
                pstat.lastSuccessBuildTime = pstat.lastBuildTime;
            }
            else {
                util_1.console.info('build failed.');
                util_1.console.info(pstat.lastBuildError);
            }
            pstat.currentBuildError = [];
            await fs.mkdir(path.join(loaders_1.outputDir, ...pxseedConfig.name.split('/')), { recursive: true });
            await util_1.__internal__.writeJson(path.join(loaders_1.outputDir, ...pxseedConfig.name.split('/'), '.pxseed.status.json'), pstat);
        }
    }
    let buildmutex = new util_1.mutex();
    async function processDirectory(dir) {
        await buildmutex.exec(async () => {
            try {
                await setWWWLastBuildTime();
            }
            finally {
                await processDirectoryInRecursive(dir);
            }
        });
    }
    async function cleanPackage(pkgOutDir) {
        await loaders_1.inited;
        const { fs, path } = await (0, util_1.getNodeCompatApi)();
        let statusJson = await util_1.__internal__.readJson(path.join(pkgOutDir, '.pxseed.status.json'));
        let pxseedConfig = statusJson.pxseedConfig;
        if (pxseedConfig != undefined && pxseedConfig.clean != undefined) {
            let cleanConfig = pxseedConfig.clean;
            if (cleanConfig.include != undefined) {
                for (let t1 of await (0, util_1.simpleGlob)(cleanConfig.include, { cwd: pkgOutDir, exclude: cleanConfig.exclude })) {
                    await fs.rm(path.join(pkgOutDir, t1));
                }
            }
        }
    }
    async function cleanBuildStatus(dir) {
        await loaders_1.inited;
        const { fs, path } = await (0, util_1.getNodeCompatApi)();
        let children = await fs.readdir(dir, { withFileTypes: true });
        if (children.some(t1 => t1.name == '.pxseed.status.json')) {
            try {
                await cleanPackage(dir);
                await fs.rm(path.join(dir, '.pxseed.status.json'));
            }
            catch (err) {
                util_1.console.warn(err);
            }
        }
        else {
            for (let t1 of children) {
                if (t1.isDirectory()) {
                    await cleanBuildStatus(path.join(dir, t1.name));
                }
            }
        }
    }
});
