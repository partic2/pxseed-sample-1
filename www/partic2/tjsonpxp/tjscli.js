define(["require", "exports", "partic2/jsutils1/base", "./tjsutil", "partic2/CodeRunner/simplecli", "./tjsenv"], function (require, exports, base_1, tjsutil_1, simplecli_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    let __name__ = base_1.requirejs.getLocalRequireModule(require);
    async function cliMain() {
        let stdin = new ReadableStream(new tjsutil_1.TjsReaderDataSource(tjs.stdin)).getReader();
        let stdout = new WritableStream(new tjsutil_1.TjsWriterDataSink(tjs.stdout)).getWriter();
        let stderr = new WritableStream(new tjsutil_1.TjsWriterDataSink(tjs.stdout)).getWriter();
        let cli = new simplecli_1.SimpleCli(stdin, stdout, stderr);
        await cli.initEnv();
        cli.codeContext.localScope.exit = (exitCode) => {
            cli.codeContext.close();
            tjs.exit(exitCode ?? 0);
        };
        let args = [...tjs.args];
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
//# sourceMappingURL=tjscli.js.map