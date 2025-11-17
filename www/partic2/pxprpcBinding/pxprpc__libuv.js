define(["require", "exports", "partic2/pxprpcClient/registry", "pxprpc/base", "./rpcregistry"], function (require, exports, registry_1, base_1, rpcregistry_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.defaultInvoker = exports.Invoker = void 0;
    exports.ensureDefaultInvoker = ensureDefaultInvoker;
    class Invoker {
        constructor() {
            this.RemoteName = 'pxprpc_libuv';
            this.rpc__RemoteFuncs = {};
        }
        async useClient(client) {
            this.rpc__client = client;
            this.rpc__RemoteFuncs = {};
        }
        async ensureFunc(name, typedecl) {
            return await (0, registry_1.getRpcFunctionOn)(this.rpc__client, this.RemoteName + '.' + name, typedecl);
        }
        async fs_open(path, flag) {
            let __v1 = await this.ensureFunc('fs_open', 'ss->o');
            let __v2 = await __v1.call(path, flag);
            return __v2;
        }
        async fs_read(fh, size, offset) {
            let __v1 = await this.ensureFunc('fs_read', 'oil->b');
            let __v2 = await __v1.call(fh, size, offset);
            return __v2;
        }
        async fs_write(fh, offset, data) {
            let __v1 = await this.ensureFunc('fs_write', 'olb->i');
            let __v2 = await __v1.call(fh, offset, data);
            return __v2;
        }
        async fs_unlink(path) {
            let __v1 = await this.ensureFunc('fs_unlink', 's->');
            let __v2 = await __v1.call(path);
        }
        async fs_mkdir(path) {
            let __v1 = await this.ensureFunc('fs_mkdir', 's->');
            let __v2 = await __v1.call(path);
        }
        async fs_rmdir(path) {
            let __v1 = await this.ensureFunc('fs_rmdir', 's->');
            let __v2 = await __v1.call(path);
        }
        async fs_scandir(path) {
            let __v1 = await this.ensureFunc('fs_scandir', 's->b');
            let __v2 = await __v1.call(path);
            return __v2;
        }
        async fs_stat(path) {
            let __v1 = await this.ensureFunc('fs_stat', 's->b');
            let __v2 = await __v1.call(path);
            return __v2;
        }
        async fs_rename(path, newPath) {
            let __v1 = await this.ensureFunc('fs_rename', 'ss->');
            let __v2 = await __v1.call(path, newPath);
        }
        async fs_ftruncate(path, offset) {
            let __v1 = await this.ensureFunc('fs_ftruncate', 'sl->');
            let __v2 = await __v1.call(path, offset);
        }
        async fs_readlink(path, offset) {
            let __v1 = await this.ensureFunc('fs_readlink', 's->s');
            let __v2 = await __v1.call(path, offset);
            return __v2;
        }
        async fs_chmod(path, mode) {
            let __v1 = await this.ensureFunc('fs_chmod', 'si->');
            let __v2 = await __v1.call(path, mode);
        }
        async stream_read(stream) {
            let __v1 = await this.ensureFunc('stream_read', 'o->b');
            let __v2 = await __v1.call(stream);
            return __v2;
        }
        async stream_write(stream, data) {
            let __v1 = await this.ensureFunc('stream_write', 'ob->i');
            let __v2 = await __v1.call(stream, data);
            return __v2;
        }
        async stream_accept(stream) {
            let __v1 = await this.ensureFunc('stream_accept', 'o->o');
            let __v2 = await __v1.call(stream);
            return __v2;
        }
        async spawn(param) {
            let __v1 = await this.ensureFunc('spawn', 'b->o');
            let __v2 = await __v1.call(param);
            return __v2;
        }
        async spawnWrap(param) {
            if (param.fileName == undefined) {
                param.fileName = '';
            }
            ;
            if (param.cwd == undefined) {
                param.cwd = '';
            }
            ;
            if (param.envs == undefined) {
                param.envs = [];
            }
            ;
            let p2 = new base_1.Serializer().prepareSerializing(16);
            p2.putString(param.fileName).putString(param.cwd);
            p2.putInt(param.args.length);
            for (let t1 of param.args) {
                p2.putString(t1);
            }
            p2.putInt(param.envs.length);
            for (let t1 of param.envs) {
                p2.putString(t1);
            }
            return this.spawn(p2.build());
        }
        async process_stdio(proc, index) {
            let __v1 = await this.ensureFunc('process_stdio', 'oi->o');
            let __v2 = await __v1.call(proc, index);
            return __v2;
        }
        async process_get_result(proc, waitExit) {
            let __v1 = await this.ensureFunc('process_get_result', 'oc->cli');
            let __v2 = await __v1.call(proc, waitExit);
            return __v2;
        }
        async pipe_bind(name) {
            let __v1 = await this.ensureFunc('pipe_bind', 's->o');
            let __v2 = await __v1.call(name);
            return __v2;
        }
        async pipe_connect(name) {
            let __v1 = await this.ensureFunc('pipe_connect', 's->o');
            let __v2 = await __v1.call(name);
            return __v2;
        }
        async tcp_bind(name, port) {
            let __v1 = await this.ensureFunc('tcp_bind', 'si->o');
            let __v2 = await __v1.call(name, port);
            return __v2;
        }
        async tcp_connect(name, port) {
            let __v1 = await this.ensureFunc('tcp_connect', 'si->o');
            let __v2 = await __v1.call(name, port);
            return __v2;
        }
        async tcp_getpeername(tcp) {
            let __v1 = await this.ensureFunc('tcp_getpeername', 'o->si');
            let __v2 = await __v1.call(tcp);
            return __v2;
        }
        async interface_address() {
            let __v1 = await this.ensureFunc('interface_address', '->b');
            let __v2 = await __v1.call();
            return __v2;
        }
        async os_getenv(name) {
            let __v1 = await this.ensureFunc('os_getenv', 's->s');
            let __v2 = await __v1.call(name);
            return __v2;
        }
        async os_setenv(name, val) {
            let __v1 = await this.ensureFunc('os_setenv', 'ss->');
            let __v2 = await __v1.call(name, val);
        }
        async os_unsetenv(name) {
            let __v1 = await this.ensureFunc('os_unsetenv', 's->');
            let __v2 = await __v1.call(name);
        }
        async os_getprop(name) {
            let __v1 = await this.ensureFunc('os_getprop', 's->s');
            let __v2 = await __v1.call(name);
            return __v2;
        }
        async os_setprop(name, val) {
            let __v1 = await this.ensureFunc('os_setprop', 'ss->');
            let __v2 = await __v1.call(name, val);
        }
        async get_memory_info() {
            let __v1 = await this.ensureFunc('get_memory_info', '->b');
            let __v2 = await __v1.call();
            return __v2;
        }
        async gettimeofday() {
            let __v1 = await this.ensureFunc('gettimeofday', '->l');
            let __v2 = await __v1.call();
            return __v2;
        }
    }
    exports.Invoker = Invoker;
    exports.defaultInvoker = null;
    async function ensureDefaultInvoker() {
        if (exports.defaultInvoker == null) {
            exports.defaultInvoker = new Invoker();
            exports.defaultInvoker.useClient(await (0, rpcregistry_1.getRpc4XplatjCServer)());
        }
    }
});
//# sourceMappingURL=pxprpc__libuv.js.map