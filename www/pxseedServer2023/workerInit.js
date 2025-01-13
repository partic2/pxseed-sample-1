define(["require", "exports", "partic2/nodehelper/env", "partic2/pxprpcClient/registry", "pxprpc/extend", "pxseedBuildScript/buildlib"], function (require, exports, env_1, registry_1, extend_1, buildlib_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.__name__ = void 0;
    exports.runPxseedBuildScript = runPxseedBuildScript;
    exports.runPxseedCleanScript = runPxseedCleanScript;
    //init for any worker of pxseedServer2023, usually setup helper and pxprpc server
    exports.__name__ = 'pxseedServer2023/workerInit';
    if (!registry_1.rpcWorkerInitModule.includes(exports.__name__)) {
        registry_1.rpcWorkerInitModule.push(exports.__name__);
    }
    async function runPxseedBuildScript() {
        await (0, buildlib_1.processDirectory)(buildlib_1.sourceDir);
    }
    async function runPxseedCleanScript() {
        await (0, buildlib_1.cleanBuildStatus)(buildlib_1.sourceDir);
    }
    extend_1.defaultFuncMap[exports.__name__ + '.runPxseedBuildScript'] = new extend_1.RpcExtendServerCallable(runPxseedBuildScript).typedecl('->');
    extend_1.defaultFuncMap[exports.__name__ + '.runPxseedCleanScript'] = new extend_1.RpcExtendServerCallable(runPxseedCleanScript).typedecl('->');
    (0, env_1.setupEnv)();
});
//# sourceMappingURL=workerInit.js.map