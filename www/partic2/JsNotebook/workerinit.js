define(["require", "exports", "partic2/CodeRunner/JsEnviron"], function (require, exports, JsEnviron_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.__name__ = void 0;
    exports.__name__ = 'partic2/JsNotebook/workerinit';
    (async () => {
        if (typeof (globalThis.importScripts) === 'function') {
            let defaultFs = new JsEnviron_1.LocalWindowSFS();
            await defaultFs.ensureInited();
            await (0, JsEnviron_1.installRequireProvider)(defaultFs);
        }
    })();
});
//# sourceMappingURL=workerinit.js.map