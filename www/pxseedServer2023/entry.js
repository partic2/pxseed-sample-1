define(["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.__inited__ = void 0;
    exports.__inited__ = (async () => {
        if (globalThis.tjs !== undefined) {
            await new Promise((resolve_1, reject_1) => { require(['./tjsentry'], resolve_1, reject_1); });
        }
        else if (globalThis.process?.versions?.node !== undefined) {
            let { __inited__ } = await new Promise((resolve_2, reject_2) => { require(['./nodeentry'], resolve_2, reject_2); });
            await __inited__;
        }
    })();
});
//# sourceMappingURL=entry.js.map