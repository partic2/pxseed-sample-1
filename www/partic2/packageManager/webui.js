define(["require", "exports", "partic2/jsutils1/webutils", "partic2/jsutils1/base", "partic2/pComponentUi/workspace", "preact"], function (require, exports, webutils_1, base_1, workspace_1, React) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.navigateWindowToThisWebui = navigateWindowToThisWebui;
    const __name__ = base_1.requirejs.getLocalRequireModule(require);
    let config = {};
    ;
    (async () => {
        if ((0, webutils_1.GetJsEntry)() == __name__) {
            config = await (0, webutils_1.GetPersistentConfig)(__name__);
            config.packageManagerWebuiEntry = config.packageManagerWebuiEntry ?? 'partic2/packageManager/webui2';
            //To support multi-desktop
            (0, workspace_1.setBaseWindowView)(React.createElement("iframe", { style: { verticalAlign: 'top', width: '100%', height: '100%', padding: '0px', border: '0px' }, src: (0, webutils_1.BuildUrlFromJsEntryModule)(config.packageManagerWebuiEntry) }));
            document.body.style.overflow = 'hidden';
        }
    })();
    function navigateWindowToThisWebui(urlarg) {
        window.open((0, webutils_1.BuildUrlFromJsEntryModule)(__name__, urlarg), '_self');
    }
});
//# sourceMappingURL=webui.js.map