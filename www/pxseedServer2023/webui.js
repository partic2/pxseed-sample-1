define(["require", "exports", "preact", "partic2/pComponentUi/texteditor", "partic2/pComponentUi/domui", "partic2/pComponentUi/window", "partic2/pComponentUi/workspace", "partic2/pxprpcClient/registry", "./clientFunction", "partic2/jsutils1/base", "partic2/jsutils1/webutils", "./webentry"], function (require, exports, React, texteditor_1, domui_1, window_1, workspace_1, registry_1, clientFunction_1, base_1, webutils_1, webentry_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.PxseedServerAdministrateTool = void 0;
    exports.main = main;
    async function alertIfError(p) {
        try {
            return await p();
        }
        catch (err) {
            (0, base_1.throwIfAbortError)(err);
            (0, window_1.alert)(err.message);
        }
    }
    class PxseedServerAdministrateTool extends React.Component {
        constructor(prop, ctx) {
            super(prop, ctx);
            this.rref = {
                configView: new domui_1.ReactRefEx()
            };
        }
        componentDidMount() {
            this.tryConnect();
        }
        async reloadServerConfig() {
            let cfg = await this.rpcFunc.getConfig();
            this.setState({
                serverConfig: cfg
            });
            (await this.rref.configView.waitValid()).setPlainText(JSON.stringify(cfg, undefined, 2));
        }
        async saveServerConfig() {
            await this.rpcFunc.saveConfig(JSON.parse((await this.rref.configView.waitValid()).getPlainText()));
        }
        async buildEnviron() {
            let resp = await this.rpcFunc.buildEnviron();
            (0, window_1.prompt)(React.createElement("pre", null, resp));
        }
        async buildPackage() {
            await alertIfError(async () => {
                let resp = await this.rpcFunc.buildPackages();
                let wnd = await (0, window_1.prompt)(React.createElement("pre", null, resp));
                await wnd.answer.get();
                wnd.close();
            });
        }
        async forceRebuildPackages() {
            await alertIfError(async () => {
                let resp = await this.rpcFunc.rebuildPackages();
                let wnd = await (0, window_1.prompt)(React.createElement("pre", null, resp));
                await wnd.answer.get();
                wnd.close();
            });
        }
        async restartSubprocess(index) {
            await alertIfError(async () => {
                await this.rpcFunc.subprocessRestart(index);
                await (0, window_1.alert)('restart done');
            });
        }
        renderConnected() {
            return React.createElement("div", { className: domui_1.css.flexColumn },
                React.createElement("h2", null, "Server config"),
                React.createElement("div", { className: domui_1.css.flexColumn },
                    React.createElement("div", { className: domui_1.css.flexColumn, style: { overflowY: 'auto', maxHeight: '300px', display: 'flex' } },
                        React.createElement(texteditor_1.TextEditor, { ref: this.rref.configView, divClass: [domui_1.css.simpleCard] }),
                        React.createElement("div", { className: domui_1.css.flexRow, style: { textAlign: 'center' } },
                            React.createElement("a", { href: "javascript:;", onClick: () => this.reloadServerConfig(), style: { flexGrow: '1' } }, "reload"),
                            React.createElement("a", { href: "javascript:;", onClick: () => this.saveServerConfig(), style: { flexGrow: '1' } }, "save")))),
                React.createElement("h2", null, "Command"),
                React.createElement("div", { className: domui_1.css.flexColumn },
                    React.createElement("a", { href: "javascript:;", onClick: () => this.buildEnviron() }, "build environ"),
                    React.createElement("a", { href: "javascript:;", onClick: () => this.buildPackage() }, "build packages"),
                    React.createElement("a", { href: "javascript:;", onClick: () => this.forceRebuildPackages() }, "force rebuild pakcages"),
                    React.createElement("a", { href: "javascript:;" }, "stop server"),
                    (this.state.serverConfig?.deamonMode?.enabled == true) ? this.state.serverConfig.deamonMode.subprocessConfig.map((cfg, index) => {
                        return React.createElement("a", { href: "javascript:;", onClick: () => this.restartSubprocess(index) },
                            "restart subprocess ",
                            index,
                            " on ",
                            `${cfg.listenOn?.host}:${cfg.listenOn?.port}`);
                    }) : null));
        }
        async doLogin() {
            await (0, webentry_1.updatePxseedServerConfig)(this.state.pxprpcKey);
            this.tryConnect();
            this.setState({ scene: 'connected' });
        }
        async tryConnect() {
            try {
                if (this.rpcFunc == undefined) {
                    let rpc = await (await (0, registry_1.getPersistentRegistered)(registry_1.ServerHostRpcName)).ensureConnected();
                    this.rpcFunc = new clientFunction_1.PxseedServer2023Function();
                    await this.rpcFunc.init(rpc);
                }
                let cfg = await this.rpcFunc.getConfig();
                this.setState({
                    serverConfig: cfg,
                    scene: 'connected'
                });
                (await this.rref.configView.waitValid()).setPlainText(JSON.stringify(cfg, undefined, 2));
            }
            catch (err) {
                (0, base_1.throwIfAbortError)(err);
                (0, window_1.alert)(err.message, 'Error');
                this.setState({ scene: 'tryLogin' });
            }
        }
        renderTryLogin() {
            return React.createElement("div", null,
                "pxprpc key:",
                React.createElement("input", { type: "text", value: this.state.pxprpcKey, onChange: (ev) => {
                        this.setState({ pxprpcKey: ev.target.value });
                    } }),
                React.createElement("a", { href: "javascript:;", onClick: () => this.doLogin() }, "connect"));
        }
        render(props, state, context) {
            switch (this.state.scene) {
                case 'tryLogin':
                    return this.renderTryLogin();
                case 'connected':
                    return this.renderConnected();
                default:
                    return this.renderTryLogin();
            }
        }
    }
    exports.PxseedServerAdministrateTool = PxseedServerAdministrateTool;
    let __name__ = base_1.requirejs.getLocalRequireModule(require);
    function* main() {
        (0, workspace_1.openNewWindow)(React.createElement(PxseedServerAdministrateTool, null), {
            title: 'PxseedServerAdministrateTool'
        });
    }
    ;
    (async () => {
        if (__name__ == (0, webutils_1.GetJsEntry)()) {
            (0, domui_1.ReactRender)(React.createElement(PxseedServerAdministrateTool, null), domui_1.DomRootComponent);
        }
    })();
});
//# sourceMappingURL=webui.js.map