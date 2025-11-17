define(["require", "exports", "pxseedBuildScript/buildlib", "partic2/jsutils1/webutils", "partic2/jsutils1/base", "pxseedBuildScript/util"], function (require, exports, buildlib_1, webutils_1, base_1, util_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.__name__ = void 0;
    exports.getGitClientConfig = getGitClientConfig;
    exports.UpgradeCorePackages = UpgradeCorePackages;
    exports.packPxseedForXplatj = packPxseedForXplatj;
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
    async function getGitClientConfig() {
        const { fs } = await (0, util_1.getNodeCompatApi)();
        globalThis.Buffer = (await new Promise((resolve_1, reject_1) => { require(['buffer'], resolve_1, reject_1); })).Buffer;
        async function request(c) {
            c.method = c.method ?? 'GET';
            c.headers = c.headers ?? {};
            if (typeof c.body === 'object' && (Symbol.asyncIterator in c.body)) {
                let bodyPart = [];
                for await (let t1 of c.body) {
                    bodyPart.push(t1);
                }
                c.body = new Uint8Array((0, base_1.ArrayBufferConcat)(bodyPart));
            }
            if ((0, webutils_1.getWWWRoot)().startsWith('http')) {
                let wwwrootUrl = new URL((0, webutils_1.getWWWRoot)());
                let targetUrl = new URL(c.url);
                c.url = wwwrootUrl.protocol + '//' + wwwrootUrl.host + '/corsBuster/' + encodeURIComponent(targetUrl.protocol + '//' + targetUrl.host) + targetUrl.pathname + targetUrl.search;
            }
            const res = await webutils_1.defaultHttpClient.fetch(c.url, { method: c.method, headers: c.headers, body: c.body });
            let body = res.body == null ? null : function (stream) {
                const reader = stream.getReader();
                return {
                    next() {
                        return reader.read();
                    },
                    return() {
                        reader.releaseLock();
                        return {};
                    },
                    [Symbol.asyncIterator]() {
                        return this;
                    },
                };
            }(res.body);
            // convert Header object to ordinary JSON
            let headers = {};
            res.headers.forEach((key, value) => {
                headers[key] = value;
            });
            return {
                url: res.url,
                method: c.method,
                statusCode: res.status,
                statusMessage: res.statusText,
                body,
                headers: headers,
            };
        }
        ;
        return { fs: { promises: fs }, http: { request } };
    }
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
            await upgradeGitPackage(pxseedCorePath);
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
                    await fetchGitPackageFromUrl(url, gitcache);
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
                let git = await new Promise((resolve_2, reject_2) => { require(['isomorphic-git'], resolve_2, reject_2); });
                await git.checkout({ ...await getGitClientConfig(), dir: pxseedCorePath, force: true });
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
    }
    async function packPxseedForXplatj() {
        const { fs, path, wwwroot } = await (0, util_1.getNodeCompatApi)();
        let pxseedRoot = path.join(wwwroot, '..').replace(/\\/g, '/');
        let outputRoot = path.join(wwwroot, exports.__name__, 'pxseedPack4Xplatj').replace(/\\/g, '/');
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
    async function fillNameDependOnPath(path2) {
        const { fs, path, wwwroot } = await (0, util_1.getNodeCompatApi)();
        let sourceDir = path.join(wwwroot, '..', 'source');
        path2 = path2 ?? sourceDir;
        let children = await fs.readdir(path2, { withFileTypes: true });
        if (children.find(v => v.name == 'pxseed.config.json') != undefined) {
            let result = await (0, util_1.readJson)(path.join(path2, 'pxseed.config.json'));
            result.name = path2.substring(sourceDir.length + 1).replace(/\\/g, '/');
            await fs.writeFile(path.join(path2, 'pxseed.config.json'), new TextEncoder().encode(JSON.stringify(result, undefined, '  ')));
        }
        else {
            for (let ch of children) {
                if (ch.isDirectory()) {
                    fillNameDependOnPath(path.join(path2, ch.name));
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
    async function installLocalPackage(path2) {
        const { fs, path, wwwroot } = await (0, util_1.getNodeCompatApi)();
        let pxseedConfig = await (0, util_1.readJson)(path.join(path2, "pxseed.config.json"));
        let pkgname = pxseedConfig.name;
        let destDir = await getSourceDirForPackage(pkgname);
        await fs.mkdir(destDir, { recursive: true });
        if (path2 != destDir) {
            await copyFilesNewer(destDir, path2);
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
                    (await new Promise((resolve_3, reject_3) => { require([pkgConfig.onInstalled.module], resolve_3, reject_3); }))[pkgConfig.onInstalled.function]();
                }
                catch (e) { }
                ;
            }
        }
    }
    async function fetchGitPackageFromUrl(url, fetchDir) {
        const { fs, path, wwwroot } = await (0, util_1.getNodeCompatApi)();
        let { clone } = await new Promise((resolve_4, reject_4) => { require(['isomorphic-git'], resolve_4, reject_4); });
        let tempdir = fetchDir ?? path.join(wwwroot, ...exports.__name__.split('/'), '..', '__temp', (0, base_1.GenerateRandomString)());
        try {
            await fs.access(tempdir);
            await fs.rm(tempdir);
        }
        catch (e) {
        }
        ;
        await fs.mkdir(tempdir, { recursive: true });
        await clone({ ...await getGitClientConfig(), dir: tempdir, url, depth: 1 });
        return tempdir;
    }
    async function fetchPackageFromUrl(url) {
        const { fs, path, wwwroot } = await (0, util_1.getNodeCompatApi)();
        if (url.startsWith('file://')) {
            let filePath = url.substring(7);
            if (/[a-zA-Z]:/.test(wwwroot)) {
                //windows path format
                filePath = filePath.substring(1);
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
        const { fs, path, wwwroot } = await (0, util_1.getNodeCompatApi)();
        let info = await getRepoInfoFromPkgName(name);
        for (let t1 of info.urls) {
            try {
                let repoLocalPath = await fetchPackageFromUrl(t1);
                if (repoLocalPath == undefined)
                    continue;
                let path2 = info.path;
                return path.join(repoLocalPath, ...path2);
            }
            catch (e) {
                log.debug(`fetchPackage from ${t1} failed. ` + e.toString());
            }
        }
    }
    async function uninstallPackage(pkgname) {
        const { fs, path, wwwroot } = await (0, util_1.getNodeCompatApi)();
        await fs.rm(path.join(wwwroot, '..', 'source', ...pkgname.split('/')), { recursive: true });
        let pkgdb = await (0, webutils_1.kvStore)(pkgdbName);
        await pkgdb.delete('pkg-' + pkgname);
    }
    async function upgradeGitPackage(localPath) {
        let git = await new Promise((resolve_5, reject_5) => { require(['isomorphic-git'], resolve_5, reject_5); });
        let gitClient = await getGitClientConfig();
        let dir = localPath;
        let { fetchHead } = await git.fetch({ ...gitClient, dir });
        await git.merge({ ...gitClient, dir, theirs: fetchHead, fastForwardOnly: true });
        //FIXME: git merge add current content into stage, which prevent checkout if force=false.
        await git.checkout({ ...gitClient, dir, force: true });
    }
    async function upgradePackage(pkgname) {
        const { fs, path, wwwroot } = await (0, util_1.getNodeCompatApi)();
        let pkgdir = path.join(path.join(wwwroot, '..', 'source'), ...pkgname.split('/'));
        let pxseedConfig = await (0, util_1.readJson)(path.join(pkgdir, 'pxseed.config.json'));
        let pmopt = getPMOptFromPcfg(pxseedConfig);
        if (pmopt?.onUpgrade != undefined) {
            await (await new Promise((resolve_6, reject_6) => { require([pmopt.onUpgrade.module], resolve_6, reject_6); }))[pmopt.onUpgrade.function](pkgname, pkgdir);
        }
        else {
            let upgradeMode = 'reinstall';
            try {
                await fs.access(path.join(pkgdir, '.git'));
                upgradeMode = 'git pull';
            }
            catch (e) { }
            ;
            if (upgradeMode == 'git pull') {
                await upgradeGitPackage(pkgdir);
            }
            else if (upgradeMode == 'reinstall') {
                await uninstallPackage(pkgname);
                await installPackage(pkgname, { upgrade: false });
            }
            else {
                throw new Error('Unsupported upgrade mode ' + upgradeMode);
            }
        }
    }
    async function publishPackage(dir) {
        const { fs, path, wwwroot } = await (0, util_1.getNodeCompatApi)();
        let children = await fs.readdir(dir, { withFileTypes: true });
        if (children.find(v => v.name == 'pxseed.config.json') != undefined) {
            let { add, commit, push, listRemotes, currentBranch } = await new Promise((resolve_7, reject_7) => { require(['isomorphic-git'], resolve_7, reject_7); });
            ;
            let remotes = await listRemotes({ ...await getGitClientConfig(), dir });
            await add({ ...await getGitClientConfig(), dir, filepath: '.' });
            await commit({ ...await getGitClientConfig(), dir, message: 'auto commit' });
            for (let t1 of remotes) {
                let pushResult = await push({ ...await getGitClientConfig(), dir, remote: t1.remote });
                log.debug(JSON.stringify(pushResult));
            }
        }
        else {
            for (let t1 of children) {
                if (t1.isDirectory()) {
                    publishPackage(path.join(dir, t1.name));
                }
            }
        }
    }
    async function initGitRepo(dir) {
        const { fs, path, wwwroot } = await (0, util_1.getNodeCompatApi)();
        let children = await fs.readdir(dir, { withFileTypes: true });
        if (children.find(v => v.name == '.git') != undefined) {
            return;
        }
        if (children.find(v => v.name == 'pxseed.config.json') != undefined) {
            let config = await (0, util_1.readJson)(path.join(dir, 'pxseed.config.json'));
            let name = config.name;
            let { init, addRemote } = await new Promise((resolve_8, reject_8) => { require(['isomorphic-git'], resolve_8, reject_8); });
            ;
            await init({ ...await getGitClientConfig(), dir });
            await fs.writeFile(path.join(dir, '.gitignore'), new TextEncoder().encode('/.pxseed.status.json'));
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
                await addRemote({ ...await getGitClientConfig(), dir, remote: remoteName[t1], url: repoUrls[t1] });
            }
        }
        else {
            for (let t1 of children) {
                if (t1.isDirectory()) {
                    await initGitRepo(path.join(dir, t1.name));
                }
            }
        }
    }
    async function getSourceDirForPackage(pkgname) {
        const { fs, path, wwwroot } = await (0, util_1.getNodeCompatApi)();
        return path.join(wwwroot, '..', 'source', ...pkgname.split('/'));
    }
    async function getPxseedConfigForPackage(pkgname) {
        const { fs, path, wwwroot } = await (0, util_1.getNodeCompatApi)();
        let configFile = path.join(await getSourceDirForPackage(pkgname), 'pxseed.config.json');
        try {
            await fs.access(configFile);
            return await (0, util_1.readJson)(configFile);
        }
        catch (e) {
            return null;
        }
    }
    async function* listPackagesInternal(dir) {
        const { fs, path, wwwroot } = await (0, util_1.getNodeCompatApi)();
        let children = await fs.readdir(dir, { withFileTypes: true });
        if (children.find(t1 => t1.name == 'pxseed.config.json')) {
            yield await (0, util_1.readJson)(path.join(dir, 'pxseed.config.json'));
        }
        else {
            for (let t1 of children) {
                if (t1.isDirectory()) {
                    yield* listPackagesInternal(path.join(dir, t1.name));
                }
            }
        }
    }
    async function* listPackages() {
        const { fs, path, wwwroot } = await (0, util_1.getNodeCompatApi)();
        yield* listPackagesInternal(path.join(wwwroot, '..', 'source'));
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
    const defaultInstallOption = {
        upgrade: true
    };
    async function installPackage(source, opt) {
        opt = { ...defaultInstallOption, ...opt };
        const { fs, path, wwwroot } = await (0, util_1.getNodeCompatApi)();
        let installProcessed = false;
        let sourceDir = path.join(wwwroot, '..', 'source');
        if (source.indexOf(':') >= 0) {
            if (source.startsWith('npm:')) {
                let packageJson = await (0, util_1.readJson)(path.join(path.dirname(sourceDir), 'npmdeps', 'package.json'));
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
                    const { runCommand } = await new Promise((resolve_9, reject_9) => { require(['pxseedBuildScript/util'], resolve_9, reject_9); });
                    let returnCode = await runCommand(`npm i ${pkgName}`, { cwd: path.join(path.dirname(sourceDir), 'npmdeps') });
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
                await fs.access(path.join(sourceDir, source, 'pxseed.config.json'));
                existed = true;
            }
            catch (e) {
                existed = false;
            }
            if (existed) {
                if (opt.upgrade) {
                    await upgradePackage(source);
                    let localPath = path.join(sourceDir, source);
                    await installLocalPackage(localPath);
                }
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
        await (0, util_1.writeJson)(path.join(pkgloc, 'pxseed.config.json'), pxseedConfig);
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