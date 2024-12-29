define(["require", "exports", "preact", "partic2/pxprpcClient/registry"], function (require, exports, React, registry_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.DefaultActionBar = void 0;
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
});
//# sourceMappingURL=misclib.js.map