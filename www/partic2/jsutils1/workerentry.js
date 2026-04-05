define(["require", "exports", "partic2/jsutils1/webutils"], function (require, exports, webutils_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.spawnerCall = void 0;
    exports.setWorkerInfo = setWorkerInfo;
    exports.dispatchWorkerLifecycle = dispatchWorkerLifecycle;
    exports.requestExit = requestExit;
    exports.spawnerCall = null;
    if ('postMessage' in globalThis) {
        if ('close' in globalThis) {
            let workerClose = globalThis.close.bind(globalThis);
            globalThis.close = function () {
                webutils_1.lifecycle.dispatchEvent(new Event('exit'));
                globalThis.postMessage({ [webutils_1.WorkerThreadMessageMark]: 'closing' });
                workerClose();
            };
        }
        let spawnerFunctionCall = new webutils_1.FunctionCallOverMessagePort(globalThis);
        exports.spawnerCall = (module, func, args) => {
            return spawnerFunctionCall.call(module, func, args);
        };
        globalThis.postMessage({ [webutils_1.WorkerThreadMessageMark]: 'ready' });
    }
    async function setWorkerInfo(id) {
        globalThis.__workerId = id;
        return id;
    }
    async function dispatchWorkerLifecycle(ev) {
        webutils_1.lifecycle.dispatchEvent(new Event(ev));
    }
    async function requestExit() {
        globalThis.close();
    }
});
//# sourceMappingURL=workerentry.js.map