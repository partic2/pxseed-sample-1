define(["require", "exports", "worker_threads", "./worker"], function (require, exports, worker_threads_1, worker_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    (function () {
        (0, worker_1.setupImpl)();
        const WorkerThreadMessageMark = '__messageMark_WorkerThread';
        let compa = new worker_1.MessagePortForNodeWorker(worker_threads_1.parentPort);
        /* possible break the future eventTarget code. need better solution. */
        global.postMessage = compa.postMessage.bind(compa);
        global.addEventListener = compa.addEventListener.bind(compa);
        global.removeEventListener = compa.removeEventListener.bind(compa);
        //exit worker_thread
        global.close = () => process.exit();
        globalThis.addEventListener('message', function (msg) {
            if (typeof msg.data === 'object' && msg.data[WorkerThreadMessageMark]) {
                let type = msg.data.type;
                let scriptId = msg.data.scriptId;
                switch (type) {
                    case 'run':
                        new Function('resolve', 'reject', msg.data.script)((result) => {
                            globalThis.postMessage({ [WorkerThreadMessageMark]: true, type: 'onScriptResolve', result, scriptId });
                        }, (reason) => {
                            globalThis.postMessage({ [WorkerThreadMessageMark]: true, type: 'onScriptRejecte', reason, scriptId });
                        });
                        break;
                }
            }
        });
        globalThis.postMessage({ [WorkerThreadMessageMark]: true, type: 'ready' });
    })();
});
//# sourceMappingURL=workerentry.js.map