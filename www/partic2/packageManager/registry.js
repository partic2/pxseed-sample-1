define(["require", "exports", "path", "fs/promises", "fs", "pxseedBuildScript/buildlib", "partic2/jsutils1/webutils", "partic2/jsutils1/base", "fs-extra", "os", "pxseedBuildScript/util"], function (require, exports, path_1, promises_1, fs_1, buildlib_1, webutils_1, base_1, fs_extra_1, os_1, util_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.__name__ = void 0;
    exports.CorePackagesUpgradeHandler = CorePackagesUpgradeHandler;
    exports.CorePackagePublishHandler = CorePackagePublishHandler;
    exports.fillNameDependOnPath = fillNameDependOnPath;
    exports.installLocalPackage = installLocalPackage;
    exports.fetchGitPackageFromUrl = fetchGitPackageFromUrl;
    exports.fetchPackageFromUrl = fetchPackageFromUrl;
    exports.getUrlTemplateFromScopeName = getUrlTemplateFromScopeName;
    exports.getRepoInfoFromPkgName = getRepoInfoFromPkgName;
    exports.fetchPackage = fetchPackage;
    exports.uninstallPackage = uninstallPackage;
    exports.upgradeGitPackage = upgradeGitPackage;
    exports.upgradePackage = upgradePackage;
    exports.publishPackage = publishPackage;
    exports.initGitRepo = initGitRepo;
    exports.getSourceDirForPackage = getSourceDirForPackage;
    exports.getPxseedConfigForPackage = getPxseedConfigForPackage;
    exports.listPackages = listPackages;
    exports.listPackagesArray = listPackagesArray;
    exports.installPackage = installPackage;
    exports.createPackageTemplate1 = createPackageTemplate1;
    exports.unloadPackageModules = unloadPackageModules;
    exports.exportPackagesInstallation = exportPackagesInstallation;
    exports.importPackagesInstallation = importPackagesInstallation;
    exports.__name__ = base_1.requirejs.getLocalRequireModule(require);
    let log = base_1.logger.getLogger(exports.__name__);
    function mustNoSuchFileError(err) {
        if (err.toString().indexOf('no such file') < 0) {
            throw err;
        }
    }
    async function copyFilesNewer(destDir, srcDir) {
        let children = await (0, promises_1.readdir)(srcDir, { withFileTypes: true });
        try {
            await (0, promises_1.access)(destDir);
        }
        catch (e) {
            mustNoSuchFileError(e);
            (0, promises_1.mkdir)(destDir, { recursive: true });
        }
        for (let t1 of children) {
            if (t1.name == '.git') {
                continue;
            }
            if (t1.isDirectory()) {
                copyFilesNewer((0, path_1.join)(destDir, t1.name), (0, path_1.join)(srcDir, t1.name));
            }
            else {
                let dest = (0, path_1.join)(destDir, t1.name);
                let src = (0, path_1.join)(srcDir, t1.name);
                let needCopy = false;
                try {
                    let dfile = await (0, promises_1.stat)(dest);
                    let sfile2 = await (0, promises_1.stat)(src);
                    if (dfile.mtimeMs < sfile2.mtimeMs) {
                        needCopy = true;
                    }
                }
                catch (e) {
                    needCopy = true;
                }
                if (needCopy) {
                    await (0, promises_1.mkdir)((0, path_1.dirname)(dest), { recursive: true });
                    await (0, promises_1.copyFile)(src, dest);
                }
            }
        }
    }
    async function fetchCorePackages() {
        let gitcache = (0, path_1.join)((0, webutils_1.getWWWRoot)(), exports.__name__, '/corepkg-gitcache');
        let { simpleGit } = await new Promise((resolve_1, reject_1) => { require(['simple-git'], resolve_1, reject_1); });
        try {
            await (0, promises_1.access)((0, path_1.join)(gitcache, '.git'));
            let git = simpleGit(gitcache);
            for (let t1 of await git.getRemotes()) {
                try {
                    log.info((await git.pull(t1.name)).remoteMessages.all.join('\n'));
                    break;
                }
                catch (e) {
                    log.info(e.toString());
                }
            }
            return;
        }
        catch (e) {
            mustNoSuchFileError(e);
        }
        let repoInfos = await getRepoInfoFromPkgName('partic2/CorePackages');
        let ok = false;
        for (let url of repoInfos.urls) {
            try {
                await fetchGitPackageFromUrl(url, gitcache);
                ok = true;
                break;
            }
            catch (e) {
                log.info(e.toString());
            }
        }
        if (!ok) {
            throw new Error('No valid repository for CorePackages');
        }
    }
    async function CorePackagesUpgradeHandler(moduleName) {
        (0, base_1.assert)(moduleName == 'partic2/packageManager');
        let gitcache = (0, path_1.join)((0, webutils_1.getWWWRoot)(), exports.__name__, '/corepkg-gitcache');
        await fetchCorePackages();
        //copyFile to pxseed dir
        await copyFilesNewer((0, path_1.join)(sourceDir, '..'), gitcache);
    }
    async function CorePackagePublishHandler(moduleName) {
        (0, base_1.assert)(moduleName == 'partic2/packageManager');
        let gitcache = (0, path_1.join)((0, webutils_1.getWWWRoot)(), exports.__name__, '/corepkg-gitcache');
        await fetchCorePackages();
        let corePackDirs = [
            ['copysource'],
            ['script'],
            ['npmdeps'],
            ['source', 'pxseedBuildScript'],
            ['source', 'pxseedServer2023'],
            ['source', 'pxprpc'],
            ['source', 'partic2', 'CodeRunner'],
            ['source', 'partic2', 'JsNotebook'],
            ['source', 'partic2', 'jsutils1'],
            ['source', 'partic2', 'nodehelper'],
            ['source', 'partic2', 'packageManager'],
            ['source', 'partic2', 'pComponentUi'],
            ['source', 'partic2', 'pxprpcBinding'],
            ['source', 'partic2', 'pxprpcClient'],
            ['source', 'partic2', 'pxseedMedia1'],
            ['source', 'partic2', 'tjshelper']
        ];
        let corePackFiles = [
            ['source', '.gitignore'],
            ['source', 'tsconfig.base.json']
        ];
        for (let t1 of corePackDirs) {
            await copyFilesNewer((0, path_1.join)(gitcache, ...t1), (0, path_1.join)(sourceDir, ...t1));
        }
        for (let t1 of corePackFiles) {
            await (0, promises_1.copyFile)((0, path_1.join)(gitcache, ...t1), (0, path_1.join)(sourceDir, ...t1));
        }
    }
    let sourceDir = (0, path_1.join)((0, path_1.dirname)((0, path_1.dirname)((0, path_1.dirname)(__dirname))), 'source');
    let pkgdbName = exports.__name__ + '/pkgdb';
    async function readJson(...path) {
        return JSON.parse(new TextDecoder().decode(await (0, promises_1.readFile)((0, path_1.join)(...path))));
    }
    function getPMOptFromPcfg(config) {
        if (config.options && (exports.__name__ in config.options)) {
            return config.options[exports.__name__];
        }
        else {
            return null;
        }
    }
    async function fillNameDependOnPath(path) {
        path = path ?? sourceDir;
        let children = await (0, promises_1.readdir)(path, { withFileTypes: true });
        if (children.find(v => v.name == 'pxseed.config.json') != undefined) {
            let result = await readJson(path, 'pxseed.config.json');
            result.name = path.substring(sourceDir.length + 1).replace(/\\/g, '/');
            await (0, promises_1.writeFile)((0, path_1.join)(path, 'pxseed.config.json'), new TextEncoder().encode(JSON.stringify(result, undefined, '  ')));
        }
        else {
            for (let ch of children) {
                if (ch.isDirectory()) {
                    fillNameDependOnPath((0, path_1.join)(path, ch.name));
                }
            }
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
    async function installLocalPackage(path) {
        let pxseedConfig = await readJson(path, "pxseed.config.json");
        let pkgname = pxseedConfig.name;
        let destDir = await getSourceDirForPackage(pkgname);
        await (0, promises_1.mkdir)(destDir, { recursive: true });
        if (path != destDir) {
            await (0, fs_extra_1.copy)(path, destDir);
        }
        let pkgConfig = getPMOptFromPcfg(pxseedConfig);
        if (pkgConfig != null) {
            if (pkgConfig.repositories != undefined) {
                for (let scopeName in pkgConfig.repositories) {
                    let toMerge = pkgConfig.repositories[scopeName];
                    (0, base_1.assert)(toMerge instanceof Array);
                    let repos = new Set(await RepositoriesRegistry.getScopeRepo(scopeName));
                    for (let t1 of toMerge) {
                        if (t1.charAt(0) == '!') {
                            repos.delete(t1.substring(1));
                        }
                        else {
                            repos.add(t1);
                        }
                    }
                    await RepositoriesRegistry.setScopeRepo(scopeName, Array.from(repos));
                }
            }
            let pkgdb = await (0, webutils_1.kvStore)(pkgdbName);
            await pkgdb.setItem('pkg-' + pkgname, pkgConfig);
            if (pkgConfig.dependencies != undefined) {
                for (let dep of pkgConfig.dependencies) {
                    let config = await getPxseedConfigForPackage(dep);
                    if (config == null) {
                        try {
                            await installPackage(dep);
                        }
                        catch (e) {
                            log.error(e.toString());
                        }
                    }
                }
            }
        }
        await (0, buildlib_1.processDirectory)(destDir);
        if (pkgConfig != null) {
            if (pkgConfig.onInstalled != undefined) {
                try {
                    (await new Promise((resolve_2, reject_2) => { require([pkgConfig.onInstalled.module], resolve_2, reject_2); }))[pkgConfig.onInstalled.function]();
                }
                catch (e) { }
                ;
            }
        }
    }
    async function fetchGitPackageFromUrl(url, fetchDir) {
        let { simpleGit } = await new Promise((resolve_3, reject_3) => { require(['simple-git'], resolve_3, reject_3); });
        let tempdir = fetchDir ?? (0, path_1.join)(__dirname, '__temp', (0, base_1.GenerateRandomString)());
        try {
            await (0, promises_1.access)(tempdir, fs_1.constants.F_OK);
            await (0, fs_extra_1.remove)(tempdir);
        }
        catch (e) {
            mustNoSuchFileError(e);
        }
        ;
        await (0, promises_1.mkdir)(tempdir, { recursive: true });
        let git = simpleGit(tempdir);
        log.info(await git.clone(url, tempdir));
        return tempdir;
    }
    async function fetchPackageFromUrl(url) {
        if (url.startsWith('file://')) {
            let filePath = url.substring(7);
            if ((0, os_1.platform)().includes('win32')) {
                filePath = filePath.substring(1).replace(/\//g, '\\');
            }
            return filePath;
        }
        else if (url.endsWith('.git')) {
            return await fetchGitPackageFromUrl(url);
        }
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
    async function fetchPackage(name) {
        let info = await getRepoInfoFromPkgName(name);
        for (let t1 of info.urls) {
            try {
                let repoLocalPath = await fetchPackageFromUrl(t1);
                if (repoLocalPath == undefined)
                    continue;
                let path = info.path;
                return (0, path_1.join)(repoLocalPath, ...path);
            }
            catch (e) {
                log.debug(`fetchPackage from ${t1} failed.`);
            }
        }
    }
    async function uninstallPackage(pkgname) {
        await (0, fs_extra_1.remove)((0, path_1.join)(sourceDir, ...pkgname.split('/')));
        let pkgdb = await (0, webutils_1.kvStore)(pkgdbName);
        await pkgdb.delete('pkg-' + pkgname);
    }
    async function upgradeGitPackage(localPath) {
        let { simpleGit } = await new Promise((resolve_4, reject_4) => { require(['simple-git'], resolve_4, reject_4); });
        let git = simpleGit(localPath);
        log.info(await git.pull(['--rebase']));
    }
    async function upgradePackage(pkgname) {
        let pkgdir = (0, path_1.join)(sourceDir, ...pkgname.split('/'));
        let pxseedConfig = await readJson((0, path_1.join)(pkgdir, 'pxseed.config.json'));
        let pmopt = getPMOptFromPcfg(pxseedConfig);
        if (pmopt?.onUpgrade != undefined) {
            await (await new Promise((resolve_5, reject_5) => { require([pmopt.onUpgrade.module], resolve_5, reject_5); }))[pmopt.onUpgrade.function](pkgname, pkgdir);
        }
        else {
            try {
                await (0, promises_1.access)((0, path_1.join)(pkgdir, '.git'), fs_1.constants.F_OK);
                await upgradeGitPackage(pkgdir);
            }
            catch (e) { }
            ;
        }
    }
    async function publishPackage(dir) {
        let children = await (0, promises_1.readdir)(dir, { withFileTypes: true });
        if (children.find(v => v.name == 'pxseed.config.json') != undefined) {
            let { simpleGit } = await new Promise((resolve_6, reject_6) => { require(['simple-git'], resolve_6, reject_6); });
            let git = simpleGit(dir);
            let remotes = await git.getRemotes();
            await git.add('.');
            await git.commit('auto commit');
            let currentBranch = (await git.branch()).current;
            for (let t1 of remotes) {
                let pushResult = await git.push(t1.name, currentBranch);
                log.debug(JSON.stringify(pushResult));
            }
        }
        else {
            for (let t1 of children) {
                if (t1.isDirectory()) {
                    publishPackage((0, path_1.join)(dir, t1.name));
                }
            }
        }
    }
    async function initGitRepo(dir) {
        let children = await (0, promises_1.readdir)(dir, { withFileTypes: true });
        if (children.find(v => v.name == '.git') != undefined) {
            return;
        }
        if (children.find(v => v.name == 'pxseed.config.json') != undefined) {
            let config = await readJson((0, path_1.join)(dir, 'pxseed.config.json'));
            let name = config.name;
            let { simpleGit } = await new Promise((resolve_7, reject_7) => { require(['simple-git'], resolve_7, reject_7); });
            let git = simpleGit(dir);
            await git.init();
            await (0, promises_1.writeFile)((0, path_1.join)(dir, '.gitignore'), new TextEncoder().encode('/.pxseed.status.json'));
            let repo = await getRepoInfoFromPkgName(name);
            let remoteName = [];
            let repoUrls = Array.from(repo.urls);
            for (let t1 of repoUrls) {
                let t2 = t1.match(/.+?\/\/(.+?)\//);
                if (t2 == null) {
                    remoteName.push('repo' + (remoteName.length + 1));
                }
                else if (remoteName.indexOf(t2[1]) >= 0) {
                    remoteName.push(t2[1] + (remoteName.length + 1));
                }
                else {
                    remoteName.push(t2[1]);
                }
            }
            for (let t1 of base_1.ArrayWrap2.IntSequence(0, remoteName.length)) {
                await git.addRemote(remoteName[t1], repoUrls[t1]);
            }
        }
        else {
            for (let t1 of children) {
                if (t1.isDirectory()) {
                    await initGitRepo((0, path_1.join)(dir, t1.name));
                }
            }
        }
    }
    async function getSourceDirForPackage(pkgname) {
        return (0, path_1.join)(sourceDir, ...pkgname.split('/'));
    }
    async function getPxseedConfigForPackage(pkgname) {
        let configFile = (0, path_1.join)(await getSourceDirForPackage(pkgname), 'pxseed.config.json');
        try {
            await (0, promises_1.access)(configFile);
            return await readJson(configFile);
        }
        catch (e) {
            mustNoSuchFileError(e);
            return null;
        }
    }
    async function* listPackagesInternal(dir) {
        let children = await (0, promises_1.readdir)(dir, { withFileTypes: true });
        if (children.find(t1 => t1.name == 'pxseed.config.json')) {
            yield await readJson((0, path_1.join)(dir, 'pxseed.config.json'));
        }
        else {
            for (let t1 of children) {
                if (t1.isDirectory()) {
                    yield* listPackagesInternal((0, path_1.join)(dir, t1.name));
                }
            }
        }
    }
    async function* listPackages() {
        yield* listPackagesInternal(sourceDir);
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
    async function installPackage(source) {
        let installProcessed = false;
        if (source.indexOf(':') >= 0) {
            if (source.startsWith('npm:')) {
                let packageJson = await readJson((0, path_1.join)((0, path_1.dirname)(sourceDir), 'npmdeps', 'package.json'));
                //TODO: npm version check
                let t1 = source.substring(4);
                let versionSep = t1.lastIndexOf('@');
                if (versionSep <= 0) {
                    versionSep = t1.length;
                }
                let pkgName = t1.substring(0, versionSep);
                if (packageJson.dependencies[pkgName] == undefined) {
                    log.info('install npm package ' + pkgName);
                    let returnCode = await (0, util_1.runCommand)(`npm i ${pkgName}`, { cwd: (0, path_1.join)((0, path_1.dirname)(sourceDir), 'npmdeps') });
                    if (returnCode !== 0)
                        log.error('install npm package failed.');
                    //Should we abort?
                }
                installProcessed = true;
            }
            else {
                let localPath = await fetchPackageFromUrl(source);
                if (localPath != undefined) {
                    await installLocalPackage(localPath);
                    installProcessed = true;
                }
            }
        }
        else {
            let existed = false;
            try {
                await (0, promises_1.access)((0, path_1.join)(sourceDir, source), fs_1.constants.F_OK);
                existed = true;
            }
            catch (e) {
                mustNoSuchFileError(e);
                existed = false;
            }
            if (existed) {
                await upgradePackage(source);
                let localPath = (0, path_1.join)(sourceDir, source);
                await installLocalPackage(localPath);
                installProcessed = true;
            }
            else {
                let localPath = await fetchPackage(source);
                if (localPath != undefined) {
                    await installLocalPackage(localPath);
                    installProcessed = true;
                }
            }
        }
        if (!installProcessed) {
            throw new Error(`Can not handle url:${source}`);
        }
    }
    async function createPackageTemplate1(pxseedConfig) {
        let pkgloc = (0, path_1.join)(sourceDir, pxseedConfig.name);
        try {
            await (0, promises_1.access)(pkgloc, fs_1.constants.F_OK);
            throw new Error('package is existed.');
        }
        catch (e) {
            mustNoSuchFileError(e);
        }
        await (0, promises_1.mkdir)(pkgloc, { recursive: true });
        await (0, promises_1.mkdir)((0, path_1.join)(pkgloc, 'assets'));
        await (0, util_1.writeJson)((0, path_1.join)(pkgloc, 'pxseed.config.json'), pxseedConfig);
        await (0, promises_1.writeFile)((0, path_1.join)(pkgloc, '.gitignore'), `.*
!.gitignore
tsconfig.json
`);
        if (pxseedConfig.options?.[exports.__name__] != undefined) {
            let opt = pxseedConfig.options[exports.__name__];
            if (opt.webui?.entry != undefined && opt.webui.entry != '') {
                let entryMod = opt.webui.entry;
                if (entryMod.startsWith(pxseedConfig.name + '/')) {
                    let entModPath = (0, path_1.join)(sourceDir, ...entryMod.split('/')) + '.tsx';
                    await (0, promises_1.mkdir)((0, path_1.dirname)(entModPath), { recursive: true });
                    await (0, promises_1.writeFile)(entModPath, `
import * as React from 'preact'
import { openNewWindow } from 'partic2/pComponentUi/workspace'
import { requirejs } from 'partic2/jsutils1/base';
import { GetJsEntry } from 'partic2/jsutils1/webutils';
import { DomRootComponent, ReactRender } from 'partic2/pComponentUi/domui';

const __name__=requirejs.getLocalRequireModule(require);

//Open from packageManager.
export function *main(args:string){
    if(args=='webui'){
        openNewWindow(<div>WebUI Demo</div>);
    }
}

//Optinal support when module is open from url directly. like http://xxxx/pxseed/index.html?__jsentry=<moduleName>
(async ()=>{
    if(__name__==GetJsEntry()){
        ReactRender(<div>WebUI Demo</div>,DomRootComponent);
    }
})();
`);
                }
            }
        }
        await installLocalPackage(pkgloc);
        await initGitRepo(pkgloc);
    }
    async function unloadPackageModules(pkg) {
        for (let mid in await base_1.requirejs.getDefined()) {
            if (mid.startsWith(pkg + '/')) {
                base_1.requirejs.undef(mid);
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
        let { repos, pkgs } = installationInfo;
        for (let name in repos.repositories.scope) {
            let repoUrls = repos.repositories.scope[name];
            await RepositoriesRegistry.setScopeRepo(name, repoUrls);
        }
        for (let pkg of pkgs) {
            try {
                let existed = false;
                try {
                    (0, promises_1.access)((0, path_1.join)(sourceDir, ...pkg.split('/')), fs_1.constants.F_OK);
                    existed = true;
                }
                catch (e) { }
                if (!existed) {
                    let localPath = await fetchPackage(pkg);
                    (0, base_1.assert)(localPath != null);
                    await installLocalPackage(localPath);
                }
            }
            catch (e) {
                log.warning(`importPackagesInstallation install package ${pkg} failed.` + e.toString());
            }
            ;
        }
    }
});
//# sourceMappingURL=registry.js.map