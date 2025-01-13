define(["require", "exports", "partic2/jsutils1/webutils", "partic2/pComponentUi/domui", "partic2/pxprpcClient/registry", "partic2/pxprpcClient/ui", "preact", "./workspace", "partic2/pComponentUi/window", "./misclib", "partic2/CodeRunner/CodeContext", "../CodeRunner/RemoteCodeContext"], function (require, exports, webutils_1, domui_1, registry_1, ui_1, React, workspace_1, window_1, misclib_1, CodeContext_1, RemoteCodeContext_1) {
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
            (0, domui_1.ReactRender)(React.createElement(misclib_1.CodeContextChooser, { onChoose: (rpc) => {
                    if (rpc == 'local window' || (rpc instanceof CodeContext_1.LocalRunCodeContext)) {
                        (0, domui_1.ReactRender)(React.createElement(workspace_1.Workspace, { divStyle: { height: '100vh' } }), domui_1.DomRootComponent);
                    }
                    else if (rpc instanceof registry_1.ClientInfo) {
                        (0, domui_1.ReactRender)(React.createElement(workspace_1.Workspace, { divStyle: { height: '100vh' }, rpc: rpc }), domui_1.DomRootComponent);
                    }
                    else if (rpc instanceof RemoteCodeContext_1.RemoteRunCodeContext) {
                        (0, domui_1.ReactRender)(React.createElement(workspace_1.Workspace, { divStyle: { height: '100vh' }, rpc: (0, misclib_1.findRpcClientInfoFromClient)(rpc.client1) }), domui_1.DomRootComponent);
                    }
                    else {
                        (0, window_1.alert)('Not support client');
                    }
                } }), domui_1.DomRootComponent);
        }
    })();
});
//# sourceMappingURL=index.js.map