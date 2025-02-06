define(["require", "exports", "pxprpc/extend", "./CodeContext", "partic2/jsutils1/base", "./Inspector", "partic2/pxprpcClient/registry"], function (require, exports, extend_1, CodeContext_1, base_1, Inspector_1, registry_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.RemoteRunCodeContext = exports.__name__ = void 0;
    exports.getRemoteContext = getRemoteContext;
    exports.__name__ = 'partic2/CodeRunner/RemoteCodeContext';
    let pxprpcNamespace = exports.__name__;
    async function jsExecFn(source, arg) {
        try {
            let r = new Function('arg', 'lib', `return (async ()=>{${source}})()`)(arg, CodeContext_1.jsExecLib);
            if (r instanceof Promise) {
                r = await r;
            }
            return r;
        }
        catch (e) {
            throw (e);
        }
    }
    extend_1.defaultFuncMap[pxprpcNamespace + '.jsExecObj'] = new extend_1.RpcExtendServerCallable(jsExecFn).typedecl('so->o');
    extend_1.defaultFuncMap[pxprpcNamespace + '.jsExecStr'] = new extend_1.RpcExtendServerCallable(jsExecFn).typedecl('so->s');
    extend_1.defaultFuncMap[pxprpcNamespace + '.codeContextJsExec'] = new extend_1.RpcExtendServerCallable(async (context, code) => {
        return context.jsExec(code);
    }).typedecl('os->s');
    /*
    remote code call like this
    */
    async function __temp1(arg, lib) {
    }
    let attached = new Map();
    function getRemoteContext(client1) {
        if (attached.has(client1.id)) {
            return attached.get(client1.id);
        }
        else {
            attached.set(client1.id, new RemoteRunCodeContext(client1));
            return attached.get(client1.id);
        }
    }
    let rpcfunctionsProps = Symbol(exports.__name__ + '/' + '/rpcfunctions');
    class RemoteCodeContextFunctionImpl {
        constructor() {
            this.funcs = [];
        }
        async jsExecObj(code, arg) {
            return this.funcs[0].call(code, arg);
        }
        async jsExecStr(code, arg) {
            return this.funcs[1].call(code, arg);
        }
        async codeContextJsExec(codeContext, code) {
            return this.funcs[2].call(codeContext, code);
        }
        async ensureInit() {
            if (this.funcs.length == 0) {
                this.funcs = [
                    (await this.client1.getFunc(exports.__name__ + '.jsExecObj'))?.typedecl('so->o'),
                    (await this.client1.getFunc(exports.__name__ + '.jsExecStr'))?.typedecl('so->s'),
                    (await this.client1.getFunc(exports.__name__ + '.codeContextJsExec'))?.typedecl('os->s')
                ];
            }
        }
    }
    class RemoteRunCodeContext {
        constructor(client1) {
            this.client1 = client1;
            this.event = new CodeContext_1.RemoteEventTarget();
            this.closed = false;
            this.initMutex = new base_1.mutex();
            this._remoteContext = null;
            this.initDone = new base_1.future();
            this.doInit();
        }
        async doInit() {
            await this.initMutex.lock();
            try {
                let remoteFunc1 = await (0, registry_1.getAttachedRemoteRigstryFunction)(this.client1);
                await remoteFunc1.loadModule(exports.__name__);
                if (rpcfunctionsProps in this.client1) {
                    this.rpcFunctions = this.client1[rpcfunctionsProps];
                }
                else {
                    this.rpcFunctions = new RemoteCodeContextFunctionImpl();
                    this.rpcFunctions.client1 = this.client1;
                    await this.rpcFunctions.ensureInit();
                    this.client1[rpcfunctionsProps] = this.rpcFunctions;
                }
                this._remoteContext = await this.rpcFunctions.jsExecObj(`return new lib.LocalRunCodeContext();`, null);
                this.event.useRemoteReference(new Inspector_1.RemoteReference(['__priv_codeContext', 'event']));
                this.event.codeContext = this;
                this.event.start();
                this.initDone.setResult(true);
                new FinalizationRegistry(() => this.close()).register(this, undefined);
            }
            finally {
                await this.initMutex.unlock();
            }
        }
        async runCode(source, resultVariable) {
            await this.initDone.get();
            resultVariable = resultVariable ?? '_';
            source = JSON.stringify(source);
            let r = await this.rpcFunctions.codeContextJsExec(this._remoteContext, `
            let r=await codeContext.runCode(${source},'${resultVariable}');
            return JSON.stringify(r);`);
            return JSON.parse(r);
        }
        async codeComplete(code, caret) {
            await this.initDone.get();
            let source = JSON.stringify(code);
            let ret = await this.rpcFunctions.codeContextJsExec(this._remoteContext, `let r=await codeContext.codeComplete(${source},${caret});
            return JSON.stringify(r);`);
            return JSON.parse(ret);
        }
        async jsExec(source) {
            await this.initDone.get();
            return await this.rpcFunctions.codeContextJsExec(this._remoteContext, source);
        }
        async connectPipe(name) {
            let remoteIo = await this.rpcFunctions.jsExecObj(`return arg.connectPipe('${name}')`, this._remoteContext);
            if (remoteIo == null) {
                return null;
            }
            else {
                return new registry_1.IoOverPxprpc(remoteIo);
            }
        }
        removePipe(name) {
            throw new Error('Method not implemented.');
        }
        close() {
            this._remoteContext?.free();
            this.event.close();
        }
        ;
    }
    exports.RemoteRunCodeContext = RemoteRunCodeContext;
});
//# sourceMappingURL=RemoteCodeContext.js.map