define("partic2/nodehelper/jseio", ["require", "exports", "partic2/tjshelper/jseiorpcserver"], function (require, exports, jseiorpcserver_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.__inited__ = void 0;
    exports.__inited__ = (async () => {
        await jseiorpcserver_1.inited;
    })();
});
