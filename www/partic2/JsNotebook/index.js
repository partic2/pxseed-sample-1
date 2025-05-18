define(["require", "exports", "partic2/jsutils1/webutils", "partic2/pComponentUi/domui", "partic2/pxprpcClient/registry", "preact", "./workspace", "partic2/pComponentUi/window", "./misclib", "partic2/CodeRunner/CodeContext", "partic2/CodeRunner/RemoteCodeContext", "partic2/pComponentUi/workspace"], function (require, exports, webutils_1, domui_1, registry_1, React, workspace_1, window_1, misclib_1, CodeContext_1, RemoteCodeContext_1, workspace_2) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.__name__ = void 0;
    exports.main = main;
    exports.__name__ = 'partic2/JsNotebook/index';
    class MainView extends React.Component {
        renderChooser() {
            return React.createElement("div", { style: { border: 'solid 1px black' } },
                React.createElement(misclib_1.CodeContextChooser, { onChoose: async (rpc) => { this.setState({ rpc }); } }));
        }
        renderWorkerspace() {
            let rpc = this.state.rpc;
            if (rpc == 'local window' || (rpc instanceof CodeContext_1.LocalRunCodeContext)) {
                return React.createElement(workspace_1.Workspace, { divStyle: { height: '100%' } });
            }
            else if (rpc instanceof registry_1.ClientInfo) {
                return React.createElement(workspace_1.Workspace, { divStyle: { height: '100%' }, rpc: rpc });
            }
            else if (rpc instanceof RemoteCodeContext_1.RemoteRunCodeContext) {
                return React.createElement(workspace_1.Workspace, { divStyle: { height: '100%' }, rpc: (0, misclib_1.findRpcClientInfoFromClient)(rpc.client1) });
            }
            else {
                (0, window_1.alert)('Not support client');
            }
        }
        render(props, state, context) {
            return this.state.rpc == undefined ? this.renderChooser() : this.renderWorkerspace();
        }
    }
    function* main(command) {
        if (command == 'webui') {
            (0, workspace_2.openNewWindow)(React.createElement(MainView, null), { title: 'JS Notebook' });
        }
    }
    ;
    (async () => {
        if ((0, webutils_1.GetJsEntry)() == exports.__name__) {
            (0, webutils_1.useDeviceWidth)();
            webutils_1.DynamicPageCSSManager.PutCss('body', ['margin:0px']);
            let rpc = (0, webutils_1.GetUrlQueryVariable)('__rpc');
            await registry_1.persistent.load();
            (0, domui_1.ReactRender)(React.createElement(MainView, null), domui_1.DomRootComponent);
        }
    })();
});
//# sourceMappingURL=index.js.map