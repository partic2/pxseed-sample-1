define(["require", "exports", "partic2/jsutils1/base", "partic2/jsutils1/webutils", "./CodeContext", "./Inspector"], function (require, exports, base_1, webutils_1, CodeContext_1, Inspector_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.SimpleCli = void 0;
    exports.simplecliDefaultInit = simplecliDefaultInit;
    exports.getConfig = getConfig;
    let remoteObjectFetchConfig = { maxDepth: 3, maxKeyCount: 50, enumerateMode: 'for in' };
    let __name__ = base_1.requirejs.getLocalRequireModule(require);
    let encode = TextEncoder.prototype.encode.bind(new TextEncoder());
    let decode = TextDecoder.prototype.decode.bind(new TextDecoder());
    async function simplecliDefaultInit(_ENV) {
        try {
            if (globalThis?.process?.versions?.node != undefined) {
                _ENV.ppm = await new Promise((resolve_1, reject_1) => { require(['partic2/packageManager/registry'], resolve_1, reject_1); });
            }
        }
        catch (err) {
            console.info(err.message);
            console.info(err.stack);
        }
        ;
    }
    async function getConfig() {
        let config = await (0, webutils_1.GetPersistentConfig)(__name__);
        if (config.initScript == undefined) {
            config.initScript = {};
        }
        config.initScript[__name__] = `
import {simplecliDefaultInit as __t1} from '${__name__}'
await __t1(_ENV);
`;
        return {
            config: config,
            save: () => (0, webutils_1.SavePersistentConfig)(__name__)
        };
    }
    class SimpleCli {
        constructor(stdin, stdout, stderr) {
            this.stdin = stdin;
            this.stdout = stdout;
            this.stderr = stderr;
            this.codeContext = new CodeContext_1.LocalRunCodeContext();
            this.remoteObjectFetcher = new Inspector_1.CodeContextRemoteObjectFetcher(this.codeContext);
        }
        async evalInput(jscode) {
            try {
                let result = await this.codeContext.runCode(jscode, '_');
                if (result.err != null) {
                    await this.stderr.write(encode(JSON.stringify(result, undefined, 2)));
                }
                else if (result.stringResult != null) {
                    await this.stderr.write(encode(result.stringResult));
                }
                else {
                    let remoteObj = await (0, Inspector_1.inspectCodeContextVariable)(this.remoteObjectFetcher, ['_'], remoteObjectFetchConfig);
                    await this.stderr.write(encode(JSON.stringify(remoteObj, (key, val) => {
                        if (typeof val == 'bigint') {
                            return `BigInt('${val}')`;
                        }
                        else {
                            return val;
                        }
                    }, 2)));
                }
            }
            catch (err) {
                await this.stderr.write(encode(err.message));
                await this.stderr.write(encode(err.stack));
            }
            await this.stdout.write(encode('\n>'));
        }
        async initEnv() {
            let { config } = await getConfig();
            for (let script of Object.values(config.initScript)) {
                try {
                    await this.codeContext.runCode(script);
                }
                catch (err) {
                    (0, base_1.throwIfAbortError)(err);
                    await this.stderr.write(encode(err.message));
                    await this.stderr.write(encode(err.stack));
                }
            }
        }
        async repl() {
            this.stdout.write(encode('>'));
            while (true) {
                let input1 = await this.stdin.read();
                if (input1.value != undefined) {
                    this.evalInput(decode(input1.value));
                }
                if (input1.done) {
                    break;
                }
            }
        }
    }
    exports.SimpleCli = SimpleCli;
});
//# sourceMappingURL=simplecli.js.map