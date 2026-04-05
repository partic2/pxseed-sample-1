define(["require", "exports", "pxseedBuildScript/util", "partic2/jsutils1/base", "partic2/jsutils1/webutils", "partic2/CodeRunner/jsutils2"], function (require, exports, util_1, base_1, webutils_1, jsutils2_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.__internal__ = exports.defaultGitClient = void 0;
    exports.initGitPackage = initGitPackage;
    exports.fetchPackage = fetchPackage;
    let __name__ = base_1.requirejs.getLocalRequireModule(require);
    let log = base_1.logger.getLogger(__name__);
    exports.defaultGitClient = new jsutils2_1.Singleton(async () => {
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
    });
    async function fetchGitPackageFromUrl(url, fetchDir) {
        const { fs, path, wwwroot } = await (0, util_1.getNodeCompatApi)();
        let { clone } = await new Promise((resolve_2, reject_2) => { require(['isomorphic-git'], resolve_2, reject_2); });
        let tempdir = fetchDir ?? path.join(wwwroot, ...__name__.split('/'), '..', '__temp', (0, base_1.GenerateRandomString)());
        try {
            await fs.access(tempdir);
            await fs.rm(tempdir, { recursive: true });
        }
        catch (e) {
        }
        ;
        await fs.mkdir(tempdir, { recursive: true });
        await clone({ ...await exports.defaultGitClient.get(), dir: tempdir, url, depth: 1 });
        return tempdir;
    }
    async function fetchPackageFromUrl(url) {
        const { fs, path, wwwroot } = await (0, util_1.getNodeCompatApi)();
        if (url.startsWith('pxseedjs:')) {
            let url1 = new URL(url);
            let pxseedjspath = url1.pathname;
            let t1 = pxseedjspath.lastIndexOf('.');
            let moduleName = pxseedjspath.substring(0, t1);
            let functionName = pxseedjspath.substring(t1 + 1);
            return await (await new Promise((resolve_3, reject_3) => { require([moduleName], resolve_3, reject_3); }))[functionName](url);
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
            return await fetchGitPackageFromUrl(url);
        }
    }
    async function publishPackage(dir) {
        const { fs, path, wwwroot } = await (0, util_1.getNodeCompatApi)();
        let children = await fs.readdir(dir, { withFileTypes: true });
        if (children.find(v => v.name == 'pxseed.config.json') != undefined) {
            let { add, commit, push, listRemotes, currentBranch } = await new Promise((resolve_4, reject_4) => { require(['isomorphic-git'], resolve_4, reject_4); });
            ;
            let remotes = await listRemotes({ ...await exports.defaultGitClient.get(), dir });
            await add({ ...await exports.defaultGitClient.get(), dir, filepath: '.' });
            await commit({ ...await exports.defaultGitClient.get(), dir, message: 'auto commit' });
            for (let t1 of remotes) {
                let pushResult = await push({ ...await exports.defaultGitClient.get(), dir, remote: t1.remote });
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
    async function initGitPackage(dir) {
        const { fs, path, wwwroot } = await (0, util_1.getNodeCompatApi)();
        let { getRepoInfoFromPkgName } = await new Promise((resolve_5, reject_5) => { require(['./registry'], resolve_5, reject_5); });
        let children = await fs.readdir(dir, { withFileTypes: true });
        if (children.find(v => v.name == '.git') != undefined) {
            return;
        }
        if (children.find(v => v.name == 'pxseed.config.json') != undefined) {
            let config = await util_1.__internal__.readJson(path.join(dir, 'pxseed.config.json'));
            let name = config.name;
            let { init, addRemote } = await new Promise((resolve_6, reject_6) => { require(['isomorphic-git'], resolve_6, reject_6); });
            ;
            await init({ ...await exports.defaultGitClient.get(), dir });
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
                await addRemote({ ...await exports.defaultGitClient.get(), dir, remote: remoteName[t1], url: repoUrls[t1] });
            }
        }
    }
    async function upgradeGitPackage(localPath) {
        let git = await new Promise((resolve_7, reject_7) => { require(['isomorphic-git'], resolve_7, reject_7); });
        let gitClient = await exports.defaultGitClient.get();
        let dir = localPath;
        let { fetchHead } = await git.fetch({ ...gitClient, dir });
        await git.merge({ ...gitClient, dir, theirs: fetchHead, fastForwardOnly: true });
        //FIXME: git merge add current content into stage, which prevent checkout if force=false.
        await git.checkout({ ...gitClient, dir, force: true });
    }
    async function fetchPackage(nameOrUrl) {
        const { fs, path, wwwroot } = await (0, util_1.getNodeCompatApi)();
        let tryResult = new Array();
        if (nameOrUrl.includes(':')) {
            try {
                let localPath = await fetchPackageFromUrl(nameOrUrl);
                if (localPath != undefined) {
                    return { localPath };
                }
            }
            catch (err) {
                tryResult.push(err);
            }
        }
        else {
            let { getRepoInfoFromPkgName } = await new Promise((resolve_8, reject_8) => { require(['./registry'], resolve_8, reject_8); });
            let info = await getRepoInfoFromPkgName(nameOrUrl);
            for (let t1 of info.urls) {
                try {
                    let repoLocalPath = await fetchPackageFromUrl(t1);
                    if (repoLocalPath == undefined)
                        continue;
                    let path2 = info.path;
                    return { localPath: path.join(repoLocalPath, ...path2) };
                }
                catch (err) {
                    tryResult.push(err);
                }
            }
        }
        let err = new Error('Failed to fetch package.');
        err.tryResult = tryResult;
        throw err;
    }
    exports.__internal__ = {
        initGitPackage, upgradeGitPackage, fetchGitPackageFromUrl, publishPackage
    };
});
//# sourceMappingURL=pkgfetcher.js.map