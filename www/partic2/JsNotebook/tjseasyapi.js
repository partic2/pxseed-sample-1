define(["require", "exports", "partic2/CodeRunner/jsutils2", "partic2/tjshelper/tjsbuilder", "partic2/tjshelper/tjsutil", "partic2/jsutils1/base", "partic2/jsutils1/base", "partic2/pxprpcClient/registry", "partic2/CodeRunner/CodeContext", "partic2/CodeRunner/JsEnviron", "partic2/jsutils1/webutils", "pxprpc/extend", "pxprpc/base"], function (require, exports, jsutils2_1, tjsbuilder_1, tjsutil_1, base_1, base_2, registry_1, CodeContext_1, JsEnviron_1, webutils_1, extend_1, base_3) {
    "use strict";
    var _a;
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.files = exports.TjsUtilsProcess = void 0;
    exports.newTjsUtilsProcess = newTjsUtilsProcess;
    exports.then = then;
    class TjsUtilsProcess {
        constructor(tjsProc, args) {
            this.tjsProc = tjsProc;
            this.args = args;
            this[_a] = {};
            this.nextStdoutChunk = null;
            this.nextStderrChunk = null;
            this.stdin = new WritableStream(new tjsutil_1.TjsWriterDataSink(this.tjsProc.stdin));
            this.stdout = new ReadableStream(new tjsutil_1.TjsReaderDataSource(this.tjsProc.stdout));
            this.stderr = new ReadableStream(new tjsutil_1.TjsReaderDataSource(this.tjsProc.stderr));
        }
        async writeStdin(data) {
            if (typeof data == 'string') {
                data = (0, jsutils2_1.utf8conv)(data);
            }
            let w = this.stdin.getWriter();
            try {
                return w.write(data);
            }
            finally {
                w.releaseLock();
            }
        }
        async writeStdinUtf8(data) {
            return await this.writeStdin(data);
        }
        async readStdout() {
            if (this.nextStdoutChunk != null)
                return this.nextStdoutChunk.get();
            this.nextStdoutChunk = new base_2.future();
            let r = new jsutils2_1.ExtendStreamReader(this.stdout.getReader());
            try {
                let rr = await r.read();
                (0, base_1.assert)(!rr.done, 'EOF reached');
                this.nextStdoutChunk.setResult(rr.value);
                this.nextStdoutChunk = null;
                return rr.value;
            }
            catch (err) {
                this.nextStdoutChunk.setException(err);
                throw err;
            }
            finally {
                r.releaseLock();
            }
        }
        async readStdoutUtf8() {
            return (0, jsutils2_1.utf8conv)(await this.readStdout());
        }
        async readStderr() {
            if (this.nextStderrChunk != null)
                return this.nextStderrChunk.get();
            this.nextStderrChunk = new base_2.future();
            let r = new jsutils2_1.ExtendStreamReader(this.stderr.getReader());
            try {
                let rr = await r.read();
                (0, base_1.assert)(!rr.done, 'EOF reached');
                this.nextStderrChunk.setResult(rr.value);
                this.nextStderrChunk = null;
                return rr.value;
            }
            catch (err) {
                this.nextStderrChunk.setException(err);
                throw err;
            }
            finally {
                r.releaseLock();
            }
        }
        async readStderrUtf8() {
            return (0, jsutils2_1.utf8conv)(await this.readStderr());
        }
        async readAllOutputs() {
            let o = new jsutils2_1.ExtendStreamReader(this.stdout.getReader());
            let e = new jsutils2_1.ExtendStreamReader(this.stderr.getReader());
            try {
                return {
                    out: await o.readAll(),
                    err: await e.readAll()
                };
            }
            finally {
                e.releaseLock();
                e.releaseLock();
            }
        }
        async readAllOutputsInString() {
            let r = await this.readAllOutputs();
            return {
                out: (0, jsutils2_1.utf8conv)(r.out),
                err: (0, jsutils2_1.utf8conv)(r.err)
            };
        }
        async openInNotebookWebui(opt) {
            let env = CodeContext_1.TaskLocalEnv.get();
            if (env?.jsnotebook?.callFunctionInNotebookWebui != undefined) {
                let stdioSource = {
                    [registry_1.RpcSerializeMagicMark]: {},
                    readStdoutUtf8: this.readStdoutUtf8.bind(this),
                    readStderrUtf8: this.readStderrUtf8.bind(this),
                    writeStdinUtf8: this.writeStdinUtf8.bind(this),
                    close: this.kill.bind(this),
                    waitClosed: this.wait.bind(this),
                };
                if (opt?.forwardClose === false) {
                    stdioSource.close = async () => { };
                }
                env.jsnotebook.callFunctionInNotebookWebui('partic2/JsNotebook/fileviewer', 'openStdioConsoleWebui', [stdioSource, {
                        title: this.args.join(' ')
                    }]);
            }
        }
        async wait() {
            return this.tjsProc.wait();
        }
        async kill() {
            return this.tjsProc.kill();
        }
    }
    exports.TjsUtilsProcess = TjsUtilsProcess;
    _a = registry_1.RpcSerializeMagicMark;
    async function newTjsUtilsProcess(args, tjsImpl) {
        if (tjsImpl == undefined)
            tjsImpl = await (0, tjsbuilder_1.buildTjs)();
        return new TjsUtilsProcess(await tjsImpl.spawn(args, { stdin: 'pipe', stdout: 'pipe', stderr: 'pipe' }), args);
    }
    exports.files = {
        tjs: null,
        simple: null,
        initmtx: new base_1.mutex(),
        osPathSep: (0, webutils_1.getWWWRoot)().includes('\\') ? '\\' : '/',
        async init() {
            await this.initmtx.exec(async () => {
                if (this.tjs == null) {
                    this.tjs = await (0, tjsbuilder_1.buildTjs)();
                    let fs = new JsEnviron_1.TjsSfs();
                    fs.from(this.tjs);
                    await fs.ensureInited();
                    this.simple = fs;
                }
            });
        },
        async whichExecutable(name) {
            let tjsi = this.tjs;
            let path1 = tjsi.env.PATH;
            let pathsSep = path1.includes(';') ? ';' : ':';
            let path1List = path1.split(pathsSep);
            let found = null;
            for (let t1 of path1List) {
                try {
                    let t2 = t1 + this.osPathSep + name;
                    await tjsi.stat(t2);
                    found = t2;
                    break;
                }
                catch (err) { }
                ;
                try {
                    let t2 = t1 + this.osPathSep + name + '.exe';
                    await tjsi.stat(t2);
                    found = t2;
                    break;
                }
                catch (err) { }
                ;
            }
            return found;
        },
        pathJoin(...names) {
            return this.pathJoin2(names);
        },
        pathJoin2(names, sep) {
            let parts = [];
            for (let t1 of names) {
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
            let fullpath = parts.join(sep ?? this.osPathSep);
            return fullpath;
        },
        async copySingleFile(src, dest, opt) {
            opt = opt ?? {};
            if (opt.srcFs == undefined)
                opt.srcFs = this.simple;
            if (opt.destFs == undefined)
                opt.destFs = this.simple;
            await JsEnviron_1.simpleFileSystemHelper.copyFile(opt.srcFs, src, dest, opt.destFs);
        },
        async copyFileTree(srcDir, destDir, opt) {
            opt = opt ?? {};
            if (opt.srcFs == undefined)
                opt.srcFs = this.simple;
            if (opt.destFs == undefined)
                opt.destFs = this.simple;
            if (opt.ignore == undefined)
                opt.ignore = () => false;
            if (opt.maxDepth == undefined)
                opt.maxDepth = 1000;
            opt.confilctPolicy = opt.confilctPolicy ?? 'overwrite';
            await opt.destFs.mkdir(destDir);
            let children = await opt.srcFs.listdir(srcDir);
            for (let t1 of children) {
                if (opt.ignore(t1.name, [srcDir, t1.name].join('/'))) {
                    continue;
                }
                if (t1.type == 'dir') {
                    await this.copyFileTree([srcDir, t1.name].join('/'), [destDir, t1.name].join('/'), { ...opt, maxDepth: opt.maxDepth - 1 });
                }
                else if (t1.type == 'file') {
                    let destPath = [destDir, t1.name].join('/');
                    let srcPath = [srcDir, t1.name].join('/');
                    let needCopy = false;
                    if (opt.confilctPolicy === 'most recent') {
                        try {
                            let dfile = await opt.destFs.stat(destPath);
                            let sfile2 = await opt.srcFs.stat(srcPath);
                            if (dfile.mtime < sfile2.mtime) {
                                needCopy = true;
                            }
                        }
                        catch (e) {
                            needCopy = true;
                        }
                    }
                    else if (opt.confilctPolicy === 'overwrite') {
                        needCopy = true;
                    }
                    else if (opt.confilctPolicy === 'skip') {
                        if (await opt.destFs.filetype(destPath) === 'none') {
                            needCopy = true;
                        }
                    }
                    else {
                        (0, base_1.assert)(false, 'Invalid parameter:opt.conflictPolicy');
                    }
                    if (needCopy) {
                        await this.copySingleFile(srcPath, destPath, opt);
                    }
                }
            }
        },
        async connectPxprpc(url) {
            let conn = await (0, registry_1.getConnectionFromUrl)(url);
            (0, base_1.assert)(conn != null);
            let rpc1 = await new extend_1.RpcExtendClient1(new base_3.Client(conn)).init();
            let { tjsFrom } = await new Promise((resolve_1, reject_1) => { require(['partic2/tjshelper/tjsonjserpc'], resolve_1, reject_1); });
            let sfs = new JsEnviron_1.TjsSfs().from(await tjsFrom(rpc1));
            await sfs.ensureInited();
            sfs.close = function () {
                rpc1.close();
            };
            return sfs;
        },
        async openFileBrowserInNotebook(fs, initdir) {
            let env = CodeContext_1.TaskLocalEnv.get();
            if (env?.jsnotebook?.callFunctionInNotebookWebui != undefined) {
                if (fs[registry_1.RpcSerializeMagicMark] == undefined) {
                    fs[registry_1.RpcSerializeMagicMark] = {};
                }
                env.jsnotebook.callFunctionInNotebookWebui('partic2/JsNotebook/filebrowser', 'openFileBrowserWindowForSimpleFileSystem', [{ fs, title: 'File browser', initdir }]);
            }
        }
    };
    async function then(resolve) {
        await exports.files.init();
        delete exports.then;
        resolve(exports);
    }
});
//# sourceMappingURL=tjseasyapi.js.map