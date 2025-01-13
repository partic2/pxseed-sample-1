define(["require", "exports", "./kvdb", "./worker", "./jseio"], function (require, exports, kvdb_1, worker_1, jseio_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.setupEnv = setupEnv;
    function setupEnv() {
        (0, kvdb_1.setupImpl)();
        (0, worker_1.setupImpl)();
        (0, jseio_1.setup)();
    }
});
//# sourceMappingURL=env.js.map