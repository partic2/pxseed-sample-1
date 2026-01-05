define(["require", "exports", "partic2/pxprpcClient/registry"], function (require, exports, registry_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Invoker = void 0;
    class Invoker {
        constructor() {
            this.rpc__RemoteFuncs = {};
        }
        async useClient(client) {
            this.rpc__client = client;
            this.rpc__RemoteFuncs = {};
        }
        async load_dll() {
            let __v1 = await (0, registry_1.getRpcFunctionOn)(this.rpc__client, 'pxprpc_winpty.load_dll', '->');
            let __v2 = await __v1.call();
        }
        async open(agentFlag) {
            let __v1 = await (0, registry_1.getRpcFunctionOn)(this.rpc__client, 'pxprpc_winpty.open', 'l->o');
            let __v2 = await __v1.call(BigInt(agentFlag));
            return __v2;
        }
        async spawn(pty, spawnFlag, appName, cmdline, cwd) {
            let __v1 = await (0, registry_1.getRpcFunctionOn)(this.rpc__client, 'pxprpc_winpty.spawn', 'olsss->');
            let __v2 = await __v1.call(pty, BigInt(spawnFlag), appName, cmdline, cwd);
            return __v2;
        }
        async constdio_name(pty) {
            let __v1 = await (0, registry_1.getRpcFunctionOn)(this.rpc__client, 'pxprpc_winpty.constdio_name', 'o->sss');
            let __v2 = await __v1.call(pty);
            return __v2;
        }
        async set_size(pty, cols, rows) {
            let __v1 = await (0, registry_1.getRpcFunctionOn)(this.rpc__client, 'pxprpc_winpty.set_size', 'oii->');
            let __v2 = await __v1.call(pty, cols, rows);
        }
    }
    exports.Invoker = Invoker;
});
//# sourceMappingURL=winpty.js.map