define("partic2/packageManager/nodecompat", ["require", "exports", "partic2/CodeRunner/JsEnviron", "partic2/jsutils1/base", "partic2/jsutils1/webutils", "partic2/pxprpcClient/registry"], function (require, exports, JsEnviron_1, base_1, webutils_1, registry_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.pathCompat = exports.NodeFsAdapter = void 0;
    exports.buildNodeCompatApiTjs = buildNodeCompatApiTjs;
    exports.getTypescriptModuleTjs = getTypescriptModuleTjs;
    //node compatible fs, To used in isomorphic-git
    class NodeFsCompatDirent {
        constructor(fileType, name, path) {
            this.fileType = fileType;
            this.name = name;
            this.path = path;
        }
        ;
        isFile() { return this.fileType == 'file'; }
        isDirectory() { return this.fileType == 'dir'; }
        isBlockDevice() { return false; }
        isCharacterDevice() { return false; }
        isSymbolicLink() { return false; }
        isFIFO() { return false; }
        isSocket() { return false; }
    }
    class NodeFsCompatStats extends NodeFsCompatDirent {
        constructor() {
            super(...arguments);
            this.dev = 0;
            this.ino = 0;
            this.mode = 0o777;
            this.nlink = 0;
            this.uid = 0;
            this.gid = 0;
            this.rdev = 0;
            this.size = 0;
            this.blksize = 0;
            this.blocks = 0;
            this.atime = new Date(0);
            this.mtime = new Date(0);
            this.ctime = new Date(0);
            this.birthtime = new Date(0);
        }
        get atimeMs() { return this.atime.getTime(); }
        ;
        get mtimeMs() { return this.mtime.getTime(); }
        ;
        get ctimeMs() { return this.ctime.getTime(); }
        ;
        get birthtimeMs() { return this.birthtime.getTime(); }
        ;
    }
    function makeENOENT() {
        let err = new Error('no such file or directory.');
        err.code = 'ENOENT';
        return err;
    }
    class NodeFsAdapter {
        constructor(wrapped) {
            this.wrapped = wrapped;
            this.access = (async (path, mode) => {Promise.__onAsyncEnter();try{
                if (await  Promise.__onAwait(this.wrapped.filetype(path)) === 'none') {
                    throw makeENOENT();
                }
            }finally{Promise.__onAsyncExit();}});
            this.readFile = (async (path, options) => {Promise.__onAsyncEnter();try{
                let data = await  Promise.__onAwait(this.wrapped.readAll(path));
                if (data == null) {
                    let err = new Error('File not existed.');
                    err.name = 'ENOENT';
                    throw err;
                }
                if (options?.encoding != undefined) {
                    (0, base_1.assert)(options.encoding.toLowerCase() == 'utf8');
                    return new TextDecoder().decode(data);
                }
                else {
                    return data;
                }
            }finally{Promise.__onAsyncExit();}});
            this.writeFile = (async (path, data, options) => {Promise.__onAsyncEnter();try{
                if (options?.encoding != undefined) {
                    (0, base_1.assert)(options.encoding.toLowerCase() == 'utf8');
                }
                if (typeof data === 'string') {
                    data = new TextEncoder().encode(data);
                }
                await  Promise.__onAwait(this.wrapped.writeAll(path, data));
            }finally{Promise.__onAsyncExit();}});
            this.unlink = (async (path) => {Promise.__onAsyncEnter();try{
                await  Promise.__onAwait(this.wrapped.delete2(path));
            }finally{Promise.__onAsyncExit();}});
            this.readdir = (async (path2, opt) => {Promise.__onAsyncEnter();try{
                let result = await  Promise.__onAwait(this.wrapped.listdir(path2));
                if (opt?.withFileTypes != true) {
                    return result.map(v => v.name);
                }
                else {
                    return result.map(v => new NodeFsCompatDirent(v.type, v.name, webutils_1.path.join(path2, v.name)));
                }
            }finally{Promise.__onAsyncExit();}});
            this.mkdir = (async (path2, opt) => {Promise.__onAsyncEnter();try{
                await  Promise.__onAwait(this.wrapped.mkdir(path2));
            }finally{Promise.__onAsyncExit();}});
            this.rmdir = (async (path) => {Promise.__onAsyncEnter();try{
                if ((await  Promise.__onAwait(this.wrapped.listdir(path))).length == 0) {
                    await  Promise.__onAwait(this.wrapped.delete2(path));
                }
                else {
                    throw new Error('rmdir failed, directory not empty.');
                }
            }finally{Promise.__onAsyncExit();}});
            this.rm = (async (path, options) => {Promise.__onAsyncEnter();try{
                if (options?.recursive || await  Promise.__onAwait(this.wrapped.filetype(path)) == 'file') {
                    await  Promise.__onAwait(this.wrapped.delete2(path));
                }
                else {
                    await  Promise.__onAwait(this.rmdir(path));
                }
            }finally{Promise.__onAsyncExit();}});
            this.stat = (async (path) => {Promise.__onAsyncEnter();try{
                let sr = await  Promise.__onAwait(this.wrapped.stat(path));
                let nst = new NodeFsCompatStats(await  Promise.__onAwait(this.wrapped.filetype(path)), path, path);
                Object.assign(nst, sr);
                return nst;
            }finally{Promise.__onAsyncExit();}});
            this.lstat = (async (path) => {Promise.__onAsyncEnter();try{
                return await  Promise.__onAwait(this.stat(path));
            }finally{Promise.__onAsyncExit();}});
            this.readlink = (async () => {Promise.__onAsyncEnter();try{
                throw new Error('Not implemented');
            }finally{Promise.__onAsyncExit();}});
            this.symlink = (async () => {Promise.__onAsyncEnter();try{
                throw new Error('Not implemented');
            }finally{Promise.__onAsyncExit();}});
            this.chmod = (async (path, mode) => {Promise.__onAsyncEnter();try{
            }finally{Promise.__onAsyncExit();}});
            this.copyFile = (async (src, dest, mode) => {Promise.__onAsyncEnter();try{
                if (await  Promise.__onAwait(this.wrapped.filetype(src)) === 'none') {
                    throw makeENOENT();
                }
                await  Promise.__onAwait(JsEnviron_1.simpleFileSystemHelper.copyFile(this.wrapped, src, dest));
            }finally{Promise.__onAsyncExit();}});
        }
    }
    exports.NodeFsAdapter = NodeFsAdapter;
    exports.pathCompat = {
        sep: (0, webutils_1.getWWWRoot)().includes('\\') ? '\\' : '/',
        join(...args) {
            let parts = [];
            for (let t1 of args) {
                for (let t2 of t1.split(/[\\\/]/)) {
                    if (t2 === '..' && parts.length >= 1) {
                        parts.pop();
                    }
                    else if (t2 === '.') {
                        //skip
                    }
                    else {
                        parts.push(t2);
                    }
                }
            }
            return parts.join(this.sep);
        },
        dirname(p) {
            return this.join(p, '..');
        },
        basename(p) {
            p.split(/[\\\/]/).at(-1) ?? '';
        }
    };
    exports.pathCompat.join = exports.pathCompat.join.bind(exports.pathCompat);
    exports.pathCompat.dirname = exports.pathCompat.dirname.bind(exports.pathCompat);
    exports.pathCompat.basename = exports.pathCompat.basename.bind(exports.pathCompat);
    async function buildNodeCompatApiTjs() {Promise.__onAsyncEnter();try{
        const { buildTjs } = await  Promise.__onAwait(new Promise((resolve_1, reject_1) => { require(['partic2/tjshelper/tjsbuilder'], resolve_1, reject_1); }));
        const tjs = await  Promise.__onAwait(buildTjs());
        const { TjsSfs } = await  Promise.__onAwait(new Promise((resolve_2, reject_2) => { require(['partic2/CodeRunner/JsEnviron'], resolve_2, reject_2); }));
        const fs = new TjsSfs();
        fs.from(tjs);
        await  Promise.__onAwait(fs.ensureInited());
        const { NodeFsAdapter } = await  Promise.__onAwait(new Promise((resolve_3, reject_3) => { require(['partic2/packageManager/nodecompat'], resolve_3, reject_3); }));
        const nfs = new NodeFsAdapter(fs);
        const { ServerHostWorker1RpcName, getPersistentRegistered, getAttachedRemoteRigstryFunction } = await  Promise.__onAwait(new Promise((resolve_4, reject_4) => { require(['partic2/pxprpcClient/registry'], resolve_4, reject_4); }));
        let wwwroot = (0, webutils_1.getWWWRoot)();
        if (wwwroot.startsWith('http')) {
            //get the server wwwroot
            const serverWorker1 = await  Promise.__onAwait(getPersistentRegistered(ServerHostWorker1RpcName));
            if (serverWorker1 != undefined) {
                wwwroot = await  Promise.__onAwait((0, registry_1.easyCallRemoteJsonFunction)(await  Promise.__onAwait(serverWorker1.ensureConnected()), 'partic2/jsutils1/webutils', 'getWWWRoot', []));
                ;
                wwwroot = wwwroot.replace(/\\/g, '/');
                if (wwwroot.startsWith('/')) {
                    wwwroot = '/' + wwwroot;
                }
            }
        }
        return { fs: { promises: nfs }, 'fs/promises': nfs, wwwroot: wwwroot, path: exports.pathCompat };
    }finally{Promise.__onAsyncExit();}}
    let cachedTypescriptModule = null;
    async function getTypescriptModuleTjs() {Promise.__onAsyncEnter();try{
        if (cachedTypescriptModule != null) {
            return cachedTypescriptModule;
        }
        let importTyescriptSucc = false;
        try {
            let ts = await  Promise.__onAwait(new Promise((resolve_5, reject_5) => { require(['typescript'], resolve_5, reject_5); }));
            importTyescriptSucc = true;
            cachedTypescriptModule = ts.default ?? ts;
            return cachedTypescriptModule;
        }
        catch (err) {
            await  Promise.__onAwait(Promise.all(Object.keys(await  Promise.__onAwait(base_1.requirejs.getFailed())).map((t1) => base_1.requirejs.undef(t1))));
        }
        try {
            let ts = await  Promise.__onAwait(new Promise((resolve_6, reject_6) => { require(['partic2/prebuiltTypescript5d8/typescript'], resolve_6, reject_6); }));
            importTyescriptSucc = true;
            cachedTypescriptModule = ts.default ?? ts;
            return cachedTypescriptModule;
        }
        catch (err) {
            await  Promise.__onAwait(Promise.all(Object.keys(await  Promise.__onAwait(base_1.requirejs.getFailed())).map((t1) => base_1.requirejs.undef(t1))));
        }
        {
            let { buildTjs } = await  Promise.__onAwait(new Promise((resolve_7, reject_7) => { require(['partic2/tjshelper/tjsbuilder'], resolve_7, reject_7); }));
            let tjs = await  Promise.__onAwait(buildTjs());
            let { fetchPackage } = await  Promise.__onAwait(new Promise((resolve_8, reject_8) => { require(['./pkgfetcher'], resolve_8, reject_8); }));
            let { localPath } = await  Promise.__onAwait(fetchPackage('partic2/prebuiltTypescript5d8'));
            let installDir = exports.pathCompat.join((0, webutils_1.getWWWRoot)(), '..', 'source', 'partic2', 'prebuiltTypescript5d8');
            await  Promise.__onAwait(tjs.makeDir(installDir, { recursive: true }));
            await  Promise.__onAwait(tjs.remove(installDir));
            await  Promise.__onAwait(tjs.rename(localPath, installDir));
            let { processDirectoryInRecursive } = await  Promise.__onAwait(new Promise((resolve_9, reject_9) => { require(['pxseedBuildScript/buildlib'], resolve_9, reject_9); }));
            await  Promise.__onAwait(processDirectoryInRecursive(installDir));
        }
        try {
            let ts = await  Promise.__onAwait(new Promise((resolve_10, reject_10) => { require(['partic2/prebuiltTypescript5d8/typescript'], resolve_10, reject_10); }));
            importTyescriptSucc = true;
            cachedTypescriptModule = ts.default ?? ts;
            return cachedTypescriptModule;
        }
        catch (err) {
            await  Promise.__onAwait(Promise.all(Object.keys(await  Promise.__onAwait(base_1.requirejs.getFailed())).map((t1) => base_1.requirejs.undef(t1))));
        }
        (0, base_1.assert)(cachedTypescriptModule != null, 'load typescript module failed');
        return cachedTypescriptModule;
    }finally{Promise.__onAsyncExit();}}
});
