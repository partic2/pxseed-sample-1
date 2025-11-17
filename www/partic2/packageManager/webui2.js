define("partic2/packageManager/webui2", ["require", "exports", "preact", "partic2/pComponentUi/domui", "partic2/pxprpcClient/registry", "partic2/jsutils1/base", "partic2/jsutils1/webutils", "partic2/pComponentUi/input", "partic2/pComponentUi/window", "partic2/CodeRunner/jsutils2", "partic2/JsNotebook/workspace", "partic2/pComponentUi/texteditor", "partic2/pComponentUi/workspace", "partic2/pxseedMedia1/index1", "partic2/pComponentUi/transform"], function (require, exports, React, domui_1, registry_1, base_1, webutils_1, input_1, window_1, jsutils2_1, workspace_1, texteditor_1, workspace_2, index1_1, transform_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.renderPackagePanel = exports.__name__ = void 0;
    var registryModuleName = 'partic2/packageManager/registry';
    exports.__name__ = base_1.requirejs.getLocalRequireModule(require);
    let i18n = {
        install: 'install',
        list: 'list',
        filter: 'filter',
        urlOrPackageName: 'url/package name',
        packageName: 'package name',
        exportInstallation: 'export installation',
        importInstallation: 'import installation',
        createPackage: 'create package',
        webui: 'webui',
        uninstall: 'uninstall',
        error: 'error',
        upgradeCorePackages: 'upgrade pxseed core',
        packageManager: "package manager"
    };
    if (navigator.language.split('-').includes('zh')) {
        i18n.install = '安装';
        i18n.list = '列出';
        i18n.filter = '过滤';
        i18n.urlOrPackageName = 'url或包名';
        i18n.packageName = '包名';
        i18n.exportInstallation = '导出安装配置';
        i18n.importInstallation = '导入安装配置';
        i18n.createPackage = '创建包';
        i18n.uninstall = '卸载';
        i18n.error = '错误';
        i18n.upgradeCorePackages = '升级PXSEED核心库';
        i18n.packageManager = '包管理';
    }
    let remoteModule = {
        registry: new jsutils2_1.Singleton(async () => {
            let rpc1 = await (0, registry_1.getPersistentRegistered)(registry_1.ServerHostRpcName);
            if (rpc1 != undefined) {
                return await (0, registry_1.importRemoteModule)(await (await (0, registry_1.getPersistentRegistered)(registry_1.ServerHostWorker1RpcName)).ensureConnected(), 'partic2/packageManager/registry');
            }
            else {
                //Local worker with xplatj mode.
                return await (0, registry_1.importRemoteModule)(await (await (0, registry_1.getPersistentRegistered)(registry_1.WebWorker1RpcName)).ensureConnected(), 'partic2/packageManager/registry');
            }
        })
    };
    let resourceManager = (0, webutils_1.getResourceManager)(exports.__name__);
    class WindowListIcon extends React.Component {
        constructor(props, ctx) {
            super(props, ctx);
            this.drag = new transform_1.ReactDragController();
            this.mounted = false;
            this.onWindowListChange = async () => {
                let windows = new Array();
                for (let t1 of workspace_2.NewWindowHandleLists.value) {
                    if (t1.parentWindow == undefined) {
                        windows.push({ title: t1.title ?? 'Untitle', visible: !await t1.isHidden() });
                    }
                }
                this.setState({ windows });
            };
            this.onWindowResize = async () => {
                //How to find a good place to move to?
                this.drag.dragged.newPos?.({ left: window.innerWidth - this.state.listWidth - 10, top: window.innerHeight - this.state.listHeight - 40 });
            };
            this.setState({ hideList: false, listWidth: 250, listHeight: 320, windows: [] });
        }
        async onExpandClick() {
            let moved = this.drag.checkIsMovedSinceLastCheck();
            if (!moved) {
                if (this.state.hideList)
                    await this.onWindowListChange();
                this.setState({ hideList: !this.state.hideList });
            }
        }
        async componentDidMount() {
            this.setState({ listWidth: Math.min(250, window.innerWidth), listHeight: Math.min(320, window.innerHeight - 32) });
            this.mounted = true;
            workspace_2.NewWindowHandleLists.addEventListener('change', this.onWindowListChange);
            window.addEventListener('resize', this.onWindowResize);
        }
        componentWillUnmount() {
            this.mounted = false;
            workspace_2.NewWindowHandleLists.removeEventListener('change', this.onWindowListChange);
            window.removeEventListener('resize', this.onWindowResize);
        }
        render(props, state, context) {
            return React.createElement("div", { style: { display: 'inline-block', position: 'absolute', pointerEvents: 'none' }, ref: this.drag.draggedRef({ left: window.innerWidth - this.state.listWidth - 10, top: window.innerHeight - this.state.listHeight - 40 }) },
                React.createElement("div", { style: { width: this.state.listWidth + 'px', height: this.state.listHeight + 'px', display: 'flex', flexDirection: 'column-reverse' } }, this.state.hideList ? null : React.createElement("div", null, this.state.windows.map((t1, t2) => React.createElement("div", { className: [domui_1.css.flexRow, domui_1.css.simpleCard].join(' '), style: { pointerEvents: 'auto' } },
                    React.createElement("div", { style: { display: 'flex', flexGrow: '1', wordBreak: 'break-all' }, onClick: () => workspace_2.NewWindowHandleLists.value[t2].activate() }, t1.title),
                    React.createElement("img", { draggable: false, src: t1.visible ? (0, index1_1.getIconUrl)('eye.svg') : (0, index1_1.getIconUrl)('eye-off.svg'), onClick: () => {
                            if (t1.visible) {
                                workspace_2.NewWindowHandleLists.value[t2].hide();
                            }
                            else {
                                workspace_2.NewWindowHandleLists.value[t2].activate();
                            }
                        } }))))),
                React.createElement("div", { className: domui_1.css.flexRow },
                    React.createElement("div", { style: { flexGrow: '1' } }),
                    React.createElement("div", { style: { pointerEvents: 'auto' }, onPointerUp: () => this.onExpandClick() },
                        React.createElement("img", { draggable: false, src: (0, index1_1.getIconUrl)('layers.svg'), ...this.drag.trigger, style: { width: '32px', height: '32px' } }))));
        }
    }
    const SimpleButton = (props) => React.createElement("a", { href: "javascript:;", onClick: () => props.onClick(), className: domui_1.css.simpleCard }, props.children);
    class PackageWebUiEntry extends React.Component {
        async launchWebui() {
            let entry = this.props.pmopt.webui.entry;
            if (entry.startsWith('.')) {
                entry = webutils_1.path.join(this.props.packageName, entry);
            }
            let entryModule = await new Promise((resolve_1, reject_1) => { require([entry], resolve_1, reject_1); });
            if (entryModule.main != undefined) {
                base_1.Task.fork(function* () {
                    let r = null;
                    if (entryModule.main.constructor.name == 'GeneratorFunction') {
                        r = yield* entryModule.main('webui');
                    }
                    else {
                        r = entryModule.main('webui');
                        if (r instanceof Promise) {
                            r = yield r;
                        }
                    }
                }).run();
            }
        }
        render(props, state, context) {
            let iconUrl = this.props.pmopt.webui?.icon;
            if (iconUrl == undefined) {
                iconUrl = (0, index1_1.getIconUrl)('package.svg');
            }
            else {
                iconUrl = resourceManager.getUrl(iconUrl);
            }
            return React.createElement("div", { style: { display: 'inline-flex', flexDirection: 'column', alignItems: 'center',
                    width: '100px', height: '120px', padding: '4px' }, onClick: () => this.launchWebui() },
                React.createElement("div", null,
                    React.createElement("img", { src: iconUrl, style: { width: '80px', height: '80px' } })),
                React.createElement("div", { style: { textAlign: 'center', wordBreak: 'break-all' } }, this.props.pmopt.webui?.label ?? this.props.packageName));
        }
    }
    class PackagePanel extends React.Component {
        constructor(props, context) {
            super(props, context);
            this.rref = {
                createPackageForm: new domui_1.ReactRefEx(),
                installPackageName: new domui_1.ReactRefEx(),
                listFilter: new domui_1.ReactRefEx()
            };
            this.filterString = 'webui';
            this.setState({ packageList: [], errorMessage: '' });
        }
        async install() {
            let dlg = await (0, window_1.prompt)(React.createElement("div", { className: domui_1.css.flexRow, style: { alignItems: 'center' } },
                i18n.urlOrPackageName,
                ":",
                React.createElement(texteditor_1.TextEditor, { ref: this.rref.installPackageName, divClass: [domui_1.css.simpleCard], divStyle: { width: Math.min(window.innerWidth - 8, 300) } })), i18n.install);
            if ((await dlg.response.get()) === 'cancel') {
                dlg.close();
                return;
            }
            let source = (await this.rref.installPackageName.waitValid()).getPlainText();
            dlg.close();
            this.setState({ errorMessage: 'Installing...' });
            try {
                const registry = await remoteModule.registry.get();
                await registry.installPackage(source);
                this.setState({ errorMessage: 'done' });
                this.refreshList();
            }
            catch (e) {
                this.setState({ errorMessage: 'Failed:' + e.toString() });
            }
        }
        async exportPackagesInstallation() {
            const registry = await remoteModule.registry.get();
            let result = await registry.exportPackagesInstallation();
            (0, webutils_1.RequestDownload)(new TextEncoder().encode(JSON.stringify(result)), 'export.txt');
        }
        async importPackagesInstallation() {
            let selected = await (0, webutils_1.selectFile)();
            if (selected != null && selected.length > 0) {
                let registry = await remoteModule.registry.get();
                registry.importPackagesInstallation(JSON.parse(new TextDecoder().decode((await (0, base_1.GetBlobArrayBufferContent)(selected.item(0))))));
            }
        }
        async requestListPackage() {
            let dlg = await (0, window_1.prompt)(React.createElement("div", { className: domui_1.css.flexRow, style: { alignItems: 'center' } },
                i18n.filter,
                ":",
                React.createElement(texteditor_1.TextEditor, { ref: this.rref.listFilter, divClass: [domui_1.css.simpleCard], divStyle: { width: Math.min(window.innerWidth - 8, 300) } })), i18n.list);
            (await this.rref.listFilter.waitValid()).setPlainText(this.filterString);
            if ((await dlg.response.get()) === 'cancel') {
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
                let registry = await remoteModule.registry.get();
                this.setState({
                    packageList: await registry.listPackagesArray(this.filterString)
                });
            }
            catch (err) {
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
                                        "entry": "./index",
                                        "label": "Js Notebook",
                                        "icon": "/partic2/pxseedMedia1/icons/sidebar.svg"
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
                                        "entry": "./webui",
                                        "label": "pxseedServer2023",
                                        "icon": "/partic2/pxseedMedia1/icons/server.svg"
                                    }
                                }
                            }
                        }],
                    errorMessage: err.toString()
                });
            }
        }
        async showCreatePackage() {
            (0, workspace_2.openNewWindow)(React.createElement(input_1.JsonForm, { ref: this.rref.createPackageForm, divStyle: { minWidth: Math.min(window.innerWidth - 8, 400) }, type: {
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
                } }), { title: i18n.createPackage, parentWindow: this.lastWindow });
            (await this.rref.createPackageForm.waitValid()).value = {
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
            let registry = await remoteModule.registry.get();
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
        async uninstall() {
            let dlg = await (0, window_1.prompt)(React.createElement("div", { className: domui_1.css.flexRow, style: { alignItems: 'center' } },
                i18n.packageName,
                ":",
                React.createElement(texteditor_1.TextEditor, { ref: this.rref.installPackageName, divClass: [domui_1.css.simpleCard], divStyle: { width: Math.min(window.innerWidth - 8, 300) } })), i18n.uninstall);
            if ((await dlg.response.get()) === 'cancel') {
                dlg.close();
                return;
            }
            let pkgName = (await this.rref.installPackageName.waitValid()).getPlainText();
            if (await (0, window_1.confirm)(`Uninstall package ${pkgName}?`) == 'ok') {
                let registry = await remoteModule.registry.get();
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
                await (0, workspace_1.openWorkspaceWindowFor)((await (0, registry_1.getPersistentRegistered)(registry_1.ServerHostWorker1RpcName)), 'packageManager/registry');
            }
            catch (err) {
                await (0, window_1.alert)(err.errorMessage, i18n.error);
            }
        }
        componentDidMount() {
            this.refreshList();
        }
        renderPackageList() {
            return this.state.packageList.filter(pkg => pkg.options?.[registryModuleName] != undefined).map(pkg => {
                return React.createElement(PackageWebUiEntry, { pmopt: pkg.options[registryModuleName], packageName: pkg.name });
            });
        }
        async upgradeCorePackages() {
            try {
                this.setState({ errorMessage: 'upgrading package...' });
                let registry = await remoteModule.registry.get();
                await registry.UpgradeCorePackages();
                this.setState({ errorMessage: 'done' });
            }
            catch (err) {
                this.setState({ errorMessage: 'Failed:' + err.toString() });
            }
        }
        render(props, state, context) {
            return [
                React.createElement(workspace_2.WorkspaceWindowContext.Consumer, null, (v) => {
                    this.lastWindow = v.lastWindow;
                    return null;
                }),
                React.createElement("div", { className: domui_1.css.flexColumn },
                    React.createElement("div", null,
                        React.createElement(SimpleButton, { onClick: () => this.requestListPackage() }, i18n.list),
                        React.createElement(SimpleButton, { onClick: () => this.install() }, i18n.install),
                        React.createElement(SimpleButton, { onClick: () => this.uninstall() }, i18n.uninstall),
                        React.createElement(SimpleButton, { onClick: () => this.showCreatePackage() }, i18n.createPackage),
                        React.createElement(SimpleButton, { onClick: () => this.exportPackagesInstallation() }, i18n.exportInstallation),
                        React.createElement(SimpleButton, { onClick: () => this.importPackagesInstallation() }, i18n.importInstallation),
                        React.createElement(SimpleButton, { onClick: () => this.upgradeCorePackages() }, i18n.upgradeCorePackages),
                        React.createElement(SimpleButton, { onClick: () => this.openNotebook() }, "notebook"),
                        React.createElement("div", { style: { display: 'inline-block', color: 'red' } }, this.state.errorMessage)),
                    React.createElement("div", { style: { flexGrow: 1 } }, this.renderPackageList()))
            ];
        }
    }
    let renderPackagePanel = async () => {
        (0, webutils_1.useDeviceWidth)();
        (0, workspace_2.openNewWindow)(React.createElement(PackagePanel, null), { title: i18n.packageManager });
        (0, window_1.appendFloatWindow)(React.createElement(window_1.WindowComponent, { keepTop: true, noTitleBar: true, noResizeHandle: true, windowDivClassName: window_1.css.borderlessWindowDiv },
            React.createElement(WindowListIcon, null)));
    };
    exports.renderPackagePanel = renderPackagePanel;
});
