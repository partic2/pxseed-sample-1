define(["require", "exports", "./tjsenv"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    (function () {
        const WorkerThreadMessageMark = '__messageMark_WorkerThread';
        self.globalThis = self;
        addEventListener('message', function (msg) {
            if (typeof msg.data === 'object' && msg.data[WorkerThreadMessageMark]) {
                let type = msg.data.type;
                let scriptId = msg.data.scriptId;
                switch (type) {
                    case 'run':
                        new Function('resolve', 'reject', msg.data.script)((result) => {
                            (msg.source ?? globalThis).postMessage({ [WorkerThreadMessageMark]: true, type: 'onScriptResolve', result, scriptId });
                        }, (reason) => {
                            (msg.source ?? globalThis).postMessage({ [WorkerThreadMessageMark]: true, type: 'onScriptRejecte', reason, scriptId });
                        });
                        break;
                }
            }
        });
        if ('postMessage' in globalThis) {
            let workerClose;
            if ('close' in globalThis) {
                workerClose = globalThis.close.bind(globalThis);
            }
            else {
                workerClose = () => globalThis.postMessage({ [WorkerThreadMessageMark]: true, type: 'tjs-close' });
            }
            globalThis.close = function () {
                require(['partic2/jsutils1/webutils'], function (webutils) {
                    webutils.lifecycle.dispatchEvent(new Event('exit'));
                    globalThis.postMessage({ [WorkerThreadMessageMark]: true, type: 'closing' });
                    workerClose();
                }, function () {
                    globalThis.postMessage({ [WorkerThreadMessageMark]: true, type: 'closing' });
                    ;
                    workerClose();
                });
            };
            globalThis.postMessage({ [WorkerThreadMessageMark]: true, type: 'ready' });
        }
    })();
});
//# sourceMappingURL=workerentry.js.map