define("partic2/packageManager/registry", ["require", "exports", "pxseedBuildScript/buildlib", "partic2/jsutils1/webutils", "partic2/jsutils1/base", "pxseedBuildScript/util", "partic2/CodeRunner/JsEnviron", "partic2/JsNotebook/workerinit", "partic2/CodeRunner/Inspector", "partic2/pxprpcClient/registry", "./pkgfetcher"], function (require, exports, buildlib_1, webutils_1, base_1, util_1, JsEnviron_1, workerinit_1, Inspector_1, registry_1, pkgfetcher_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.listener = exports.__name__ = void 0;
    exports.UpgradeCorePackages = UpgradeCorePackages;
    exports.packPxseedForPxseedLoader = packPxseedForPxseedLoader;
    exports.updatePackagesDatabase = updatePackagesDatabase;
    exports.installLocalPackage = installLocalPackage;
    exports.getUrlTemplateFromScopeName = getUrlTemplateFromScopeName;
    exports.getRepoInfoFromPkgName = getRepoInfoFromPkgName;
    exports.buildPackageAndNotfiy = buildPackageAndNotfiy;
    exports.uninstallPackage = uninstallPackage;
    exports.getPxseedConfigForPackage = getPxseedConfigForPackage;
    exports.listPackages = listPackages;
    exports.listPackagesArray = listPackagesArray;
    exports.upgradePackage = upgradePackage;
    exports.installPackage = installPackage;
    exports.createPackageTemplate1 = createPackageTemplate1;
    exports.unloadPackageModules = unloadPackageModules;
    exports.exportPackagesInstallation = exportPackagesInstallation;
    exports.importPackagesInstallation = importPackagesInstallation;
    exports.cleanPackageInstallCache = cleanPackageInstallCache;
    exports.getPackageListeners = getPackageListeners;
    exports.sendOnStartupEventForAllPackages = sendOnStartupEventForAllPackages;
    exports.__name__ = base_1.requirejs.getLocalRequireModule(require);
    let log = base_1.logger.getLogger(exports.__name__);
    exports.listener = {
        onBuild: new Array(),
        onInstall: new Array(),
        onUninstall: new Array(),
    };
    async function copyFilesNewer(destDir, srcDir, ignore, maxDepth) {
        if (maxDepth == undefined) {
            maxDepth = 20;
        }
        if (maxDepth == 0) {
            return;
        }
        const { fs, path } = await (0, util_1.getNodeCompatApi)();
        await fs.mkdir(destDir, { recursive: true });
        let children = await fs.readdir(srcDir, { withFileTypes: true });
        try {
            await fs.access(destDir);
        }
        catch (e) {
            await fs.mkdir(destDir, { recursive: true });
        }
        for (let t1 of children) {
            if (ignore != undefined && ignore(t1.name, srcDir + '/' + t1.name)) {
                continue;
            }
            if (t1.isDirectory()) {
                await copyFilesNewer(path.join(destDir, t1.name), path.join(srcDir, t1.name), ignore, maxDepth - 1);
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
                    await fs.mkdir(path.dirname(dest), { recursive: true });
                    await fs.copyFile(src, dest);
                }
            }
        }
    }
    let corePackFiles = [
        ['copysource'],
        ['npmdeps'],
        ['pxseed-cli'],
        ['script'],
        ['source', 'pxseedBuildScript'],
        ['source', 'pxseedServer2023'],
        ['source', 'pxprpc'],
        ['source', '.gitignore'],
        ['source', 'tsconfig.base.json'],
        ['source', 'partic2', 'CodeRunner'],
        ['source', 'partic2', 'JsNotebook'],
        ['source', 'partic2', 'jsutils1'],
        ['source', 'partic2', 'nodehelper'],
        ['source', 'partic2', 'pComponentUi'],
        ['source', 'partic2', 'packageManager'],
        ['source', 'partic2', 'pxprpcBinding'],
        ['source', 'partic2', 'pxprpcClient'],
        ['source', 'partic2', 'pxseedMedia1'],
        ['source', 'partic2', 'tjshelper']
    ];
    async function UpgradeCorePackages() {
        const { fs, path, wwwroot } = await (0, util_1.getNodeCompatApi)();
        let pxseedCorePath = path.join(wwwroot, '..');
        let err = null;
        try {
            await pkgfetcher_1.__internal__.upgradeGitPackage(pxseedCorePath);
        }
        catch (e) {
            log.info('UpgradeCorePackages:git pull failed with ' + e.toString());
            err = e;
        }
        if (err != null) {
            err = null;
            let gitcache = path.join(wwwroot, exports.__name__, '/corepkg-gitcache');
            try {
                await fs.rm(gitcache, { recursive: true });
            }
            catch (err) { }
            ;
            let repoInfos = await getRepoInfoFromPkgName('partic2/CorePackages');
            let fetchDone = false;
            for (let url of repoInfos.urls) {
                try {
                    await pkgfetcher_1.__internal__.fetchGitPackageFromUrl(url, gitcache);
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
                    await fs.rm(path.join(pxseedCorePath, '.git'), { recursive: true });
                }
                catch (err) { }
                ;
                await copyFilesNewer(path.join(pxseedCorePath, '.git'), path.join(gitcache, '.git'), undefined, 30);
                let git = await new Promise((resolve_1, reject_1) => { require(['isomorphic-git'], resolve_1, reject_1); });
                await git.checkout({ ...await pkgfetcher_1.defaultGitClient.get(), dir: pxseedCorePath, force: true });
                await fs.rm(gitcache, { recursive: true });
            }
            else {
                log.error('Fetch failed for all url.');
                throw new Error('UpgradeCorePackages:Fetch failed for all url');
            }
        }
        if (err === null) {
            for (let t1 of corePackFiles) {
                if (t1[0] === 'source') {
                    let joinedPath = path.join(pxseedCorePath, ...t1);
                    let t2 = await fs.stat(joinedPath);
                    if (t2.isDirectory()) {
                        try {
                            await (0, buildlib_1.processDirectory)(joinedPath);
                        }
                        catch (err) {
                            log.error('processDirectory failed with ' + err.toString());
                        }
                    }
                }
            }
        }
        try {
            await updatePackagesDatabase();
        }
        catch (err) { }
    }
    async function packPxseedForPxseedLoader() {
        const { fs, path, wwwroot } = await (0, util_1.getNodeCompatApi)();
        let pxseedRoot = path.join(wwwroot, '..').replace(/\\/g, '/');
        let outputRoot = path.join(wwwroot, exports.__name__, 'pxseedPack4PxseedLoader').replace(/\\/g, '/');
        await copyFilesNewer(outputRoot + '/pxseed', pxseedRoot, (name, path) => {
            path = path.replace(/\\/g, '/');
            if (name == '.git') {
                return true;
            }
            return [pxseedRoot + '/npmdeps/node_modules',
                pxseedRoot + '/www/node_modules',
                outputRoot].includes(path);
        });
        await fs.writeFile(path.join(outputRoot, 'index.html'), new TextEncoder().encode(String.raw `
    <!DOCTYPE html>
    <html>
    <head>
        <script>
            window.onload=function(){
                document.getElementById("uainfo").innerHTML=navigator.userAgent
                document.getElementById("viewinfo").innerHTML=''+window.innerWidth+"X"+window.innerHeight
                window.open('pxseed/www/index.html?__jsentry=partic2%2FpackageManager%2Fwebui','_self')
            }
        </script>
    </head>
    <body>
        <div>
            this is entry at assets/res/index.html
        </div>
        <div>
            userAgent:<span id="uainfo">
            </span>
        </div>
        view:<span id="viewinfo">
    
        </span>
    </body>
    </html>
`));
    }
    let pkgdbName = exports.__name__ + '/pkgdb';
    function getPMOptFromPcfg(config) {
        if (config.options && (exports.__name__ in config.options)) {
            return config.options[exports.__name__];
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
        ensureRepoCfg: async function () {
            let pkgdb = await (0, webutils_1.kvStore)(pkgdbName);
            let repoCfg = await pkgdb.getItem('repo');
            if (repoCfg == null) {
                repoCfg = initRepoConfig;
                await pkgdb.setItem('repo', repoCfg);
            }
            (0, base_1.assert)(repoCfg.version <= 1, 'version not support');
            if (repoCfg.repositories == undefined) {
                repoCfg.repositories = initRepoConfig.repositories;
            }
            if (repoCfg.repositories.scope == undefined) {
                repoCfg.repositories.scope = initRepoConfig.repositories?.scope;
            }
            await pkgdb.setItem('repo', repoCfg);
            return repoCfg;
        },
        getScopeRepo: async function (scopeName) {
            let repoCfg = await this.ensureRepoCfg();
            return await repoCfg.repositories?.scope?.[scopeName];
        },
        setScopeRepo: async function (scopeName, repos) {
            let repoCfg = await this.ensureRepoCfg();
            repoCfg.repositories.scope[scopeName] = repos;
            let pkgdb = await (0, webutils_1.kvStore)(pkgdbName);
            await pkgdb.setItem('repo', repoCfg);
        }
    };
    async function updatePackagesDatabase(pkgNameOrPxseedConfig) {
        const { fs, path, wwwroot } = await (0, util_1.getNodeCompatApi)();
        if (pkgNameOrPxseedConfig == undefined) {
            for await (let pkg of listPackages()) {
                try {
                    await updatePackagesDatabase(pkg);
                }
                catch (err) {
                    log.error(err.toString() + err.stack);
                }
            }
        }
        else {
            let pxseedConfig;
            if (typeof pkgNameOrPxseedConfig === 'string') {
                pxseedConfig = (await getPxseedConfigForPackage(pkgNameOrPxseedConfig));
            }
            else {
                pxseedConfig = pkgNameOrPxseedConfig;
            }
            let pkgConfig = getPMOptFromPcfg(pxseedConfig);
            if (pkgConfig?.repositories != undefined) {
                for (let scopeName in pkgConfig.repositories) {
                    let toMerge = pkgConfig.repositories[scopeName];
                    (0, base_1.assert)(toMerge instanceof Array);
                    let repos = new Set(await RepositoriesRegistry.getScopeRepo(scopeName));
                    for (let t1 of toMerge) {
                        if (t1.charAt(0) === '!') {
                            repos.delete(t1.substring(1));
                        }
                        else {
                            repos.add(t1);
                        }
                    }
                    await RepositoriesRegistry.setScopeRepo(scopeName, Array.from(repos));
                }
            }
        }
    }
    async function getSourceDirForPackage(pkgname) {
        const { fs, path, wwwroot } = await (0, util_1.getNodeCompatApi)();
        return path.join(wwwroot, '..', 'source', ...pkgname.split('/'));
    }
    async function getOutputDirForPakcage(pkgname) {
        const { fs, path, wwwroot } = await (0, util_1.getNodeCompatApi)();
        return path.join(wwwroot, ...pkgname.split('/'));
    }
    async function installLocalPackage(path2) {
        const { fs, path, wwwroot } = await (0, util_1.getNodeCompatApi)();
        let pxseedConfig = await util_1.__internal__.readJson(path.join(path2, "pxseed.config.json"));
        let pkgname = pxseedConfig.name;
        let destDir = await getSourceDirForPackage(pkgname);
        await fs.mkdir(destDir, { recursive: true });
        if (path2 != destDir) {
            await copyFilesNewer(destDir, path2);
        }
        let pkgConfig = getPMOptFromPcfg(pxseedConfig);
        if (pkgConfig?.dependencies != undefined) {
            for (let dep of pkgConfig.dependencies) {
                let config = await getPxseedConfigForPackage(dep);
                if (config == null) {
                    try {
                        await installPackage(dep);
                    }
                    catch (e) {
                        log.error(e.toString() + e.stack);
                    }
                }
            }
        }
        await buildPackageAndNotfiy(pkgname);
        await updatePackagesDatabase(pxseedConfig);
        if (pkgConfig != null) {
            if (pkgConfig.onInstalled != undefined) {
                try {
                    (await new Promise((resolve_2, reject_2) => { require([pkgConfig.onInstalled.module], resolve_2, reject_2); }))[pkgConfig.onInstalled.func]();
                }
                catch (e) { }
                ;
            }
        }
        exports.listener.onInstall.forEach((l) => new Promise((resolve_3, reject_3) => { require([l.module], resolve_3, reject_3); }).then(m => m[l.func](pkgname)).catch(() => { }));
    }
    async function getUrlTemplateFromScopeName(scopeName) {
        return RepositoriesRegistry.getScopeRepo(scopeName);
    }
    async function getRepoInfoFromPkgName(pkgFullName) {
        let parts = pkgFullName.split('/');
        let [scope, subname] = parts.slice(0, 2);
        let path = parts.slice(2);
        subname = subname ?? '';
        let repos = await RepositoriesRegistry.getScopeRepo(scope);
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
    }
    async function buildPackageAndNotfiy(pkgName) {
        let { processDirectory } = await new Promise((resolve_4, reject_4) => { require(['pxseedBuildScript/buildlib'], resolve_4, reject_4); });
        let { path, wwwroot } = await (0, util_1.getNodeCompatApi)();
        let records = [];
        let wrapConsole = { ...globalThis.console };
        wrapConsole.debug = (...msg) => records.push(msg);
        wrapConsole.info = (...msg) => records.push(msg);
        wrapConsole.warn = (...msg) => records.push(msg);
        wrapConsole.error = (...msg) => records.push(msg);
        let buildPath = await getSourceDirForPackage(pkgName);
        await (0, util_1.withConsole)(wrapConsole, () => processDirectory(buildPath));
        exports.listener.onBuild.forEach((l) => { new Promise((resolve_5, reject_5) => { require([l.module], resolve_5, reject_5); }).then(m => m[l.func](pkgName)).catch(() => { }); });
        try {
            await updatePackagesDatabase(pkgName);
        }
        catch (err) { }
        return records.map(t1 => t1.join(' ')).join('\n');
    }
    async function uninstallPackage(pkgname) {
        const { fs, path, wwwroot } = await (0, util_1.getNodeCompatApi)();
        let pkgcfg = await getPxseedConfigForPackage(pkgname);
        if (pkgcfg != null) {
            let pmopt = getPMOptFromPcfg(pkgcfg);
            if (pmopt != null && pmopt.onUninstalling != undefined) {
                try {
                    await (await new Promise((resolve_6, reject_6) => { require([pmopt.onUninstalling.module], resolve_6, reject_6); }))[pmopt.onUninstalling.func]?.();
                }
                catch (err) { }
                ;
            }
        }
        let dir1 = await getSourceDirForPackage(pkgname);
        await fs.rm(dir1, { recursive: true }).catch(_ => { });
        dir1 = await getOutputDirForPakcage(pkgname);
        await (0, buildlib_1.cleanBuildStatus)(dir1).catch(_ => { });
        await fs.rm(dir1, { recursive: true }).catch(_ => { });
        exports.listener.onUninstall.forEach((l) => new Promise((resolve_7, reject_7) => { require([l.module], resolve_7, reject_7); }).then(m => m[l.func](pkgname)));
    }
    async function getPxseedConfigForPackage(pkgname) {
        const { fs, path, wwwroot } = await (0, util_1.getNodeCompatApi)();
        let statusFile = path.join(await getOutputDirForPakcage(pkgname), '.pxseed.status.json');
        try {
            await fs.access(statusFile);
            return (await util_1.__internal__.readJson(statusFile)).pxseedConfig;
        }
        catch (e) {
            return null;
        }
    }
    async function* listPackagesInDirectory(dir) {
        const { fs, path, wwwroot } = await (0, util_1.getNodeCompatApi)();
        let children = await fs.readdir(dir, { withFileTypes: true });
        if (children.find(t1 => t1.name == '.pxseed.status.json')) {
            yield { path: dir, config: (await util_1.__internal__.readJson(path.join(dir, '.pxseed.status.json'))).pxseedConfig };
        }
        else {
            for (let t1 of children) {
                if (t1.isDirectory()) {
                    yield* listPackagesInDirectory(path.join(dir, t1.name));
                }
            }
        }
    }
    async function* listPackages() {
        const { fs, path, wwwroot } = await (0, util_1.getNodeCompatApi)();
        for await (let t1 of listPackagesInDirectory(wwwroot)) {
            yield t1.config;
        }
    }
    async function listPackagesArray(filterString) {
        let arr = [];
        let filterFunc;
        if (filterString.startsWith('javascript:')) {
            filterFunc = new Function('name', 'config', 'pmopt', filterString.substring('javascript:'.length + 1));
        }
        else {
            filterFunc = (() => {
                let keywords = filterString.split(/\s+/);
                return (name, config, pmopt) => {
                    for (let kw of keywords) {
                        if (name.includes(kw)) {
                            return true;
                        }
                        if (config.description != undefined && config.description.includes(kw)) {
                            return true;
                        }
                        if (pmopt != undefined && kw in pmopt) {
                            return true;
                        }
                    }
                    return false;
                };
            })();
        }
        for await (let t1 of listPackages()) {
            if (filterFunc(t1.name, t1, t1.options?.[exports.__name__])) {
                arr.push(t1);
            }
            ;
        }
        return arr;
    }
    async function upgradePackage(pkgname) {
        const { fs, path, wwwroot } = await (0, util_1.getNodeCompatApi)();
        let pkgdir = await getSourceDirForPackage(pkgname);
        let pxseedConfig = await util_1.__internal__.readJson(path.join(pkgdir, 'pxseed.config.json'));
        let pmopt = getPMOptFromPcfg(pxseedConfig);
        if (pmopt?.onUpgrade != undefined) {
            await (await new Promise((resolve_8, reject_8) => { require([pmopt.onUpgrade.module], resolve_8, reject_8); }))[pmopt.onUpgrade.func](pkgname, pkgdir);
        }
        else {
            await fs.access(path.join(pkgdir, '.git'));
            await pkgfetcher_1.__internal__.upgradeGitPackage(pkgdir);
            await installLocalPackage(pkgdir);
        }
    }
    async function installPackage(source) {
        const { fs, path, wwwroot } = await (0, util_1.getNodeCompatApi)();
        let installProcessed = false;
        let sourceDir = path.join(wwwroot, '..', 'source');
        if (source.startsWith('npm:')) {
            let packageJson = await util_1.__internal__.readJson(path.join(path.dirname(sourceDir), 'npmdeps', 'package.json'));
            //TODO: npm version check
            let t1 = source.substring(4);
            let versionSep = t1.lastIndexOf('@');
            if (versionSep <= 0) {
                versionSep = t1.length;
            }
            let pkgName = t1.substring(0, versionSep);
            if (packageJson.dependencies[pkgName] == undefined) {
                log.info('install npm package ' + pkgName);
                if (globalThis.process?.versions?.node == undefined) {
                    throw new Error('npm depdendencies are only support on node.js platform');
                }
                let returnCode = await util_1.__internal__.runCommand(`npm i ${pkgName}`, { cwd: path.join(path.dirname(sourceDir), 'npmdeps') });
                if (returnCode !== 0)
                    log.error('install npm package failed.');
            }
            installProcessed = true;
        }
        else {
            let existed = false;
            try {
                await fs.access(path.join(sourceDir, source, 'pxseed.config.json'));
                existed = true;
            }
            catch (e) {
                existed = false;
            }
            if (existed) {
                try {
                    await upgradePackage(source);
                    installProcessed = true;
                }
                catch (err) {
                    log.info('upgrade failed.' + err);
                }
            }
            if (!installProcessed) {
                try {
                    let fetchResult = await (0, pkgfetcher_1.fetchPackage)(source);
                    await installLocalPackage(fetchResult.localPath);
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
    }
    async function createPackageTemplate1(pxseedConfig) {
        const { fs, path, wwwroot } = await (0, util_1.getNodeCompatApi)();
        let pkgloc = path.join(buildlib_1.sourceDir, pxseedConfig.name);
        try {
            await fs.access(pkgloc);
            throw new Error('package is existed.');
        }
        catch (e) {
        }
        await fs.mkdir(pkgloc, { recursive: true });
        await fs.mkdir(path.join(pkgloc, 'assets'));
        await util_1.__internal__.writeJson(path.join(pkgloc, 'pxseed.config.json'), pxseedConfig);
        await fs.writeFile(path.join(pkgloc, '.gitignore'), `.*
!.gitignore
tsconfig.json
`);
        if (pxseedConfig.options?.[exports.__name__] != undefined) {
            let opt = pxseedConfig.options[exports.__name__];
            if (opt.webui?.entry != undefined && opt.webui.entry != '') {
                let entryMod = opt.webui.entry;
                if (entryMod.startsWith(pxseedConfig.name + '/')) {
                    let entModPath = path.join(buildlib_1.sourceDir, ...entryMod.split('/')) + '.tsx';
                    await fs.mkdir(path.dirname(entModPath), { recursive: true });
                    await fs.writeFile(entModPath, `
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
`);
                }
            }
        }
        await installLocalPackage(pkgloc);
        await pkgfetcher_1.__internal__.initGitPackage(pkgloc);
    }
    async function unloadPackageModules(pkg) {
        for (let mid in await base_1.requirejs.getDefined()) {
            if (mid.startsWith(pkg + '/')) {
                await base_1.requirejs.undef(mid);
            }
        }
    }
    async function exportPackagesInstallation() {
        let repos = await RepositoriesRegistry.ensureRepoCfg();
        let pkgs = [];
        for await (let t1 of listPackages()) {
            pkgs.push(t1.name);
        }
        return { repos, pkgs };
    }
    async function importPackagesInstallation(installationInfo) {
        const { fs, path, wwwroot } = await (0, util_1.getNodeCompatApi)();
        let { repos, pkgs } = installationInfo;
        for (let name in repos.repositories.scope) {
            let repoUrls = repos.repositories.scope[name];
            await RepositoriesRegistry.setScopeRepo(name, repoUrls);
        }
        for (let pkg of pkgs) {
            try {
                let existed = false;
                try {
                    fs.access(path.join(buildlib_1.sourceDir, ...pkg.split('/')));
                    existed = true;
                }
                catch (e) { }
                if (!existed) {
                    let fetchResult = await (0, pkgfetcher_1.fetchPackage)(pkg);
                    (0, base_1.assert)(fetchResult != null);
                    await installLocalPackage(fetchResult.localPath);
                }
            }
            catch (e) {
                log.warning(`importPackagesInstallation install package ${pkg} failed.` + e.toString());
            }
            ;
        }
    }
    async function cleanPackageInstallCache() {
        const { fs, path, wwwroot } = await (0, util_1.getNodeCompatApi)();
        await fs.rm(path.join(wwwroot, ...exports.__name__.split('/'), '..', '__temp'), { recursive: true });
    }
    async function getPackageListeners(eventType) {
        let result = new Array();
        for await (let pkg of listPackages()) {
            let pmopt = getPMOptFromPcfg(pkg);
            if (pmopt != null) {
                if (pmopt[eventType] != null) {
                    try {
                        result.push(pmopt[eventType]);
                    }
                    catch (err) { }
                    ;
                }
            }
        }
        return result;
    }
    async function sendOnStartupEventForAllPackages() {
        await Promise.allSettled((await getPackageListeners('onServerStartup')).map(t1 => new Promise((resolve_9, reject_9) => { require([t1.module], resolve_9, reject_9); }).then(t2 => t2[t1.func]())));
        await (0, JsEnviron_1.ensureDefaultFileSystem)();
        let startupNotebook = (0, JsEnviron_1.getSimpleFileSysteNormalizedWWWRoot)() + '/' + webutils_1.path.join(exports.__name__, '..', 'notebook', 'startup.ijsnb');
        if (await JsEnviron_1.defaultFileSystem.filetype(startupNotebook) == 'none') {
            let nbd = new workerinit_1.NotebookFileData();
            let ccld = new Inspector_1.CodeCellListData();
            ccld.cellList.push({ cellInput: `//All cells in this notebook will be executed when server(and packageManager) started.`, cellOutput: [null, ''], key: (0, base_1.GenerateRandomString)() });
            nbd.setCellsData(ccld);
            nbd.rpc = registry_1.ServerHostWorker1RpcName;
            await JsEnviron_1.defaultFileSystem.writeAll(startupNotebook, nbd.dump());
        }
        else {
            await (0, workerinit_1.runNotebook)(startupNotebook, 'all cells');
        }
    }
});
