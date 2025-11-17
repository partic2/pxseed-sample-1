define(["require", "exports", "pxprpc/extend", "./tjsbuilder", "partic2/jsutils1/webutils"], function (require, exports, extend_1, tjsbuilder_1, webutils_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.inited = void 0;
    exports.inited = (async function () {
        let tjs = await (0, tjsbuilder_1.buildTjs)();
        extend_1.defaultFuncMap['JseHelper.JseIo.realpath'] = new extend_1.RpcExtendServerCallable(async (path) => tjs.realPath(path)).typedecl('s->s');
        extend_1.defaultFuncMap['JseHelper.JseIo.unlink'] = new extend_1.RpcExtendServerCallable(async (path) => tjs.remove(path)).typedecl('s->');
        extend_1.defaultFuncMap['JseHelper.JseIo.rename'] = new extend_1.RpcExtendServerCallable(async (path, newPath) => tjs.rename(path, newPath)).typedecl('ss->');
        extend_1.defaultFuncMap['JseHelper.JseIo.mkstemp'] = new extend_1.RpcExtendServerCallable(async (template) => tjs.makeTempFile(template)).typedecl('s->os');
        extend_1.defaultFuncMap['JseHelper.JseIo.fhRead'] = new extend_1.RpcExtendServerCallable(async (fh, offset, len) => {
            let buf = new Uint8Array(len);
            let readResult = (await fh.read(buf, Number(offset))) ?? 0;
            return new Uint8Array(buf.buffer, 0, readResult);
        }).typedecl('oli->b');
        extend_1.defaultFuncMap['JseHelper.JseIo.fhWrite'] = new extend_1.RpcExtendServerCallable(async (fh, offset, buf) => {
            let writeResult = await fh.write(buf, Number(offset));
            return writeResult;
        }).typedecl('olb->i');
        extend_1.defaultFuncMap['JseHelper.JseIo.fhClose'] = new extend_1.RpcExtendServerCallable(async (fh) => fh.close()).typedecl('o->');
        extend_1.defaultFuncMap['JseHelper.JseIo.fhTruncate'] = new extend_1.RpcExtendServerCallable(async (fh, offset) => fh.truncate(Number(offset))).typedecl('sl->');
        extend_1.defaultFuncMap['JseHelper.JseIo.stat'] = new extend_1.RpcExtendServerCallable(async (path) => {
            let fileStat = await tjs.stat(path);
            let type = 'unknown';
            if (fileStat.isFile)
                type = 'file';
            if (fileStat.isDirectory)
                type = 'dir';
            return [type, BigInt(fileStat.size), BigInt(fileStat.mtim.getTime())];
        }).typedecl('s->sll');
        extend_1.defaultFuncMap['JseHelper.JseIo.open'] = new extend_1.RpcExtendServerCallable(async (path, flag, mode) => {
            //ignore mode, at least now
            return tjs.open(path, flag);
        }).typedecl('ssi->o');
        extend_1.defaultFuncMap['JseHelper.JseIo.rmdir'] = new extend_1.RpcExtendServerCallable(async (path) => tjs.remove(path)).typedecl('s->');
        extend_1.defaultFuncMap['JseHelper.JseIo.mkdir'] = new extend_1.RpcExtendServerCallable(async (path) => tjs.makeDir(path, { recursive: true })).typedecl('s->');
        extend_1.defaultFuncMap['JseHelper.JseIo.copyFile'] = new extend_1.RpcExtendServerCallable(async (path, newPath) => tjs.copyFile(path, newPath)).typedecl('ss->');
        extend_1.defaultFuncMap['JseHelper.JseIo.readdir'] = new extend_1.RpcExtendServerCallable(async (path) => {
            let ser = new extend_1.TableSerializer().setColumnsInfo(null, ['name', 'type', 'size', 'mtime']);
            for await (let f of await tjs.readDir(path)) {
                try {
                    let fileStat = await tjs.stat(path + '/' + f.name);
                    let type = 'unknwon';
                    if (fileStat.isDirectory)
                        type = 'dir';
                    if (fileStat.isFile)
                        type = 'file';
                    ser.addRow([f.name, type, BigInt(fileStat.size), BigInt(fileStat.mtim.getTime())]);
                }
                catch (e) { }
            }
            return ser.build();
        }).typedecl('s->b');
        extend_1.defaultFuncMap['JseHelper.JseIo.rm'] = new extend_1.RpcExtendServerCallable(async (path) => tjs.remove(path)).typedecl('s->');
        extend_1.defaultFuncMap['JseHelper.JseIo.execCommand'] = new extend_1.RpcExtendServerCallable(async (command) => {
            let args = [];
            for (let t1 = 0; t1 < command.length; t1++) {
                let part = '';
                let inQuote = false;
                let ch = command.charAt(t1);
                if (ch == '"') {
                    inQuote = !inQuote;
                }
                else {
                    if (ch == ' ' && part !== '' && !inQuote) {
                        args.push(part);
                        part = '';
                    }
                    else {
                        part += ch;
                    }
                }
            }
            let proc = tjs.spawn(args, { stdin: 'pipe', stdout: 'pipe', stderr: 'pipe' });
            return proc;
        }).typedecl('s->o');
        extend_1.defaultFuncMap['JseHelper.JseIo.processWait'] = new extend_1.RpcExtendServerCallable(async (proc) => {
            let exitStat = await proc.wait();
            return exitStat.exit_status;
        }).typedecl('o->i');
        extend_1.defaultFuncMap['JseHelper.JseIo.processIsAlive'] = new extend_1.RpcExtendServerCallable(async (proc) => {
            throw new Error('Not implemented');
        }).typedecl('o->c');
        extend_1.defaultFuncMap['JseHelper.JseIo.processStdio'] = new extend_1.RpcExtendServerCallable(async (proc, in2, out2, err2) => {
            return [
                in2 ? proc.stdin : null,
                out2 ? proc.stdout : null,
                err2 ? proc.stderr : null
            ];
        }).typedecl('occc->ooo');
        extend_1.defaultFuncMap['JseHelper.JseIo.inputRead'] = new extend_1.RpcExtendServerCallable(async (in2, len) => {
            let buf = new Uint8Array(len);
            let readLen = (await in2.read(buf)) ?? 0;
            let buf2 = new Uint8Array(buf.buffer, 0, readLen);
            return buf2;
        }).typedecl('oi->b');
        extend_1.defaultFuncMap['JseHelper.JseIo.outputWrite'] = new extend_1.RpcExtendServerCallable(async (out2, data) => out2.write(data)).typedecl('ob->i');
        extend_1.defaultFuncMap['JseHelper.JseIo.tcpConnect'] = new extend_1.RpcExtendServerCallable(async (host, port) => tjs.connect('tcp', host, port)).typedecl('si->o');
        extend_1.defaultFuncMap['JseHelper.JseIo.tcpStreams'] = new extend_1.RpcExtendServerCallable(async (soc) => {
            return [{ read: soc.read.bind(soc) }, { write: soc.write.bind(soc) }];
        }).typedecl('o->oo');
        extend_1.defaultFuncMap['JseHelper.JseIo.tcpListen'] = new extend_1.RpcExtendServerCallable(async (host, port) => {
            let listener = await tjs.listen('tcp', host, port);
            return listener;
        }).typedecl('si->o');
        extend_1.defaultFuncMap['JseHelper.JseIo.tcpAccept'] = new extend_1.RpcExtendServerCallable(async (serv) => {
            return await serv.accept();
        }).typedecl('o->o');
        extend_1.defaultFuncMap['JseHelper.JseIo.platform'] = new extend_1.RpcExtendServerCallable(async () => {
            return tjs.system.platform;
        }).typedecl('->s');
        extend_1.defaultFuncMap['JseHelper.JseIo.getDataDir'] = new extend_1.RpcExtendServerCallable(async () => {
            return webutils_1.path.join((0, webutils_1.getWWWRoot)().replace(/\\/g, '/'), '..');
        }).typedecl('->s');
    })();
});
//# sourceMappingURL=jseiorpcserver.js.map