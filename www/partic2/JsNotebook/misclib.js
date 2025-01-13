define(["require", "exports", "preact", "partic2/pxprpcClient/registry", "partic2/pComponentUi/domui", "partic2/pxprpcClient/ui", "partic2/CodeRunner/CodeContext", "partic2/pComponentUi/window", "partic2/jsutils1/base"], function (require, exports, React, registry_1, domui_1, ui_1, CodeContext_1, window_1, base_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.CodeContextChooser = exports.DefaultActionBar = void 0;
    exports.findRpcClientInfoFromClient = findRpcClientInfoFromClient;
    class DefaultActionBar extends React.Component {
        processKeyEvent(evt) {
            if (evt.code === 'KeyS' && evt.ctrlKey) {
                if ('save' in this.props.action) {
                    this.props.action.save();
                    evt.preventDefault();
                }
            }
        }
        render(props, state, context) {
            let btn = [];
            for (let name in this.props.action) {
                if (name === 'save') {
                    btn.push({ id: name, label: 'Save(Ctrl+S)' });
                }
                else if (name === 'reload') {
                    btn.push({ id: name, label: 'Reload' });
                }
                else if (name === 'reloadCodeWorker') {
                    btn.push({ id: name, label: 'Reload Code Worker' });
                }
                else {
                    btn.push({ id: name, label: name });
                }
            }
            return btn.map(v => [React.createElement("span", null, "\u00A0\u00A0"), React.createElement("a", { href: "javascript:;", onClick: (ev) => this.props.action[v.id]() }, v.label), React.createElement("span", null, "\u00A0\u00A0")]);
        }
    }
    exports.DefaultActionBar = DefaultActionBar;
    function findRpcClientInfoFromClient(client) {
        for (let t1 of (0, registry_1.listRegistered)()) {
            if (t1[1].client === client) {
                return t1[1];
            }
        }
        return null;
    }
    class CodeContextChooser extends React.Component {
        constructor() {
            super(...arguments);
            this.rref = {
                registry: new domui_1.ReactRefEx(),
                registryContainerDiv: new domui_1.ReactRefEx()
            };
        }
        render(props, state, context) {
            return React.createElement("div", null,
                React.createElement("h2", null, "From..."),
                React.createElement("a", { href: "javascript:;", onClick: () => this.props.onChoose('local window') }, "Local Window"),
                React.createElement("h2", null,
                    "or ",
                    React.createElement("a", { href: "javascript:;", onClick: async () => {
                            let selected = (await this.rref.registry.waitValid()).getSelected();
                            if (selected == null) {
                                (0, window_1.alert)('select at least one rpc client below.');
                                (await this.rref.registryContainerDiv.waitValid()).style.border = 'solid red 2px';
                                await (0, base_1.sleep)(1000);
                                (await this.rref.registryContainerDiv.waitValid()).style.border = '0px';
                                return;
                            }
                            this.props.onChoose((0, registry_1.getRegistered)(selected));
                        } }, "Use RPC"),
                    " below"),
                React.createElement("div", { ref: this.rref.registryContainerDiv },
                    React.createElement(ui_1.RegistryUI, { ref: this.rref.registry })),
                React.createElement("div", null,
                    React.createElement("h2", null, "From RunCodeContext registry"),
                    CodeContext_1.registry.list().map(name => React.createElement("a", { href: "javascript:;", onClick: () => this.props.onChoose(CodeContext_1.registry.get(name)) }, name))));
        }
    }
    exports.CodeContextChooser = CodeContextChooser;
});
//# sourceMappingURL=misclib.js.map