define(["require", "exports", "partic2/jsutils1/base", "pxprpc/extend", "pxprpc/base", "pxprpc/backend"], function (require, exports, base_1, extend_1, base_2, backend_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.PxseedServer2023Function = void 0;
    exports.getServerConfig = getServerConfig;
    exports.restartSubprocessSelf = restartSubprocessSelf;
    let boundRpcFunctions = Symbol('boundRpcFunctions');
    class PxseedServer2023Function {
        constructor() {
            this.funcs = [];
        }
        async exit() {
            await this.funcs[0].call();
        }
        async subprocessWaitExitCode(index) {
            await this.funcs[1].call(index);
        }
        async subprocessRestart(index) {
            await this.funcs[2].call(index);
        }
        async subprocessRestartOnExit(index) {
            return await this.funcs[3].call(index);
        }
        async init(client1) {
            if (boundRpcFunctions in client1) {
                this.funcs = client1.boundRpcFunctions;
            }
            else {
                this.funcs.push((await client1.getFunc('pxseedServer2023.exit')).typedecl('->'));
                this.funcs.push((await client1.getFunc('pxseedServer2023.subprocess.waitExitCode')).typedecl('i->i'));
                this.funcs.push((await client1.getFunc('pxseedServer2023.subprocess.restart')).typedecl('i->'));
                this.funcs.push((await client1.getFunc('pxseedServer2023.subprocess.restartOnExit')).typedecl('i->o'));
                client1.boundRpcFunctions = this.funcs;
            }
        }
    }
    exports.PxseedServer2023Function = PxseedServer2023Function;
    async function getServerConfig() {
        if ('pxseedServer2023/entry' in await base_1.requirejs.getDefined()) {
            let serv = await new Promise((resolve_1, reject_1) => { require(['pxseedServer2023/entry'], resolve_1, reject_1); });
            return { root: serv.rootConfig, current: serv.config };
        }
        else {
            return null;
        }
    }
    async function restartSubprocessSelf() {
        let { current, root } = (await getServerConfig());
        (0, base_1.assert)(current.subprocessIndex != undefined);
        let client1 = new extend_1.RpcExtendClient1(new base_2.Client(await new backend_1.WebSocketIo().connect(`ws://127.0.0.1:${root.listenOn.port}${root.pxseedBase}${root.pxprpcPath}`)));
        await client1.init();
        let func = new PxseedServer2023Function();
        await func.init(client1);
        let closable = await func.subprocessRestartOnExit(current.subprocessIndex);
        process.exit(0);
    }
});
//# sourceMappingURL=clientFunction.js.map