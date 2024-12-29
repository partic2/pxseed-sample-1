define(["require", "exports", "partic2/jsutils1/webutils", "partic2/pComponentUi/domui", "partic2/pxprpcClient/registry", "partic2/pxprpcClient/ui", "preact", "./workspace"], function (require, exports, webutils_1, domui_1, registry_1, ui_1, React, workspace_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.__name__ = void 0;
    exports.__name__ = 'partic2/JsNotebook/index';
    class ResourcePanel extends React.Component {
        render(props, state, context) {
            return React.createElement("div", null,
                React.createElement(ui_1.RegistryUI, null));
        }
    }
    ;
    (async () => {
        if ((0, webutils_1.GetJsEntry)() == exports.__name__) {
            (0, webutils_1.useDeviceWidth)();
            webutils_1.DynamicPageCSSManager.PutCss('body', ['margin:0px']);
            let rpc = (0, webutils_1.GetUrlQueryVariable)('__rpc');
            await registry_1.persistent.load();
            (0, domui_1.ReactRender)(React.createElement("div", null,
                React.createElement("h2", null, "From..."),
                React.createElement("a", { href: "javascript:;", onClick: () => {
                        (0, domui_1.ReactRender)(React.createElement("div", { style: { width: '99vw', height: '98vh' } },
                            React.createElement(workspace_1.Workspace, null)), domui_1.DomRootComponent);
                    } }, "Local Window"),
                React.createElement("h2", null, "or"),
                React.createElement(ui_1.RegistryUI, { onSelectConfirm: (selected) => {
                        if (selected !== null) {
                            (0, domui_1.ReactRender)(React.createElement("div", { style: { width: '99vw', height: '98vh' } },
                                React.createElement(workspace_1.Workspace, { rpc: selected })), domui_1.DomRootComponent);
                        }
                    } })), domui_1.DomRootComponent);
        }
    })();
});
//# sourceMappingURL=index.js.map