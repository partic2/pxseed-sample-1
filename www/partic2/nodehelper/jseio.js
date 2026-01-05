define(["require", "exports", "pxprpc/extend", "fs/promises", "os", "net", "path", "child_process", "partic2/nodehelper/nodeio", "path"], function (require, exports, extend_1, fs, os, net, path_1, child_process_1, nodeio_1, path_2) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.setup = setup;
    class JseStreamWrap {
        constructor(r, w) {
            this.r = r;
            this.w = w;
        }
        ;
        tjsRead() {
            return (0, nodeio_1.wrapReadable)(this.r);
        }
        close() {
            if (this.r != undefined)
                this.r.destroy();
            if (this.w != undefined)
                this.w?.destroy();
        }
    }
    function setup() {
        extend_1.defaultFuncMap['JseHelper.JseIo.realpath'] = new extend_1.RpcExtendServerCallable(async (path) => fs.realpath(path)).typedecl('s->s');
        extend_1.defaultFuncMap['JseHelper.JseIo.unlink'] = new extend_1.RpcExtendServerCallable(async (path) => fs.unlink(path)).typedecl('s->');
        extend_1.defaultFuncMap['JseHelper.JseIo.rename'] = new extend_1.RpcExtendServerCallable(async (path, newPath) => fs.rename(path, newPath)).typedecl('ss->');
        extend_1.defaultFuncMap['JseHelper.JseIo.mkstemp'] = new extend_1.RpcExtendServerCallable(async (template) => {
            //simple implement, not correctly
            let prefix = "";
            for (let i = template.length; i >= 0; i--) {
                if (template.charAt(i) != 'X') {
                    prefix = template.substring(0, i);
                    break;
                }
            }
            let tmppath = os.tmpdir() + fs.mkdtemp(prefix);
            let fh = await fs.open(tmppath);
            return [fh, tmppath];
        }).typedecl('s->os');
        extend_1.defaultFuncMap['JseHelper.JseIo.fhRead'] = new extend_1.RpcExtendServerCallable(async (fh, offset, len) => {
            let buf = Buffer.alloc(len);
            let readResult = await fh.read(buf, 0, len, Number(offset));
            return new Uint8Array(buf.buffer, 0, readResult.bytesRead);
        }).typedecl('oli->b');
        extend_1.defaultFuncMap['JseHelper.JseIo.fhWrite'] = new extend_1.RpcExtendServerCallable(async (fh, offset, buf) => {
            let writeResult = await fh.write(buf, 0, buf.byteLength, Number(offset));
            return writeResult.bytesWritten;
        }).typedecl('olb->i');
        extend_1.defaultFuncMap['JseHelper.JseIo.fhClose'] = new extend_1.RpcExtendServerCallable(async (fh) => fh.close()).typedecl('o->');
        extend_1.defaultFuncMap['JseHelper.JseIo.fhTruncate'] = new extend_1.RpcExtendServerCallable(async (fh, offset) => fh.truncate(Number(offset))).typedecl('sl->');
        extend_1.defaultFuncMap['JseHelper.JseIo.stat'] = new extend_1.RpcExtendServerCallable(async (path) => {
            let fileStat = await fs.stat(path);
            let type = 'unknown';
            if (fileStat.isFile())
                type = 'file';
            if (fileStat.isDirectory())
                type = 'dir';
            return [type, BigInt(fileStat.size), BigInt(fileStat.mtime.getTime())];
        }).typedecl('s->sll');
        extend_1.defaultFuncMap['JseHelper.JseIo.open'] = new extend_1.RpcExtendServerCallable(async (path, flag, mode) => {
            //ignore mode
            return fs.open(path, flag);
        }).typedecl('ssi->o');
        extend_1.defaultFuncMap['JseHelper.JseIo.rmdir'] = new extend_1.RpcExtendServerCallable(async (path) => fs.rmdir(path)).typedecl('s->');
        extend_1.defaultFuncMap['JseHelper.JseIo.mkdir'] = new extend_1.RpcExtendServerCallable(async (path) => fs.mkdir(path, { recursive: true })).typedecl('s->');
        extend_1.defaultFuncMap['JseHelper.JseIo.copyFile'] = new extend_1.RpcExtendServerCallable(async (path, newPath) => fs.cp(path, newPath, { recursive: true, force: true })).typedecl('ss->');
        extend_1.defaultFuncMap['JseHelper.JseIo.readdir'] = new extend_1.RpcExtendServerCallable(async (path) => {
            let ser = new extend_1.TableSerializer().setColumnsInfo(null, ['name', 'type', 'size', 'mtime']);
            for (let f of await fs.readdir(path)) {
                try {
                    let fileStat = await fs.stat(path + path_1.sep + f);
                    let type = 'unknwon';
                    if (fileStat.isDirectory())
                        type = 'dir';
                    if (fileStat.isFile())
                        type = 'file';
                    ser.addRow([f, type, BigInt(fileStat.size), BigInt(fileStat.mtime.getTime())]);
                }
                catch (e) { }
            }
            return ser.build();
        }).typedecl('s->b');
        extend_1.defaultFuncMap['JseHelper.JseIo.rm'] = new extend_1.RpcExtendServerCallable(async (path) => fs.rm(path, { recursive: true, force: true })).typedecl('s->');
        extend_1.defaultFuncMap['JseHelper.JseIo.execCommand'] = new extend_1.RpcExtendServerCallable(async (command) => {
            let proc = (0, child_process_1.spawn)(command, {
                stdio: 'pipe', shell: true
            });
            return proc;
        }).typedecl('s->o');
        extend_1.defaultFuncMap['JseHelper.JseIo.processWait'] = new extend_1.RpcExtendServerCallable(async (proc) => {
            if (proc.exitCode !== null) {
                return proc.exitCode;
            }
            else {
                return await new Promise((resolve) => {
                    proc.once('exit', (code) => resolve(code));
                });
            }
        }).typedecl('o->i');
        extend_1.defaultFuncMap['JseHelper.JseIo.processIsAlive'] = new extend_1.RpcExtendServerCallable(async (proc) => {
            return proc.exitCode == undefined;
        }).typedecl('o->c');
        extend_1.defaultFuncMap['JseHelper.JseIo.processStdio'] = new extend_1.RpcExtendServerCallable(async (proc, in2, out2, err2) => {
            return [
                in2 ? new JseStreamWrap(undefined, proc.stdin) : null,
                out2 ? new JseStreamWrap(proc.stdout) : null,
                err2 ? new JseStreamWrap(proc.stdout) : new JseStreamWrap(proc.stderr)
            ];
        }).typedecl('occc->ooo');
        extend_1.defaultFuncMap['JseHelper.JseIo.inputRead'] = new extend_1.RpcExtendServerCallable(async (in2, len) => {
            let buf = new Uint8Array(len);
            let readLen = await in2.tjsRead().read(buf, 0);
            if (readLen == null) {
                return new Uint8Array(0);
            }
            let buf2 = new Uint8Array(buf.buffer, buf.byteOffset, readLen);
            return buf2;
        }).typedecl('oi->b');
        extend_1.defaultFuncMap['JseHelper.JseIo.outputWrite'] = new extend_1.RpcExtendServerCallable(async (out2, data) => {
            return await new Promise((resolve, reject) => {
                out2.w.write(Buffer.from(data), (err) => {
                    if (err === null) {
                        resolve(data.byteLength);
                    }
                    else {
                        reject(err);
                    }
                });
            });
        }).typedecl('ob->i');
        extend_1.defaultFuncMap['JseHelper.JseIo.tcpConnect'] = new extend_1.RpcExtendServerCallable(async (host, port) => {
            return await new Promise((resolve, reject) => {
                let socket = net.connect(port, host);
                socket.once('connect', () => resolve(socket));
                socket.once('error', (e) => reject(e));
                socket.once('timeout', () => reject('connect timeout'));
            });
        }).typedecl('si->o');
        extend_1.defaultFuncMap['JseHelper.JseIo.tcpStreams'] = new extend_1.RpcExtendServerCallable(async (soc) => {
            return [new JseStreamWrap(soc), new JseStreamWrap(undefined, soc)];
        }).typedecl('o->oo');
        extend_1.defaultFuncMap['JseHelper.JseIo.tcpListen'] = new extend_1.RpcExtendServerCallable(async (host, port) => {
            return await new Promise((resolve, reject) => {
                let serv = net.createServer();
                serv.once('error', (e) => reject(e));
                serv.once('listening', () => resolve(serv));
                serv.listen(port, host, 8);
            });
        }).typedecl('si->o');
        extend_1.defaultFuncMap['JseHelper.JseIo.tcpAccept'] = new extend_1.RpcExtendServerCallable(async (serv) => {
            return await new Promise((resolve, reject) => {
                serv.once('connection', (soc) => resolve(soc));
            });
        }).typedecl('o->o');
        extend_1.defaultFuncMap['JseHelper.JseIo.platform'] = new extend_1.RpcExtendServerCallable(async (serv) => {
            let platform = os.platform();
            if (platform == 'win32')
                return 'windows';
            return platform;
        }).typedecl('->s');
        extend_1.defaultFuncMap['JseHelper.JseIo.getDataDir'] = new extend_1.RpcExtendServerCallable(async () => {
            //use the dirname(.../www)
            return (0, path_2.dirname)((0, path_2.dirname)((0, path_2.dirname)((0, path_2.dirname)(__filename))));
        }).typedecl('->s');
    }
});
//# sourceMappingURL=jseio.js.map