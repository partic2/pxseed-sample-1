define("partic2/packageManager/pkgfetcher", ["require", "exports", "pxseedBuildScript/util", "partic2/jsutils1/base", "partic2/jsutils1/webutils", "partic2/CodeRunner/jsutils2"], function (require, exports, util_1, base_1, webutils_1, jsutils2_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.__internal__ = exports.defaultGitClient = void 0;
    exports.initGitPackage = initGitPackage;
    exports.fetchPackage = fetchPackage;
    let __name__ = base_1.requirejs.getLocalRequireModule(require);
    let log = base_1.logger.getLogger(__name__);
    exports.defaultGitClient = new jsutils2_1.Singleton(async () => {Promise.__onAsyncEnter();try{
        const { fs } = await  Promise.__onAwait((0, util_1.getNodeCompatApi)());
        globalThis.Buffer = (await  Promise.__onAwait(new Promise((resolve_1, reject_1) => { require(['buffer'], resolve_1, reject_1); }))).Buffer;
        async function request(c) {Promise.__onAsyncEnter();try{
            c.method = c.method ?? 'GET';
            c.headers = c.headers ?? {};
            if (typeof c.body === 'object' && (Symbol.asyncIterator in c.body)) {
                let bodyPart = [];
                let t2 = c.body[Symbol.asyncIterator]();
                try {
                    for (let t1 = await  Promise.__onAwait(t2.next()); !t1.done; t1 = await  Promise.__onAwait(t2.next())) {
                        bodyPart.push(t1.value);
                    }
                }
                finally {
                    t2.return?.();
                }
                c.body = new Uint8Array((0, base_1.ArrayBufferConcat)(bodyPart));
            }
            if ((0, webutils_1.getWWWRoot)().startsWith('http')) {
                let wwwrootUrl = new URL((0, webutils_1.getWWWRoot)());
                let targetUrl = new URL(c.url);
                c.url = wwwrootUrl.protocol + '//' + wwwrootUrl.host + '/corsBuster/' + encodeURIComponent(targetUrl.protocol + '//' + targetUrl.host) + targetUrl.pathname + targetUrl.search;
            }
            const res = await  Promise.__onAwait(webutils_1.defaultHttpClient.fetch(c.url, { method: c.method, headers: c.headers, body: c.body }));
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
        }finally{Promise.__onAsyncExit();}}
        ;
        return { fs: { promises: fs }, http: { request } };
    }finally{Promise.__onAsyncExit();}});
    async function fetchGitPackageFromUrl(url, fetchDir) {Promise.__onAsyncEnter();try{
        const { fs, path, wwwroot } = await  Promise.__onAwait((0, util_1.getNodeCompatApi)());
        let { clone } = await  Promise.__onAwait(new Promise((resolve_2, reject_2) => { require(['./prebuilt/isomorphic-git'], resolve_2, reject_2); }));
        let tempdir = fetchDir ?? path.join(wwwroot, ...__name__.split('/'), '..', '__temp', (0, base_1.GenerateRandomString)());
        try {
            await  Promise.__onAwait(fs.access(tempdir));
            await  Promise.__onAwait(fs.rm(tempdir, { recursive: true }));
        }
        catch (e) {
        }
        ;
        await  Promise.__onAwait(fs.mkdir(tempdir, { recursive: true }));
        await  Promise.__onAwait(clone({ ...await  Promise.__onAwait(exports.defaultGitClient.get()), dir: tempdir, url, depth: 1 }));
        return tempdir;
    }finally{Promise.__onAsyncExit();}}
    async function fetchPackageFromUrl(url) {Promise.__onAsyncEnter();try{
        const { fs, path, wwwroot } = await  Promise.__onAwait((0, util_1.getNodeCompatApi)());
        if (url.startsWith('pxseedjs:')) {
            let url1 = new URL(url);
            let pxseedjspath = url1.pathname;
            let t1 = pxseedjspath.lastIndexOf('.');
            let moduleName = pxseedjspath.substring(0, t1);
            let functionName = pxseedjspath.substring(t1 + 1);
            return await  Promise.__onAwait((await  Promise.__onAwait(new Promise((resolve_3, reject_3) => { require([moduleName], resolve_3, reject_3); })))[functionName](url));
        }
        if (url.startsWith('file://')) {
            let filePath = url.substring(7);
            if (/[a-zA-Z]:/.test(wwwroot)) {
                //windows path format
                filePath = filePath.substring(1);
            }
            return filePath;
        }
        else if (url.endsWith('.git')) {
            return await  Promise.__onAwait(fetchGitPackageFromUrl(url));
        }
    }finally{Promise.__onAsyncExit();}}
    async function publishPackage(dir) {Promise.__onAsyncEnter();try{
        const { fs, path, wwwroot } = await  Promise.__onAwait((0, util_1.getNodeCompatApi)());
        let children = await  Promise.__onAwait(fs.readdir(dir, { withFileTypes: true }));
        if (children.find(v => v.name == 'pxseed.config.json') != undefined) {
            let { add, commit, push, listRemotes, currentBranch } = await  Promise.__onAwait(new Promise((resolve_4, reject_4) => { require(['./prebuilt/isomorphic-git'], resolve_4, reject_4); }));
            ;
            let remotes = await  Promise.__onAwait(listRemotes({ ...await  Promise.__onAwait(exports.defaultGitClient.get()), dir }));
            await  Promise.__onAwait(add({ ...await  Promise.__onAwait(exports.defaultGitClient.get()), dir, filepath: '.' }));
            await  Promise.__onAwait(commit({ ...await  Promise.__onAwait(exports.defaultGitClient.get()), dir, message: 'auto commit' }));
            for (let t1 of remotes) {
                let pushResult = await  Promise.__onAwait(push({ ...await  Promise.__onAwait(exports.defaultGitClient.get()), dir, remote: t1.remote }));
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
    }finally{Promise.__onAsyncExit();}}
    async function initGitPackage(dir) {Promise.__onAsyncEnter();try{
        const { fs, path, wwwroot } = await  Promise.__onAwait((0, util_1.getNodeCompatApi)());
        let { getRepoInfoFromPkgName } = await  Promise.__onAwait(new Promise((resolve_5, reject_5) => { require(['./registry'], resolve_5, reject_5); }));
        let children = await  Promise.__onAwait(fs.readdir(dir, { withFileTypes: true }));
        if (children.find(v => v.name == '.git') != undefined) {
            return;
        }
        if (children.find(v => v.name == 'pxseed.config.json') != undefined) {
            let config = await  Promise.__onAwait(util_1.__internal__.readJson(path.join(dir, 'pxseed.config.json')));
            let name = config.name;
            let { init, addRemote } = await  Promise.__onAwait(new Promise((resolve_6, reject_6) => { require(['./prebuilt/isomorphic-git'], resolve_6, reject_6); }));
            ;
            await  Promise.__onAwait(init({ ...await  Promise.__onAwait(exports.defaultGitClient.get()), dir }));
            await  Promise.__onAwait(fs.writeFile(path.join(dir, '.gitignore'), new TextEncoder().encode('/.pxseed.status.json')));
            let repo = await  Promise.__onAwait(getRepoInfoFromPkgName(name));
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
                await  Promise.__onAwait(addRemote({ ...await  Promise.__onAwait(exports.defaultGitClient.get()), dir, remote: remoteName[t1], url: repoUrls[t1] }));
            }
        }
    }finally{Promise.__onAsyncExit();}}
    async function upgradeGitPackage(localPath) {Promise.__onAsyncEnter();try{
        let git = await  Promise.__onAwait(new Promise((resolve_7, reject_7) => { require(['./prebuilt/isomorphic-git'], resolve_7, reject_7); }));
        let gitClient = await  Promise.__onAwait(exports.defaultGitClient.get());
        let dir = localPath;
        let { fetchHead } = await  Promise.__onAwait(git.fetch({ ...gitClient, dir }));
        await  Promise.__onAwait(git.merge({ ...gitClient, dir, theirs: fetchHead, fastForwardOnly: true }));
        //FIXME: git merge add current content into stage, which prevent checkout if force=false.
        await  Promise.__onAwait(git.checkout({ ...gitClient, dir, force: true }));
    }finally{Promise.__onAsyncExit();}}
    async function fetchPackage(nameOrUrl) {Promise.__onAsyncEnter();try{
        const { fs, path, wwwroot } = await  Promise.__onAwait((0, util_1.getNodeCompatApi)());
        let tryResult = new Array();
        if (nameOrUrl.includes(':')) {
            try {
                let localPath = await  Promise.__onAwait(fetchPackageFromUrl(nameOrUrl));
                if (localPath != undefined) {
                    return { localPath };
                }
            }
            catch (err) {
                log.info(`fetch package ${nameOrUrl} failed. \n ${err}`);
                tryResult.push(err);
            }
        }
        else {
            let { getRepoInfoFromPkgName } = await  Promise.__onAwait(new Promise((resolve_8, reject_8) => { require(['./registry'], resolve_8, reject_8); }));
            let info = await  Promise.__onAwait(getRepoInfoFromPkgName(nameOrUrl));
            for (let t1 of info.urls) {
                try {
                    log.info(`try to fetch from source ${t1}`);
                    let repoLocalPath = await  Promise.__onAwait(fetchPackageFromUrl(t1));
                    if (repoLocalPath == undefined)
                        continue;
                    let path2 = info.path;
                    return { localPath: path.join(repoLocalPath, ...path2) };
                }
                catch (err) {
                    log.info(`fetch package ${nameOrUrl} from source ${t1} failed. \n ${err}`);
                    tryResult.push(err);
                }
            }
        }
        let err = new Error('Failed to fetch package.');
        err.tryResult = tryResult;
        throw err;
    }finally{Promise.__onAsyncExit();}}
    exports.__internal__ = {
        initGitPackage, upgradeGitPackage, fetchGitPackageFromUrl, publishPackage
    };
});
