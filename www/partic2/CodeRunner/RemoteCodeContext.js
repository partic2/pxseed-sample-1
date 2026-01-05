define(["require", "exports", "pxprpc/extend", "./CodeContext", "partic2/jsutils1/base", "partic2/pxprpcClient/registry", "./jsutils2"], function (require, exports, extend_1, CodeContext_1, base_1, registry_1, jsutils2_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.RemoteRunCodeContext = exports.__name__ = void 0;
    exports.createConnectorWithNewRunCodeContext = createConnectorWithNewRunCodeContext;
    exports.connectToRemoteCodeContext = connectToRemoteCodeContext;
    (0, jsutils2_1.setupAsyncHook)();
    exports.__name__ = 'partic2/CodeRunner/RemoteCodeContext';
    async function remoteCall(stringParam, objectParam) {
        let fnMap = {
            connectCodeContext: async (source) => {
                let r = await (new Function('lib', `return (async ()=>{${source}})()`)(CodeContext_1.jsExecLib));
                return ['', r];
            },
            callProp1: async (prop, param) => {
                return [JSON.stringify(await objectParam.value[prop](...param)), null];
            },
            pullCodeContextEvent: async (timeGt) => {
                let codeContext = objectParam.value;
                let events = [];
                const checkEvent = () => {
                    events = codeContext.event._cachedEventQueue.arr().filter(t1 => t1.time > timeGt)
                        .map(t1 => ({ type: t1.event.type, data: t1.event.data, time: t1.time }));
                };
                checkEvent();
                if (events.length === 0) {
                    await codeContext.event._cachedEventQueue.waitForQueueChange();
                    checkEvent();
                }
                return [JSON.stringify(events), null];
            }
        };
        let { fn, param } = JSON.parse(stringParam);
        return fnMap[fn](...param);
    }
    extend_1.defaultFuncMap[exports.__name__ + '.remoteCall'] = new extend_1.RpcExtendServerCallable(remoteCall).typedecl('so->so');
    /*
    remote code call like this
    */
    async function __temp1(arg, lib) {
    }
    async function createConnectorWithNewRunCodeContext() {
        let codeContext = new CodeContext_1.jsExecLib.LocalRunCodeContext();
        return { value: codeContext, close: () => codeContext.close() };
    }
    class RemoteRunCodeContext {
        constructor(client1, remoteCodeContext) {
            this.client1 = client1;
            this._remoteContext = null;
            this.event = new CodeContext_1.CodeContextEventTarget();
            this.inited = new base_1.future();
            this.initMutex = new base_1.mutex();
            if (remoteCodeContext != undefined) {
                this._remoteContext = remoteCodeContext;
            }
            this.doInit();
        }
        async pullEventLoop() {
            try {
                let lastEventTime = 0;
                while (this._remoteContext != null) {
                    let t1 = await this.remoteCall.call(JSON.stringify({ fn: 'pullCodeContextEvent',
                        param: [lastEventTime]
                    }), this._remoteContext);
                    let events = JSON.parse(t1[0]);
                    for (let t1 of events) {
                        this.event.dispatchEvent(new CodeContext_1.CodeContextEvent(t1.type, { data: t1.data }));
                    }
                    if (events.length > 0) {
                        lastEventTime = events.at(-1).time;
                    }
                }
            }
            catch (err) {
                (0, base_1.throwIfAbortError)(err);
            }
        }
        async doInit() {
            await this.initMutex.lock();
            try {
                (await (await (0, registry_1.getAttachedRemoteRigstryFunction)(this.client1)).loadModule(exports.__name__)).free();
                this.remoteCall = await (0, registry_1.getRpcFunctionOn)(this.client1, exports.__name__ + '.remoteCall', 'so->so');
                (0, base_1.assert)(this.remoteCall != null);
                if (this._remoteContext == undefined) {
                    let t1 = await this.remoteCall.call(JSON.stringify({ fn: 'connectCodeContext',
                        param: [`return (await lib.importModule('partic2/CodeRunner/RemoteCodeContext')).createConnectorWithNewRunCodeContext()`]
                    }), null);
                    this._remoteContext = t1[1];
                }
                this.inited.setResult(true);
                this.pullEventLoop();
                new FinalizationRegistry(() => this.close()).register(this, undefined);
            }
            catch (err) {
                this.inited.setException(err);
            }
            finally {
                await this.initMutex.unlock();
            }
        }
        async runCode(source, resultVariable) {
            await this.inited.get();
            let t1 = await this.remoteCall.call(JSON.stringify({ fn: 'callProp1',
                param: ['runCode', [source, resultVariable]]
            }), this._remoteContext);
            return JSON.parse(t1[0]);
        }
        async codeComplete(code, caret) {
            await this.inited.get();
            let t1 = await this.remoteCall.call(JSON.stringify({ fn: 'callProp1',
                param: ['codeComplete', [code, caret]]
            }), this._remoteContext);
            return JSON.parse(t1[0]);
        }
        async jsExec(source) {
            await this.inited.get();
            let t1 = await this.remoteCall.call(JSON.stringify({ fn: 'callProp1',
                param: ['jsExec', [source]]
            }), this._remoteContext);
            return JSON.parse(t1[0]);
        }
        close() {
            let t1 = this._remoteContext;
            this._remoteContext = null;
            if (t1 != null) {
                (async () => {
                    await this.remoteCall.call(JSON.stringify({ fn: 'callProp1',
                        param: ['runCode', [`event.dispatchEvent(new Event('remote-disconnected'))`]]
                    }), t1).catch();
                    await t1.free();
                })();
            }
        }
        ;
    }
    exports.RemoteRunCodeContext = RemoteRunCodeContext;
    /*
        client1:The pxprpc client.
        connectCode: The remote code to get the RunCodeContexConnector. eg: `return (await lib.importModule('partic2/CodeRunner/RemoteCodeContext')).createConnectorWithNewRunCodeContext()`
    */
    async function connectToRemoteCodeContext(client1, connectCode) {
        (await (await (0, registry_1.getAttachedRemoteRigstryFunction)(client1)).loadModule(exports.__name__)).free();
        let remoteCall = await (0, registry_1.getRpcFunctionOn)(client1, exports.__name__ + '.remoteCall', 'so->so');
        (0, base_1.assert)(remoteCall != null, 'remote function not found.');
        let t1 = await remoteCall.call(JSON.stringify({ fn: 'connectCodeContext',
            param: [connectCode]
        }), null);
        (0, base_1.assert)(t1 != null, 'connect code failed to return a connector.');
        return new RemoteRunCodeContext(client1, t1[1]);
    }
});
//# sourceMappingURL=RemoteCodeContext.js.map