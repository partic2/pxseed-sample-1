define("partic2/pxseedMedia1/index1", ["require", "exports", "partic2/jsutils1/webutils"], function (require, exports, webutils_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.__name__ = void 0;
    exports.getIconUrl = getIconUrl;
    exports.__name__ = 'partic2/pxseedMedia1/index1';
    let resourceManager = (0, webutils_1.getResourceManager)(exports.__name__);
    function getIconUrl(iconName) {
        return resourceManager.getUrl(`icons/${iconName}`);
    }
});
