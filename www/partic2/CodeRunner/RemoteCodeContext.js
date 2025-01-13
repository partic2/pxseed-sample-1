define(["require", "exports", "pxprpc/extend", "./CodeContext", "partic2/jsutils1/base"], function (require, exports, extend_1, CodeContext_1, base_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.RemoteRunCodeContext = exports.__name__ = void 0;
    exports.getRemoteContext = getRemoteContext;
    exports.PxprpcJsLoadPxseedModule = PxprpcJsLoadPxseedModule;
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
    async function PxprpcJsLoadPxseedModule(client1, modules) {
        let jsExec = (await client1.getFunc('builtin.jsExec'));
        let toJson = (await client1.getFunc('builtin.toJSON'));
        try {
            (0, base_1.assert)(jsExec != null && toJson != null);
            jsExec.typedecl('so->o');
            toJson.typedecl('o->s');
            await jsExec.call(`return new Promise((resolve)=>{require(${JSON.stringify(modules)},function(rcc){resolve(null)},function(err){reject(err)})})`, null);
        }
        finally {
            await jsExec?.free();
            await toJson?.free();
        }
    }
    class RemoteRunCodeContext {
        constructor(client1) {
            this.client1 = client1;
            this.event = new EventTarget();
            this.closed = false;
            this.jsExecObj = null;
            this.jsExecStr = null;
            this.remoteContext = null;
            this.initDone = new base_1.future();
            this.doInit();
        }
        async doInit() {
            //XXX:race condition
            await PxprpcJsLoadPxseedModule(this.client1, [exports.__name__]);
            if (rpcfunctionsProps in this.client1) {
                let t1 = this.client1[rpcfunctionsProps];
                this.jsExecObj = t1.jsExecObj;
                this.jsExecStr = t1.jsExecStr;
            }
            else {
                this.jsExecObj = (await this.client1.getFunc(pxprpcNamespace + '.jsExecObj')).typedecl('so->o');
                this.jsExecStr = (await this.client1.getFunc(pxprpcNamespace + '.jsExecStr')).typedecl('so->s');
                this.client1[rpcfunctionsProps] = {
                    jsExecObj: this.jsExecObj,
                    jsExecStr: this.jsExecStr
                };
            }
            this.remoteContext = await this.remoteExecObj(`return new lib.LocalRunCodeContext();`, null);
            this.remoteEventQueue = await this.remoteExecObj(`return lib.CreateEventQueue(arg.event,['console.data']);`, this.remoteContext);
            this.pullEventInterval();
            this.initDone.setResult(true);
            new FinalizationRegistry(() => this.close()).register(this, undefined);
        }
        async pullEventInterval() {
            while (!this.closed) {
                let evt = JSON.parse(await this.remoteExecStr(`return await arg.next();`, this.remoteEventQueue));
                if (evt.type == 'console.data') {
                    let e = new CodeContext_1.ConsoleDataEvent();
                    e.data = evt.data;
                    this.event.dispatchEvent(e);
                }
            }
        }
        async remoteExecObj(source, arg) {
            return await this.jsExecObj.call(source, arg);
        }
        async remoteExecStr(source, arg) {
            return await this.jsExecStr.call(source, arg);
        }
        async runCode(source, resultVariable) {
            await this.initDone.get();
            resultVariable = resultVariable ?? '_';
            source = JSON.stringify(source);
            let r = await this.remoteExecStr(`
            let r=await arg.runCode(${source},'${resultVariable}');
            return JSON.stringify(r);`, this.remoteContext);
            return JSON.parse(r);
        }
        async codeComplete(code, caret) {
            await this.initDone.get();
            let source = JSON.stringify(code);
            let ret = await this.remoteExecStr(`let r=await arg.codeComplete(${source},${caret});
            return JSON.stringify(r);`, this.remoteContext);
            return JSON.parse(ret);
        }
        async jsExec(source) {
            await this.initDone.get();
            source = JSON.stringify(source);
            return await this.remoteExecStr(`return await arg.jsExec(${source})`, this.remoteContext);
        }
        async queryTooltip(code, caret) {
            await this.initDone.get();
            return '';
        }
        close() {
            this.remoteContext?.free();
            this.remoteEventQueue?.free();
        }
        ;
    }
    exports.RemoteRunCodeContext = RemoteRunCodeContext;
});
//# sourceMappingURL=RemoteCodeContext.js.map