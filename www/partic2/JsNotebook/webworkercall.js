define("partic2/JsNotebook/webworkercall", ["require", "exports", "partic2/jsutils1/base"], function (require, exports, base_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.prismHighlightJS = prismHighlightJS;
    let __name__ = base_1.requirejs.getLocalRequireModule(require);
    async function prismHighlightJS(text) {
        let { highlight, languages } = await new Promise((resolve_1, reject_1) => { require(['./prism/prism'], resolve_1, reject_1); });
        await new Promise((resolve_2, reject_2) => { require(['./prism/prism-javascript'], resolve_2, reject_2); });
        return highlight(text, languages.javascript, 'javascript');
    }
});
