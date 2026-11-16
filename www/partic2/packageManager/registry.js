define("partic2/packageManager/registry", ["require", "exports", "pxseedBuildScript/buildlib", "partic2/jsutils1/webutils", "partic2/jsutils1/base", "pxseedBuildScript/util", "partic2/CodeRunner/JsEnviron", "partic2/JsNotebook/workerinit", "partic2/pxprpcClient/registry", "./pkgfetcher", "partic2/CodeRunner/CodeContext"], function (require, exports, buildlib_1, webutils_1, base_1, util_1, JsEnviron_1, workerinit_1, registry_1, pkgfetcher_1, CodeContext_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.pxseedCorePackagesNames = exports.listener = exports.__name__ = void 0;
    exports.UpgradeCorePackages = UpgradeCorePackages;
    exports.updatePackagesDatabase = updatePackagesDatabase;
    exports.installLocalPackage = installLocalPackage;
    exports.getUrlTemplateFromScopeName = getUrlTemplateFromScopeName;
    exports.getRepoInfoFromPkgName = getRepoInfoFromPkgName;
    exports.buildPackageAndNotfiy = buildPackageAndNotfiy;
    exports.uninstallPackage = uninstallPackage;
    exports.getPxseedConfigForPackage = getPxseedConfigForPackage;
    exports.listPackagesArray = listPackagesArray;
    exports.upgradePackage = upgradePackage;
    exports.upgradeAllNonCorePackages = upgradeAllNonCorePackages;
    exports.installPackage = installPackage;
    exports.createPackageTemplate1 = createPackageTemplate1;
    exports.unloadPackageModules = unloadPackageModules;
    exports.exportPackagesInstallation = exportPackagesInstallation;
    exports.importPackagesInstallation = importPackagesInstallation;
    exports.cleanPackageInstallCache = cleanPackageInstallCache;
    exports.getPackageListeners = getPackageListeners;
    exports.blockHttpAccessToStaticFileInWWW = blockHttpAccessToStaticFileInWWW;
    exports.sendOnStartupEventForAllPackages = sendOnStartupEventForAllPackages;
    exports.__name__ = base_1.requirejs.getLocalRequireModule(require);
    let log = base_1.logger.getLogger(exports.__name__);
    exports.listener = {
        onBuild: new Array(),
        onInstall: new Array(),
        onUninstall: new Array(),
    };
    define('buffer', ['partic2/packageManager/prebuilt/buffer'], function (buffer) { return buffer; });
    async function copyFilesNewer(destDir, srcDir, ignore, maxDepth) {Promise.__onAsyncEnter();try{
        if (maxDepth == undefined) {
            maxDepth = 20;
        }
        if (maxDepth == 0) {
            return;
        }
        const { fs, path } = await  Promise.__onAwait((0, util_1.getNodeCompatApi)());
        await  Promise.__onAwait(fs.mkdir(destDir, { recursive: true }));
        let children = await  Promise.__onAwait(fs.readdir(srcDir, { withFileTypes: true }));
        try {
            await  Promise.__onAwait(fs.access(destDir));
        }
        catch (e) {
            await  Promise.__onAwait(fs.mkdir(destDir, { recursive: true }));
        }
        for (let t1 of children) {
            if (ignore != undefined && ignore(t1.name, srcDir + '/' + t1.name)) {
                continue;
            }
            if (t1.isDirectory()) {
                await  Promise.__onAwait(copyFilesNewer(path.join(destDir, t1.name), path.join(srcDir, t1.name), ignore, maxDepth - 1));
            }
            else {
                let dest = path.join(destDir, t1.name);
                let src = path.join(srcDir, t1.name);
                let needCopy = false;
                try {
                    let dfile = await  Promise.__onAwait(fs.stat(dest));
                    let sfile2 = await  Promise.__onAwait(fs.stat(src));
                    if (dfile.mtimeMs < sfile2.mtimeMs) {
                        needCopy = true;
                    }
                }
                catch (e) {
                    needCopy = true;
                }
                if (needCopy) {
                    await  Promise.__onAwait(fs.mkdir(path.dirname(dest), { recursive: true }));
                    await  Promise.__onAwait(fs.copyFile(src, dest));
                }
            }
        }
    }finally{Promise.__onAsyncExit();}}
    exports.pxseedCorePackagesNames = new Set([
        "pxprpc", "pxseedBuildScript", "pxseedServer2023", "partic2/CodeRunner", "partic2/JsNotebook", "partic2/jsutils1", "partic2/nodehelper",
        "partic2/pComponentUi", "partic2/packageManager", "partic2/pxprpcBinding", "partic2/pxprpcClient",
        "partic2/pxseedMedia1", "partic2/tjshelper"
    ]);
    let corePackFiles = [
        ['copysource'],
        ['npmdeps'],
        ['pxseed-cli'],
        ['script'],
        ['source', '.gitignore'],
        ['source', 'tsconfig.base.json'],
        ...Array.from(exports.pxseedCorePackagesNames).map(t1 => ['source', ...t1.split('/')])
    ];
    async function UpgradeCorePackages() {Promise.__onAsyncEnter();try{
        const { fs, path, wwwroot } = await  Promise.__onAwait((0, util_1.getNodeCompatApi)());
        let pxseedCorePath = path.join(wwwroot, '..');
        let err = null;
        try {
            await  Promise.__onAwait(pkgfetcher_1.__internal__.upgradeGitPackage(pxseedCorePath));
        }
        catch (e) {
            log.info('UpgradeCorePackages:git pull failed with ' + e.toString());
            err = e;
        }
        if (err != null) {
            err = null;
            let gitcache = path.join(wwwroot, exports.__name__, '/corepkg-gitcache');
            try {
                await  Promise.__onAwait(fs.rm(gitcache, { recursive: true }));
            }
            catch (err) { }
            ;
            let repoInfos = await  Promise.__onAwait(getRepoInfoFromPkgName('partic2/CorePackages'));
            let fetchDone = false;
            for (let url of repoInfos.urls) {
                try {
                    await  Promise.__onAwait(pkgfetcher_1.__internal__.fetchGitPackageFromUrl(url, gitcache));
                    fetchDone = true;
                    break;
                }
                catch (e) {
                    log.info('UpgradeCorePackages:Fetch failed for url ' + url + ',' + e.toString());
                }
            }
            log.info('UpgradeCorePackages:Fetch successfully.');
            if (fetchDone) {
                try {
                    await  Promise.__onAwait(fs.rm(path.join(pxseedCorePath, '.git'), { recursive: true }));
                }
                catch (err) { }
                ;
                await  Promise.__onAwait(copyFilesNewer(path.join(pxseedCorePath, '.git'), path.join(gitcache, '.git'), undefined, 30));
                let git = await  Promise.__onAwait(new Promise((resolve_1, reject_1) => { require(['./prebuilt/isomorphic-git'], resolve_1, reject_1); }));
                await  Promise.__onAwait(git.checkout({ ...await  Promise.__onAwait(pkgfetcher_1.defaultGitClient.get()), dir: pxseedCorePath, force: true }));
                await  Promise.__onAwait(fs.rm(gitcache, { recursive: true }));
            }
            else {
                log.error('Fetch failed for all url.');
                throw new Error('UpgradeCorePackages:Fetch failed for all url');
            }
        }
        if (err === null) {
            await  Promise.__onAwait(copyFilesNewer(path.join(pxseedCorePath, 'www'), path.join(pxseedCorePath, 'copysource'), undefined, 30));
            for (let t1 of corePackFiles) {
                if (t1[0] === 'source') {
                    let joinedPath = path.join(pxseedCorePath, ...t1);
                    let t2 = await  Promise.__onAwait(fs.stat(joinedPath));
                    if (t2.isDirectory()) {
                        try {
                            await  Promise.__onAwait((0, buildlib_1.processDirectory)(joinedPath));
                        }
                        catch (err) {
                            log.error('processDirectory failed with ' + err.toString());
                        }
                    }
                }
            }
        }
        try {
            await  Promise.__onAwait(updatePackagesDatabase());
        }
        catch (err) { }
    }finally{Promise.__onAsyncExit();}}
    let pkgdbName = exports.__name__ + '/pkgdb';
    function getPMConfigFromPcfg(config) {
        if (config.extra && (exports.__name__ in config.extra)) {
            return config.extra[exports.__name__];
        }
        else {
            return null;
        }
    }
    ;
    let initRepoConfig = {
        version: 1,
        repositories: { scope: {
                'partic2': [
                    'https://gitee.com/partic/pxseed-${subname}.git',
                    'https://github.com/partic2/pxseed-${subname}.git'
                ],
                'pxprpc': [
                    'https://gitee.com/partic/pxseed-pxprpc.git',
                    'https://github.com/partic2/pxseed-pxprpc.git'
                ],
                'pxseedBuildScript': [
                    'https://gitee.com/partic/pxseed-pxseedBuildScript.git',
                    'https://github.com/partic2/pxseed-pxseedBuildScript.git'
                ],
                'pxseedServer2023': [
                    'https://gitee.com/partic/pxseed-pxseedServer2023.git',
                    'https://github.com/partic2/pxseed-pxseedServer2023.git'
                ]
            } }
    };
    let RepositoriesRegistry = {
        ensureRepoCfg: async function () {Promise.__onAsyncEnter();try{
            let pkgdb = await  Promise.__onAwait((0, webutils_1.kvStore)(pkgdbName));
            let repoCfg = await  Promise.__onAwait(pkgdb.getItem('repo'));
            if (repoCfg == null) {
                repoCfg = initRepoConfig;
                await  Promise.__onAwait(pkgdb.setItem('repo', repoCfg));
            }
            (0, base_1.assert)(repoCfg.version <= 1, 'version not support');
            if (repoCfg.repositories == undefined) {
                repoCfg.repositories = initRepoConfig.repositories;
            }
            if (repoCfg.repositories.scope == undefined) {
                repoCfg.repositories.scope = initRepoConfig.repositories?.scope;
            }
            await  Promise.__onAwait(pkgdb.setItem('repo', repoCfg));
            return repoCfg;
        }finally{Promise.__onAsyncExit();}},
        getScopeRepo: async function (scopeName) {Promise.__onAsyncEnter();try{
            let repoCfg = await  Promise.__onAwait(this.ensureRepoCfg());
            return await  Promise.__onAwait(repoCfg.repositories?.scope?.[scopeName]);
        }finally{Promise.__onAsyncExit();}},
        setScopeRepo: async function (scopeName, repos) {Promise.__onAsyncEnter();try{
            let repoCfg = await  Promise.__onAwait(this.ensureRepoCfg());
            repoCfg.repositories.scope[scopeName] = repos;
            let pkgdb = await  Promise.__onAwait((0, webutils_1.kvStore)(pkgdbName));
            await  Promise.__onAwait(pkgdb.setItem('repo', repoCfg));
        }finally{Promise.__onAsyncExit();}},
        upgradeFromPkgConfig: async function (pkgConfig) {Promise.__onAsyncEnter();try{
            if (pkgConfig?.repositories != undefined) {
                for (let scopeName in pkgConfig.repositories) {
                    let toMerge = pkgConfig.repositories[scopeName];
                    (0, base_1.assert)(toMerge instanceof Array);
                    let repos = new Set(await  Promise.__onAwait(RepositoriesRegistry.getScopeRepo(scopeName)));
                    for (let t1 of toMerge) {
                        if (t1.charAt(0) === '!') {
                            repos.delete(t1.substring(1));
                        }
                        else {
                            repos.add(t1);
                        }
                    }
                    await  Promise.__onAwait(RepositoriesRegistry.setScopeRepo(scopeName, Array.from(repos)));
                }
            }
        }finally{Promise.__onAsyncExit();}}
    };
    async function updatePackagesDatabase(pkgNameOrPxseedConfig) {Promise.__onAsyncEnter();try{
        const { fs, path, wwwroot } = await  Promise.__onAwait((0, util_1.getNodeCompatApi)());
        if (pkgNameOrPxseedConfig == undefined) {
            for (let pkg of await  Promise.__onAwait(listPackagesArray(''))) {
                try {
                    await  Promise.__onAwait(updatePackagesDatabase(pkg));
                }
                catch (err) {
                    log.error(err.toString() + err.stack);
                }
            }
        }
        else {
            let pxseedConfig;
            if (typeof pkgNameOrPxseedConfig === 'string') {
                pxseedConfig = (await  Promise.__onAwait(getPxseedConfigForPackage(pkgNameOrPxseedConfig)));
            }
            else {
                pxseedConfig = pkgNameOrPxseedConfig;
            }
            let pkgConfig = getPMConfigFromPcfg(pxseedConfig);
            await  Promise.__onAwait(RepositoriesRegistry.upgradeFromPkgConfig(pkgConfig));
        }
    }finally{Promise.__onAsyncExit();}}
    async function getSourceDirForPackage(pkgname) {Promise.__onAsyncEnter();try{
        const { fs, path, wwwroot } = await  Promise.__onAwait((0, util_1.getNodeCompatApi)());
        return path.join(wwwroot, '..', 'source', ...pkgname.split('/'));
    }finally{Promise.__onAsyncExit();}}
    async function getOutputDirForPakcage(pkgname) {Promise.__onAsyncEnter();try{
        const { fs, path, wwwroot } = await  Promise.__onAwait((0, util_1.getNodeCompatApi)());
        return path.join(wwwroot, ...pkgname.split('/'));
    }finally{Promise.__onAsyncExit();}}
    let pendingInstallingTask = new Map();
    async function installLocalPackage(path2) {Promise.__onAsyncEnter();try{
        const { fs, path, wwwroot } = await  Promise.__onAwait((0, util_1.getNodeCompatApi)());
        let pxseedConfig = await  Promise.__onAwait(util_1.__internal__.readJson(path.join(path2, "pxseed.config.json")));
        let pkgname = pxseedConfig.name;
        if (pendingInstallingTask.get(pkgname) != undefined) {
            log.warning(`Package '${pkgname}' is already being installed. This may indicate a circular dependency or a concurrent installation attempt.`);
            return;
        }
        pendingInstallingTask.set(pkgname, new base_1.future());
        try {
            let destDir = await  Promise.__onAwait(getSourceDirForPackage(pkgname));
            await  Promise.__onAwait(fs.mkdir(destDir, { recursive: true }));
            if (path2 != destDir) {
                await  Promise.__onAwait(copyFilesNewer(destDir, path2));
            }
            //add repositories before dependencies resolving.
            let pkgConfig = getPMConfigFromPcfg(pxseedConfig);
            await  Promise.__onAwait(RepositoriesRegistry.upgradeFromPkgConfig(pkgConfig));
            if (pkgConfig?.dependencies != undefined) {
                for (let dep of pkgConfig.dependencies) {
                    let config = await  Promise.__onAwait(getPxseedConfigForPackage(dep));
                    if (config == null) {
                        try {
                            await  Promise.__onAwait(installPackage(dep));
                        }
                        catch (e) {
                            (0, base_1.throwIfAbortError)(e);
                            log.error(e.toString() + e.stack);
                        }
                    }
                    else {
                        try {
                            await  Promise.__onAwait(upgradePackage(dep));
                        }
                        catch (e) {
                            (0, base_1.throwIfAbortError)(e);
                            log.error(e.toString() + e.stack);
                        }
                    }
                }
            }
            try {
                await  Promise.__onAwait(buildPackageAndNotfiy(pkgname));
            }
            catch (err) {
                (0, base_1.throwIfAbortError)(err);
                log.error(err + err.stack);
            }
            exports.listener.onInstall.forEach((l) => new Promise((resolve_2, reject_2) => { require([l.module], resolve_2, reject_2); }).then(m => m[l.func](pkgname)).catch(() => { }));
            await  Promise.__onAwait(Promise.allSettled((await  Promise.__onAwait(getPackageListeners('onInstalled'))).map(t1 => new Promise((resolve_3, reject_3) => { require([t1.module], resolve_3, reject_3); }).then(t2 => t2[t1.func]()))));
        }
        finally {
            pendingInstallingTask.get(pkgname)?.setResult();
            pendingInstallingTask.delete(pkgname);
        }
    }finally{Promise.__onAsyncExit();}}
    async function getUrlTemplateFromScopeName(scopeName) {Promise.__onAsyncEnter();try{
        return RepositoriesRegistry.getScopeRepo(scopeName);
    }finally{Promise.__onAsyncExit();}}
    async function getRepoInfoFromPkgName(pkgFullName) {Promise.__onAsyncEnter();try{
        let parts = pkgFullName.split('/');
        let [scope, subname] = parts.slice(0, 2);
        let path = parts.slice(2);
        subname = subname ?? '';
        let repos = await  Promise.__onAwait(RepositoriesRegistry.getScopeRepo(scope));
        function* iterUrl() {
            if (repos == undefined) {
                return;
            }
            for (let t1 of repos) {
                try {
                    let url = new Function('fullname', 'subname', 'scope', 'return `' + t1 + '`')(pkgFullName, subname, scope);
                    yield url;
                }
                catch (e) {
                }
            }
        }
        return {
            scope: scope, subname: subname, path: path, urls: Array.from(iterUrl())
        };
    }finally{Promise.__onAsyncExit();}}
    async function buildPackageAndNotfiy(pkgName) {Promise.__onAsyncEnter();try{
        let { processDirectory } = await  Promise.__onAwait(new Promise((resolve_4, reject_4) => { require(['pxseedBuildScript/buildlib'], resolve_4, reject_4); }));
        let { path, wwwroot } = await  Promise.__onAwait((0, util_1.getNodeCompatApi)());
        let wrapConsole = { ...globalThis.console };
        let curTask = base_1.Task.currentTask;
        wrapConsole.debug = (...msg) => { curTask?.fork(function* () { log.debug(...msg); }).run(); };
        wrapConsole.info = (...msg) => { curTask?.fork(function* () { log.info(...msg); }).run(); };
        wrapConsole.warn = (...msg) => { curTask?.fork(function* () { log.warning(...msg); }).run(); };
        wrapConsole.error = (...msg) => { curTask?.fork(function* () { log.error(...msg); }).run(); };
        let buildPath = await  Promise.__onAwait(getSourceDirForPackage(pkgName));
        await  Promise.__onAwait((0, util_1.withConsole)(wrapConsole, () => processDirectory(buildPath)));
        exports.listener.onBuild.forEach((l) => { new Promise((resolve_5, reject_5) => { require([l.module], resolve_5, reject_5); }).then(m => m[l.func](pkgName)).catch(() => { }); });
        try {
            await  Promise.__onAwait(updatePackagesDatabase(pkgName));
        }
        catch (err) { }
    }finally{Promise.__onAsyncExit();}}
    async function uninstallPackage(pkgname) {Promise.__onAsyncEnter();try{
        const { fs } = await  Promise.__onAwait((0, util_1.getNodeCompatApi)());
        let dir1 = await  Promise.__onAwait(getSourceDirForPackage(pkgname));
        await  Promise.__onAwait(fs.rm(dir1, { recursive: true }).catch(_ => { }));
        dir1 = await  Promise.__onAwait(getOutputDirForPakcage(pkgname));
        await  Promise.__onAwait((0, buildlib_1.cleanBuildStatus)(dir1).catch(_ => { }));
        exports.listener.onUninstall.forEach((l) => new Promise((resolve_6, reject_6) => { require([l.module], resolve_6, reject_6); }).then(m => m[l.func](pkgname)));
    }finally{Promise.__onAsyncExit();}}
    async function getPxseedConfigForPackage(pkgname) {Promise.__onAsyncEnter();try{
        const { fs, path, wwwroot } = await  Promise.__onAwait((0, util_1.getNodeCompatApi)());
        let statusFile = path.join(await  Promise.__onAwait(getOutputDirForPakcage(pkgname)), '.pxseed.status.json');
        try {
            await  Promise.__onAwait(fs.access(statusFile));
            return (await  Promise.__onAwait(util_1.__internal__.readJson(statusFile))).pxseedConfig;
        }
        catch (e) {
            return null;
        }
    }finally{Promise.__onAsyncExit();}}
    async function listPackagesInDirectoryArray(dir, filter) {Promise.__onAsyncEnter();try{
        const { fs, path, wwwroot } = await  Promise.__onAwait((0, util_1.getNodeCompatApi)());
        let children = await  Promise.__onAwait(fs.readdir(dir, { withFileTypes: true }));
        let result = new Array();
        if (children.find(t1 => t1.name == '.pxseed.status.json')) {
            let t1 = { path: dir, config: (await  Promise.__onAwait(util_1.__internal__.readJson(path.join(dir, '.pxseed.status.json')))).pxseedConfig };
            if (filter == undefined || await  Promise.__onAwait(filter(t1))) {
                result.push(t1);
            }
        }
        else {
            for (let t1 of children) {
                if (t1.isDirectory()) {
                    result.push(...await  Promise.__onAwait(listPackagesInDirectoryArray(path.join(dir, t1.name), filter)));
                }
            }
        }
        return result;
    }finally{Promise.__onAsyncExit();}}
    async function listPackagesArray(filterString) {Promise.__onAsyncEnter();try{
        let filterFunc;
        if (filterString.startsWith('javascript:')) {
            filterFunc = new Function('name', 'config', 'pmcfg', filterString.substring('javascript:'.length + 1));
        }
        else {
            filterFunc = (() => {
                let keywords = filterString.split(/\s+/);
                return (name, config, pmcfg) => {
                    for (let kw of keywords) {
                        if (name.includes(kw)) {
                            return true;
                        }
                        if (config.description != undefined && config.description.includes(kw)) {
                            return true;
                        }
                        if (pmcfg != undefined && kw in pmcfg) {
                            return true;
                        }
                    }
                    return false;
                };
            })();
        }
        const { fs, path, wwwroot } = await  Promise.__onAwait((0, util_1.getNodeCompatApi)());
        return (await  Promise.__onAwait(listPackagesInDirectoryArray(wwwroot, async ({ path, config }) => {Promise.__onAsyncEnter();try{
            let t1 = config;
            let t2 = filterFunc(t1.name, t1, t1.extra?.[exports.__name__]);
            return t2;
        }finally{Promise.__onAsyncExit();}}))).map(t1 => t1.config);
    }finally{Promise.__onAsyncExit();}}
    async function upgradePackage(pkgname) {Promise.__onAsyncEnter();try{
        const { fs, path, wwwroot } = await  Promise.__onAwait((0, util_1.getNodeCompatApi)());
        let pkgdir = await  Promise.__onAwait(getSourceDirForPackage(pkgname));
        let pxseedConfig = await  Promise.__onAwait(util_1.__internal__.readJson(path.join(pkgdir, 'pxseed.config.json')));
        await  Promise.__onAwait(fs.access(path.join(pkgdir, '.git')));
        await  Promise.__onAwait(pkgfetcher_1.__internal__.upgradeGitPackage(pkgdir));
        await  Promise.__onAwait(installLocalPackage(pkgdir));
    }finally{Promise.__onAsyncExit();}}
    async function upgradeAllNonCorePackages() {Promise.__onAsyncEnter();try{
        for (let t1 of await  Promise.__onAwait(listPackagesArray(''))) {
            if (!exports.pxseedCorePackagesNames.has(t1.name)) {
                try {
                    await  Promise.__onAwait(upgradePackage(t1.name));
                    log.info(`upgradeAllNonCorePackages success to upgrade ${t1.name}`);
                }
                catch (err) {
                    log.warning(`upgradeAllNonCorePackages failed when upgrade ${t1.name}, message:${err.toString()} stack:${err.stack}`);
                }
            }
        }
    }finally{Promise.__onAsyncExit();}}
    async function installPackage(source) {Promise.__onAsyncEnter();try{
        log.info('install request for:' + source);
        const { fs, path, wwwroot } = await  Promise.__onAwait((0, util_1.getNodeCompatApi)());
        let installProcessed = false;
        let sourceDir = path.join(wwwroot, '..', 'source');
        {
            let existed = false;
            try {
                await  Promise.__onAwait(fs.access(path.join(sourceDir, source, 'pxseed.config.json')));
                existed = true;
            }
            catch (e) {
                existed = false;
            }
            if (existed) {
                log.info(`package ${source} existed,upgrade it.`);
                try {
                    await  Promise.__onAwait(upgradePackage(source));
                    installProcessed = true;
                }
                catch (err) {
                    log.info('upgrade failed.' + err);
                }
            }
            if (!installProcessed) {
                try {
                    log.info(`Try to fetch package ${source}.`);
                    let fetchResult = await  Promise.__onAwait((0, pkgfetcher_1.fetchPackage)(source));
                    await  Promise.__onAwait(installLocalPackage(fetchResult.localPath));
                    installProcessed = true;
                }
                catch (err) {
                    log.info('install failed.' + err);
                }
                ;
            }
        }
        if (!installProcessed) {
            throw new Error(`Can not handle url:${source}`);
        }
    }finally{Promise.__onAsyncExit();}}
    async function createPackageTemplate1(pxseedConfig) {Promise.__onAsyncEnter();try{
        const { fs, path, wwwroot } = await  Promise.__onAwait((0, util_1.getNodeCompatApi)());
        let pkgloc = path.join(buildlib_1.sourceDir, pxseedConfig.name);
        try {
            await  Promise.__onAwait(fs.access(pkgloc));
            throw new Error('package is existed.');
        }
        catch (e) {
        }
        await  Promise.__onAwait(fs.mkdir(pkgloc, { recursive: true }));
        await  Promise.__onAwait(fs.mkdir(path.join(pkgloc, 'assets')));
        await  Promise.__onAwait(util_1.__internal__.writeJson(path.join(pkgloc, 'pxseed.config.json'), pxseedConfig));
        await  Promise.__onAwait(fs.writeFile(path.join(pkgloc, '.gitignore'), `.*
!.gitignore
tsconfig.json
`));
        if (pxseedConfig.extra?.[exports.__name__] != undefined) {
            let cfg = pxseedConfig.extra[exports.__name__];
            if (cfg.webui?.entry != undefined && cfg.webui.entry != '') {
                let entryMod = cfg.webui.entry;
                if (entryMod.startsWith(pxseedConfig.name + '/')) {
                    let entModPath = path.join(buildlib_1.sourceDir, ...entryMod.split('/')) + '.tsx';
                    await  Promise.__onAwait(fs.mkdir(path.dirname(entModPath), { recursive: true }));
                    await  Promise.__onAwait(fs.writeFile(entModPath, `
import * as React from 'preact'
import { openNewWindow } from 'partic2/pComponentUi/workspace'
import { requirejs } from 'partic2/jsutils1/base';
import { GetJsEntry } from 'partic2/jsutils1/webutils';
import { setBaseWindowView } from 'partic2/pComponentUi/workspace';

const __name__=requirejs.getLocalRequireModule(require);

//Open from packageManager.
export function main(args:string){
    if(args=='webui'){
        openNewWindow(<div>WebUI Demo</div>);
    }
}

//Optinal support when module is open from url directly. like http://xxxx/pxseed/index.html?__jsentry=<moduleName>
(async ()=>{
    if(__name__==GetJsEntry()){
        setBaseWindowView(<div>WebUI Demo</div>);
    }
})();
`));
                }
            }
        }
        await  Promise.__onAwait(installLocalPackage(pkgloc));
        await  Promise.__onAwait(pkgfetcher_1.__internal__.initGitPackage(pkgloc));
    }finally{Promise.__onAsyncExit();}}
    async function unloadPackageModules(pkg) {Promise.__onAsyncEnter();try{
        for (let mid in await  Promise.__onAwait(base_1.requirejs.getDefined())) {
            if (mid.startsWith(pkg + '/')) {
                await  Promise.__onAwait(base_1.requirejs.undef(mid));
            }
        }
    }finally{Promise.__onAsyncExit();}}
    async function exportPackagesInstallation() {Promise.__onAsyncEnter();try{
        let repos = await  Promise.__onAwait(RepositoriesRegistry.ensureRepoCfg());
        let pkgs = [];
        for (let t1 of await  Promise.__onAwait(listPackagesArray(''))) {
            pkgs.push(t1.name);
        }
        return { repos, pkgs };
    }finally{Promise.__onAsyncExit();}}
    async function importPackagesInstallation(installationInfo) {Promise.__onAsyncEnter();try{
        const { fs, path, wwwroot } = await  Promise.__onAwait((0, util_1.getNodeCompatApi)());
        let { repos, pkgs } = installationInfo;
        for (let name in repos.repositories.scope) {
            let repoUrls = repos.repositories.scope[name];
            await  Promise.__onAwait(RepositoriesRegistry.setScopeRepo(name, repoUrls));
        }
        for (let pkg of pkgs) {
            try {
                let existed = false;
                try {
                    await  Promise.__onAwait(fs.access(path.join(buildlib_1.sourceDir, ...pkg.split('/'))));
                    existed = true;
                }
                catch (e) { }
                if (!existed) {
                    let fetchResult = await  Promise.__onAwait((0, pkgfetcher_1.fetchPackage)(pkg));
                    (0, base_1.assert)(fetchResult != null);
                    await  Promise.__onAwait(installLocalPackage(fetchResult.localPath));
                }
            }
            catch (e) {
                log.warning(`importPackagesInstallation install package ${pkg} failed.` + e.toString());
            }
            ;
        }
    }finally{Promise.__onAsyncExit();}}
    async function cleanPackageInstallCache() {Promise.__onAsyncEnter();try{
        const { fs, path, wwwroot } = await  Promise.__onAwait((0, util_1.getNodeCompatApi)());
        await  Promise.__onAwait(fs.rm(path.join(wwwroot, ...exports.__name__.split('/'), '..', '__temp'), { recursive: true }));
    }finally{Promise.__onAsyncExit();}}
    let cachedListenersList = new Map();
    let cachedListenersUpdateTime = 0;
    async function getPackageListeners(eventType) {Promise.__onAsyncEnter();try{
        let lastBuildTime = await  Promise.__onAwait((0, buildlib_1.getWWWLastBuildTime)());
        if (lastBuildTime > cachedListenersUpdateTime) {
            cachedListenersList.clear();
            cachedListenersUpdateTime = (0, base_1.GetCurrentTime)().getTime();
        }
        if (cachedListenersList.get(eventType) == undefined) {
            let result = new Array();
            for (let pkg of await  Promise.__onAwait(listPackagesArray(''))) {
                let pmcfg = getPMConfigFromPcfg(pkg);
                if (pmcfg != null) {
                    if (pmcfg[eventType] != null) {
                        try {
                            let t1 = { ...pmcfg[eventType] };
                            if (/^\.\.?\//.test(t1.module)) {
                                t1.module = webutils_1.path.join(pkg.name, t1.module);
                            }
                            result.push(t1);
                        }
                        catch (err) { }
                        ;
                    }
                }
            }
            cachedListenersList.set(eventType, { listeners: result });
        }
        return cachedListenersList.get(eventType).listeners;
    }finally{Promise.__onAsyncExit();}}
    async function blockHttpAccessToStaticFileInWWW(path2) {Promise.__onAsyncEnter();try{
        await  Promise.__onAwait((0, registry_1.easyCallRemoteJsonFunction)(await  Promise.__onAwait((await  Promise.__onAwait((0, registry_1.getPersistentRegistered)(registry_1.ServerHostRpcName))).ensureConnected()), webutils_1.path.join(exports.__name__, '..', 'onServerStartup'), '__blockHttpAccessToStaticFileInWWW', [path2]));
    }finally{Promise.__onAsyncExit();}}
    async function sendOnStartupEventForAllPackages() {Promise.__onAsyncEnter();try{
        await  Promise.__onAwait(Promise.allSettled((await  Promise.__onAwait(getPackageListeners('onServerStartup'))).map(t1 => new Promise((resolve_7, reject_7) => { require([t1.module], resolve_7, reject_7); }).then(t2 => t2[t1.func]()))));
        await  Promise.__onAwait((0, JsEnviron_1.ensureDefaultFileSystem)());
        let startupNotebook = (0, JsEnviron_1.getSimpleFileSysteNormalizedWWWRoot)() + '/' + webutils_1.path.join(exports.__name__, '..', 'notebook', 'startup.ijsnb');
        if (await  Promise.__onAwait(JsEnviron_1.defaultFileSystem.filetype(startupNotebook)) == 'none') {
            let nbd = new workerinit_1.NotebookFileData();
            let ccld = CodeContext_1.newCodeCellListData.get()();
            ccld.cellList.push({ cellInput: `//All cells in this notebook will be executed when server(and packageManager) started.`, cellOutput: [null, ''], key: (0, base_1.GenerateRandomString)() });
            nbd.setCellsData(ccld);
            nbd.rpc = registry_1.ServerHostWorker1RpcName;
            await  Promise.__onAwait(JsEnviron_1.defaultFileSystem.writeAll(startupNotebook, nbd.dump()));
        }
        else {
            await  Promise.__onAwait((0, workerinit_1.runNotebook)(startupNotebook, 'all cells'));
        }
    }finally{Promise.__onAsyncExit();}}
});
