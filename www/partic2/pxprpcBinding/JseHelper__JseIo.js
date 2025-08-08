define(["require", "exports", "./pxprpc_config"], function (require, exports, pxprpc_config_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Invoker = void 0;
    exports.getDefault = getDefault;
    class Invoker {
        constructor() {
            this.RemoteName = 'JseHelper.JseIo';
            this.rpc__RemoteFuncs = {};
        }
        async useClient(client) {
            this.rpc__client = client;
            this.rpc__RemoteFuncs = client.__attached__JseHelper__JseIo;
            if (this.rpc__RemoteFuncs == undefined) {
                this.rpc__RemoteFuncs = {};
                client.__attached__JseHelper__JseIo = this.rpc__RemoteFuncs;
            }
        }
        async ensureFunc(name, typedecl) {
            let __v1 = this.rpc__RemoteFuncs[name];
            if (__v1 == undefined) {
                __v1 = await this.rpc__client.getFunc(this.RemoteName + '.' + name);
                this.rpc__RemoteFuncs[name] = __v1;
                __v1.typedecl(typedecl);
            }
            return __v1;
        }
        async realpath(path) {
            let __v1 = await this.ensureFunc('realpath', 's->s');
            let __v2 = await __v1.call(path);
            return __v2;
        }
        async unlink(path) {
            let __v1 = await this.ensureFunc('unlink', 's->');
            let __v2 = await __v1.call(path);
        }
        async rename(path, newPath) {
            let __v1 = await this.ensureFunc('rename', 'ss->');
            let __v2 = await __v1.call(path, newPath);
        }
        async close() {
            let __v1 = await this.ensureFunc('close', '->');
            let __v2 = await __v1.call();
        }
        async mkstemp(template) {
            let __v1 = await this.ensureFunc('mkstemp', 's->os');
            let __v2 = await __v1.call(template);
            return __v2;
        }
        async fhRead(f, offset, length) {
            let __v1 = await this.ensureFunc('fhRead', 'oli->b');
            let __v2 = await __v1.call(f, offset, length);
            return __v2;
        }
        async fhWrite(f, offset, buf) {
            let __v1 = await this.ensureFunc('fhWrite', 'olb->i');
            let __v2 = await __v1.call(f, offset, buf);
            return __v2;
        }
        async fhClose(f) {
            let __v1 = await this.ensureFunc('fhClose', 'o->');
            let __v2 = await __v1.call(f);
        }
        async fhTruncate(f, offset) {
            let __v1 = await this.ensureFunc('fhTruncate', 'ol->');
            let __v2 = await __v1.call(f, offset);
        }
        async stat(path) {
            let __v1 = await this.ensureFunc('stat', 's->sll');
            let __v2 = await __v1.call(path);
            return __v2;
        }
        async open(path, flag, mode) {
            let __v1 = await this.ensureFunc('open', 'ssi->o');
            let __v2 = await __v1.call(path, flag, mode);
            return __v2;
        }
        async rmdir(path) {
            let __v1 = await this.ensureFunc('rmdir', 's->');
            let __v2 = await __v1.call(path);
        }
        async mkdir(path) {
            let __v1 = await this.ensureFunc('mkdir', 's->');
            let __v2 = await __v1.call(path);
        }
        async copyFileRecursively(path, newPath) {
            let __v1 = await this.ensureFunc('copyFileRecursively', 'ss->');
            let __v2 = await __v1.call(path, newPath);
        }
        async copyFile(path, newPath) {
            let __v1 = await this.ensureFunc('copyFile', 'ss->');
            let __v2 = await __v1.call(path, newPath);
        }
        async readdir(path) {
            let __v1 = await this.ensureFunc('readdir', 's->b');
            let __v2 = await __v1.call(path);
            return __v2;
        }
        async rm(path) {
            let __v1 = await this.ensureFunc('rm', 's->');
            let __v2 = await __v1.call(path);
        }
        async execCommand(command) {
            let __v1 = await this.ensureFunc('execCommand', 's->o');
            let __v2 = await __v1.call(command);
            return __v2;
        }
        async processWait(proc) {
            let __v1 = await this.ensureFunc('processWait', 'o->i');
            let __v2 = await __v1.call(proc);
            return __v2;
        }
        async processIsAlive(proc) {
            let __v1 = await this.ensureFunc('processIsAlive', 'o->c');
            let __v2 = await __v1.call(proc);
            return __v2;
        }
        async processStdio(proc, in2, out, err) {
            let __v1 = await this.ensureFunc('processStdio', 'occc->ooo');
            let __v2 = await __v1.call(proc, in2, out, err);
            return __v2;
        }
        async inputRead(in2, len) {
            let __v1 = await this.ensureFunc('inputRead', 'oi->b');
            let __v2 = await __v1.call(in2, len);
            return __v2;
        }
        async outputWrite(out, buf) {
            let __v1 = await this.ensureFunc('outputWrite', 'ob->');
            let __v2 = await __v1.call(out, buf);
        }
        async getDataDir() {
            let __v1 = await this.ensureFunc('getDataDir', '->s');
            let __v2 = await __v1.call();
            return __v2;
        }
        async getProp(prop) {
            let __v1 = await this.ensureFunc('getProp', 's->s');
            let __v2 = await __v1.call(prop);
            return __v2;
        }
        async dumpPropNames() {
            let __v1 = await this.ensureFunc('dumpPropNames', '->s');
            let __v2 = await __v1.call();
            return __v2;
        }
        async tcpConnect(host, port) {
            let __v1 = await this.ensureFunc('tcpConnect', 'si->o');
            let __v2 = await __v1.call(host, port);
            return __v2;
        }
        async tcpStreams(soc) {
            let __v1 = await this.ensureFunc('tcpStreams', 'o->oo');
            let __v2 = await __v1.call(soc);
            return __v2;
        }
        async tcpListen(host, port) {
            let __v1 = await this.ensureFunc('tcpListen', 'si->o');
            let __v2 = await __v1.call(host, port);
            return __v2;
        }
        async tcpAccept(ss) {
            let __v1 = await this.ensureFunc('tcpAccept', 'o->o');
            let __v2 = await __v1.call(ss);
            return __v2;
        }
        async platform() {
            let __v1 = await this.ensureFunc('platform', '->s');
            let __v2 = await __v1.call();
            return __v2;
        }
    }
    exports.Invoker = Invoker;
    let defaultInvoker = null;
    async function getDefault() {
        if (defaultInvoker === null) {
            defaultInvoker = new Invoker();
            await defaultInvoker.useClient(await (0, pxprpc_config_1.getDefaultClient)());
        }
        return defaultInvoker;
    }
});
//# sourceMappingURL=JseHelper__JseIo.js.map