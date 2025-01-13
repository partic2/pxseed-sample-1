define(["require", "exports", "partic2/jsutils1/base", "partic2/jsutils1/webutils", "partic2/jsutils1/webutils"], function (require, exports, base_1, webutils_1, webutils_2) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.installedRequirejsResourceProvider = exports.LocalWindowSFS = exports.TjsSfs = void 0;
    exports.installRequireProvider = installRequireProvider;
    exports.initCodeEnv = initCodeEnv;
    class TjsSfs {
        constructor() {
            this.dummyRootDir = [];
            //is windows base(C:\... D:\...) path?
            this.winbasepath = false;
        }
        from(impl) {
            this.impl = impl;
        }
        async ensureInited() {
            if (this.impl == undefined) {
                throw new Error('call from() first.');
            }
            try {
                await this.impl.stat('c:\\');
                this.winbasepath = true;
            }
            catch (e) { }
        }
        async writeAll(path, data) {
            let dirname = webutils_2.path.dirname(path);
            if (await this.filetype(dirname) !== 'dir') {
                await this.mkdir(dirname);
            }
            path = this.pathConvert(path);
            let file = await this.impl.open(path, 'w');
            try {
                let offset = 0;
                for (let times = 0; offset < data.byteLength && times < 4000; times++) {
                    let sizemax = 4 * 1024 * 1024;
                    if (data.length - offset < sizemax) {
                        sizemax = data.length - offset;
                    }
                    let write = await file.write(new Uint8Array(data, offset, sizemax), offset);
                    offset += write;
                }
            }
            finally {
                await file.close();
            }
        }
        async readAll(path) {
            path = this.pathConvert(path);
            return await this.impl.readFile(path);
        }
        async delete2(path) {
            path = this.pathConvert(path);
            await this.impl.rm(path);
        }
        pathConvert(path) {
            if (path === '') {
                return '/';
            }
            if (path.startsWith('/') && this.winbasepath) {
                if (path.length <= 3) {
                    return path.substring(1) + '\\';
                }
                else {
                    return path.substring(1);
                }
            }
            else {
                return path;
            }
        }
        async listdir(path) {
            if ((path === '/' || path === '') && this.winbasepath) {
                if (this.dummyRootDir.length === 0) {
                    for (let t1 of 'cdefghijklmn') {
                        try {
                            this.dummyRootDir.push([t1 + ':', await this.impl.stat(t1 + ':\\')]);
                        }
                        catch (e) {
                        }
                    }
                }
                return this.dummyRootDir.map(v => ({ name: v[0], type: 'dir' }));
            }
            path = this.pathConvert(path);
            let files = [];
            for await (let child of await this.impl.readdir(path)) {
                files.push({ name: child.name, type: child.isDirectory ? 'dir' : 'file' });
            }
            return files;
        }
        async filetype(path) {
            path = this.pathConvert(path);
            try {
                let st = await this.impl.stat(path);
                return st.isDirectory ? 'dir' : 'file';
            }
            catch (e) {
                return 'none';
            }
        }
        async mkdir(path) {
            path = this.pathConvert(path);
            await this.impl.mkdir(path);
        }
        async rename(path, newPath) {
            path = this.pathConvert(path);
            newPath = this.pathConvert(newPath);
            await this.impl.rename(path, newPath);
        }
        async dataDir() {
            //note homedir is Application specified, not the user home normally.
            //maybe we should use another function name.
            let datadir = this.impl.homedir().replace(/\\/g, '/');
            if (!datadir.startsWith('/')) {
                datadir = '/' + datadir;
            }
            return datadir;
        }
        async read(path, offset, buf) {
            let fh = await this.impl.open(path, 'r+');
            try {
                let len = await fh.read(buf, offset);
                if (len === null) {
                    throw new Error('EOF reached');
                }
                return len;
            }
            finally {
                fh.close();
            }
        }
        async write(path, offset, buf) {
            let fh = await this.impl.open(path, 'r+');
            try {
                let len = await fh.write(buf, offset);
                return len;
            }
            finally {
                fh.close();
            }
        }
    }
    exports.TjsSfs = TjsSfs;
    class LocalWindowSFS {
        constructor() {
            this.lastModified = 0;
            //For compatibility. fs module is in partic2/JsNotebook in early day.
            this.dbname = 'partic2/JsNotebook/filebrowser/sfs';
        }
        async ensureInited() {
            //XXX: race condition
            if (this.db == undefined) {
                this.db = await (0, webutils_1.kvStore)(this.dbname);
                this.root = await this.db.getItem('lwsfs/1');
                if (this.root == undefined) {
                    this.root = { name: '', type: 'dir', children: [] };
                    await this.saveChange();
                }
                this.lastModified = (await this.db.getItem('lwsfs/modifiedAt') ?? 0);
            }
        }
        pathSplit(path) {
            //remove empty name
            return path.split(/[\/\\]/).filter(v => v != '');
        }
        async lookupPathDir(path2, opt) {
            //_ensureRootCacheLatest()
            let lastModified = (await this.db.getItem('lwsfs/modifiedAt') ?? 0);
            if (this.lastModified < lastModified) {
                this.root = await this.db.getItem('lwsfs/1');
                this.lastModified = lastModified;
            }
            let curobj = this.root;
            for (let i1 = 0; i1 < path2.length; i1++) {
                let name = path2[i1];
                if (curobj.type === 'dir') {
                    let t1 = curobj.children.find(v => v.name === name);
                    if (t1 === undefined) {
                        if (opt.createParentDirectories) {
                            t1 = { type: 'dir', children: [], name };
                            curobj.children.push(t1);
                        }
                        else {
                            throw new Error(path2.slice(0, i1).join('/') + ' is not a directory');
                        }
                    }
                    curobj = t1;
                }
                else if (curobj.type === 'file') {
                    throw new Error(path2.slice(0, i1 + 1).join('/') + ' is not a directory');
                }
            }
            return curobj;
        }
        async writeAll(path, data) {
            let path2 = this.pathSplit(path);
            let parent = await this.lookupPathDir(path2.slice(0, path2.length - 1), { createParentDirectories: true });
            let found = parent.children.find(v => v.name === path2[path2.length - 1]);
            let dataKey = (0, base_1.GenerateRandomString)();
            if (found == undefined) {
                parent.children.push({ type: 'file', name: path2[path2.length - 1], dataKey });
            }
            else {
                dataKey = found.dataKey;
            }
            await this.db.setItem(dataKey, data);
            await this.saveChange();
        }
        async readAll(path) {
            let path2 = this.pathSplit(path);
            try {
                let parent = await this.lookupPathDir(path2.slice(0, path2.length - 1), { createParentDirectories: false });
                let found = parent.children.find(v => v.name === path2[path2.length - 1]);
                if (found == undefined || found.type !== 'file') {
                    return null;
                }
                else {
                    return await this.db.getItem(found.dataKey);
                }
            }
            catch (e) {
                return null;
            }
        }
        async delete2(path) {
            let path2 = this.pathSplit(path);
            let parent = await this.lookupPathDir(path2.slice(0, path2.length - 1), { createParentDirectories: false });
            let found = parent.children.findIndex(v => v.name === path2[path2.length - 1]);
            if (found >= 0) {
                let [fe] = parent.children.splice(found, 1);
                if (fe.dataKey != undefined) {
                    this.db.delete(fe.dataKey);
                }
            }
            await this.saveChange();
        }
        async saveChange() {
            this.lastModified = (0, base_1.GetCurrentTime)().getTime();
            await this.db.setItem('lwsfs/1', this.root);
            await this.db.setItem('lwsfs/modifiedAt', this.lastModified);
        }
        async listdir(path) {
            let path2 = this.pathSplit(path);
            let dir1 = await this.lookupPathDir(path2, { createParentDirectories: false });
            return dir1.children.map(v => v);
        }
        async mkdir(path) {
            let path2 = this.pathSplit(path);
            await this.lookupPathDir(path2, { createParentDirectories: true });
            await this.saveChange();
        }
        //Don't create directory automatically
        async filetype(path) {
            let path2 = this.pathSplit(path);
            try {
                if (path == '') {
                    return this.root.type;
                }
                let parent = await this.lookupPathDir(path2.slice(0, path2.length - 1), { createParentDirectories: false });
                let found = parent.children.find(v => v.name === path2[path2.length - 1]);
                return found === undefined ? 'none' : found.type;
            }
            catch (e) {
                return 'none';
            }
        }
        async rename(path, newPath) {
            let path2 = this.pathSplit(path);
            let newPath2 = this.pathSplit(newPath);
            let parent = await this.lookupPathDir(path2.slice(0, path2.length - 1), { createParentDirectories: false });
            let newParent = await this.lookupPathDir(newPath2.slice(0, path2.length - 1), { createParentDirectories: true });
            let foundIndex = parent.children.findIndex(v => v.name == path2[path2.length - 1]);
            let [t1] = parent.children.splice(foundIndex, 1);
            t1.name = newPath2[newPath2.length - 1];
            newParent.children.push(t1);
            await this.saveChange();
        }
        async dataDir() {
            return '';
        }
        //TODO:Seek read/write still read entire file. We need implement FilePart in kv db.
        async read(path, offset, buf) {
            let entire = await this.readAll(path);
            if (entire === null) {
                throw new Error(`${path} can't be read.`);
            }
            if (offset >= entire?.length) {
                throw new Error('EOF reached');
            }
            let len = Math.min(offset, length);
            buf.set(new Uint8Array(entire, offset, len));
            return len;
        }
        async write(path, offset, buf) {
            let entire = await this.readAll(path);
            if (entire === null) {
                throw new Error(`${path} can't be read.`);
            }
            if (offset + buf.byteLength >= entire?.length) {
                let t2 = new Uint8Array(offset + buf.byteLength);
                t2.set(entire);
                entire = t2;
            }
            entire.set(buf, offset);
            await this.writeAll(path, buf);
            return buf.byteLength;
        }
    }
    exports.LocalWindowSFS = LocalWindowSFS;
    class NodeSimpleFileSystem {
        constructor() {
            //is windows base(C:\... D:\...) path? like `TjsSfs` do.
            //Maybe it is not good to use different path convention between node native and SimpleFileSystem.
            this.winbasepath = false;
        }
        pathConvert(path) {
            //For windows 
            if (path === '') {
                return '/';
            }
            if (path.startsWith('/') && this.winbasepath) {
                if (path.length <= 3) {
                    return path.substring(1) + '\\';
                }
                else {
                    return path.substring(1);
                }
            }
            else {
                return path;
            }
        }
        async ensureInited() {
            this.nodefs = await new Promise((resolve_1, reject_1) => { require(['fs/promises'], resolve_1, reject_1); });
            this.nodepath = await new Promise((resolve_2, reject_2) => { require(['path'], resolve_2, reject_2); });
            try {
                await this.nodefs.stat('c:\\');
                this.winbasepath = true;
            }
            catch (e) { }
        }
        async writeAll(path, data) {
            path = this.pathConvert(path);
            let parent = this.nodepath.dirname(path);
            if (await this.filetype(parent) === 'none') {
                this.mkdir(parent);
            }
            await this.nodefs.writeFile(path, data);
        }
        async readAll(path) {
            path = this.pathConvert(path);
            return await this.nodefs.readFile(path);
        }
        async delete2(path) {
            path = this.pathConvert(path);
            await this.nodefs.rm(path, { recursive: true });
        }
        async listdir(path) {
            let dummyRootDir = [];
            if ((path === '/' || path === '') && this.winbasepath) {
                if (dummyRootDir.length === 0) {
                    for (let t1 of 'cdefghijklmn') {
                        try {
                            dummyRootDir.push([t1 + ':', await this.nodefs.stat(t1 + ':\\')]);
                        }
                        catch (e) {
                        }
                    }
                }
                return dummyRootDir.map(v => ({ name: v[0], type: 'dir' }));
            }
            path = this.pathConvert(path);
            let dirinfo = await this.nodefs.readdir(path, { withFileTypes: true });
            return dirinfo.map(ent => ({ name: ent.name, type: ent.isDirectory() ? 'dir' : 'file' }));
        }
        async filetype(path) {
            path = this.pathConvert(path);
            try {
                let ent = await this.nodefs.stat(path);
                return ent.isDirectory() ? 'dir' : 'file';
            }
            catch (e) {
                (0, base_1.throwIfAbortError)(e);
                return 'none';
            }
        }
        async mkdir(path) {
            path = this.pathConvert(path);
            await this.nodefs.mkdir(path, { recursive: true });
        }
        async rename(path, newPath) {
            path = this.pathConvert(path);
            await this.nodefs.rename(path, newPath);
        }
        async dataDir() {
            return webutils_2.path.dirname((0, webutils_1.getWWWRoot)().replace(/\\/, '/'));
        }
        async read(path, offset, buf) {
            let fh = await this.nodefs.open(path, 'r+');
            let r = await fh.read(buf, 0, buf.byteLength, offset);
            return r.bytesRead;
        }
        async write(path, offset, buf) {
            let fh = await this.nodefs.open(path, 'r+');
            let r = await fh.write(buf, 0, buf.byteLength, offset);
            return r.bytesWritten;
        }
    }
    class RequirejsResourceProvider {
        constructor(fs) {
            this.fs = fs;
            this.rootPath = 'www';
            this.handler = async (modName, url) => {
                await this.fs.ensureInited();
                let { baseUrl } = base_1.requirejs.getConfig();
                let fileName = url.substring(baseUrl.length);
                let data = await this.fs.readAll(this.rootPath + '/' + fileName);
                if (data != null) {
                    return new TextDecoder().decode(data);
                }
                return null;
            };
        }
        ;
    }
    exports.installedRequirejsResourceProvider = [];
    async function installRequireProvider(fs, rootPath) {
        let provider = new RequirejsResourceProvider(fs);
        if (rootPath != undefined) {
            provider.rootPath = rootPath;
        }
        base_1.requirejs.addResourceProvider(provider.handler);
        exports.installedRequirejsResourceProvider.push(provider);
        return provider.handler;
    }
    /* Usage: Run below code in CodeContext to init CodeContext _ENV
        ```javascript
        await (await import('partic2/CodeRunner/JsEnviron')).initCodeEnv(_ENV,{currentDirectory:'xxx'});
        ```
        Then these variable list in CodeContextEnvInitVar will be set to _ENV
    */
    async function initCodeEnv(_ENV, opt) {
        let env = 'unknown';
        if (globalThis.process?.versions?.node != undefined) {
            env = 'node';
        }
        else if (globalThis.navigator != undefined) {
            env = 'browser';
        }
        let simplefs = undefined;
        if (exports.installedRequirejsResourceProvider.length > 0) {
            simplefs = exports.installedRequirejsResourceProvider[0].fs;
        }
        else if (env === 'node') {
            simplefs = new NodeSimpleFileSystem();
            await simplefs.ensureInited();
        }
        let fs = {
            simple: simplefs,
            codePath: opt?.codePath,
            env: env,
            loadScript: async function (path) {
                (0, base_1.assert)(this.simple != undefined);
                if (path.startsWith('.')) {
                    (0, base_1.assert)(this.codePath != undefined);
                    path = webutils_2.path.dirname(this.codePath) + path.substring(1);
                }
                let jsbin = await this.simple.readAll(path);
                if (jsbin == null) {
                    throw new Error('File not existed');
                }
                let js = new TextDecoder().decode(jsbin);
                let cc = _ENV.__priv_codeContext;
                let savedCodePath = this.codePath;
                this.codePath = path;
                await cc.runCode(js);
                this.codePath = savedCodePath;
            }
        };
        _ENV.fs = fs;
        _ENV.import2env = async (moduleName) => {
            let mod = await base_1.requirejs.promiseRequire(moduleName);
            for (let [k1, v1] of Object.entries(mod)) {
                _ENV[k1] = v1;
            }
        };
        let { CustomFunctionParameterCompletionSymbol, importNameCompletion, makeFunctionCompletionWithFilePathArg0 } = (await new Promise((resolve_3, reject_3) => { require(['./Inspector'], resolve_3, reject_3); }));
        _ENV.import2env[CustomFunctionParameterCompletionSymbol] = async (context) => {
            let param = context.code.substring(context.funcParamStart, context.caret);
            let importName2 = param.match(/\(\s*(['"])([^'"]+)$/);
            if (importName2 != null) {
                let replaceRange = [context.funcParamStart + param.lastIndexOf(importName2[1]) + 1, 0];
                replaceRange[1] = replaceRange[0] + importName2[2].length;
                let importName = importName2[2];
                let t1 = await importNameCompletion(importName);
                context.completionItems.push(...t1.map(v => ({ type: 'literal', candidate: v, replaceRange })));
            }
        };
        _ENV.fs.loadScript[CustomFunctionParameterCompletionSymbol] = makeFunctionCompletionWithFilePathArg0(webutils_1.path.dirname(_ENV.fs.codePath));
        _ENV.fs.simple.readAll[CustomFunctionParameterCompletionSymbol] = makeFunctionCompletionWithFilePathArg0(undefined);
        _ENV.fs.simple.writeAll[CustomFunctionParameterCompletionSymbol] = makeFunctionCompletionWithFilePathArg0(undefined);
        _ENV.fs.simple.listdir[CustomFunctionParameterCompletionSymbol] = makeFunctionCompletionWithFilePathArg0(undefined);
        _ENV.fs.simple.filetype[CustomFunctionParameterCompletionSymbol] = makeFunctionCompletionWithFilePathArg0(undefined);
        _ENV.fs.simple.delete2[CustomFunctionParameterCompletionSymbol] = makeFunctionCompletionWithFilePathArg0(undefined);
        _ENV.globalThis = globalThis;
    }
});
//# sourceMappingURL=JsEnviron.js.map