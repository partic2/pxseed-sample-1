define(["require", "exports", "partic2/jsutils1/webutils", "partic2/pxprpcClient/registry", "preact", "partic2/pComponentUi/window", "./notebook", "partic2/pComponentUi/workspace", "./workspace"], function (require, exports, webutils_1, registry_1, React, window_1, notebook_1, workspace_1, workspace_2) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.__name__ = void 0;
    exports.main = main;
    exports.__name__ = 'partic2/JsNotebook/index';
    let { RpcChooser } = notebook_1.__internal__;
    class MainView extends React.Component {
        renderChooser() {
            return React.createElement("div", { style: { border: 'solid 1px black' } },
                React.createElement(RpcChooser, { onChoose: async (rpc) => { this.openWorkspaceForRpc(rpc); } }));
        }
        openWorkspaceForRpc(rpc) {
            if (rpc == 'local window') {
                return (0, workspace_2.openWorkspaceWindowFor)('local window');
            }
            else if (rpc instanceof registry_1.ClientInfo) {
                return (0, workspace_2.openWorkspaceWindowFor)(rpc);
            }
            else {
                (0, window_1.alert)('Unsupported client');
            }
        }
        render(props, state, context) {
            return this.renderChooser();
        }
    }
    function* main(command) {
        if (command == 'webui') {
            (0, workspace_1.openNewWindow)(React.createElement(MainView, null), { title: 'JS Notebook RPC Chooser' });
        }
    }
    ;
    (async () => {
        if ((0, webutils_1.GetJsEntry)() == exports.__name__) {
            (0, webutils_1.useDeviceWidth)();
            webutils_1.DynamicPageCSSManager.PutCss('body', ['margin:0px']);
            let rpc = (0, webutils_1.GetUrlQueryVariable)('__rpc');
            await registry_1.persistent.load();
            (0, workspace_1.setBaseWindowView)(React.createElement(MainView, null));
        }
    })();
});
//# sourceMappingURL=index.js.map