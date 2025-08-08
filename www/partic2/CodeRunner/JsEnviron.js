define(["require", "exports", "partic2/jsutils1/base", "partic2/jsutils1/webutils", "partic2/jsutils1/webutils"], function (require, exports, base_1, webutils_1, webutils_2) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.installedRequirejsResourceProvider = exports.DirAsRootFS = exports.NodeSimpleFileSystem = exports.defaultFileSystem = exports.LocalWindowSFS = exports.TjsSfs = void 0;
    exports.getSimpleFileSystemFromPxprpc = getSimpleFileSystemFromPxprpc;
    exports.ensureDefaultFileSystem = ensureDefaultFileSystem;
    exports.getFileSystemReadableStream = getFileSystemReadableStream;
    exports.getFileSysteWritableStream = getFileSysteWritableStream;
    exports.installRequireProvider = installRequireProvider;
    exports.initCodeEnv = initCodeEnv;
    class MountFileEntry {
        //pxseed url for mounted fs, eg:  "pxseedjs:your/module/name.asynchronizedBuilder?param=xxx"
        //asynchronizedBuilder:async function asynchronizedBuilder(url:string):Promise<SimpleFileSystem>
        constructor(builder) {
            this.builder = builder;
        }
        toJSON() {
            return this.builder;
        }
        async ensureFs() {
            if (this.fs == undefined) {
                let { pathname, protocol } = new URL(this.builder);
                (0, base_1.assert)(protocol == 'pxseedjs:');
                let delim = pathname.lastIndexOf('.');
                this.fs = await ((await new Promise((resolve_1, reject_1) => { require([pathname.substring(0, delim)], resolve_1, reject_1); }))[pathname.substring(delim + 1)])(this.builder);
            }
            await this.fs.ensureInited();
        }
    }
    class TjsSfs {
        constructor() {
            this.dummyRootDir = [];
            //is windows base(C:\... D:\...) path?
            this.winbasepath = false;
            this.inited = false;
            this.mtx = new base_1.mutex();
        }
        from(impl) {
            this.impl = impl;
        }
        async ensureInited() {
            await this.mtx.lock();
            try {
                if (this.inited)
                    return;
                if (this.impl == undefined) {
                    throw new Error('call from() first.');
                }
                try {
                    await this.impl.stat('C:\\');
                    this.winbasepath = true;
                }
                catch (e) {
                    (0, base_1.throwIfAbortError)(e);
                }
                this.inited = true;
            }
            finally {
                await this.mtx.unlock();
            }
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
            await this.impl.remove(path);
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
                    for (let t1 of 'CDEFGHIJKMN') {
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
            for await (let child of await this.impl.readDir(path)) {
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
            await this.impl.makeDir(path, { recursive: true });
        }
        async rename(path, newPath) {
            path = this.pathConvert(path);
            newPath = this.pathConvert(newPath);
            await this.impl.rename(path, newPath);
        }
        async dataDir() {
            //note homedir is Application specified, not the user home normally.
            //maybe we should use another function name.
            let datadir = this.impl.homeDir.replace(/\\/g, '/');
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
                    len = 0;
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
        async stat(path) {
            let statRes = await this.impl.stat(path);
            return { atime: statRes.atim, mtime: statRes.mtim, ctime: statRes.ctim, birthtime: statRes.birthtim, size: statRes.size };
        }
        async truncate(path, newSize) {
            let f = await this.impl.open(path, 'r+');
            try {
                await f.truncate(newSize);
            }
            finally {
                await f.close();
            }
        }
    }
    exports.TjsSfs = TjsSfs;
    async function getSimpleFileSystemFromPxprpc(pxprpc) {
        //check if jseio is supported
        let checkFunc = await pxprpc.getFunc('JseHelper.JseIo.open');
        if (checkFunc != null) {
            checkFunc.free();
            let { tjsFrom } = await new Promise((resolve_2, reject_2) => { require(['partic2/tjshelper/tjsonjserpc'], resolve_2, reject_2); });
            let { Invoker } = await new Promise((resolve_3, reject_3) => { require(['partic2/pxprpcBinding/JseHelper__JseIo'], resolve_3, reject_3); });
            let inv = new Invoker();
            await inv.useClient(pxprpc);
            let fs = new TjsSfs();
            fs.from(await tjsFrom(inv));
            return fs;
        }
    }
    class LWSFSInternalError extends Error {
    }
    class LocalWindowSFS {
        constructor() {
            this.lastModified = 0;
            //For compatibility. fs module is in partic2/JsNotebook in early day.
            this.dbname = 'partic2/JsNotebook/filebrowser/sfs';
            this.mtx = new base_1.mutex();
        }
        throwIfNotInternalError(err) {
            if (!(err instanceof LWSFSInternalError)) {
                throw err;
            }
        }
        async ensureInited() {
            //XXX: race condition
            await this.mtx.lock();
            try {
                if (this.db == undefined) {
                    this.db = await (0, webutils_1.kvStore)(this.dbname);
                    this.root = await this.db.getItem('lwsfs/1');
                    if (this.root == undefined) {
                        this.root = { name: '', type: 'dir', children: [], mtime: (0, base_1.GetCurrentTime)().getTime() };
                        await this.saveChange();
                    }
                    this.lastModified = (await this.db.getItem('lwsfs/modifiedAt') ?? 0);
                }
            }
            finally {
                await this.mtx.unlock();
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
                    if (curobj.mountFs == null) {
                        let t1 = curobj.children.find(v => v.name === name);
                        if (t1 === undefined) {
                            if (opt.createParentDirectories) {
                                t1 = { type: 'dir', children: [], name, mtime: (0, base_1.GetCurrentTime)().getTime() };
                                curobj.children.push(t1);
                            }
                            else {
                                throw new LWSFSInternalError(path2.slice(0, i1).join('/') + ' is not a directory');
                            }
                        }
                        curobj = t1;
                    }
                    else {
                        if (typeof curobj.mountFs === 'string') {
                            curobj.mountFs = new MountFileEntry(curobj.mountFs);
                            await curobj.mountFs.ensureFs();
                        }
                        return {
                            entry: curobj,
                            restPath: path2.slice(i1 + 1)
                        };
                    }
                }
                else if (curobj.type === 'file') {
                    throw new Error(path2.slice(0, i1 + 1).join('/') + ' is not a directory');
                }
            }
            if (typeof curobj.mountFs === 'string') {
                curobj.mountFs = new MountFileEntry(curobj.mountFs);
                await curobj.mountFs.ensureFs();
            }
            return {
                entry: curobj
            };
        }
        async writeAll(path, data) {
            let path2 = this.pathSplit(path);
            let lookupResult = await this.lookupPathDir(path2.slice(0, path2.length - 1), { createParentDirectories: true });
            if (lookupResult.restPath == undefined && lookupResult.entry.mountFs == null) {
                let parent = lookupResult.entry;
                let found = parent.children.find(v => v.name === path2[path2.length - 1]);
                let dataKey = (0, base_1.GenerateRandomString)();
                if (found != undefined) {
                    found.mtime = (0, base_1.GetCurrentTime)().getTime();
                    if (typeof found.dataKey === 'string') {
                        await this.db.delete(found.dataKey);
                    }
                    else {
                        for (let t1 of found.dataKey) {
                            await this.db.delete(t1.key);
                        }
                    }
                    found.dataKey = [{ key: dataKey, size: data.length }];
                }
                else {
                    found = { type: 'file', name: path2[path2.length - 1], dataKey: [{ key: dataKey, size: data.length }], mtime: (0, base_1.GetCurrentTime)().getTime() };
                    parent.children.push(found);
                }
                found.size = data.length;
                await this.db.setItem(dataKey, data);
                await this.saveChange();
            }
            else {
                await lookupResult.entry.mountFs.fs.writeAll([...(lookupResult.restPath ?? []), path2.at(-1)].join('/'), data);
            }
        }
        async readAll(path) {
            let path2 = this.pathSplit(path);
            try {
                let lookupResult = await this.lookupPathDir(path2.slice(0, path2.length - 1), { createParentDirectories: false });
                if (lookupResult.restPath == undefined && lookupResult.entry.mountFs == null) {
                    let parent = lookupResult.entry;
                    let found = parent.children.find(v => v.name === path2[path2.length - 1]);
                    if (found == undefined || found.type !== 'file') {
                        return null;
                    }
                    else {
                        if (typeof found.dataKey === 'string') {
                            return await this.db.getItem(found.dataKey);
                        }
                        else {
                            return new Uint8Array((0, base_1.ArrayBufferConcat)(await Promise.all(found.dataKey.map(t1 => this.db.getItem(t1.key)))));
                        }
                    }
                }
                else {
                    return await lookupResult.entry.mountFs.fs.readAll([...(lookupResult.restPath ?? []), path2.at(-1)].join('/'));
                }
            }
            catch (e) {
                this.throwIfNotInternalError(e);
                return null;
            }
        }
        async delete2(path) {
            let path2 = this.pathSplit(path);
            let lookupResult = await this.lookupPathDir(path2.slice(0, path2.length - 1), { createParentDirectories: false });
            if (lookupResult.restPath == undefined && lookupResult.entry.mountFs == null) {
                let parent = lookupResult.entry;
                let found = parent.children.findIndex(v => v.name === path2[path2.length - 1]);
                if (found >= 0) {
                    let [fe] = parent.children.splice(found, 1);
                    if (fe.dataKey != undefined) {
                        if (typeof fe.dataKey === 'string') {
                            await this.db.delete(fe.dataKey);
                        }
                        else {
                            await Promise.all(fe.dataKey.map(t1 => this.db.delete(t1.key)));
                        }
                    }
                }
                await this.saveChange();
            }
            else {
                await lookupResult.entry.mountFs.fs.delete2([...(lookupResult.restPath ?? []), path2.at(-1)].join('/'));
            }
        }
        async saveChange() {
            this.lastModified = (0, base_1.GetCurrentTime)().getTime();
            await this.db.setItem('lwsfs/1', this.root);
            await this.db.setItem('lwsfs/modifiedAt', this.lastModified);
        }
        async listdir(path) {
            let path2 = this.pathSplit(path);
            let lookupResult = await this.lookupPathDir(path2, { createParentDirectories: false });
            if (lookupResult.restPath == undefined && lookupResult.entry.mountFs == null) {
                return lookupResult.entry.children.map(v => v);
            }
            else {
                return lookupResult.entry.mountFs.fs.listdir([...(lookupResult.restPath ?? [])].join('/'));
            }
        }
        async mkdir(path) {
            let path2 = this.pathSplit(path);
            let lookupResult = await this.lookupPathDir(path2, { createParentDirectories: true });
            if (lookupResult.restPath == undefined && lookupResult.entry.mountFs == null) {
            }
            else {
                return lookupResult.entry.mountFs.fs.mkdir([...(lookupResult.restPath ?? [])].join('/'));
            }
            await this.saveChange();
        }
        //Don't create directory automatically
        async filetype(path) {
            let path2 = this.pathSplit(path);
            try {
                if (path == '') {
                    return this.root.type;
                }
                let lookupResult = await this.lookupPathDir(path2.slice(0, path2.length - 1), { createParentDirectories: false });
                if (lookupResult.restPath == undefined && lookupResult.entry.mountFs == null) {
                    let parent = lookupResult.entry;
                    let found = parent.children.find(v => v.name === path2[path2.length - 1]);
                    return found === undefined ? 'none' : found.type;
                }
                else {
                    return lookupResult.entry.mountFs.fs.filetype([...(lookupResult.restPath ?? []), path2.at(-1)].join('/'));
                }
            }
            catch (e) {
                this.throwIfNotInternalError(e);
                return 'none';
            }
        }
        async rename(path, newPath) {
            let path2 = this.pathSplit(path);
            let newPath2 = this.pathSplit(newPath);
            let parent = await this.lookupPathDir(path2.slice(0, path2.length - 1), { createParentDirectories: false });
            let newParent = await this.lookupPathDir(newPath2.slice(0, path2.length - 1), { createParentDirectories: true });
            if (parent.restPath == undefined && newParent.restPath == undefined && parent.entry.mountFs == null && newParent.entry.mountFs == null) {
                let foundIndex = parent.entry.children.findIndex(v => v.name == path2[path2.length - 1]);
                let [t1] = parent.entry.children.splice(foundIndex, 1);
                t1.name = newPath2[newPath2.length - 1];
                newParent.entry.children.push(t1);
                await this.saveChange();
            }
            else if (parent.entry == newParent.entry) {
                await parent.entry.mountFs.fs.rename([parent.restPath ?? [], path2.at(-1)].join('/'), [newParent.restPath ?? [], path2.at(-1)].join('/'));
            }
            else {
                throw new Error('Cross filesystem rename is not supported');
            }
        }
        async dataDir() {
            return '';
        }
        async read(path, offset, buf) {
            (0, base_1.assert)(buf.length > 0);
            let path2 = this.pathSplit(path);
            let lookupResult = await this.lookupPathDir(path2.slice(0, path2.length - 1), { createParentDirectories: false });
            if (lookupResult.entry.mountFs == null) {
                let entry = lookupResult.entry.children.find(t1 => t1.name == path2.at(-1));
                let datas = new Array();
                if (typeof entry.dataKey === 'string') {
                    datas.push({ key: entry.dataKey, size: entry.size });
                }
                else {
                    datas = entry.dataKey;
                }
                let pos = 0;
                let blk = 0;
                for (blk = 0; blk < datas.length; blk++) {
                    if (pos + datas[blk].size > offset) {
                        break;
                    }
                    pos += datas[blk].size;
                }
                let len = Math.min(datas[blk].size - (offset - pos), buf.byteLength);
                if (len <= 0)
                    return 0;
                let bufsrc = await this.db.getItem(datas[blk].key);
                buf.set(new Uint8Array(bufsrc.buffer, offset - pos, len));
                return len;
            }
            else {
                return await lookupResult.entry.mountFs.fs.read([...(lookupResult.restPath ?? []), path2.at(-1)].join('/'), offset, buf);
            }
        }
        async write(path, offset, buf) {
            (0, base_1.assert)(buf.length > 0);
            let path2 = this.pathSplit(path);
            let lookupResult = await this.lookupPathDir(path2.slice(0, path2.length - 1), { createParentDirectories: true });
            if (lookupResult.entry.mountFs == null) {
                let entry = lookupResult.entry.children.find(t1 => t1.name == path2.at(-1));
                if (entry == undefined) {
                    let newEntry = {
                        type: 'file', name: path2[path2.length - 1],
                        dataKey: [{ key: (0, base_1.GenerateRandomString)(), size: offset }],
                        mtime: (0, base_1.GetCurrentTime)().getTime(),
                        size: offset
                    };
                    await this.db.setItem(newEntry.dataKey[0].key, new Uint8Array(newEntry.dataKey[0].size));
                    entry = newEntry;
                    lookupResult.entry.children.push(entry);
                }
                let datas = new Array();
                if (typeof entry.dataKey === 'string') {
                    datas.push({ key: entry.dataKey, size: entry.size });
                }
                else {
                    datas = entry.dataKey;
                }
                if (offset > entry.size) {
                    this.truncate(path, offset);
                }
                let pos = 0, blk = 0, endblk = 0, startblk = 0, startpos = 0, endpos = 0;
                for (blk = 0; blk < datas.length; blk++) {
                    if (pos + datas[blk].size > offset) {
                        break;
                    }
                    pos += datas[blk].size;
                }
                startblk = blk;
                startpos = pos;
                for (; blk < datas.length; blk++) {
                    if (pos + datas[blk].size > offset + buf.byteLength) {
                        break;
                    }
                    pos += datas[blk].size;
                }
                endblk = blk;
                endpos = pos;
                let newDatas = new Array();
                for (let t1 = 0; t1 < startblk; t1++) {
                    newDatas.push(datas[t1]);
                }
                if (startpos < offset) {
                    let newKey = (0, base_1.GenerateRandomString)();
                    let startblk2 = await this.db.getItem(datas[startblk].key);
                    await this.db.setItem(newKey, startblk2.slice(0, offset - startpos));
                    newDatas.push({ key: newKey, size: offset - startpos });
                }
                {
                    let newKey = (0, base_1.GenerateRandomString)();
                    await this.db.setItem(newKey, buf.slice());
                    newDatas.push({ key: newKey, size: buf.length });
                }
                if (endblk < datas.length) {
                    if (endpos < offset + buf.byteLength) {
                        let newKey = (0, base_1.GenerateRandomString)();
                        let endblk2 = await this.db.getItem(datas[endblk].key);
                        let blkSplice = offset + buf.byteLength - endpos;
                        await this.db.setItem(newKey, endblk2.slice(blkSplice, endblk2.byteLength));
                        newDatas.push({ key: newKey, size: endblk2.byteLength - blkSplice });
                        await this.db.delete(datas[endblk].key);
                    }
                    else {
                        newDatas.push(datas[endblk]);
                    }
                }
                for (let t1 = endblk + 1; t1 < datas.length; t1++) {
                    newDatas.push(datas[t1]);
                }
                for (let t1 = startblk; t1 < endblk; t1++) {
                    await this.db.delete(datas[t1].key);
                }
                entry.dataKey = newDatas;
                entry.size = entry.dataKey.reduce((prev, curr) => prev + curr.size, 0);
                await this.saveChange();
                return buf.byteLength;
            }
            else {
                return await lookupResult.entry.mountFs.fs.write([...(lookupResult.restPath ?? []), path2.at(-1)].join('/'), offset, buf);
            }
        }
        async stat(path) {
            let path2 = this.pathSplit(path);
            try {
                let lookupResult = await this.lookupPathDir(path2.slice(0, path2.length - 1), { createParentDirectories: false });
                if (lookupResult.entry.mountFs == null) {
                    let parent = lookupResult.entry;
                    let found = parent.children.find(v => v.name === path2[path2.length - 1]);
                    if (found == undefined) {
                        throw new Error(`${path} can't be read.`);
                    }
                    else {
                        let mtimDat = new Date(found.mtime);
                        return { atime: mtimDat, mtime: mtimDat, ctime: mtimDat, birthtime: mtimDat, size: found.size ?? 0 };
                    }
                }
                else {
                    return lookupResult.entry.mountFs.fs.stat([...(lookupResult.restPath ?? []), path2.at(-1)].join('/'));
                }
            }
            catch (e) {
                this.throwIfNotInternalError(e);
                throw new Error(`${path} can't be read.`);
            }
        }
        async truncate(path, newSize) {
            let path2 = this.pathSplit(path);
            try {
                let lookupResult = await this.lookupPathDir(path2.slice(0, path2.length - 1), { createParentDirectories: false });
                if (lookupResult.entry.mountFs == null) {
                    (0, base_1.assert)(lookupResult.entry.type == 'file', `incorrect file type for ${path}`);
                    let datas = new Array();
                    if (typeof lookupResult.entry.dataKey === 'string') {
                        datas.push({ key: lookupResult.entry.dataKey, size: lookupResult.entry.size });
                    }
                    else {
                        datas = lookupResult.entry.dataKey;
                    }
                    if (lookupResult.entry.size < newSize) {
                        let newBlk = { key: (0, base_1.GenerateRandomString)(), size: newSize - lookupResult.entry.size };
                        await this.db.setItem(newBlk.key, new Uint8Array(newBlk.size));
                        datas.push(newBlk);
                    }
                    else if (lookupResult.entry.size > newSize) {
                        let pos = 0;
                        let t1 = -1;
                        for (t1 = 0; t1 < datas.length; t1++) {
                            if (pos + datas[t1].size > newSize) {
                                break;
                            }
                        }
                        let data1 = await this.db.getItem(datas[t1].key);
                        await this.db.setItem(datas[t1].key, data1.slice(0, newSize - pos));
                        lookupResult.entry.dataKey = datas.slice(0, t1);
                    }
                    lookupResult.entry.size = newSize;
                }
                else {
                    lookupResult.entry.mountFs.fs.truncate([...(lookupResult.restPath ?? []), path2.at(-1)].join('/'), newSize);
                }
            }
            catch (e) {
                this.throwIfNotInternalError(e);
            }
        }
    }
    exports.LocalWindowSFS = LocalWindowSFS;
    exports.defaultFileSystem = null;
    async function ensureDefaultFileSystem() {
        exports.defaultFileSystem = new LocalWindowSFS();
        await exports.defaultFileSystem.ensureInited();
    }
    class NodeSimpleFileSystem {
        constructor() {
            //is windows base(C:\... D:\...) path? like `TjsSfs` do.
            //Maybe it is not good to use different path convention between node native and SimpleFileSystem.
            this.winbasepath = false;
            this.mtx = new base_1.mutex();
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
            await this.mtx.lock();
            try {
                this.nodefs = await new Promise((resolve_4, reject_4) => { require(['fs/promises'], resolve_4, reject_4); });
                this.nodepath = await new Promise((resolve_5, reject_5) => { require(['path'], resolve_5, reject_5); });
                try {
                    await this.nodefs.stat('c:\\');
                    this.winbasepath = true;
                }
                catch (e) {
                    (0, base_1.throwIfAbortError)(e);
                }
            }
            finally {
                await this.mtx.unlock();
            }
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
            path = this.pathConvert(path);
            let fh = await this.nodefs.open(path, 'r+');
            try {
                let r = await fh.read(buf, 0, buf.byteLength, offset);
                return r.bytesRead;
            }
            finally {
                fh.close();
            }
        }
        async write(path, offset, buf) {
            path = this.pathConvert(path);
            let parent = this.nodepath.dirname(path);
            if (await this.filetype(parent) === 'none') {
                this.mkdir(parent);
            }
            let fh = await this.nodefs.open(path, 'r+');
            try {
                let r = await fh.write(buf, 0, buf.byteLength, offset);
                return r.bytesWritten;
            }
            finally {
                fh.close();
            }
        }
        async stat(path) {
            path = this.pathConvert(path);
            return this.nodefs.stat(path);
        }
        async truncate(path, newSize) {
            path = this.pathConvert(path);
            await this.nodefs.truncate(path, newSize);
        }
    }
    exports.NodeSimpleFileSystem = NodeSimpleFileSystem;
    class DirAsRootFS {
        constructor(fs, rootDir) {
            this.fs = fs;
            this.rootDir = rootDir;
        }
        async ensureInited() {
            return await this.fs.ensureInited();
        }
        pConvertPath(path) {
            if (path.startsWith('/')) {
                return this.rootDir + path.substring(1);
            }
            else {
                return this.rootDir + path;
            }
        }
        async writeAll(path, data) {
            return this.fs.writeAll(this.pConvertPath(path), data);
        }
        async readAll(path) {
            return this.fs.readAll(this.pConvertPath(path));
        }
        async read(path, offset, buf) {
            return this.fs.read(this.pConvertPath(path), offset, buf);
        }
        async write(path, offset, buf) {
            return this.fs.write(this.pConvertPath(path), offset, buf);
        }
        async delete2(path) {
            return this.fs.delete2(this.pConvertPath(path));
        }
        async listdir(path) {
            return this.fs.listdir(this.pConvertPath(path));
        }
        async filetype(path) {
            return this.fs.filetype(this.pConvertPath(path));
        }
        async mkdir(path) {
            return this.fs.mkdir(this.pConvertPath(path));
        }
        async rename(path, newPath) {
            return this.fs.rename(this.pConvertPath(path), this.pConvertPath(newPath));
        }
        async dataDir() {
            return '';
        }
        async stat(path) {
            return this.fs.stat(this.pConvertPath(path));
        }
        async truncate(path, newSize) {
            return this.fs.truncate(this.pConvertPath(path), newSize);
        }
    }
    exports.DirAsRootFS = DirAsRootFS;
    class SimpleFileSystemDataSource {
        constructor(fs, path) {
            this.fs = fs;
            this.path = path;
            this.readPos = 0;
            this.readBuffer = new Uint8Array(64 * 1024);
        }
        async pull(controller) {
            let bytesRead = await this.fs.read(this.path, this.readPos, this.readBuffer);
            if (bytesRead == 0) {
                controller.close();
                return;
            }
            this.readPos += bytesRead;
            controller.enqueue(this.readBuffer.slice(0, bytesRead));
        }
    }
    function getFileSystemReadableStream(fs, path, initialSeek) {
        let dataSource = new SimpleFileSystemDataSource(fs, path);
        if (initialSeek != undefined)
            dataSource.readPos = initialSeek;
        return new ReadableStream(dataSource);
    }
    class SimpleFileSystemDataSink {
        constructor(fs, path) {
            this.fs = fs;
            this.path = path;
            this.writePos = 0;
        }
        async write(chunk, controller) {
            await this.fs.write(this.path, this.writePos, chunk);
        }
    }
    function getFileSysteWritableStream(fs, path, initialSeek) {
        let dataSink = new SimpleFileSystemDataSink(fs, path);
        if (initialSeek != undefined)
            dataSink.writePos = initialSeek;
        return new WritableStream(dataSink);
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
        let { CustomFunctionParameterCompletionSymbol, importNameCompletion, makeFunctionCompletionWithFilePathArg0 } = (await new Promise((resolve_6, reject_6) => { require(['./Inspector'], resolve_6, reject_6); }));
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
        if (_ENV.fs.simple != undefined) {
            _ENV.fs.simple.readAll[CustomFunctionParameterCompletionSymbol] = makeFunctionCompletionWithFilePathArg0(undefined);
            _ENV.fs.simple.writeAll[CustomFunctionParameterCompletionSymbol] = makeFunctionCompletionWithFilePathArg0(undefined);
            _ENV.fs.simple.listdir[CustomFunctionParameterCompletionSymbol] = makeFunctionCompletionWithFilePathArg0(undefined);
            _ENV.fs.simple.filetype[CustomFunctionParameterCompletionSymbol] = makeFunctionCompletionWithFilePathArg0(undefined);
            _ENV.fs.simple.delete2[CustomFunctionParameterCompletionSymbol] = makeFunctionCompletionWithFilePathArg0(undefined);
        }
        _ENV.globalThis = globalThis;
    }
});
//# sourceMappingURL=JsEnviron.js.map