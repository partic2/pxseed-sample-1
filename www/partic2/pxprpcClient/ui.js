define(["require", "exports", "preact", "./registry", "partic2/pComponentUi/domui", "partic2/jsutils1/base"], function (require, exports, React, registry_1, domui_1, base_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.RegistryUI = void 0;
    class AddCard extends domui_1.SimpleReactForm1 {
        setNewWebWorker() {
            this.value = { url: 'webworker:' + (0, base_1.GenerateRandomString)() };
        }
        render(props, state, context) {
            return React.createElement("div", { class: domui_1.css.simpleCard },
                React.createElement("input", { type: "text", ref: this.getRefForInput("name"), placeholder: 'name' }),
                React.createElement("br", null),
                React.createElement("input", { type: "text", ref: this.getRefForInput("url"), placeholder: 'url' }),
                React.createElement("br", null),
                React.createElement("a", { href: "javascript:;", onClick: () => this.props.onAdd(this.value) }, "Add"),
                "\u00A0",
                React.createElement("a", { href: "javascript:;", onClick: () => this.setNewWebWorker() }, "NewWorker"));
        }
    }
    class RegistryUI extends React.Component {
        constructor() {
            super(...arguments);
            this.rref = { div: React.createRef() };
        }
        async doLoadConfig() {
            await registry_1.persistent.load();
            this.forceUpdate(() => {
                let div = this.rref.div.current;
                div?.dispatchEvent(new Event(domui_1.event.layout, { bubbles: true }));
            });
        }
        componentDidMount() {
            this.doLoadConfig();
        }
        async doAdd(info) {
            await (0, registry_1.addClient)(info.url, info.name);
            await registry_1.persistent.save();
            this.forceUpdate();
        }
        async doDrop() {
            await (0, registry_1.dropClient)(this.state.selected);
            await registry_1.persistent.save();
            this.forceUpdate();
        }
        async doConfirm() {
            this.props.onSelectConfirm?.((0, registry_1.getRegistered)(this.state.selected));
        }
        async doCancel() {
            this.props.onSelectConfirm?.(null);
        }
        async doSelect(selected) {
            this.setState({ selected });
        }
        async doDisconnect() {
            let conn = (0, registry_1.getRegistered)(this.state.selected);
            await conn.disconnect();
            this.forceUpdate();
        }
        async doConnect() {
            let conn = (0, registry_1.getRegistered)(this.state.selected);
            await conn.ensureConnected();
            this.forceUpdate();
        }
        render(props, state, context) {
            let btns = [];
            let sel2 = (0, registry_1.getRegistered)(this.state.selected ?? '');
            if (sel2) {
                if (sel2.connected()) {
                    btns.push({ label: 'Disconnect', handler: () => this.doDisconnect() });
                }
                else {
                    btns.push({ label: 'Connect', handler: () => this.doConnect() });
                }
                btns.push({ label: 'Drop', handler: () => this.doDrop() });
            }
            if (this.props.onSelectConfirm) {
                btns.push({ label: 'Confirm', handler: () => this.doConfirm() });
                btns.push({ label: 'Cancel', handler: () => this.doCancel() });
            }
            return React.createElement("div", { className: domui_1.css.simpleCard, ref: this.rref.div },
                "PXPRPC Connection:",
                React.createElement("br", null),
                Array.from((0, registry_1.listRegistered)()).map(ent => {
                    return React.createElement("div", { key: ent[0], className: [domui_1.css.simpleCard, domui_1.css.selectable, this.state.selected === ent[0] ? domui_1.css.selected : ''].join(' '), onClick: () => this.doSelect(ent[0]) },
                        React.createElement("div", null, ent[0]),
                        React.createElement("div", null, ent[1].url.toString()),
                        React.createElement("div", null, ent[1].connected() ? 'connected' : 'disconnected'));
                }),
                React.createElement(AddCard, { onAdd: (info) => this.doAdd(info) }),
                React.createElement("div", null, btns.map(v => React.createElement("span", null,
                    "\u2003",
                    React.createElement("a", { href: "javascript:;", onClick: v.handler }, v.label),
                    "\u2003"))));
        }
    }
    exports.RegistryUI = RegistryUI;
});
//# sourceMappingURL=ui.js.map