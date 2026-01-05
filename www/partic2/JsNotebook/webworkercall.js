define(["require", "exports", "./prism/prism", "./prism/prism-javascript"], function (require, exports, prism_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.prismHighlightJS = prismHighlightJS;
    async function prismHighlightJS(text) {
        return (0, prism_1.highlight)(text, prism_1.languages.javascript, 'javascript');
    }
});
//# sourceMappingURL=webworkercall.js.map