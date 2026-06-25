define("partic2/pxprpcClient/ui", ["require", "exports", "preact", "./registry", "partic2/pComponentUi/domui", "partic2/pComponentUi/window", "partic2/jsutils1/base", "./rpcworker", "partic2/jsutils1/webutils"], function (require, exports, React, registry_1, domui_1, window_1, base_1, rpcworker_1, webutils_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.RegistryUI = void 0;
    let css2 = {
        rpcClientCard: (0, base_1.GenerateRandomString)()
    };
    let __name__ = base_1.requirejs.getLocalRequireModule(require);
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
    let config = null;
    async function pullFromServerHost() {
        let rpc = await (0, registry_1.getPersistentRegistered)(registry_1.ServerHostRpcName);
        if (rpc != undefined && !await (0, registry_1.isServerHost)()) {
            let result1 = await (0, registry_1.easyCallRemoteJsonFunction)(await rpc.ensureConnected(), webutils_1.path.join(__name__, '..', 'registry'), 'listPersistentRegistered', []);
            for (let t1 of result1) {
                if (t1[0] == registry_1.ServerHostRpcName)
                    continue;
                let existed = await (0, registry_1.getPersistentRegistered)(t1[0]);
                if (existed == null || t1[1].url.startsWith(`iooverpxprpc:${registry_1.ServerHostRpcName}`)) {
                    if (t1[1].url.startsWith('iooverpxprpc:')) {
                        await (0, registry_1.addClient)(`iooverpxprpc:${registry_1.ServerHostRpcName}/${t1[1].url.substring('iooverpxprpc:'.length)}`);
                    }
                    else {
                        await (0, registry_1.addClient)(`iooverpxprpc:${registry_1.ServerHostRpcName}/${encodeURIComponent(t1[1].url)}`, t1[0]);
                    }
                }
            }
        }
    }
    async function pushToServerHost() {
        let rpc = (0, registry_1.getRegistered)(registry_1.ServerHostRpcName);
        if (rpc != undefined && !await (0, registry_1.isServerHost)()) {
            let remoteClientList = new Map(await (0, registry_1.easyCallRemoteJsonFunction)(await rpc.ensureConnected(), webutils_1.path.join(__name__, '..', 'registry'), 'listPersistentRegistered', []));
            let toRemove = new Array();
            let toAdd = new Array();
            let registered = await (0, registry_1.listPersistentRegistered)();
            for (let t1 of registered) {
                if (t1[1].url.startsWith(`iooverpxprpc:${registry_1.ServerHostRpcName}/`)) {
                    let restRpcPath = t1[1].url.substring(`iooverpxprpc:${registry_1.ServerHostRpcName}/`.length);
                    if (restRpcPath.indexOf('/') >= 0) {
                        restRpcPath = 'iooverpxprpc:' + restRpcPath;
                    }
                    else {
                        restRpcPath = decodeURIComponent(restRpcPath);
                    }
                    if (remoteClientList.get(t1[0])?.url != restRpcPath) {
                        toAdd.push([restRpcPath, t1[0]]);
                    }
                }
            }
            for (let t1 of remoteClientList.keys()) {
                if ((0, registry_1.getRegistered)(t1) == undefined) {
                    toRemove.push(t1);
                }
            }
            for (let t1 of toAdd) {
                await (0, registry_1.easyCallRemoteJsonFunction)(await rpc.ensureConnected(), webutils_1.path.join(__name__, '..', 'registry'), 'addClient', t1);
            }
            for (let t1 of toRemove) {
                await (0, registry_1.easyCallRemoteJsonFunction)(await rpc.ensureConnected(), webutils_1.path.join(__name__, '..', 'registry'), 'removeClient', [t1]);
            }
        }
    }
    class RegistryUI extends React.Component {
        constructor() {
            super(...arguments);
            this.rref = { div: React.createRef() };
        }
        async doLoadConfig() {
            if (config == null) {
                config = await (0, webutils_1.GetPersistentConfig)(__name__);
                if (config.lastFilter != undefined) {
                    this.setState({ filter: config.lastFilter });
                }
            }
            let r = await this._getRegistyModule();
            this.setState({ clients: await r.listPersistentRegistered() }, () => {
                let div = this.rref.div.current;
                div?.dispatchEvent(new Event(domui_1.event.layout, { bubbles: true }));
            });
        }
        componentDidMount() {
            this.doLoadConfig();
            this.setState({ selected: null, filter: '' });
        }
        async _getRegistyModule() {
            if (this.props.rpc == undefined) {
                return await new Promise((resolve_1, reject_1) => { require(['./registry'], resolve_1, reject_1); });
            }
            else {
                return await (0, registry_1.importRemoteModule)(this.props.rpc, webutils_1.path.join(__name__, '..', 'registry'));
            }
        }
        async doAdd() {
            let addCard = new domui_1.ReactRefEx();
            let dlg = await (0, window_1.prompt)(React.createElement(AddCard, { ref: addCard }), 'New rpc client');
            (await addCard.waitValid()).setAddClientInfo({ name: 'user.', url: '' });
            if (await dlg.response.get() === 'ok') {
                let { url, name } = (await addCard.waitValid()).getAddClientInfo();
                let r = await this._getRegistyModule();
                await r.addClient(url, name);
            }
            dlg.close();
            await this.doLoadConfig();
        }
        async doEdit() {
            let selected = this.state.selected;
            let addCard = new domui_1.ReactRefEx();
            let dlg = await (0, window_1.prompt)(React.createElement(AddCard, { ref: addCard }), 'New rpc client');
            (await addCard.waitValid()).setAddClientInfo({
                name: selected,
                url: this.state.clients.find(t1 => t1[0] == selected)[1].url
            });
            if (await dlg.response.get() === 'ok') {
                let { url, name } = (await addCard.waitValid()).getAddClientInfo();
                let r = await this._getRegistyModule();
                await r.removeClient(selected);
                await r.addClient(url, name);
            }
            dlg.close();
            await this.doLoadConfig();
        }
        async doRemove() {
            let r = await this._getRegistyModule();
            await r.removeClient(this.state.selected);
            await this.doLoadConfig();
        }
        async doSelect(selected) {
            this.setState({ selected });
        }
        async doDisconnect() {
            let conn = (0, registry_1.getRegistered)(this.state.selected);
            await conn.disconnect();
            await this.doLoadConfig();
        }
        async doSyncWithServer() {
            try {
                await pullFromServerHost();
                await pushToServerHost();
                await this.doLoadConfig();
            }
            catch (err) {
                (0, window_1.alert)(err.toString() + err.stack);
            }
        }
        async doConnect() {
            let conn = (0, registry_1.getRegistered)(this.state.selected);
            try {
                await conn.ensureConnected();
            }
            catch (e) {
                await (0, window_1.alert)(e.toString());
            }
            await this.doLoadConfig();
        }
        getSelected() {
            return this.state.selected;
        }
        async onFilterChange(newFilter) {
            if (config == null) {
                config = await (0, webutils_1.GetPersistentConfig)(__name__);
            }
            config.lastFilter = newFilter;
            await (0, webutils_1.SavePersistentConfig)(__name__, config);
            this.setState({ filter: newFilter });
        }
        render(props, state, context) {
            let btns = [];
            let sel2 = (0, registry_1.getRegistered)(this.state.selected ?? '');
            if (sel2) {
                if (this.props.rpc == undefined) {
                    if (sel2.connected()) {
                        btns.push({ label: 'Disconnect', handler: () => this.doDisconnect() });
                    }
                    else {
                        btns.push({ label: 'Connect', handler: () => this.doConnect() });
                    }
                }
                btns.push({ label: 'Edit/Copy', handler: () => this.doEdit() });
                btns.push({ label: 'Remove', handler: () => this.doRemove() });
            }
            btns.push({ label: 'Add', handler: () => this.doAdd() });
            if (this.props.rpc == undefined) {
                btns.push({ label: 'SyncWithServer', handler: () => this.doSyncWithServer() });
            }
            let allClients = (this.state.clients ?? []);
            allClients.sort((a, b) => (a[0] < b[0]) ? -1 : (a[0] === b[0] ? 0 : 1));
            return React.createElement("div", { className: [domui_1.css.simpleCard, domui_1.css.flexColumn].join(' '), ref: this.rref.div },
                React.createElement("div", { className: domui_1.css.flexRow },
                    React.createElement("b", { style: { flexGrow: '0', flexShrink: '1' } }, "PXPRPC Connection:"),
                    React.createElement("input", { type: "text", placeholder: "filter", style: { flexGrow: '1', flexShrink: '1' }, onChange: (e) => this.onFilterChange(e.target.value), value: this.state.filter })),
                React.createElement("div", null, btns.map(v => React.createElement("span", null,
                    "\u2003",
                    React.createElement("a", { href: "javascript:;", onClick: v.handler }, v.label),
                    "\u2003"))),
                allClients.filter(t1 => t1[0].includes(this.state.filter)).map(ent => {
                    return React.createElement("div", { key: ent[0], className: [css2.rpcClientCard, domui_1.css.simpleCard, domui_1.css.selectable,
                            this.state.selected === ent[0] ? domui_1.css.selected : ''].join(' '), onClick: () => this.doSelect(ent[0]) },
                        React.createElement("div", null, ent[0]),
                        React.createElement("hr", null),
                        React.createElement("div", null, ent[1].url.toString()),
                        React.createElement("hr", null),
                        this.props.rpc == undefined ? React.createElement("div", null, ent[1].connected() ? 'connected' : 'disconnected') : '');
                }),
                React.createElement("hr", null),
                this.props.rpc == undefined ? React.createElement("div", { style: { wordBreak: 'break-all' } },
                    "RPC id:",
                    rpcworker_1.rpcId.get()) : '');
        }
    }
    exports.RegistryUI = RegistryUI;
});
