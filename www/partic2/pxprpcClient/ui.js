define(["require", "exports", "preact", "./registry", "partic2/pComponentUi/domui", "partic2/pComponentUi/window", "partic2/jsutils1/base", "./rpcworker", "partic2/jsutils1/webutils"], function (require, exports, React, registry_1, domui_1, window_1, base_1, rpcworker_1, webutils_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.RegistryUI = void 0;
    let css2 = {
        rpcClientCard: (0, base_1.GenerateRandomString)()
    };
    webutils_1.DynamicPageCSSManager.PutCss('.' + css2.rpcClientCard, ['word-break:break-all']);
    class AddCard extends React.Component {
        constructor(props, ctx) {
            super(props, ctx);
            this.setState({ url: '', name: '', rpcChain: [] });
        }
        setNewWebWorker() {
            let tname = this.state.name;
            if (tname === '') {
                for (let t1 of base_1.ArrayWrap2.IntSequence(0, 10000)) {
                    tname = 'partic2/pxprpcClient/registry/worker/' + String(t1);
                    if ((0, registry_1.getRegistered)(tname) == undefined) {
                        break;
                    }
                }
            }
            this.setState({
                url: 'webworker:' + (0, base_1.GenerateRandomString)(),
                name: tname
            });
        }
        decodeURISafe(s) {
            try {
                return decodeURIComponent(s);
            }
            catch (e) {
                return '';
            }
        }
        parseRpcChain(url) {
            let url1 = new URL(url);
            (0, base_1.assert)(url1.protocol === 'iooverpxprpc:');
            let chain1 = url1.pathname.split('/');
            return chain1.map(t1 => this.decodeURISafe(t1));
        }
        getAddClientInfo() {
            return {
                url: this.state.url,
                name: this.state.name
            };
        }
        setAddClientInfo(info) {
            this.setState({ url: info.url, name: info.name });
        }
        render(props, state, context) {
            return React.createElement("div", { className: [domui_1.css.simpleCard, domui_1.css.flexColumn].join(' ') },
                React.createElement("input", { type: "text", placeholder: 'name', value: this.state.name, onChange: (ev) => { this.setState({ name: ev.target.value }); } }),
                React.createElement("input", { type: "text", placeholder: 'url', value: this.state.url, onChange: (ev) => { this.setState({ url: ev.target.value }); } }),
                React.createElement("div", { className: [domui_1.css.flexRow].join(' '), style: { flexWrap: 'wrap' } },
                    React.createElement("a", { href: "javascript:;", onClick: () => this.setNewWebWorker() }, "|New WebWorker|")),
                this.state.url.startsWith('iooverpxprpc:') ? React.createElement("div", { className: [domui_1.css.flexColumn].join(' ') },
                    "RPC Chain:",
                    this.parseRpcChain(this.state.url).map(t1 => (React.createElement("div", null,
                        t1,
                        "->")))) : null);
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
            this.setState({ selected: null });
        }
        async doAdd() {
            let addCard = new domui_1.ReactRefEx();
            let dlg = await (0, window_1.prompt)(React.createElement(AddCard, { ref: addCard }), 'New rpc client');
            if (await dlg.response.get() === 'ok') {
                let { url, name } = (await addCard.waitValid()).getAddClientInfo();
                await (0, registry_1.addClient)(url, name);
            }
            dlg.close();
            await registry_1.persistent.save();
            this.forceUpdate();
        }
        async doEdit() {
            let selected = this.state.selected;
            let addCard = new domui_1.ReactRefEx();
            let dlg = await (0, window_1.prompt)(React.createElement(AddCard, { ref: addCard }), 'New rpc client');
            (await addCard.waitValid()).setAddClientInfo({
                name: selected,
                url: (0, registry_1.getRegistered)(selected)?.url ?? ''
            });
            if (await dlg.response.get() === 'ok') {
                let { url, name } = (await addCard.waitValid()).getAddClientInfo();
                await (0, registry_1.removeClient)(selected);
                await (0, registry_1.addClient)(url, name);
            }
            dlg.close();
            await registry_1.persistent.save();
            this.forceUpdate();
        }
        async doRemove() {
            await (0, registry_1.removeClient)(this.state.selected);
            await registry_1.persistent.save();
            this.forceUpdate();
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
            try {
                await conn.ensureConnected();
            }
            catch (e) {
                await (0, window_1.alert)(e.toString());
            }
            this.forceUpdate();
        }
        getSelected() {
            return this.state.selected;
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
                btns.push({ label: 'Edit', handler: () => this.doEdit() });
                btns.push({ label: 'Remove', handler: () => this.doRemove() });
            }
            btns.push({ label: 'Add', handler: () => this.doAdd() });
            let allClients = Array.from((0, registry_1.listRegistered)());
            allClients.sort((a, b) => (a[0] < b[0]) ? -1 : (a[0] === b[0] ? 0 : 1));
            return React.createElement("div", { className: [domui_1.css.simpleCard, domui_1.css.flexColumn].join(' '), ref: this.rref.div },
                React.createElement("h3", null, "PXPRPC Connection:"),
                allClients.map(ent => {
                    return React.createElement("div", { key: ent[0], className: [css2.rpcClientCard, domui_1.css.simpleCard, domui_1.css.selectable,
                            this.state.selected === ent[0] ? domui_1.css.selected : ''].join(' '), onClick: () => this.doSelect(ent[0]) },
                        React.createElement("div", null, ent[0]),
                        React.createElement("hr", null),
                        React.createElement("div", null, ent[1].url.toString()),
                        React.createElement("hr", null),
                        React.createElement("div", null, ent[1].connected() ? 'connected' : 'disconnected'));
                }),
                React.createElement("div", null, btns.map(v => React.createElement("span", null,
                    "\u2003",
                    React.createElement("a", { href: "javascript:;", onClick: v.handler }, v.label),
                    "\u2003"))),
                React.createElement("hr", null),
                React.createElement("div", { style: { wordBreak: 'break-all' } },
                    "RPC id for this scope:",
                    rpcworker_1.rpcId.get()));
        }
    }
    exports.RegistryUI = RegistryUI;
});
//# sourceMappingURL=ui.js.map