define("partic2/nodehelper/worker", ["require", "exports", "partic2/jsutils1/webutils", "worker_threads", "path"], function (require, exports, webutils_1, worker_threads_1, path_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.MessagePortForNodeWorker = void 0;
    exports.setupImpl = setupImpl;
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
    class NodeWorkerThread extends webutils_1.WebWorkerThread {
        async _createWorker() {
            this.nodeWorker = new worker_threads_1.Worker(path_1.default.join((0, webutils_1.getWWWRoot)(), 'noderun.js'), { workerData: { entryModule: 'partic2/nodehelper/workerentry' } });
            return new MessagePortForNodeWorker(this.nodeWorker);
        }
    }
    var implSetuped = false;
    function setupImpl() {
        if (!implSetuped) {
            (0, webutils_1.setWorkerThreadImplementation)(NodeWorkerThread);
        }
    }
});
