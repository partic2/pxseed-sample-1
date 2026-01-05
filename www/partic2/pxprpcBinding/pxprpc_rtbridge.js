define(["require", "exports", "partic2/pxprpcClient/registry", "./rpcregistry"], function (require, exports, registry_1, rpcregistry_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.defaultInvoker = exports.Invoker = void 0;
    exports.ensureDefaultInvoker = ensureDefaultInvoker;
    class Invoker {
        constructor() {
            this.rpc__RemoteFuncs = {};
        }
        async useClient(client) {
            this.rpc__client = client;
            this.rpc__RemoteFuncs = {};
        }
        async pipe_serve(name) {
            let __v1 = await (0, registry_1.getRpcFunctionOn)(this.rpc__client, 'pxprpc_pipe_pp.serve', 's->o');
            let __v2 = await __v1.call(name);
            return __v2;
        }
        async pipe_accept(pipeServer) {
            let __v1 = await (0, registry_1.getRpcFunctionOn)(this.rpc__client, 'pxprpc_pipe_pp.accept', 'o->o');
            let __v2 = await __v1.call(pipeServer);
            return __v2;
        }
        async pipe_connect(target) {
            let __v1 = await (0, registry_1.getRpcFunctionOn)(this.rpc__client, 'pxprpc_pipe_pp.connect', 's->o');
            let __v2 = await __v1.call(target);
            return __v2;
        }
        async io_to_raw_addr(io1) {
            let __v1 = await (0, registry_1.getRpcFunctionOn)(this.rpc__client, 'pxprpc_pp.io_to_raw_addr', 'o->l');
            let __v2 = await __v1.call(io1);
            return __v2;
        }
        async io_from_raw_addr(addr) {
            let __v1 = await (0, registry_1.getRpcFunctionOn)(this.rpc__client, 'pxprpc_pp.io_from_raw_addr', 'l->o');
            let __v2 = await __v1.call(addr);
            return __v2;
        }
        async io_send(io1, data) {
            let __v1 = await (0, registry_1.getRpcFunctionOn)(this.rpc__client, 'pxprpc_pp.io_send', 'ob->');
            let __v2 = await __v1.call(io1, data);
            return __v2;
        }
        async io_receive(io1) {
            let __v1 = await (0, registry_1.getRpcFunctionOn)(this.rpc__client, 'pxprpc_pp.io_receive', 'o->b');
            let __v2 = await __v1.call(io1);
            return __v2;
        }
        async io_set_auto_close(io1, autoClose) {
            let __v1 = await (0, registry_1.getRpcFunctionOn)(this.rpc__client, 'pxprpc_pp.io_set_auto_close', 'oc->');
            let __v2 = await __v1.call(io1, autoClose);
            return __v2;
        }
        async new_tcp_rpc_server(host, port) {
            let __v1 = await (0, registry_1.getRpcFunctionOn)(this.rpc__client, 'pxprpc_rtbridge_host.new_tcp_rpc_server', 'si->');
            let __v2 = await __v1.call(host, port);
            return __v2;
        }
        async memory_alloc(size) {
            let __v1 = await (0, registry_1.getRpcFunctionOn)(this.rpc__client, 'pxprpc_rtbridge.memory_alloc', 'i->o');
            let __v2 = await __v1.call(size);
            return __v2;
        }
        async memory_access(addr, size) {
            let __v1 = await (0, registry_1.getRpcFunctionOn)(this.rpc__client, 'pxprpc_rtbridge.memory_access', 'li->o');
            let __v2 = await __v1.call(addr, size);
            return __v2;
        }
        async memory_read(chunk, offset, size) {
            let __v1 = await (0, registry_1.getRpcFunctionOn)(this.rpc__client, 'pxprpc_rtbridge.memory_read', 'oii->b');
            let __v2 = await __v1.call(chunk, offset, size);
            return __v2;
        }
        async memory_write(chunk, offset, data) {
            let __v1 = await (0, registry_1.getRpcFunctionOn)(this.rpc__client, 'pxprpc_rtbridge.memory_write', 'oib->');
            let __v2 = await __v1.call(chunk, offset, data);
            return __v2;
        }
        async memory_info(chunk) {
            let __v1 = await (0, registry_1.getRpcFunctionOn)(this.rpc__client, 'pxprpc_rtbridge.memory_info', 'o->li');
            let __v2 = await __v1.call(chunk);
            return __v2;
        }
        async memory_mapfile(path, mode, size) {
            let __v1 = await (0, registry_1.getRpcFunctionOn)(this.rpc__client, 'pxprpc_rtbridge.memory_mapfile', 'ssi->o');
            let __v2 = await __v1.call(path, mode, size);
            return __v2;
        }
        async simpleffi_call(fn, argvMemChunk) {
            let __v1 = await (0, registry_1.getRpcFunctionOn)(this.rpc__client, 'pxprpc_rtbridge.simpleffi_call', 'lo->l');
            let __v2 = await __v1.call(fn, argvMemChunk);
            return __v2;
        }
        async sizeof_pointer() {
            let __v1 = await (0, registry_1.getRpcFunctionOn)(this.rpc__client, 'pxprpc_rtbridge.sizeof_pointer', '->i');
            let __v2 = await __v1.call();
            return __v2;
        }
        async variable_get(name) {
            let __v1 = await (0, registry_1.getRpcFunctionOn)(this.rpc__client, 'pxprpc_rtbridge.variable_get', 's->s');
            let __v2 = await __v1.call(name);
            return __v2;
        }
        async variable_set(name, value) {
            let __v1 = await (0, registry_1.getRpcFunctionOn)(this.rpc__client, 'pxprpc_rtbridge.variable_set', 'ss->');
            let __v2 = await __v1.call(name, value);
            return __v2;
        }
        async variable_on_change() {
            let __v1 = await (0, registry_1.getRpcFunctionOn)(this.rpc__client, 'pxprpc_rtbridge.variable_on_change', '->o');
            let __v2 = await __v1.call();
            return (await __v2.asCallable()).typedecl('->s');
        }
    }
    exports.Invoker = Invoker;
    exports.defaultInvoker = null;
    async function ensureDefaultInvoker() {
        if (exports.defaultInvoker == null) {
            exports.defaultInvoker = new Invoker();
            exports.defaultInvoker.useClient(await (0, rpcregistry_1.getRpc4RuntimeBridge0)());
        }
    }
});
//# sourceMappingURL=pxprpc_rtbridge.js.map