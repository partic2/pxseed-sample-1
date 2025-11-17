define(["require", "exports", "partic2/jsutils1/base", "partic2/CodeRunner/simplecli", "partic2/nodehelper/nodeio", "./pxseedhttpserver"], function (require, exports, base_1, simplecli_1, nodeio_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    let __name__ = base_1.requirejs.getLocalRequireModule(require);
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
                for (let t1 of args.slice(1)) {
                    await cli.codeContext.runCode(t1);
                }
                await cli.codeContext.runCode('exit()');
            }
            else {
                cli.repl();
            }
        }
    }
    cliMain();
});
//# sourceMappingURL=nodecli.js.map