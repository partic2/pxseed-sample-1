define(["require", "exports", "preact", "partic2/pComponentUi/domui", "partic2/pxprpcClient/registry", "partic2/jsutils1/base", "partic2/jsutils1/webutils", "partic2/pComponentUi/input", "partic2/pComponentUi/window", "partic2/CodeRunner/jsutils2", "partic2/pxprpcClient/bus", "partic2/JsNotebook/workspace", "partic2/pComponentUi/texteditor", "partic2/pComponentUi/workspace", "partic2/pxseedMedia1/index1", "partic2/pComponentUi/transform", "pxprpc/extend", "pxprpc/base", "partic2/pxprpcClient/rpcworker"], function (require, exports, React, domui_1, registry_1, base_1, webutils_1, input_1, window_1, jsutils2_1, bus_1, workspace_1, texteditor_1, workspace_2, index1_1, transform_1, extend_1, base_2, rpcworker_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.webuiStartupExecuteFunction = exports.renderPackagePanel = exports.__name__ = void 0;
    exports.startWebuiForPackage = startWebuiForPackage;
    exports.openPackageMainWindow = openPackageMainWindow;
    exports.then = then;
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
        packageManager: "package manager",
        done: 'done',
        cleanPackageInstallCache: 'clean install cache',
        updatePackageIndex: 'update package index'
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
        i18n.done = '完成';
        i18n.cleanPackageInstallCache = '清除安装缓存';
        i18n.updatePackageIndex = '更新目录';
    }
    let remoteModule = {
        registry: new jsutils2_1.Singleton(async () => {
            return await (0, registry_1.importRemoteModule)(await (await (0, registry_1.getPersistentRegistered)(registry_1.ServerHostWorker1RpcName)).ensureConnected(), 'partic2/packageManager/registry');
        }),
        misc: new jsutils2_1.Singleton(async () => {
            return await (0, registry_1.importRemoteModule)(await (await (0, registry_1.getPersistentRegistered)(registry_1.ServerHostWorker1RpcName)).ensureConnected(), 'partic2/packageManager/misc');
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
                for (let t2 = 0; t2 < workspace_2.NewWindowHandleLists.value.length; t2++) {
                    let t1 = workspace_2.NewWindowHandleLists.value[t2];
                    if (t1.parentWindow == undefined) {
                        windows.push({ title: t1.title ?? 'Untitle', visible: !await t1.isHidden(), index: t2 });
                    }
                }
                this.setState({ windows });
            };
            this.onWindowResize = async () => {
                //TODO: How to find a good place to move to?
                //this.drag.dragged.newPos?.({left:window.innerWidth-this.state.listWidth-10,top:window.innerHeight-this.state.listHeight-40});
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
                React.createElement("div", { style: { width: this.state.listWidth + 'px', height: this.state.listHeight + 'px', display: 'flex', flexDirection: 'column-reverse' } }, this.state.hideList ? null : React.createElement("div", null, this.state.windows.map((t1) => React.createElement("div", { className: [domui_1.css.flexRow, domui_1.css.simpleCard].join(' '), style: { pointerEvents: 'auto' } },
                    React.createElement("div", { style: { display: 'flex', flexGrow: '1', wordBreak: 'break-all' }, onClick: () => workspace_2.NewWindowHandleLists.value[t1.index].activate() }, t1.title),
                    React.createElement("img", { draggable: false, src: t1.visible ? (0, index1_1.getIconUrl)('eye.svg') : (0, index1_1.getIconUrl)('eye-off.svg'), onClick: () => {
                            if (t1.visible) {
                                workspace_2.NewWindowHandleLists.value[t1.index].hide();
                            }
                            else {
                                workspace_2.NewWindowHandleLists.value[t1.index].activate();
                            }
                        } }))))),
                React.createElement("div", { className: domui_1.css.flexRow },
                    React.createElement("div", { style: { flexGrow: '1' } }),
                    React.createElement("div", { draggable: false, style: { pointerEvents: 'auto', touchAction: 'none' }, ...this.drag.trigger, onPointerUp: (ev) => { this.onExpandClick(); } },
                        React.createElement("img", { draggable: false, src: (0, index1_1.getIconUrl)('layers.svg'), style: { width: '32px', height: '32px', touchAction: 'none' } }))));
        }
    }
    const SimpleButton = (props) => React.createElement("a", { href: "javascript:;", onClick: () => props.onClick(), className: domui_1.css.simpleCard }, props.children);
    async function startWebuiForPackage(pkgName) {
        let registry = await remoteModule.registry.get();
        let config1 = await registry.getPxseedConfigForPackage(pkgName);
        (0, base_1.assert)(config1 != null, 'packages not found.');
        (0, base_1.assert)(config1.options?.[registryModuleName]?.webui != undefined, 'No webui info found in package');
        let pmopt = config1.options[registryModuleName];
        let entry = pmopt.webui.entry;
        if (entry.startsWith('.')) {
            entry = webutils_1.path.join(pkgName, entry);
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
    class PackageWebUiEntry extends React.Component {
        async launchWebui() {
            try {
                await startWebuiForPackage(this.props.packageName);
            }
            catch (err) {
                //use current cache
                let pmopt = this.props.pmopt;
                let entry = pmopt.webui.entry;
                if (entry.startsWith('.')) {
                    entry = webutils_1.path.join(this.props.packageName, entry);
                }
                let entryModule = await new Promise((resolve_2, reject_2) => { require([entry], resolve_2, reject_2); });
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
                installPackageName: new domui_1.ReactRefEx(),
                listFilter: new domui_1.ReactRefEx()
            };
            this.filterString = 'webui';
            this.setState({ packageList: [], statusText: '' });
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
            this.setState({ statusText: 'Installing...' });
            try {
                const registry = await remoteModule.registry.get();
                await registry.installPackage(source);
                this.refreshList();
            }
            catch (err) {
                (0, base_1.throwIfAbortError)(err);
                (0, window_1.alert)('Failed:' + err.message + err.remoteStack);
            }
            finally {
                this.setState({ statusText: '' });
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
                    statusText: 'Failed to connect to server :' + err.toString()
                });
            }
        }
        async showCreatePackage() {
            try {
                let basicInfo = await (0, input_1.promptWithForm)(React.createElement(input_1.SimpleReactForm1, null, (form1) => {
                    return React.createElement("div", null,
                        React.createElement("div", null, "name:"),
                        React.createElement("div", null,
                            React.createElement("input", { style: { width: '100%', boxSizing: 'border-box' }, ref: form1.getRefForInput('name'), type: 'text' })),
                        React.createElement("div", null, "loaders:"),
                        React.createElement(texteditor_1.PlainTextEditorInput, { ref: form1.getRefForInput('loaders'), divStyle: { border: 'solid 1px black' } }),
                        React.createElement("div", null, "description:"),
                        React.createElement(texteditor_1.PlainTextEditorInput, { ref: form1.getRefForInput('description'), divStyle: { border: 'solid 1px black' } }),
                        React.createElement("div", null, "dependencies:"),
                        React.createElement(texteditor_1.PlainTextEditorInput, { ref: form1.getRefForInput('dependencies'), divStyle: { border: 'solid 1px black' } }),
                        React.createElement(input_1.SimpleReactForm1, { ref: form1.getRefForInput('webui') }, form1 => React.createElement("div", null,
                            React.createElement("div", null, "webui relative config:"),
                            React.createElement("div", null, "entry:"),
                            React.createElement("div", null,
                                React.createElement("input", { style: { width: '100%', boxSizing: 'border-box' }, ref: form1.getRefForInput('entry'), type: 'text' })),
                            React.createElement("div", null, "label:"),
                            React.createElement("div", null,
                                React.createElement("input", { style: { width: '100%', boxSizing: 'border-box' }, ref: form1.getRefForInput('label'), type: 'text' })),
                            React.createElement("div", null, "icon:"),
                            React.createElement("div", null,
                                React.createElement("input", { style: { width: '100%', boxSizing: 'border-box' }, ref: form1.getRefForInput('icon'), type: 'text' })))));
                }), { title: i18n.createPackage, initialValue: {
                        name: 'partic2/createPkgDemo',
                        loaders: JSON.stringify([
                            { "name": "copyFiles", "include": ["assets/**/*"] },
                            { "name": "typescript" }
                        ], undefined, 4),
                        webui: {
                            entry: './webui',
                            label: '',
                            icon: ''
                        }
                    } });
                if (basicInfo == null) {
                    return;
                }
                basicInfo.loaders = JSON.parse(basicInfo.loaders);
                let registry = await remoteModule.registry.get();
                let scopeName = basicInfo.name.split('/')[0];
                let urlTpl = await registry.getUrlTemplateFromScopeName(scopeName);
                basicInfo.repositories = JSON.stringify({
                    [scopeName]: urlTpl ?? ['https://github.com/' + scopeName + '/pxseed-${subname}']
                }, undefined, 4);
                basicInfo = await (0, input_1.promptWithForm)(React.createElement(input_1.SimpleReactForm1, null, (form1) => {
                    return React.createElement("div", null,
                        React.createElement("div", null, "repositories:"),
                        React.createElement(texteditor_1.PlainTextEditorInput, { ref: form1.getRefForInput('repositories'), divStyle: { border: 'solid 1px black' } }));
                }), { title: i18n.createPackage, initialValue: basicInfo });
                if (basicInfo == null) {
                    return;
                }
                try {
                    basicInfo.options = {};
                    let opt = {};
                    let inPath = basicInfo.webui.entry;
                    if (inPath != '') {
                        if (inPath.startsWith('./')) {
                            inPath = basicInfo.name + inPath.substring(1);
                        }
                        opt.webui = { entry: inPath, label: basicInfo.name };
                        inPath = basicInfo.webui.icon;
                        if (inPath != '') {
                            if (inPath.startsWith('./')) {
                                inPath = basicInfo.name + inPath.substring(1);
                            }
                            opt.webui.icon = inPath;
                        }
                        if (basicInfo.webui.label != '') {
                            opt.webui.label = basicInfo.webui.label;
                        }
                    }
                    delete basicInfo.webui;
                    opt.dependencies = basicInfo.dependencies.split(',').filter(v => v != '');
                    delete basicInfo.dependencies;
                    opt.repositories = JSON.parse(basicInfo.repositories);
                    delete basicInfo.repositories;
                    basicInfo.options['partic2/packageManager/registry'] = opt;
                    await registry.createPackageTemplate1(basicInfo);
                    await (0, window_1.alert)(i18n.done, 'CAUTION');
                }
                catch (err) {
                    (0, base_1.throwIfAbortError)(err);
                    (0, window_1.alert)('Failed:' + err.message + err.remoteStack);
                }
            }
            catch (err) {
                await (0, window_1.alert)(err.message + '\n' + err.stack, 'ERROR');
            }
            await this.refreshList();
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
            dlg.close();
            if (await (0, window_1.confirm)(`Uninstall package ${pkgName}?`) == 'ok') {
                let registry = await remoteModule.registry.get();
                this.setState({ statusText: 'uninstalling...' });
                try {
                    await registry.uninstallPackage(pkgName);
                }
                catch (err) {
                    (0, base_1.throwIfAbortError)(err);
                    (0, window_1.alert)('Failed:' + err.message + err.remoteStack);
                }
                finally {
                    this.setState({ statusText: '' });
                }
                this.refreshList();
            }
        }
        async openNotebook() {
            try {
                let nbw = await workspace_1.openWorkspaceWithProfile.openJSNotebookFirstProfileWorkspace({
                    defaultRpc: registry_1.ServerHostWorker1RpcName,
                    defaultStartupScript: `import2env('partic2/jsutils1/base');
import2env('partic2/jsutils1/webutils');
import2env('partic2/CodeRunner/jsutils2');
import2env('partic2/packageManager/registry');`,
                    notebookDirectory: webutils_1.path.join(exports.__name__, '..', 'notebook'),
                    sampleCode: [`installPackage('xxx')`, `listPackageArray('')`]
                });
                nbw.title = 'PackageManager';
                await nbw.start();
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
                let resp = await (0, window_1.confirm)(i18n.upgradeCorePackages + '?');
                if (resp == 'cancel')
                    return;
                this.setState({ statusText: 'upgrading package...' });
                let registry = await remoteModule.registry.get();
                await registry.UpgradeCorePackages();
            }
            catch (err) {
                (0, base_1.throwIfAbortError)(err);
                (0, window_1.alert)('Failed:' + err.message + err.remoteStack);
            }
            finally {
                this.setState({ statusText: '' });
            }
        }
        async cleanPackageInstallCache() {
            let registry = await remoteModule.registry.get();
            this.setState({ statusText: 'cleaning...' });
            try {
                await registry.cleanPackageInstallCache();
            }
            catch (err) {
                (0, base_1.throwIfAbortError)(err);
                (0, window_1.alert)('Failed:' + err.message + err.remoteStack);
            }
            finally {
                this.setState({ statusText: '' });
            }
        }
        async updatePackageIndex() {
            let registry = await remoteModule.registry.get();
            this.setState({ statusText: 'updating...' });
            try {
                await registry.updatePackagesDatabase();
            }
            catch (err) {
                (0, base_1.throwIfAbortError)(err);
                (0, window_1.alert)('Failed:' + err.message + err.remoteStack);
            }
            finally {
                this.setState({ statusText: '' });
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
                        React.createElement(SimpleButton, { onClick: () => this.cleanPackageInstallCache() }, i18n.cleanPackageInstallCache),
                        React.createElement(SimpleButton, { onClick: () => this.updatePackageIndex() }, i18n.updatePackageIndex),
                        React.createElement(SimpleButton, { onClick: () => this.openNotebook() }, "notebook"),
                        React.createElement("div", { style: { display: 'inline-block', color: 'red' } }, this.state.statusText)),
                    React.createElement("div", { style: { flexGrow: 1 } }, this.renderPackageList()))
            ];
        }
    }
    let renderPackagePanel = async () => {
        (0, webutils_1.useDeviceWidth)();
        (0, workspace_2.openNewWindow)(React.createElement(PackagePanel, null), { title: i18n.packageManager, layoutHint: exports.__name__ + '.PackagePanel', windowOptions: { closeIcon: null } });
        (0, window_1.appendFloatWindow)(React.createElement(window_1.WindowComponent, { keepTop: true, noTitleBar: true, noResizeHandle: true, windowDivClassName: window_1.css.borderlessWindowDiv },
            React.createElement(WindowListIcon, null)));
    };
    exports.renderPackagePanel = renderPackagePanel;
    async function openPackageMainWindow(appInfo, ...args) {
        if (args[1] == undefined) {
            args[1] = {};
        }
        if (args[1].windowOptions == undefined) {
            args[1].windowOptions = {};
        }
        if (args[1].windowOptions.titleBarButton == undefined) {
            args[1].windowOptions.titleBarButton = [];
        }
        let windowHandler;
        args[1].windowOptions.titleBarButton.unshift({
            icon: (0, index1_1.getIconUrl)('refresh-ccw.svg'),
            onClick: async () => {
                windowHandler.close();
                await appInfo.beforeUnload?.();
                for (let t1 of Object.keys(await base_1.requirejs.getDefined())) {
                    if (t1.startsWith(appInfo.pkgName + '/')) {
                        await base_1.requirejs.undef(t1);
                    }
                }
                let registry = await remoteModule.registry.get();
                await registry.unloadPackageModules(appInfo.pkgName);
                await registry.buildPackageAndNotfiy(appInfo.pkgName);
                startWebuiForPackage(appInfo.pkgName);
            }
        });
        windowHandler = await (0, workspace_2.openNewWindow)(...args);
        return windowHandler;
    }
    let config = {};
    exports.webuiStartupExecuteFunction = {
        async add(id, functionInfo) {
            config = await (0, webutils_1.GetPersistentConfig)(exports.__name__);
            config.startupExecuteFunction = config.startupExecuteFunction ?? {};
            config.startupExecuteFunction[id] = functionInfo;
            await (0, webutils_1.SavePersistentConfig)(exports.__name__);
        },
        async delete(id) {
            config = await (0, webutils_1.GetPersistentConfig)(exports.__name__);
            config.startupExecuteFunction = config.startupExecuteFunction ?? {};
            delete config.startupExecuteFunction[id];
            await (0, webutils_1.SavePersistentConfig)(exports.__name__);
        },
        async get(id) {
            config = await (0, webutils_1.GetPersistentConfig)(exports.__name__);
            return config.startupExecuteFunction?.[id];
        },
        async iter() {
            config = await (0, webutils_1.GetPersistentConfig)(exports.__name__);
            config.startupExecuteFunction = config.startupExecuteFunction ?? {};
            return Object.entries(config.startupExecuteFunction);
        }
    };
    let __inited__ = (async () => {
        if ((0, webutils_1.GetJsEntry)() == exports.__name__) {
            document.body.style.overflow = 'hidden';
            (0, exports.renderPackagePanel)();
            bus_1.RemotePxseedJsIoServer.serve(`/pxprpc/pxseed_webui/${exports.__name__.replace(/\//g, '.')}/${rpcworker_1.rpcId.get()}`, {
                onConnect: (io) => new extend_1.RpcExtendServer1(new base_2.Server(io))
            }).catch((err) => console.warn(err.message, err.stack));
            config = await (0, webutils_1.GetPersistentConfig)(exports.__name__);
            for (let t1 of await exports.webuiStartupExecuteFunction.iter()) {
                new Promise((resolve_3, reject_3) => { require([t1[1].module], resolve_3, reject_3); }).then(mod => mod[t1[1].functionName](...(t1[1].arguments ?? []))).catch(() => { });
                if (t1[1].once) {
                    await exports.webuiStartupExecuteFunction.delete(t1[0]);
                }
            }
        }
    })();
    async function then(resolve) {
        delete exports.then;
        await __inited__;
        resolve(exports);
    }
});
//# sourceMappingURL=webui2.js.map