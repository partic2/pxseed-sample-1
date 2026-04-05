define(["require", "exports", "worker_threads", "./worker", "./env"], function (require, exports, worker_threads_1, worker_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    (0, worker_1.setupImpl)();
    let compa = new worker_1.MessagePortForNodeWorker(worker_threads_1.parentPort);
    /* possible break the future eventTarget code. need better solution. */
    global.postMessage = compa.postMessage.bind(compa);
    global.addEventListener = compa.addEventListener.bind(compa);
    global.removeEventListener = compa.removeEventListener.bind(compa);
    //exit worker_thread
    global.close = () => process.exit();
    new Promise((resolve_1, reject_1) => { require(['partic2/jsutils1/workerentry'], resolve_1, reject_1); });
});
//# sourceMappingURL=workerentry.js.map