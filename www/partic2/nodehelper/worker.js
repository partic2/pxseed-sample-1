define(["require", "exports", "partic2/jsutils1/base", "partic2/jsutils1/webutils", "worker_threads", "partic2/jsutils1/webutils", "path"], function (require, exports, base_1, webutils_1, worker_threads_1, webutils_2, path_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.MessagePortForNodeWorker = void 0;
    exports.setupImpl = setupImpl;
    const WorkerThreadMessageMark = '__messageMark_WorkerThread';
    class NodeMessageEvent {
        constructor() {
            this.lastEventId = '';
            this.origin = '*';
            this.ports = [];
            this.source = null;
            this.bubbles = false;
            this.cancelBubble = false;
            this.cancelable = false;
            this.composed = false;
            this.currentTarget = null;
            this.defaultPrevented = false;
            this.eventPhase = 0;
            this.isTrusted = true;
            this.returnValue = false;
            this.srcElement = null;
            this.target = null;
            this.timeStamp = 0;
            this.type = 'message';
            this.NONE = 0;
            this.CAPTURING_PHASE = 1;
            this.AT_TARGET = 2;
            this.BUBBLING_PHASE = 3;
        }
        initMessageEvent(type, bubbles, cancelable, data, origin, lastEventId, source, ports) {
            throw new Error("Method not implemented.");
        }
        composedPath() {
            throw new Error("Method not implemented.");
        }
        initEvent(type, bubbles, cancelable) {
            throw new Error("Method not implemented.");
        }
        preventDefault() {
        }
        stopImmediatePropagation() {
        }
        stopPropagation() {
        }
    }
    class MessagePortForNodeWorker {
        //Partial<MessagePort> is loose type restrict.
        constructor(nodePort) {
            this.nodePort = nodePort;
            this.listener = new Set();
            nodePort.on('message', (val) => this.onMessage(val));
        }
        addEventListener(type, cb) {
            this.listener.add(cb);
        }
        removeEventListener(type, cb) {
            this.listener.delete(cb);
        }
        onMessage(data) {
            let msgevt = new NodeMessageEvent();
            msgevt.source = this;
            msgevt.data = data;
            for (let t1 of this.listener) {
                t1(msgevt);
            }
        }
        postMessage(data, opt) {
            this.nodePort.postMessage(data);
        }
    }
    exports.MessagePortForNodeWorker = MessagePortForNodeWorker;
    class NodeWorkerThread {
        constructor(workerId) {
            this.workerId = '';
            this.waitReady = new base_1.future();
            this.exitListener = () => {
                this.runScript(`require(['${webutils_2.__name__}'],function(webutils){
            webutils.lifecycle.dispatchEvent(new Event('exit'));
        })`);
            };
            this.processingScript = {};
            this.workerId = workerId ?? (0, base_1.GenerateRandomString)();
        }
        async start() {
            //Program started with noderun.js
            this.nodeWorker = new worker_threads_1.Worker(path_1.default.join((0, webutils_1.getWWWRoot)(), 'noderun.js'), { workerData: { entryModule: 'partic2/nodehelper/workerentry' } });
            this.nodeWorker.on('message', (msgdata) => {
                let msg = { data: msgdata };
                if (typeof msg.data === 'object' && msg.data[WorkerThreadMessageMark]) {
                    let { type, scriptId } = msg.data;
                    switch (type) {
                        case 'run':
                            this.onHostRunScript(msg.data.script);
                            break;
                        case 'onScriptResolve':
                            this.onScriptResult(msg.data.result, scriptId);
                            break;
                        case 'onScriptReject':
                            this.onScriptReject(msg.data.reason, scriptId);
                            break;
                        case 'ready':
                            this.waitReady.setResult(0);
                            break;
                        case 'closing':
                            webutils_1.lifecycle.removeEventListener('exit', this.exitListener);
                            this.onExit?.();
                            break;
                    }
                }
            });
            await this.waitReady.get();
            await this.runScript(`global.__workerId='${this.workerId}'`);
            webutils_1.lifecycle.addEventListener('exit', this.exitListener);
            this.port = new MessagePortForNodeWorker(this.nodeWorker);
        }
        onHostRunScript(script) {
            (new Function('workerThread', script))(this);
        }
        async runScript(script, getResult) {
            let scriptId = '';
            if (getResult === true) {
                scriptId = (0, base_1.GenerateRandomString)();
                this.processingScript[scriptId] = new base_1.future();
            }
            this.nodeWorker?.postMessage({ [WorkerThreadMessageMark]: true, type: 'run', script, scriptId });
            if (getResult === true) {
                return await this.processingScript[scriptId].get();
            }
        }
        onScriptResult(result, scriptId) {
            if (scriptId !== undefined && scriptId in this.processingScript) {
                let fut = this.processingScript[scriptId];
                delete this.processingScript[scriptId];
                fut.setResult(result);
            }
        }
        onScriptReject(reason, scriptId) {
            if (scriptId !== undefined && scriptId in this.processingScript) {
                let fut = this.processingScript[scriptId];
                delete this.processingScript[scriptId];
                fut.setException(new Error(reason));
            }
        }
        requestExit() {
            this.runScript('globalThis.close()');
        }
    }
    var implSetuped = false;
    function setupImpl() {
        if (!implSetuped) {
            (0, webutils_1.setWorkerThreadImplementation)(NodeWorkerThread);
        }
    }
});
//# sourceMappingURL=worker.js.map