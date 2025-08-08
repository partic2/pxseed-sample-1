define(["require", "exports", "partic2/jsutils1/base", "os", "path", "fs/promises", "child_process", "./nodeio", "net"], function (require, exports, base_1, os_1, path_1, promises_1, child_process_1, nodeio_1, net_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.tjsFrom = tjsFrom;
    let tjsImpl = null;
    async function tjsFrom() {
        if (tjsImpl != null) {
            return tjsImpl;
        }
        let platform = os_1.default.platform();
        async function realpath(path) {
            return await promises_1.default.realpath(path);
        }
        /**
        * Removes the given file.
        *
        * @param path Path to be removed.
        */
        async function unlink(path) {
            return await promises_1.default.unlink(path);
        }
        /**
        * Renames the given path.
        *
        * @param path Current path.
        * @param newPath New desired path name.
        */
        async function rename(path, newPath) {
            return await promises_1.default.rename(path, newPath);
        }
        /**
        * Create a unique temporary file. The given template must end in XXXXXX, and the Xs will
        * be replaced to provide a unique file name. The returned object is an open file handle.Handle
        *
        * @param template Template for the file name.
        */
        async function mkstemp(template) {
            let tmpdir = os_1.default.tmpdir();
            let rpath = path_1.default.join(tmpdir, template).replace(/XXXXXX$/, (0, base_1.GenerateRandomString)().substring(4, 10));
            let fh = new FileHandle(await promises_1.default.open(rpath), rpath);
            return fh;
        }
        class FileHandle {
            /**
            * path: The file path.
            */
            constructor(nodeFh, path) {
                this.nodeFh = nodeFh;
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
                let result = await this.nodeFh.read(Buffer.from(buffer.buffer, buffer.byteOffset, buffer.byteLength), offset);
                if (result.bytesRead == 0) {
                    return null;
                }
                else {
                    return result.bytesRead;
                }
            }
            /**
            * Writes data from the given buffer at the given file offset. Returns
            * the amount of data written.
            *
            * @param buffer Buffer to write.
            * @param offset Offset in the file to write to.
            */
            async write(buffer, offset) {
                let result = await this.nodeFh.write(Buffer.from(buffer.buffer, buffer.byteOffset, buffer.byteLength), offset);
                return result.bytesWritten;
            }
            /**
            * Closes the file.
            */
            async close() {
                await this.nodeFh.close();
            }
            /**
            * Get the file status information.
            * See [stat(2)](https://man7.org/linux/man-pages/man2/lstat.2.html)
            */
            async stat() {
                return stat(this.path);
            }
            /**
            * Truncates the file to the given length.
            *
            * @param offset Length to truncate the file to.
            */
            async truncate(offset) {
                this.nodeFh.truncate(offset);
            }
        }
        /**
        * Gets file status information.
        * See [stat(2)](https://man7.org/linux/man-pages/man2/stat.2.html)
        *
        * @param path Path to the file.
        */
        async function stat(path) {
            let statResult = await promises_1.default.stat(path);
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
                size: statResult.size,
                atim: statResult.atime,
                mtim: statResult.mtime,
                ctim: statResult.ctime,
                birthtim: statResult.birthtime,
                isBlockDevice: false,
                isCharacterDevice: false,
                isFIFO: false,
                isSocket: false,
                isSymbolicLink: false,
                isDirectory: statResult.isDirectory(),
                isFile: statResult.isFile()
            };
            return r;
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
            return new FileHandle(await promises_1.default.open(path, flags, mode), path);
        }
        /**
        * Removes the directory at the given path.
        *
        * @param path Directory path.
        */
        async function rmdir(path) {
            await promises_1.default.rmdir(path);
        }
        /**
        * Create a directory at the given path.
        *
        * @param path The path to of the directory to be created.
        * @param options Options for making the directory.
        */
        async function mkdir(path, options) {
            await promises_1.default.mkdir(path, { recursive: true });
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
            await promises_1.default.copyFile(path, newPath);
        }
        /**
        * Open the directory at the given path in order to navigate its content.
        * See [readdir(3)](https://man7.org/linux/man-pages/man3/readdir.3.html)
        *
        * @param path Path to the directory.
        */
        async function readdir(path) {
            let children = await promises_1.default.readdir(path, { withFileTypes: true });
            let t1 = {
                close: async () => { }, path,
                __iter: async function* () {
                    for (let ch of children) {
                        yield { isFile: ch.isFile(), isDirectory: ch.isDirectory(), name: ch.name };
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
        /**
         * Recursively delete files and directories at the given path.
         * Equivalent to POSIX "rm -rf".
         *
         * @param path Path to be removed.
         */
        async function rm(path) {
            await promises_1.default.rm(path, { recursive: true });
        }
        class Process {
            constructor(args, options) {
                this.args = args;
                this.options = options;
                this.pid = -1;
                if (typeof args === 'string') {
                    args = [args];
                }
                this.nodeProcess = child_process_1.default.spawn(args[0], args.slice(1), {
                    stdio: 'pipe'
                });
                if (this.options != undefined) {
                    if ((this.options.stdin ?? 'ignore') === 'pipe') {
                        this.stdin = {
                            write: (buf) => new Promise((resolve, reject) => {
                                this.nodeProcess.stdin.write(buf, (err) => {
                                    if (err != null) {
                                        reject(err);
                                    }
                                    else {
                                        resolve(buf.length);
                                    }
                                });
                            })
                        };
                    }
                    if ((this.options.stdout ?? 'ignore') === 'pipe') {
                        this.stdout = (0, nodeio_1.wrapReadable)(this.nodeProcess.stdout);
                    }
                    if ((this.options.stderr ?? 'ignore') === 'pipe') {
                        this.stderr = (0, nodeio_1.wrapReadable)(this.nodeProcess.stderr);
                    }
                }
                this.pid = this.nodeProcess.pid ?? -1;
            }
            kill() {
                throw new Error('Not implemented');
            }
            async wait() {
                return new Promise((resolve, reject) => {
                    this.nodeProcess.on('exit', (code) => {
                        resolve({
                            exit_status: code ?? -1,
                            term_signal: null
                        });
                    });
                });
            }
        }
        function spawn(args, options) {
            let p = new Process(args, options);
            return p;
        }
        var dataDir = base_1.requirejs.getConfig().wwwroot;
        function homedir() {
            return dataDir;
        }
        class NodeConnection {
            read(buf) {
                return this.rawR.read(buf);
            }
            write(buf) {
                return this.rawW.write(buf);
            }
            setKeepAlive(enable, delay) {
                this.sock.setKeepAlive(enable, delay);
            }
            setNoDelay(enable) {
                this.sock.setNoDelay(enable);
            }
            shutdown() {
                this.close();
            }
            close() {
                this.sock.end();
            }
            constructor(sock) {
                this.sock = sock;
                this.localAddress = { family: 0, ip: '', port: 0 };
                this.remoteAddress = { family: 0, ip: '', port: 0 };
                //Diabled until concurrent read/write issue is solved.
                this.readable = undefined;
                this.writable = undefined;
                this.rawR = (0, nodeio_1.wrapReadable)(sock);
                this.rawW = {
                    write: (buf) => {
                        return new Promise((resolve, reject) => {
                            sock.write(buf, (err) => {
                                if (err != null) {
                                    reject(err);
                                }
                                else {
                                    resolve(buf.byteLength);
                                }
                            });
                        });
                    },
                };
                this.localAddress.ip = sock.localAddress;
                this.localAddress.port = sock.localPort;
                this.remoteAddress.ip = sock.localAddress;
                this.remoteAddress.port = sock.remotePort;
            }
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
                let soc = new net_1.Socket();
                let r = new NodeConnection(soc);
                let p = new Promise((resolve, reject) => {
                    //XXX:should we remove listener?
                    soc.once('connect', resolve);
                    soc.once('error', reject);
                });
                soc.connect({ host: host, port: Number(port ?? 0) });
                await p;
                return r;
            }
            else if (transport == 'pipe') {
                let soc = new net_1.Socket();
                let r = new NodeConnection(soc);
                let p = new Promise((resolve, reject) => {
                    //XXX:should we remove listener?
                    soc.once('connect', resolve);
                    soc.once('error', reject);
                });
                soc.connect({ path: host });
                await p;
                return r;
            }
            else {
                throw new Error('Not implemented');
            }
        }
        class NodeListener {
            constructor(ssoc) {
                this.ssoc = ssoc;
                this.sockQueue = new base_1.ArrayWrap2();
                this.localAddress = { family: 0, ip: '', port: 0 };
                ssoc.on('connection', (soc) => {
                    this.sockQueue.queueSignalPush(soc);
                });
                let addr = ssoc.address();
                if (typeof addr == 'string') {
                    this.localAddress.ip = addr;
                }
                else if (addr != undefined) {
                    this.localAddress.ip = addr.address;
                    this.localAddress.port = addr.port;
                }
            }
            ;
            async accept() {
                let sock = await this.sockQueue.queueBlockShift();
                return new NodeConnection(sock);
            }
            close() {
                this.ssoc.close();
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
                let serv = new net_1.Server();
                serv.listen({
                    host: host, port: Number(port ?? 0)
                });
                return new NodeListener(serv);
            }
            else if (transport == 'udp') {
                let serv = new net_1.Server();
                serv.listen({
                    path: host
                });
                return new NodeListener(serv);
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
            __impl__: 'partic2/nodehelper/tjsadapt'
        };
        tjsImpl = tjsi;
        return tjsImpl;
    }
});
//# sourceMappingURL=tjsadapt.js.map