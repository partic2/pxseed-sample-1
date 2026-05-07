define("partic2/CodeRunner/RemoteCodeContext", ["require", "exports", "./CodeContext", "partic2/jsutils1/base", "partic2/pxprpcClient/registry", "./jsutils2"], function (require, exports, CodeContext_1, base_1, registry_1, jsutils2_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.RemoteRunCodeContext = exports.RunCodeContextConnector = exports.__name__ = void 0;
    exports.createConnectorWithNewRunCodeContext = createConnectorWithNewRunCodeContext;
    exports.connectToCodeContextFromCode = connectToCodeContextFromCode;
    exports.connectToRemoteCodeContext = connectToRemoteCodeContext;
    (0, jsutils2_1.setupAsyncHook)();
    exports.__name__ = 'partic2/CodeRunner/RemoteCodeContext';
    /*
    remote code call like this
    */
    async function __temp1(arg, lib) {
    }
    class RunCodeContextConnector {
        constructor(value) {
            this.value = value;
            this.connectorId = (0, base_1.GenerateRandomString)();
            this[registry_1.RpcSerializeMagicMark] = {};
        }
        ;
        async pullCodeContextEvent(seqGt) {
            let codeContext = this.value;
            let events = [];
            const checkEvent = () => {
                let filterev = codeContext.event._cachedEventQueue.arr().filter(t1 => t1.seq > seqGt);
                events = filterev.map(t1 => ({ type: t1.event.type, data: t1.event.data, time: t1.time, seq: t1.seq }));
            };
            checkEvent();
            if (events.length === 0) {
                await codeContext.event._cachedEventQueue.waitForQueueChange();
                checkEvent();
            }
            return events;
        }
        async pushCodeContextEvent(event) {
            this.value.event._dispatchEventOnEventTarget(new CodeContext_1.CodeContextEvent(event.type, { data: event.data }));
        }
        async runCode(source, resultVariable) {
            return this.value.runCode(source, resultVariable);
        }
        async codeComplete(code, caret) {
            return this.value.codeComplete(code, caret);
        }
        async jsExec(source) {
            return this.value.jsExec(source);
        }
    }
    exports.RunCodeContextConnector = RunCodeContextConnector;
    async function createConnectorWithNewRunCodeContext() {
        let codeContext = new CodeContext_1.jsExecLib.LocalRunCodeContext();
        let t1 = new RunCodeContextConnector(codeContext);
        t1.close = () => codeContext.close();
        return t1;
    }
    class RemoteCodeContextEventTarget extends CodeContext_1.CodeContextEventTarget {
        constructor(rcc) {
            super();
            this.rcc = rcc;
        }
        dispatchEvent(event) {
            this.rcc._remoteContext?.pushCodeContextEvent({ type: event.type, data: event.data });
            return super.dispatchEvent(event);
        }
    }
    class RemoteRunCodeContext {
        constructor(client1, remoteCodeContext) {
            this.client1 = client1;
            //RunCodeContextConnector here is usually a rpc object, not the real local object.
            this._remoteContext = null;
            this.event = new RemoteCodeContextEventTarget(this);
            this.inited = new base_1.future();
            this.initMutex = new base_1.mutex();
            if (remoteCodeContext != undefined) {
                this._remoteContext = remoteCodeContext;
            }
            this.doInit();
        }
        async pullEventLoop() {
            try {
                let lastEventSeq = 0;
                while (this._remoteContext != null) {
                    let events = await this._remoteContext.pullCodeContextEvent(lastEventSeq);
                    for (let t1 of events) {
                        this.event._dispatchEventOnEventTarget(new CodeContext_1.CodeContextEvent(t1.type, { data: t1.data }));
                    }
                    if (events.length > 0) {
                        lastEventSeq = events.at(-1).seq;
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
                await (await (0, registry_1.getAttachedRemoteRigstryFunction)(this.client1)).loadModule(exports.__name__);
                if (this._remoteContext == undefined) {
                    this._remoteContext = await (0, registry_1.easyCallRemoteJsonFunction)(this.client1, exports.__name__, 'connectToCodeContextFromCode', [
                        `return (await lib.importModule('partic2/CodeRunner/RemoteCodeContext')).createConnectorWithNewRunCodeContext()`
                    ]);
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
            return await this._remoteContext.runCode(source, resultVariable);
        }
        async codeComplete(code, caret) {
            await this.inited.get();
            return await this._remoteContext.codeComplete(code, caret);
        }
        async jsExec(source) {
            await this.inited.get();
            return await this._remoteContext.jsExec(source);
        }
        close() {
            let t1 = this._remoteContext;
            this._remoteContext = null;
            if (t1 != null) {
                (async () => {
                    this.event.dispatchEvent(new CodeContext_1.CodeContextEvent('remote-disconnected'));
                    t1.close?.();
                })().catch(() => { });
            }
        }
        ;
    }
    exports.RemoteRunCodeContext = RemoteRunCodeContext;
    async function connectToCodeContextFromCode(connectCode) {
        let r = await (new Function('lib', `return (async ()=>{${connectCode}})()`)(CodeContext_1.jsExecLib));
        return r;
    }
    /*
        client1:The pxprpc client.
        connectCode: The remote code to get the RunCodeContexConnector. eg: `return (await lib.importModule('partic2/CodeRunner/RemoteCodeContext')).createConnectorWithNewRunCodeContext()`
    */
    async function connectToRemoteCodeContext(client1, connectCode) {
        return new RemoteRunCodeContext(client1, await (0, registry_1.easyCallRemoteJsonFunction)(client1, exports.__name__, 'connectToCodeContextFromCode', [connectCode]));
    }
});
