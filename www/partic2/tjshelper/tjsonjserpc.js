//Implement tjs base on pxprpc
define(["require", "exports", "pxprpc/extend", "partic2/pxprpcBinding/JseHelper__JseIo", "partic2/jsutils1/base"], function (require, exports, extend_1, JseHelper__JseIo_1, base_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.tjsFrom = tjsFrom;
    exports.setup = setup;
    let tjsImpl = Symbol('tjs implemention');
    async function tjsFrom(remote) {
        var jseio;
        if (remote instanceof JseHelper__JseIo_1.Invoker) {
            jseio = remote;
        }
        else {
            jseio = new JseHelper__JseIo_1.Invoker();
            await jseio.useClient(remote);
        }
        if (tjsImpl in jseio) {
            return jseio[tjsImpl];
        }
        let platform = await jseio.platform();
        async function realpath(path) {
            return jseio.realpath(path);
        }
        /**
        * Removes the given file.
        *
        * @param path Path to be removed.
        */
        async function unlink(path) {
            return jseio.unlink(path);
        }
        /**
        * Renames the given path.
        *
        * @param path Current path.
        * @param newPath New desired path name.
        */
        async function rename(path, newPath) {
            return await jseio.rename(path, newPath);
        }
        /**
        * Create a unique temporary file. The given template must end in XXXXXX, and the Xs will
        * be replaced to provide a unique file name. The returned object is an open file handle.Handle
        *
        * @param template Template for the file name.
        */
        async function mkstemp(template) {
            return new FileHandle(...await jseio.mkstemp(template));
        }
        class FileHandle {
            /**
            * path: The file path.
            */
            constructor(remoteHandler, path) {
                this.remoteHandler = remoteHandler;
                this.path = path;
            }
            /**
            * Reads data into the given buffer at the given file offset. Returns
            * the amount of read data or null for EOF.
            *
            * @param buffer Buffer to read data into.
            * @param offset Offset in the file to read from.
            */
            async read(buffer, offset) {
                offset = offset ?? 0;
                let r = await jseio.fhRead(this.remoteHandler, BigInt(offset), buffer.length);
                if (r.byteLength == 0) {
                    return null;
                }
                buffer.set(r);
                return r.byteLength;
            }
            /**
            * Writes data from the given buffer at the given file offset. Returns
            * the amount of data written.
            *
            * @param buffer Buffer to write.
            * @param offset Offset in the file to write to.
            */
            async write(buffer, offset) {
                offset = offset ?? 0;
                let r = await jseio.fhWrite(this.remoteHandler, BigInt(offset), buffer);
                return r;
            }
            /**
            * Closes the file.
            */
            async close() {
                await this.remoteHandler.free();
            }
            /**
            * Get the file status information.
            * See [stat(2)](https://man7.org/linux/man-pages/man2/lstat.2.html)
            */
            async stat() {
                return await stat(this.path);
            }
            /**
            * Truncates the file to the given length.
            *
            * @param offset Length to truncate the file to.
            */
            async truncate(offset) {
                offset = offset ?? 0;
                await jseio.fhTruncate(this.remoteHandler, BigInt(offset));
            }
        }
        /**
        * Gets file status information.
        * See [stat(2)](https://man7.org/linux/man-pages/man2/stat.2.html)
        *
        * @param path Path to the file.
        */
        async function stat(path) {
            try {
                let [type, size, mtime] = await jseio.stat(path);
                let r = {
                    dev: 0,
                    mode: 0o777,
                    nlink: 0,
                    uid: 0,
                    gid: 0,
                    rdev: 0,
                    ino: 0,
                    blksize: 0,
                    blocks: 0,
                    size: Number(size),
                    atim: new Date(Number(mtime)),
                    mtim: new Date(Number(mtime)),
                    ctim: new Date(Number(mtime)),
                    birthtim: new Date(Number(mtime)),
                    isBlockDevice: false,
                    isCharacterDevice: false,
                    isFIFO: false,
                    isSocket: false,
                    isSymbolicLink: false,
                    isDirectory: type === 'dir',
                    isFile: type === 'file'
                };
                return r;
            }
            catch (err) {
                if (err.message.includes('File not exists')) {
                    let err2 = new Error(err.message);
                    err2.code = 'ENOENT';
                    throw err2;
                }
                else {
                    throw err;
                }
            }
        }
        /**
        * Opens the file at the given path. Opening flags:
        *
        *   - r: open for reading
        *   - w: open for writing, truncating the file if it exists
        *   - x: open with exclusive creation, will fail if the file exists
        *   - a: open for writing, appending at the end if the file exists
        *   - +: open for updating (reading and writing)
        *
        * ```js
        * const f = await tjs.open('file.txt', 'r');
        * ```
        * @param path The path to the file to be opened.
        * @param flags Flags with which to open the file.
        * @param mode File mode bits applied if the file is created. Defaults to `0o666`.
        */
        async function open(path, flags, mode) {
            //not support yet
            mode = 0;
            return new FileHandle(await jseio.open(path, flags, mode), path);
        }
        /**
        * Removes the directory at the given path.
        *
        * @param path Directory path.
        */
        async function rmdir(path) {
            await jseio.rmdir(path);
        }
        /**
        * Create a directory at the given path.
        *
        * @param path The path to of the directory to be created.
        * @param options Options for making the directory.
        */
        async function mkdir(path, options) {
            await jseio.mkdir(path);
        }
        /**
        * Copies the source file into the target.
        *
        * If `COPYFILE_EXCL` is specified the operation will fail if the target exists.
        *
        * If `COPYFILE_FICLONE` is specified it will attempt to create a reflink. If
        * copy-on-write is not supported, a fallback copy mechanism is used.
        *
        * If `COPYFILE_FICLONE_FORCE` is specified it will attempt to create a reflink.
        * If copy-on-write is not supported, an error is thrown.
        *
        * @param path Source path.
        * @param newPath Target path.
        * @param flags Specify the mode for copying the file.
        */
        async function copyfile(path, newPath, flags) {
            jseio.copyFile(path, newPath);
        }
        /**
        * Open the directory at the given path in order to navigate its content.
        * See [readdir(3)](https://man7.org/linux/man-pages/man3/readdir.3.html)
        *
        * @param path Path to the directory.
        */
        async function readdir(path) {
            let children = new extend_1.TableSerializer().load(await jseio.readdir(path));
            let t1 = {
                close: async () => { }, path,
                __iter: async function* () {
                    let arr = children.toMapArray();
                    for (let row of arr) {
                        yield { isFile: row.type === 'file', isDirectory: row.type === 'dir', name: row.name };
                    }
                }(),
                next: function () {
                    return this.__iter.next();
                },
                return: function () { return this.__iter.return(); },
                throw: function (e) { return this.__iter.throw(e); },
                [Symbol.asyncIterator]: function () { return this; },
            };
            return t1;
        }
        /**
        * Reads the entire contents of a file.
        *
        * @param path File path.
        */
        async function readFile(path) {
            let fh = await open(path, 'r');
            try {
                let stat2 = await fh.stat();
                let offset = 0;
                let buf = new Uint8Array(stat2.size);
                let readLen = await fh.read(buf, offset);
                while (readLen != null) {
                    offset += readLen;
                    readLen = await fh.read(buf, offset);
                }
                return buf;
            }
            finally {
                await fh.close();
            }
        }
        class JseInputReader {
            constructor() {
                this.getHandler = new base_1.future();
            }
            async read(buf) {
                let handler = await this.getHandler.get();
                let buf2 = await jseio.inputRead(handler, buf.length);
                if (buf2.byteLength === 0) {
                    return null;
                }
                buf.set(new Uint8Array(buf2), 0);
                return buf2.byteLength;
            }
        }
        class JseOutputWriter {
            constructor() {
                this.getHandler = new base_1.future();
            }
            async write(buf) {
                let handler = await this.getHandler.get();
                await jseio.outputWrite(handler, buf);
                return buf.length;
            }
        }
        /**
         * Recursively delete files and directories at the given path.
         * Equivalent to POSIX "rm -rf".
         *
         * @param path Path to be removed.
         */
        async function rm(path) {
            await jseio.rm(path);
        }
        class Process {
            constructor(args, options) {
                this.args = args;
                this.options = options;
                this.getHandler = new base_1.future();
                this.cmd = '';
                this.pid = -1;
                if (typeof this.args === 'string') {
                    this.cmd = this.args;
                }
                else {
                    //easy but not complete
                    this.cmd = this.args.map(v => `"${v}"`).join(' ');
                }
                if (this.options != undefined) {
                    if ((this.options.stdin ?? 'ignore') === 'pipe') {
                        this.stdin = new JseOutputWriter();
                    }
                    if ((this.options.stdout ?? 'ignore') === 'pipe') {
                        this.stdout = new JseInputReader();
                    }
                    if ((this.options.stderr ?? 'ignore') === 'pipe') {
                        this.stderr = new JseInputReader();
                    }
                }
                this._init();
            }
            kill() {
                throw new Error('Not implemented');
            }
            async wait() {
                let exit_status = await jseio.processWait(await this.getHandler.get());
                return { exit_status, term_signal: null };
            }
            async _init() {
                this.getHandler.setResult(await jseio.execCommand(this.cmd));
                let [sin, sout, serr] = await jseio.processStdio(await this.getHandler.get(), this.stdin !== null, this.stdout !== null, this.stderr !== null);
                if (sin != null)
                    this.stdin.getHandler.setResult(sin);
                if (sout != null)
                    this.stdout.getHandler.setResult(sout);
                if (serr != null)
                    this.stderr.getHandler.setResult(serr);
            }
        }
        function spawn(args, options) {
            let p = new Process(args, options);
            return p;
        }
        var dataDir = await jseio.getDataDir();
        function homedir() {
            return dataDir;
        }
        class JseConnection {
            read(buf) {
                return this.rawR.read(buf);
            }
            write(buf) {
                return this.rawW.write(buf);
            }
            setKeepAlive(enable, delay) {
                throw new Error("Method not implemented.");
            }
            setNoDelay(enable) {
                throw new Error("Method not implemented.");
            }
            shutdown() {
                this.close();
            }
            close() {
                if (this.rawR.getHandler.done) {
                    this.rawR.getHandler.result.free();
                }
                if (this.rawW.getHandler.done) {
                    this.rawW.getHandler.result.free();
                }
                this.rpcHandle.free();
            }
            constructor(rpcHandle) {
                this.rpcHandle = rpcHandle;
                this.rawR = new JseInputReader();
                this.rawW = new JseOutputWriter();
                this.localAddress = { family: 0, ip: '', port: 0 };
                this.remoteAddress = { family: 0, ip: '', port: 0 };
                //Diabled until concurrent read/write issue is solved.
                this.readable = undefined;
                this.writable = undefined;
            }
        }
        async function JseConnectionFromJseRpcSocket(soc) {
            let [in2, out2] = await jseio.tcpStreams(soc);
            let r = new JseConnection(soc);
            r.rawR.getHandler.setResult(in2);
            r.rawW.getHandler.setResult(out2);
            return r;
        }
        /**
        * Creates a connection to the target host + port over the selected transport.
        *
        * @param transport Type of transport for the connection.
        * @param host Hostname for the connection. Basic lookup using {@link lookup} will be performed.
        * @param port Destination port (where applicable).
        * @param options Extra connection options.
        */
        async function connect(transport, host, port, options) {
            if (transport == 'tcp') {
                let soc = await jseio.tcpConnect(host, Number(port ?? 0));
                let r = await JseConnectionFromJseRpcSocket(soc);
                return r;
            }
            else {
                throw new Error('Not implemented');
            }
        }
        class JseIoListener {
            constructor(ssoc) {
                this.ssoc = ssoc;
                this.localAddress = { family: 0, ip: '', port: 0 };
            }
            ;
            async accept() {
                let soc = await jseio.tcpAccept(this.ssoc);
                let r = JseConnectionFromJseRpcSocket(soc);
                return r;
            }
            close() {
                this.ssoc.free();
            }
            [Symbol.asyncIterator]() {
                throw new Error("Method not implemented.");
            }
        }
        /**
        * Listens for incoming connections on the selected transport.
        *
        * @param transport Transport type.
        * @param host Hostname for listening on.
        * @param port Listening port (where applicable).
        * @param options Extra listen options.
        */
        async function listen(transport, host, port, options) {
            if (transport == 'tcp') {
                return new JseIoListener(await jseio.tcpListen(host, Number(port ?? 0)));
            }
            else {
                throw new Error('Not implemented');
            }
        }
        let tjsi = {
            realpath, unlink, rename, mkstemp, stat, open, rmdir, copyfile, mkdir, readdir, readFile, rm, spawn, homedir, platform,
            realPath: realpath,
            remove: rm,
            homeDir: dataDir,
            makeDir: mkdir,
            readDir: readdir,
            system: { platform: platform },
            listen, connect,
            __impl__: 'partic2/tjshelper/tjsonjserpc'
        };
        jseio[tjsImpl] = tjsi;
        return tjsi;
    }
    async function setup(tjsObject) {
        if (tjsObject === undefined) {
            if (!('tjs' in globalThis)) {
                globalThis.tjs = {};
            }
            tjsObject = globalThis.tjs;
        }
        let jseio = await (0, JseHelper__JseIo_1.getDefault)();
        (0, base_1.copy)(await tjsFrom(jseio), tjsObject, 1);
    }
});
//# sourceMappingURL=tjsonjserpc.js.map