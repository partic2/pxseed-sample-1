define(["require", "exports", "partic2/jsutils1/base", "partic2/CodeRunner/simplecli", "partic2/nodehelper/nodeio", "partic2/nodehelper/env", "./pxseedhttpserver"], function (require, exports, base_1, simplecli_1, nodeio_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.setCliOption = setCliOption;
    let __name__ = base_1.requirejs.getLocalRequireModule(require);
    let cliOption = {
        autoExitAfterAllCodeSettled: false
    };
    async function setCliOption(opt) {
        for (let [k1, v1] of Object.entries(opt)) {
            if (v1 != undefined) {
                cliOption[k1] = v1;
            }
        }
    }
    async function cliMain() {
        let stdin = new ReadableStream(new nodeio_1.NodeReadableDataSource(process.stdin)).getReader();
        let stdout = new WritableStream(new nodeio_1.NodeWritableDataSink(process.stdout)).getWriter();
        let stderr = new WritableStream(new nodeio_1.NodeWritableDataSink(process.stdout)).getWriter();
        let cli = new simplecli_1.SimpleCli(stdin, stdout, stderr);
        await cli.initEnv();
        cli.codeContext.localScope.exit = (exitCode) => {
            cli.codeContext.close();
            process.exit(exitCode ?? 0);
        };
        cli.codeContext.localScope.startServer = async () => {
            await new Promise((resolve_1, reject_1) => { require(['./nodeentry'], resolve_1, reject_1); });
            setCliOption({ autoExitAfterAllCodeSettled: false });
        };
        cli.codeContext.localScope.buildAndStartServer = async () => {
            let { processDirectory } = await new Promise((resolve_2, reject_2) => { require(['pxseedBuildScript/buildlib'], resolve_2, reject_2); });
            let loader1 = await new Promise((resolve_3, reject_3) => { require(['pxseedBuildScript/loaders'], resolve_3, reject_3); });
            await loader1.inited;
            await processDirectory(loader1.sourceDir);
            await new Promise((resolve_4, reject_4) => { require(['./nodeentry'], resolve_4, reject_4); });
            setCliOption({ autoExitAfterAllCodeSettled: false });
        };
        let args = [...process.argv];
        let found = false;
        for (let t1 = 1; t1 < args.length; t1++) {
            if (args[t1] === __name__) {
                args = args.slice(t1);
                found = true;
                break;
            }
        }
        if (found) {
            if (args.length > 1) {
                setCliOption({ autoExitAfterAllCodeSettled: true });
                for (let t1 of args.slice(1)) {
                    await cli.codeContext.runCode(t1);
                }
                if (cliOption.autoExitAfterAllCodeSettled) {
                    await cli.codeContext.runCode('exit()');
                }
                else {
                    cli.repl();
                }
            }
            else {
                cli.repl();
            }
        }
    }
    cliMain();
});
//# sourceMappingURL=nodecli.js.map