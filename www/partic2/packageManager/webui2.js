define("partic2/packageManager/webui2", ["require", "exports", "preact", "partic2/pComponentUi/domui", "partic2/pxprpcClient/registry", "partic2/jsutils1/base", "partic2/jsutils1/webutils", "partic2/pComponentUi/input", "partic2/pComponentUi/window", "partic2/CodeRunner/jsutils2", "partic2/pComponentUi/texteditor", "partic2/pComponentUi/workspace", "partic2/pxseedMedia1/index1", "partic2/pComponentUi/transform", "../CodeRunner/Component1", "./webui"], function (require, exports, React, domui_1, registry_1, base_1, webutils_1, input_1, window_1, jsutils2_1, texteditor_1, workspace_1, index1_1, transform_1, Component1_1, webui_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.webuiStartupExecuteFunction = exports.config = exports.floatTaskListView = exports.__name__ = void 0;
    exports.startWebuiForPackage = startWebuiForPackage;
    exports.disableFloatTaskListView = disableFloatTaskListView;
    exports.setFloatTaskListViewVisible = setFloatTaskListViewVisible;
    exports.openPackageMainWindow = openPackageMainWindow;
    exports.main = main;
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
        updatePackageIndex: 'update package index',
        installAndUseV2: 'install and use v2'
    };
    if (window_1.language.get().split('-').includes('zh')) {
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
        i18n.updatePackageIndex = '更新包信息';
        i18n.installAndUseV2 = '安装并使用V2版';
    }
    let remoteModule = {
        registry: new jsutils2_1.Singleton(async () => {Promise.__onAsyncEnter();try{
            return await  Promise.__onAwait((0, registry_1.importRemoteModule)(await  Promise.__onAwait((await  Promise.__onAwait((0, registry_1.getPersistentRegistered)(registry_1.ServerHostWorker1RpcName))).ensureConnected()), 'partic2/packageManager/registry'));
        }finally{Promise.__onAsyncExit();}}),
        misc: new jsutils2_1.Singleton(async () => {Promise.__onAsyncEnter();try{
            return await  Promise.__onAwait((0, registry_1.importRemoteModule)(await  Promise.__onAwait((await  Promise.__onAwait((0, registry_1.getPersistentRegistered)(registry_1.ServerHostWorker1RpcName))).ensureConnected()), 'partic2/packageManager/misc'));
        }finally{Promise.__onAsyncExit();}}),
        jsutils2: new jsutils2_1.Singleton(async () => {Promise.__onAsyncEnter();try{
            return await  Promise.__onAwait((0, registry_1.importRemoteModule)(await  Promise.__onAwait((await  Promise.__onAwait((0, registry_1.getPersistentRegistered)(registry_1.ServerHostWorker1RpcName))).ensureConnected()), 'partic2/CodeRunner/jsutils2'));
        }finally{Promise.__onAsyncExit();}})
    };
    let resourceManager = (0, webutils_1.getResourceManager)(exports.__name__);
    class WindowListIcon extends React.Component {
        constructor(props, ctx) {
            super(props, ctx);
            this.drag = new transform_1.ReactDragController();
            this.mounted = false;
            this.onWindowListChange = async () => {Promise.__onAsyncEnter();try{
                let windows = new Array();
                for (let t2 = 0; t2 < workspace_1.NewWindowHandleLists.value.length; t2++) {
                    let t1 = workspace_1.NewWindowHandleLists.value[t2];
                    if (t1.parentWindow == undefined) {
                        windows.push({ title: t1.title ?? 'Untitle', visible: !await  Promise.__onAwait(t1.isHidden()), index: t2 });
                    }
                }
                this.setState({ windows });
            }finally{Promise.__onAsyncExit();}};
            this.onWindowResize = async () => {Promise.__onAsyncEnter();try{
                //TODO: How to find a good place to move to?
                //this.drag.dragged.newPos?.({left:window.innerWidth-this.state.listWidth-10,top:window.innerHeight-this.state.listHeight-40});
            }finally{Promise.__onAsyncExit();}};
            this.setState({ hideList: false, listWidth: 250, listHeight: 320, windows: [] });
        }
        async onExpandClick() {Promise.__onAsyncEnter();try{
            let moved = this.drag.checkIsMovedSinceLastCheck();
            if (!moved) {
                if (this.state.hideList)
                    await  Promise.__onAwait(this.onWindowListChange());
                this.setState({ hideList: !this.state.hideList });
            }
        }finally{Promise.__onAsyncExit();}}
        async componentDidMount() {Promise.__onAsyncEnter();try{
            this.setState({ listWidth: Math.min(250, window.innerWidth), listHeight: Math.min(320, window.innerHeight - 32) });
            this.mounted = true;
            workspace_1.NewWindowHandleLists.onChange.setListener(exports.__name__ + '.WindowListIcon', this.onWindowListChange);
            window.addEventListener('resize', this.onWindowResize);
            await  Promise.__onAwait(this.onWindowListChange());
        }finally{Promise.__onAsyncExit();}}
        componentWillUnmount() {
            this.mounted = false;
            workspace_1.NewWindowHandleLists.onChange.deleteListener(exports.__name__ + '.WindowListIcon');
            window.removeEventListener('resize', this.onWindowResize);
        }
        render(props, state, context) {
            return React.createElement("div", { style: { display: 'inline-block', position: 'absolute', pointerEvents: 'none' }, ref: this.drag.draggedRef({ left: window.innerWidth - this.state.listWidth - 10, top: window.innerHeight - this.state.listHeight - 40 }) },
                React.createElement("div", { style: { width: this.state.listWidth + 'px', height: this.state.listHeight + 'px', display: 'flex', flexDirection: 'column-reverse' } }, this.state.hideList ? null : React.createElement("div", null, this.state.windows.map((t1) => React.createElement("div", { className: [domui_1.css.flexRow, domui_1.css.simpleCard].join(' '), style: { pointerEvents: 'auto' } },
                    React.createElement("div", { style: { display: 'flex', flexGrow: '1', wordBreak: 'break-all' }, onClick: () => workspace_1.NewWindowHandleLists.value[t1.index].activate() }, t1.title),
                    React.createElement("img", { draggable: false, src: t1.visible ? (0, index1_1.getIconUrl)('eye.svg') : (0, index1_1.getIconUrl)('eye-off.svg'), onClick: () => {
                            if (t1.visible) {
                                workspace_1.NewWindowHandleLists.value[t1.index].hide();
                            }
                            else {
                                workspace_1.NewWindowHandleLists.value[t1.index].activate();
                            }
                        } }))))),
                React.createElement("div", { className: domui_1.css.flexRow },
                    React.createElement("div", { style: { flexGrow: '1' } }),
                    React.createElement("div", { draggable: false, style: { pointerEvents: 'auto', touchAction: 'none' }, ...this.drag.trigger, onPointerUp: (ev) => { this.onExpandClick(); } },
                        React.createElement("img", { draggable: false, src: (0, index1_1.getIconUrl)('layers.svg'), style: { width: '32px', height: '32px', touchAction: 'none' } }))));
        }
    }
    const SimpleButton = (props) => React.createElement("a", { href: "javascript:;", onClick: () => props.onClick(), className: domui_1.css.simpleCard }, props.children);
    async function startWebuiForPackage(pkgName) {Promise.__onAsyncEnter();try{
        let registry = await  Promise.__onAwait(remoteModule.registry.get());
        let config1 = await  Promise.__onAwait(registry.getPxseedConfigForPackage(pkgName));
        (0, base_1.assert)(config1 != null, 'packages not found.');
        (0, base_1.assert)(config1.extra?.[registryModuleName]?.webui != undefined, 'No webui info found in package');
        let pmopt = config1.extra[registryModuleName];
        let entry = pmopt.webui.entry;
        if (entry.startsWith('.')) {
            entry = webutils_1.path.join(pkgName, entry);
        }
        let entryModule = await  Promise.__onAwait(new Promise((resolve_1, reject_1) => { require([entry], resolve_1, reject_1); }));
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
    }finally{Promise.__onAsyncExit();}}
    class PackageWebUiEntry extends React.Component {
        async launchWebui() {Promise.__onAsyncEnter();try{
            try {
                await  Promise.__onAwait(startWebuiForPackage(this.props.packageName));
            }
            catch (err) {
                //use current cache
                let pmopt = this.props.pmopt;
                let entry = pmopt.webui.entry;
                if (entry.startsWith('.')) {
                    entry = webutils_1.path.join(this.props.packageName, entry);
                }
                let entryModule = await  Promise.__onAwait(new Promise((resolve_2, reject_2) => { require([entry], resolve_2, reject_2); }));
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
        }finally{Promise.__onAsyncExit();}}
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
        async install() {Promise.__onAsyncEnter();try{
            let dlg = await  Promise.__onAwait((0, window_1.prompt)(React.createElement("div", { className: domui_1.css.flexRow, style: { alignItems: 'center' } },
                i18n.urlOrPackageName,
                ":",
                React.createElement(texteditor_1.TextEditor, { ref: this.rref.installPackageName, divClass: [domui_1.css.simpleCard], divStyle: { width: Math.min(window.innerWidth - 8, 300) } })), i18n.install));
            if ((await  Promise.__onAwait(dlg.response.get())) === 'cancel') {
                dlg.close();
                return;
            }
            let source = (await  Promise.__onAwait(this.rref.installPackageName.waitValid())).getPlainText();
            dlg.close();
            this.setState({ statusText: 'Installing...' });
            try {
                const registry = await  Promise.__onAwait(remoteModule.registry.get());
                const jsutils2 = await  Promise.__onAwait(remoteModule.jsutils2.get());
                let logBuffer = await  Promise.__onAwait(jsutils2.newEventBuffer());
                let localLogBuffer = await  Promise.__onAwait((0, jsutils2_1.newEventBuffer)());
                await  Promise.__onAwait((0, workspace_1.openNewWindow)(React.createElement(Component1_1.SimpleLogViewer, { logSources: [logBuffer, localLogBuffer] }), { title: 'LOG' }));
                await  Promise.__onAwait(base_1.Task.fork(function* () {
                    (0, registry_1.bindToRemoteRpcTask)();
                    yield jsutils2.setTaskLocalLogBuffer(logBuffer);
                    yield registry.installPackage(source);
                }).run());
                localLogBuffer.push({ level: 'info', label: exports.__name__, msg: ['installed'] });
                this.refreshList();
            }
            catch (err) {
                (0, base_1.throwIfAbortError)(err);
                (0, window_1.alert)('Failed:' + err.message + err.remoteStack);
            }
            finally {
                this.setState({ statusText: '' });
            }
        }finally{Promise.__onAsyncExit();}}
        async exportPackagesInstallation() {Promise.__onAsyncEnter();try{
            const registry = await  Promise.__onAwait(remoteModule.registry.get());
            let result = await  Promise.__onAwait(registry.exportPackagesInstallation());
            (0, webutils_1.RequestDownload)(new TextEncoder().encode(JSON.stringify(result)), 'export.txt');
        }finally{Promise.__onAsyncExit();}}
        async importPackagesInstallation() {Promise.__onAsyncEnter();try{
            let selected = await  Promise.__onAwait((0, webutils_1.selectFile)());
            if (selected != null && selected.length > 0) {
                let registry = await  Promise.__onAwait(remoteModule.registry.get());
                registry.importPackagesInstallation(JSON.parse((0, jsutils2_1.utf8conv)(new Uint8Array(await  Promise.__onAwait(selected.item(0).arrayBuffer())))));
            }
        }finally{Promise.__onAsyncExit();}}
        async requestListPackage() {Promise.__onAsyncEnter();try{
            let dlg = await  Promise.__onAwait((0, window_1.prompt)(React.createElement("div", { className: domui_1.css.flexRow, style: { alignItems: 'center' } },
                i18n.filter,
                ":",
                React.createElement(texteditor_1.TextEditor, { ref: this.rref.listFilter, divClass: [domui_1.css.simpleCard], divStyle: { width: Math.min(window.innerWidth - 8, 300) } })), i18n.list));
            (await  Promise.__onAwait(this.rref.listFilter.waitValid())).setPlainText(this.filterString);
            if ((await  Promise.__onAwait(dlg.response.get())) === 'cancel') {
                dlg.close();
                return;
            }
            else {
                this.filterString = this.rref.listFilter.current.getPlainText();
                dlg.close();
                await  Promise.__onAwait(this.refreshList());
            }
        }finally{Promise.__onAsyncExit();}}
        async refreshList() {Promise.__onAsyncEnter();try{
            try {
                let registry = await  Promise.__onAwait(remoteModule.registry.get());
                this.setState({
                    packageList: await  Promise.__onAwait(registry.listPackagesArray(this.filterString))
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
                            "extra": {
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
                                }
                            ],
                            "name": "pxseedServer2023",
                            "extra": {
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
        }finally{Promise.__onAsyncExit();}}
        async showCreatePackage() {Promise.__onAsyncEnter();try{
            try {
                let basicInfo = await  Promise.__onAwait((0, input_1.promptWithForm)(React.createElement(input_1.SimpleReactForm1, null, (form1) => {
                    return React.createElement("div", { style: { padding: '8px', minHeight: '0px', overflow: 'auto', minWidth: '250px' } },
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
                                React.createElement("input", { style: { width: '100%', boxSizing: 'border-box' }, ref: form1.getRefForInput('icon'), type: 'text' })))),
                        React.createElement("div", null, "clean:"),
                        React.createElement(texteditor_1.PlainTextEditorInput, { ref: form1.getRefForInput('clean'), divStyle: { border: 'solid 1px black' } }));
                }), { title: i18n.createPackage, initialValue: {
                        name: 'scopeName/packageName',
                        loaders: JSON.stringify([
                            { "name": "copyFiles", "include": ["assets/**/*"] },
                            { "name": "typescript" }
                        ], undefined, 4),
                        clean: JSON.stringify({
                            include: ['**/*.js', 'assets/**/*'],
                            exclude: ['data']
                        }, undefined, 4),
                        webui: {
                            entry: './webui',
                            label: '',
                            icon: ''
                        }
                    } }));
                if (basicInfo == null) {
                    return;
                }
                try {
                    basicInfo.loaders = JSON.parse(basicInfo.loaders);
                    basicInfo.clean = JSON.parse(basicInfo.clean);
                    let registry = await  Promise.__onAwait(remoteModule.registry.get());
                    let scopeName = basicInfo.name.split('/')[0];
                    let urlTpl = await  Promise.__onAwait(registry.getUrlTemplateFromScopeName(scopeName));
                    basicInfo.repositories = JSON.stringify({
                        [scopeName]: urlTpl ?? ['https://github.com/' + scopeName + '/pxseed-${subname}']
                    }, undefined, 4);
                    basicInfo = await  Promise.__onAwait((0, input_1.promptWithForm)(React.createElement(input_1.SimpleReactForm1, null, (form1) => {
                        return React.createElement("div", null,
                            React.createElement("div", null, "repositories:"),
                            React.createElement(texteditor_1.PlainTextEditorInput, { ref: form1.getRefForInput('repositories'), divStyle: { border: 'solid 1px black' } }));
                    }), { title: i18n.createPackage, initialValue: basicInfo }));
                    if (basicInfo == null) {
                        return;
                    }
                    basicInfo.extra = {};
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
                    basicInfo.extra['partic2/packageManager/registry'] = opt;
                    await  Promise.__onAwait(registry.createPackageTemplate1(basicInfo));
                    await  Promise.__onAwait((0, window_1.alert)(i18n.done, 'CAUTION'));
                }
                catch (err) {
                    (0, base_1.throwIfAbortError)(err);
                    (0, window_1.alert)('Failed:' + err.message + err.stack + '\n--------\n' + err.remoteStack);
                }
            }
            catch (err) {
                await  Promise.__onAwait((0, window_1.alert)(err.message + '\n' + err.stack, 'ERROR'));
            }
            await  Promise.__onAwait(this.refreshList());
        }finally{Promise.__onAsyncExit();}}
        async uninstall() {Promise.__onAsyncEnter();try{
            let dlg = await  Promise.__onAwait((0, window_1.prompt)(React.createElement("div", { className: domui_1.css.flexRow, style: { alignItems: 'center' } },
                i18n.packageName,
                ":",
                React.createElement(texteditor_1.TextEditor, { ref: this.rref.installPackageName, divClass: [domui_1.css.simpleCard], divStyle: { width: Math.min(window.innerWidth - 8, 300) } })), i18n.uninstall));
            if ((await  Promise.__onAwait(dlg.response.get())) === 'cancel') {
                dlg.close();
                return;
            }
            let pkgName = (await  Promise.__onAwait(this.rref.installPackageName.waitValid())).getPlainText();
            dlg.close();
            if (await  Promise.__onAwait((0, window_1.confirm)(`Uninstall package ${pkgName}?`)) == 'ok') {
                let registry = await  Promise.__onAwait(remoteModule.registry.get());
                this.setState({ statusText: 'uninstalling...' });
                try {
                    await  Promise.__onAwait(registry.uninstallPackage(pkgName));
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
        }finally{Promise.__onAsyncExit();}}
        async openNotebook() {Promise.__onAsyncEnter();try{
            try {
                let { openWorkspaceWithProfile } = await  Promise.__onAwait(new Promise((resolve_3, reject_3) => { require(['partic2/JsNotebook/workspace'], resolve_3, reject_3); }));
                let nbw = await  Promise.__onAwait(openWorkspaceWithProfile.openJSNotebookFirstProfileWorkspace({
                    defaultStartupScript: `import2env('partic2/jsutils1/base');
import2env('partic2/jsutils1/webutils');
import2env('partic2/CodeRunner/jsutils2');
import2env('partic2/packageManager/registry');`,
                    notebookDirectory: webutils_1.path.join(exports.__name__, '..', 'notebook'),
                    sampleCode: [`installPackage('xxx')`, `listPackagesArray('')`]
                }));
                nbw.title = 'PackageManager';
                await  Promise.__onAwait(nbw.start());
            }
            catch (err) {
                await  Promise.__onAwait((0, window_1.alert)(err.errorMessage, i18n.error));
            }
        }finally{Promise.__onAsyncExit();}}
        componentDidMount() {
            this.refreshList();
        }
        renderPackageList() {
            return this.state.packageList.filter(pkg => pkg.extra?.[registryModuleName] != undefined).map(pkg => {
                return React.createElement(PackageWebUiEntry, { pmopt: pkg.extra[registryModuleName], packageName: pkg.name });
            });
        }
        async upgradeCorePackages() {Promise.__onAsyncEnter();try{
            try {
                let resp = await  Promise.__onAwait((0, window_1.confirm)(i18n.upgradeCorePackages + '?'));
                if (resp == 'cancel')
                    return;
                this.setState({ statusText: 'upgrading package...' });
                const registry = await  Promise.__onAwait(remoteModule.registry.get());
                const jsutils2 = await  Promise.__onAwait(remoteModule.jsutils2.get());
                let logBuffer = await  Promise.__onAwait(jsutils2.newEventBuffer());
                let localLogBuffer = await  Promise.__onAwait((0, jsutils2_1.newEventBuffer)());
                await  Promise.__onAwait((0, workspace_1.openNewWindow)(React.createElement(Component1_1.SimpleLogViewer, { logSources: [logBuffer, localLogBuffer] }), { title: 'LOG' }));
                await  Promise.__onAwait(base_1.Task.fork(function* () {
                    (0, registry_1.bindToRemoteRpcTask)();
                    yield jsutils2.setTaskLocalLogBuffer(logBuffer);
                    yield registry.UpgradeCorePackages();
                }).run());
                localLogBuffer.push({ level: 'info', label: exports.__name__, msg: ['upgrading core packages done.'] });
            }
            catch (err) {
                (0, base_1.throwIfAbortError)(err);
                (0, window_1.alert)('Failed:' + err.message + err.remoteStack);
            }
            finally {
                this.setState({ statusText: '' });
            }
        }finally{Promise.__onAsyncExit();}}
        async cleanPackageInstallCache() {Promise.__onAsyncEnter();try{
            let registry = await  Promise.__onAwait(remoteModule.registry.get());
            this.setState({ statusText: 'cleaning...' });
            try {
                await  Promise.__onAwait(registry.cleanPackageInstallCache());
            }
            catch (err) {
                (0, base_1.throwIfAbortError)(err);
                (0, window_1.alert)('Failed:' + err.message + err.remoteStack);
            }
            finally {
                this.setState({ statusText: '' });
            }
        }finally{Promise.__onAsyncExit();}}
        async updatePackageIndex() {Promise.__onAsyncEnter();try{
            let registry = await  Promise.__onAwait(remoteModule.registry.get());
            this.setState({ statusText: 'updating...' });
            try {
                await  Promise.__onAwait(registry.updatePackagesDatabase());
            }
            catch (err) {
                (0, base_1.throwIfAbortError)(err);
                (0, window_1.alert)('Failed:' + err.message + err.remoteStack);
            }
            finally {
                this.setState({ statusText: '' });
            }
        }finally{Promise.__onAsyncExit();}}
        async installAndUseV2() {Promise.__onAsyncEnter();try{
            let registry = await  Promise.__onAwait(remoteModule.registry.get());
            let jsutils2 = await  Promise.__onAwait(remoteModule.jsutils2.get());
            this.setState({ statusText: 'processing...' });
            let logBuffer = await  Promise.__onAwait(jsutils2.newEventBuffer());
            let localLogBuffer = await  Promise.__onAwait((0, jsutils2_1.newEventBuffer)());
            await  Promise.__onAwait((0, workspace_1.openNewWindow)(React.createElement(Component1_1.SimpleLogViewer, { logSources: [logBuffer, localLogBuffer] }), { title: 'LOG' }));
            await  Promise.__onAwait(base_1.Task.fork(function* () {
                (0, registry_1.bindToRemoteRpcTask)();
                yield jsutils2.setTaskLocalLogBuffer(logBuffer);
                yield registry.installPackage('partic2/packageManager2');
                localLogBuffer.push({ level: 'info', label: exports.__name__, msg: ['installing packageManager2 done.'] });
                yield (0, webui_1.setPackageManagerWebuiEntry)({ module: 'partic2/packageManager2/webui', func: 'main' });
                location.reload();
            }).run());
        }finally{Promise.__onAsyncExit();}}
        render(props, state, context) {
            return [
                React.createElement("div", { className: domui_1.css.flexColumn },
                    React.createElement("div", { style: { display: 'flex', flexDirection: 'row', flexWrap: 'wrap' } },
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
                        React.createElement(SimpleButton, { onClick: () => this.installAndUseV2() }, i18n.installAndUseV2),
                        React.createElement("div", { style: { display: 'inline-block', color: 'red' } }, this.state.statusText)),
                    React.createElement("div", { style: { flexGrow: 1 } }, this.renderPackageList()))
            ];
        }
    }
    exports.floatTaskListView = {
        ref: new domui_1.ReactRefEx(),
        component: null,
        event: new EventTarget(),
        windowListIconRef: new domui_1.ReactRefEx(),
        setHideList(hide) {
            this.windowListIconRef.current?.setState({ hideList: hide });
        }
    };
    let renderPackagePanel = async () => {Promise.__onAsyncEnter();try{
        (0, workspace_1.openNewWindow)(React.createElement(PackagePanel, null), { title: i18n.packageManager, layoutHint: exports.__name__ + '.PackagePanel', windowOptions: { closeIcon: null } });
        if (exports.floatTaskListView.ref != null) {
            exports.floatTaskListView.component = React.createElement(window_1.WindowComponent, { keepTop: true, ref: exports.floatTaskListView.ref, borderless: true, initialLayout: { left: 0, top: 0, width: 0, height: 0 } },
                React.createElement(WindowListIcon, { ref: exports.floatTaskListView.windowListIconRef }));
            (0, window_1.appendFloatWindow)(exports.floatTaskListView.component);
        }
    }finally{Promise.__onAsyncExit();}};
    function disableFloatTaskListView() {
        if (exports.floatTaskListView.component != null) {
            (0, window_1.removeFloatWindow)(exports.floatTaskListView.component);
        }
        exports.floatTaskListView.ref = null;
        exports.floatTaskListView.component = null;
    }
    function setFloatTaskListViewVisible(visible) {
        if (visible) {
            exports.floatTaskListView.ref?.current?.activate();
        }
        else {
            exports.floatTaskListView.ref?.current?.hide();
        }
    }
    async function openPackageMainWindow(appInfo, ...args) {Promise.__onAsyncEnter();try{
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
            onClick: async () => {Promise.__onAsyncEnter();try{
                windowHandler.close();
                await  Promise.__onAwait(appInfo.beforeUnload?.());
                for (let t1 of Object.keys(await  Promise.__onAwait(base_1.requirejs.getDefined()))) {
                    if (t1.startsWith(appInfo.pkgName + '/')) {
                        await  Promise.__onAwait(base_1.requirejs.undef(t1));
                    }
                }
                let registry = await  Promise.__onAwait(remoteModule.registry.get());
                await  Promise.__onAwait(registry.unloadPackageModules(appInfo.pkgName));
                await  Promise.__onAwait(registry.buildPackageAndNotfiy(appInfo.pkgName));
                startWebuiForPackage(appInfo.pkgName);
            }finally{Promise.__onAsyncExit();}}
        });
        windowHandler = await  Promise.__onAwait((0, workspace_1.openNewWindow)(...args));
        return windowHandler;
    }finally{Promise.__onAsyncExit();}}
    exports.config = {};
    exports.webuiStartupExecuteFunction = {
        async add(id, functionInfo) {Promise.__onAsyncEnter();try{
            exports.config = await  Promise.__onAwait((0, webutils_1.GetPersistentConfig)(exports.__name__));
            exports.config.startupExecuteFunction = exports.config.startupExecuteFunction ?? {};
            exports.config.startupExecuteFunction[id] = functionInfo;
            await  Promise.__onAwait((0, webutils_1.SavePersistentConfig)(exports.__name__, exports.config));
        }finally{Promise.__onAsyncExit();}},
        async delete(id) {Promise.__onAsyncEnter();try{
            exports.config = await  Promise.__onAwait((0, webutils_1.GetPersistentConfig)(exports.__name__));
            exports.config.startupExecuteFunction = exports.config.startupExecuteFunction ?? {};
            delete exports.config.startupExecuteFunction[id];
            await  Promise.__onAwait((0, webutils_1.SavePersistentConfig)(exports.__name__, exports.config));
        }finally{Promise.__onAsyncExit();}},
        async get(id) {Promise.__onAsyncEnter();try{
            exports.config = await  Promise.__onAwait((0, webutils_1.GetPersistentConfig)(exports.__name__));
            return exports.config.startupExecuteFunction?.[id];
        }finally{Promise.__onAsyncExit();}},
        async iter() {Promise.__onAsyncEnter();try{
            exports.config = await  Promise.__onAwait((0, webutils_1.GetPersistentConfig)(exports.__name__));
            exports.config.startupExecuteFunction = exports.config.startupExecuteFunction ?? {};
            return Object.entries(exports.config.startupExecuteFunction);
        }finally{Promise.__onAsyncExit();}}
    };
    async function main(cmd) {Promise.__onAsyncEnter();try{
        if (cmd == 'webui') {
            (0, webutils_1.useDeviceWidth)();
            exports.config = await  Promise.__onAwait((0, webutils_1.GetPersistentConfig)(exports.__name__));
            (0, window_1.ensureRootWindowContainer)();
            if (exports.config.mobileMode == undefined) {
                let windowWidth = (await  Promise.__onAwait((await  Promise.__onAwait(window_1.rootWindowGroup.waitValid())).container.waitValid())).offsetWidth;
                exports.config.mobileMode = windowWidth < 800;
            }
            if (exports.config.mobileMode) {
                let setMobileDefaultFullScreenName = exports.__name__ + '.setMobileDefaultFullScreen';
                if (workspace_1.openNewWindowPipeline.arr().find(t1 => t1.name == setMobileDefaultFullScreenName) == undefined) {
                    workspace_1.openNewWindowPipeline.arr().push({ name: setMobileDefaultFullScreenName, handler: async (context) => {Promise.__onAsyncEnter();try{
                            (await  Promise.__onAwait(context.result.windowRef.waitValid())).setMaximized(true);
                        }finally{Promise.__onAsyncExit();}} });
                }
            }
            renderPackagePanel();
            for (let t1 of await  Promise.__onAwait(exports.webuiStartupExecuteFunction.iter())) {
                new Promise((resolve_4, reject_4) => { require([t1[1].module], resolve_4, reject_4); }).then(mod => mod[t1[1].functionName](...(t1[1].arguments ?? []))).catch(() => { });
                if (t1[1].once) {
                    await  Promise.__onAwait(exports.webuiStartupExecuteFunction.delete(t1[0]));
                }
            }
        }
    }finally{Promise.__onAsyncExit();}}
});
