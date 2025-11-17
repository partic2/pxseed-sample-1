define("partic2/packageManager/webui", ["require", "exports", "partic2/jsutils1/webutils", "partic2/jsutils1/base"], function (require, exports, webutils_1, base_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    const __name__ = base_1.requirejs.getLocalRequireModule(require);
    ;
    (async () => {
        if ((0, webutils_1.GetJsEntry)() == __name__) {
            document.body.style.overflow = 'hidden';
            await (await new Promise((resolve_1, reject_1) => { require(['./webui2'], resolve_1, reject_1); })).renderPackagePanel();
        }
    })();
});
