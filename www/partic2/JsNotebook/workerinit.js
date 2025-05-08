define(["require", "exports", "partic2/CodeRunner/JsEnviron", "partic2/jsutils1/base"], function (require, exports, JsEnviron_1, base_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ensureInited = exports.__name__ = void 0;
    exports.__name__ = 'partic2/JsNotebook/workerinit';
    exports.ensureInited = new base_1.future();
    ;
    (async () => {
        try {
            if (typeof (globalThis.importScripts) === 'function') {
                let defaultFs = new JsEnviron_1.LocalWindowSFS();
                await defaultFs.ensureInited();
                await (0, JsEnviron_1.installRequireProvider)(defaultFs);
            }
            exports.ensureInited.setResult('done');
        }
        catch (e) {
            exports.ensureInited.setException(e);
        }
    })();
});
//# sourceMappingURL=workerinit.js.map