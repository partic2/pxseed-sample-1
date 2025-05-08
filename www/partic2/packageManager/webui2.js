define(["require", "exports", "preact", "partic2/pComponentUi/domui", "partic2/CodeRunner/RemoteCodeContext", "partic2/pxprpcClient/registry", "partic2/jsutils1/base", "partic2/jsutils1/webutils", "partic2/pComponentUi/input", "partic2/pComponentUi/window", "partic2/CodeRunner/jsutils2", "partic2/CodeRunner/CodeContext", "partic2/JsNotebook/workspace", "partic2/pComponentUi/texteditor"], function (require, exports, React, domui_1, RemoteCodeContext_1, registry_1, base_1, webutils_1, input_1, window_1, jsutils2_1, CodeContext_1, workspace_1, texteditor_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.renderPackagePanel = exports.__name__ = void 0;
    exports.close = close;
    var registryModuleName = 'partic2/packageManager/registry';
    exports.__name__ = base_1.requirejs.getLocalRequireModule(require);
    let i18n = {
        install: 'install',
        list: 'list',
        filter: 'filter',
        urlOrPackageName: 'url/package name',
        exportInstallation: 'export installation',
        importInstallation: 'import installation',
        createPackage: 'create package',
        webui: 'webui',
        uninstall: 'uninstall',
        error: 'error'
    };
    if (navigator.language.split('-').includes('zh')) {
        i18n.install = '安装';
        i18n.list = '列出';
        i18n.filter = '过滤';
        i18n.urlOrPackageName = 'url或包名';
        i18n.exportInstallation = '导出安装配置';
        i18n.importInstallation = '导入安装配置';
        i18n.createPackage = '创建包';
        i18n.uninstall = '卸载';
        i18n.error = '错误';
    }
    let codeCellShell = new jsutils2_1.Singleton(async () => {
        await registry_1.persistent.load();
        let rpc = (0, registry_1.getRegistered)(registry_1.ServerHostWorker1RpcName);
        (0, base_1.assert)(rpc != null);
        let codeContext = new RemoteCodeContext_1.RemoteRunCodeContext(await rpc.ensureConnected());
        CodeContext_1.registry.set(registryModuleName, codeContext);
        return new CodeContext_1.CodeContextShell(codeContext);
    });
    async function getServerCodeShell() {
        let ccs = await codeCellShell.get();
        let mod = await ccs.importModule(registryModuleName, 'registry');
        return {
            shell: codeCellShell,
            registry: mod.toModuleProxy()
        };
    }
    const SimpleButton = (props) => React.createElement("a", { href: "javascript:;", onClick: () => props.onClick(), className: domui_1.css.simpleCard }, props.children);
    class PackagePanel extends React.Component {
        constructor(props, context) {
            super(props, context);
            this.rref = {
                createPackageGuide: React.createRef(),
                createPackageForm: React.createRef(),
                installPackageName: new domui_1.ReactRefEx(),
                listFilter: new domui_1.ReactRefEx()
            };
            this.filterString = 'webui';
            this.setState({ packageList: [], errorMessage: '' });
        }
        async install() {
            let dlg = await (0, window_1.prompt)(React.createElement("div", { style: { backgroundColor: 'white' } },
                i18n.urlOrPackageName,
                ":",
                React.createElement(texteditor_1.TextEditor, { ref: this.rref.installPackageName, divClass: [domui_1.css.simpleCard], divStyle: { width: Math.min(window.innerWidth - 8, 300) } })), i18n.install);
            if ((await dlg.answer.get()) === 'cancel') {
                dlg.close();
                return;
            }
            let source = (await this.rref.installPackageName.waitValid()).getPlainText();
            dlg.close();
            let { registry } = await getServerCodeShell();
            this.setState({ errorMessage: 'Installing...' });
            try {
                await registry.installPackage(source);
                this.setState({ errorMessage: 'done' });
                this.refreshList();
            }
            catch (e) {
                this.setState({ errorMessage: 'Failed:' + e.toString() });
            }
        }
        async exportPackagesInstallation() {
            let { registry } = await getServerCodeShell();
            let result = await registry.exportPackagesInstallation();
            (0, webutils_1.RequestDownload)(new TextEncoder().encode(JSON.stringify(result)), 'export.txt');
        }
        async importPackagesInstallation() {
            let selected = await (0, webutils_1.selectFile)();
            if (selected != null && selected.length > 0) {
                let { registry } = await getServerCodeShell();
                registry.importPackagesInstallation(JSON.parse(new TextDecoder().decode((await (0, base_1.GetBlobArrayBufferContent)(selected.item(0))))));
            }
        }
        async requestListPackage() {
            let dlg = await (0, window_1.prompt)(React.createElement("div", { style: { backgroundColor: 'white' } },
                i18n.filter,
                ":",
                React.createElement(texteditor_1.TextEditor, { ref: this.rref.listFilter, divClass: [domui_1.css.simpleCard], divStyle: { width: Math.min(window.innerWidth - 8, 300) } })), i18n.list);
            (await this.rref.listFilter.waitValid()).setPlainText(this.filterString);
            if ((await dlg.answer.get()) === 'cancel') {
                dlg.close();
                return;
            }
            else {
                this.filterString = this.rref.listFilter.current.getPlainText();
                dlg.close();
                await this.refreshList();
            }
        }
        async refreshList() {
            try {
                let { registry } = await getServerCodeShell();
                this.setState({
                    packageList: await registry.listPackagesArray(this.filterString),
                    errorMessage: ''
                });
            }
            catch (err) {
                codeCellShell.i = null;
                this.setState({
                    packageList: [{
                            "loaders": [
                                {
                                    "name": "typescript"
                                }
                            ],
                            "name": "partic2/JsNotebook",
                            "options": {
                                "partic2/packageManager/registry": {
                                    "webui": {
                                        "entry": "partic2/JsNotebook/index"
                                    }
                                }
                            }
                        }, {
                            "loaders": [
                                {
                                    "name": "typescript"
                                }, {
                                    "name": "rollup",
                                    "entryModules": [
                                        "preact"
                                    ]
                                }
                            ],
                            "name": "pxseedServer2023",
                            "options": {
                                "partic2/packageManager/registry": {
                                    "webui": {
                                        "entry": "pxseedServer2023/webui"
                                    }
                                }
                            }
                        }],
                    errorMessage: err.message
                });
            }
        }
        async showCreatePackage() {
            this.rref.createPackageGuide.current?.active();
            this.rref.createPackageForm.current.value = {
                name: 'partic2/createPkgDemo',
                loaders: `[
{"name": "copyFiles","include": ["assets/**/*"]},
{"name": "typescript"}
]`,
                webuiEntry: './index',
                dependencies: '',
                repositories: [{
                        scope: 'partic2',
                        'url template': 'https://github.com/partic2/pxseed-${subname}'
                    }]
            };
        }
        async createPackageBtn(pkgInfoIn, subbtn) {
            let { registry } = await getServerCodeShell();
            if (subbtn === 'create') {
                let opt = {};
                let webuiEntry = pkgInfoIn.webuiEntry;
                if (webuiEntry.startsWith('./')) {
                    webuiEntry = pkgInfoIn.name + webuiEntry.substring(1);
                }
                opt.webui = {
                    entry: webuiEntry,
                    label: pkgInfoIn.name
                };
                opt.dependencies = pkgInfoIn.dependencies.split(',').filter(v => v != '');
                opt.repositories = {};
                pkgInfoIn.repositories.forEach((v) => {
                    opt.repositories[v.scope] = [...(opt.repositories?.[v.scope] ?? []), v['url template']];
                });
                let r1 = {
                    name: pkgInfoIn.name,
                    loaders: JSON.parse(pkgInfoIn.loaders),
                    options: {
                        'partic2/packageManager/registry': opt
                    }
                };
                this.setState({ errorMessage: 'creating...' });
                try {
                    await registry.createPackageTemplate1(r1);
                    this.setState({ errorMessage: 'done' });
                }
                catch (e) {
                    this.setState({ errorMessage: e.toString() });
                }
            }
            else if (subbtn === 'fill repositories') {
                try {
                    let scopeName = pkgInfoIn.name.split('/')[0];
                    let urlTpl = await registry.getUrlTemplateFromScopeName(scopeName);
                    if (urlTpl != undefined) {
                        pkgInfoIn.repositories = urlTpl.map(v => ({
                            scope: scopeName,
                            ['url template']: v
                        }));
                    }
                    this.rref.createPackageForm.current.value = pkgInfoIn;
                }
                catch (e) {
                    await (0, window_1.alert)(e.toString());
                }
            }
        }
        async uninstallPackage(pkgName) {
            if (await (0, window_1.confirm)(`Uninstall package ${pkgName}?`) == 'ok') {
                let { registry } = await getServerCodeShell();
                this.setState({ errorMessage: 'uninstalling...' });
                try {
                    await registry.uninstallPackage(pkgName);
                }
                catch (e) {
                    this.setState({ errorMessage: e.toString() });
                }
                this.setState({ errorMessage: 'done' });
                this.refreshList();
            }
        }
        async openNotebook() {
            try {
                await (0, workspace_1.openWorkspaceWindowFor)((await codeCellShell.get()).codeContext, 'packageManager/registry');
            }
            catch (err) {
                await (0, window_1.alert)(err.errorMessage, i18n.error);
            }
        }
        componentDidMount() {
            this.refreshList();
        }
        renderPackageList() {
            return this.state.packageList.map(pkg => {
                let cmd = [];
                cmd.push({ label: i18n.uninstall, click: () => {
                        this.uninstallPackage(pkg.name);
                    } });
                if (pkg.options != undefined && registryModuleName in pkg.options) {
                    let opt = pkg.options[registryModuleName];
                    if (opt.webui != undefined) {
                        cmd.push({ label: i18n.webui, click: async () => {
                                let entryModule = await new Promise((resolve_1, reject_1) => { require([opt.webui.entry], resolve_1, reject_1); });
                                if (typeof entryModule.main === 'function') {
                                    let r = entryModule.main('webui');
                                    if (Symbol.iterator in r) {
                                        base_1.Task.fork(r).run();
                                    }
                                }
                            } });
                    }
                }
                return React.createElement("div", { className: domui_1.css.flexRow, style: { alignItems: 'center', borderBottom: 'solid black 1px' } },
                    React.createElement("span", { style: { flexGrow: 1 } }, pkg.name),
                    React.createElement("div", { style: { display: 'inline-block', flexShrink: 1 } }, cmd.map(v => React.createElement(SimpleButton, { onClick: v.click }, v.label))));
            });
        }
        render(props, state, context) {
            return [
                React.createElement("div", { className: domui_1.css.flexColumn },
                    React.createElement("div", null,
                        React.createElement(SimpleButton, { onClick: () => this.requestListPackage() }, i18n.list),
                        React.createElement(SimpleButton, { onClick: () => this.install() }, i18n.install),
                        React.createElement(SimpleButton, { onClick: () => this.showCreatePackage() }, i18n.createPackage),
                        React.createElement(SimpleButton, { onClick: () => this.exportPackagesInstallation() }, i18n.exportInstallation),
                        React.createElement(SimpleButton, { onClick: () => this.importPackagesInstallation() }, i18n.importInstallation),
                        React.createElement(SimpleButton, { onClick: () => this.openNotebook() }, "notebook"),
                        React.createElement("div", { style: { display: 'inline-block', color: 'red' } }, this.state.errorMessage)),
                    React.createElement("div", { style: { flexGrow: 1 } }, this.renderPackageList())),
                React.createElement(window_1.WindowComponent, { ref: this.rref.createPackageGuide, title: i18n.createPackage },
                    React.createElement(input_1.JsonForm, { ref: this.rref.createPackageForm, divStyle: { minWidth: Math.min(window.innerWidth - 8, 400) }, type: {
                            type: 'object',
                            fields: [
                                ['name', { type: 'string' }],
                                ['loaders', { type: 'string' }],
                                ['webuiEntry', { type: 'string' }],
                                ['dependencies', { type: 'string' }],
                                ['repositories', { type: 'array', element: {
                                            type: 'object', fields: [
                                                ['scope', { type: 'string' }],
                                                ['url template', { type: 'string' }],
                                            ]
                                        } }],
                                ['btn1', { type: 'button', subbtn: ['create', 'fill repositories'],
                                        onClick: (parent, subbtn) => this.createPackageBtn(parent, subbtn) }]
                            ]
                        } }))
            ];
        }
    }
    //Module cleaner
    async function close() {
        if (codeCellShell != null) {
            if (codeCellShell instanceof CodeContext_1.CodeContextShell) {
                codeCellShell.codeContext.close();
            }
        }
    }
    let renderPackagePanel = async () => {
        (0, webutils_1.useDeviceWidth)();
        (0, domui_1.ReactRender)(React.createElement(PackagePanel, null), domui_1.DomRootComponent);
    };
    exports.renderPackagePanel = renderPackagePanel;
});
//# sourceMappingURL=webui2.js.map