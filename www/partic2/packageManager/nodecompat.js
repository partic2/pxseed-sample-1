define(["require", "exports", "partic2/jsutils1/base", "partic2/jsutils1/webutils", "partic2/pxprpcClient/registry"], function (require, exports, base_1, webutils_1, registry_1) {
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
            this.access = (async (path, mode) => {
                if (await this.wrapped.filetype(path) === 'none') {
                    throw makeENOENT();
                }
            });
            this.readFile = (async (path, options) => {
                let data = await this.wrapped.readAll(path);
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
            });
            this.writeFile = (async (path, data, options) => {
                if (options?.encoding != undefined) {
                    (0, base_1.assert)(options.encoding.toLowerCase() == 'utf8');
                }
                if (typeof data === 'string') {
                    data = new TextEncoder().encode(data);
                }
                await this.wrapped.writeAll(path, data);
            });
            this.unlink = (async (path) => {
                await this.wrapped.delete2(path);
            });
            this.readdir = (async (path2, opt) => {
                let result = await this.wrapped.listdir(path2);
                if (opt?.withFileTypes != true) {
                    return result.map(v => v.name);
                }
                else {
                    return result.map(v => new NodeFsCompatDirent(v.type, v.name, webutils_1.path.join(path2, v.name)));
                }
            });
            this.mkdir = (async (path2, opt) => {
                this.wrapped.mkdir(path2);
            });
            this.rmdir = (async (path) => {
                if ((await this.wrapped.listdir(path)).length == 0) {
                    await this.wrapped.delete2(path);
                }
                else {
                    throw new Error('rmdir failed, directory not empty.');
                }
            });
            this.rm = (async (path, options) => {
                if (options.recursive || await this.wrapped.filetype(path) == 'file') {
                    await this.wrapped.delete2(path);
                }
                else {
                    await this.rmdir(path);
                }
            });
            this.stat = (async (path) => {
                let sr = await this.wrapped.stat(path);
                let nst = new NodeFsCompatStats(await this.wrapped.filetype(path), path, path);
                Object.assign(nst, sr);
                return nst;
            });
            this.lstat = (async (path) => {
                return await this.stat(path);
            });
            this.readlink = (async () => {
                throw new Error('Not implemented');
            });
            this.symlink = (async () => {
                throw new Error('Not implemented');
            });
            this.chmod = (async (path, mode) => {
            });
            this.copyFile = (async (src, dest, mode) => {
                let data = await this.wrapped.readAll(src);
                if (data == null) {
                    throw makeENOENT();
                }
                await this.wrapped.writeAll(dest, data);
            });
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
    async function buildNodeCompatApiTjs() {
        const { buildTjs } = await new Promise((resolve_1, reject_1) => { require(['partic2/tjshelper/tjsbuilder'], resolve_1, reject_1); });
        const tjs = await buildTjs();
        const { TjsSfs } = await new Promise((resolve_2, reject_2) => { require(['partic2/CodeRunner/JsEnviron'], resolve_2, reject_2); });
        const fs = new TjsSfs();
        fs.from(tjs);
        await fs.ensureInited();
        const { NodeFsAdapter } = await new Promise((resolve_3, reject_3) => { require(['partic2/packageManager/nodecompat'], resolve_3, reject_3); });
        const nfs = new NodeFsAdapter(fs);
        const { ServerHostWorker1RpcName, getPersistentRegistered, getAttachedRemoteRigstryFunction } = await new Promise((resolve_4, reject_4) => { require(['partic2/pxprpcClient/registry'], resolve_4, reject_4); });
        let wwwroot = (0, webutils_1.getWWWRoot)();
        if (wwwroot.startsWith('http')) {
            //get the server wwwroot
            const serverWorker1 = await getPersistentRegistered(ServerHostWorker1RpcName);
            if (serverWorker1 != undefined) {
                wwwroot = await (0, registry_1.easyCallRemoteJsonFunction)(await serverWorker1.ensureConnected(), 'partic2/jsutils1/webutils', 'getWWWRoot', []);
                ;
                wwwroot = wwwroot.replace(/\\/g, '/');
                if (wwwroot.startsWith('/')) {
                    wwwroot = '/' + wwwroot;
                }
            }
        }
        return { fs: { promises: nfs }, 'fs/promises': nfs, wwwroot: wwwroot, path: exports.pathCompat };
    }
    let cachedTypescriptModule = null;
    async function getTypescriptModuleTjs() {
        if (cachedTypescriptModule != null) {
            return cachedTypescriptModule;
        }
        let importTyescriptSucc = false;
        try {
            let ts = await base_1.requirejs.promiseRequire('typescript');
            importTyescriptSucc = true;
            cachedTypescriptModule = ts.default ?? ts;
            return cachedTypescriptModule;
        }
        catch (err) {
            await Promise.all(Object.keys(await base_1.requirejs.getFailed()).map((t1) => base_1.requirejs.undef(t1)));
        }
        try {
            let ts = await base_1.requirejs.promiseRequire('partic2/packageManager/typescript4tjs');
            importTyescriptSucc = true;
            cachedTypescriptModule = ts.default ?? ts;
            return cachedTypescriptModule;
        }
        catch (err) {
            await Promise.all(Object.keys(await base_1.requirejs.getFailed()).map((t1) => base_1.requirejs.undef(t1)));
        }
        {
            let downloadTs = await fetch('https://cdnjs.cloudflare.com/ajax/libs/typescript/5.8.3/typescript.min.js');
            (0, base_1.assert)(downloadTs.ok);
            let tstxt = await downloadTs.text();
            tstxt = "define(['exports','module'],function(exports,module){" + tstxt + "})";
            const { fs, wwwroot, path } = await buildNodeCompatApiTjs();
            await fs.promises.writeFile(path.join(wwwroot, 'partic2', 'packageManager', 'typescript4tjs.js'), new TextEncoder().encode(tstxt));
        }
        {
            let ts = await base_1.requirejs.promiseRequire('partic2/packageManager/typescript4tjs');
            importTyescriptSucc = true;
            cachedTypescriptModule = ts.default ?? ts;
            return cachedTypescriptModule;
        }
    }
});
//# sourceMappingURL=nodecompat.js.map