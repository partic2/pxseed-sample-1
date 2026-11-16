var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
define("partic2/CodeRunner/JsEnviron", ["require", "exports", "partic2/jsutils1/base", "./FileSystem", "./jsutils2", "partic2/jsutils1/webutils", "partic2/tjshelper/tjsbuilder", "./FileSystem"], function (require, exports, base_1, FileSystem_1, jsutils2_1, webutils_1, tjsbuilder_1, FileSystem_2) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.installedRequirejsResourceProvider = exports.defaultFileSystem = void 0;
    exports.ensureDefaultFileSystem = ensureDefaultFileSystem;
    exports.setDefaultFileSystem = setDefaultFileSystem;
    exports.installRequireProvider = installRequireProvider;
    exports.getSimpleFileSysteNormalizedWWWRoot = getSimpleFileSysteNormalizedWWWRoot;
    __exportStar(FileSystem_2, exports);
    exports.defaultFileSystem = null;
    async function ensureDefaultFileSystem() {
        if (exports.defaultFileSystem === null) {
            if (globalThis.location?.protocol.startsWith('http')) {
                exports.defaultFileSystem = new FileSystem_1.LocalWindowSFS();
            }
            else {
                let tjs1 = await (0, tjsbuilder_1.buildTjs)();
                let t1 = new FileSystem_1.TjsSfs();
                t1.from(tjs1);
                exports.defaultFileSystem = t1;
            }
            await exports.defaultFileSystem.ensureInited();
        }
    }
    function setDefaultFileSystem(fs) {
        exports.defaultFileSystem = fs;
    }
    class CSimpleFileSystemScriptLoader {
        constructor(providers) {
            this.providers = providers;
            this.currentDefining = null;
        }
        loadModule(moduleId, url, done) {
            this.loadModuleAsync(moduleId, url).then(() => done(null), (err) => done(err));
        }
        getDefiningModule() {
            return this.currentDefining;
        }
        async loadModuleAsync(moduleId, url) {
            url = moduleId;
            if (!url.endsWith('.js'))
                url = url + '.js';
            for (let t1 of this.providers) {
                let data = await t1.fs.readAll(t1.rootPath + '/' + url);
                if (data != null) {
                    this.currentDefining = moduleId;
                    try {
                        new Function((0, jsutils2_1.utf8conv)(data))();
                    }
                    finally {
                        this.currentDefining = null;
                        return;
                    }
                }
            }
            throw new Error(`module ${moduleId} not found by CSimpleFileSystemScriptLoader`);
        }
    }
    let simpleFileSystemScriptLoader = null;
    exports.installedRequirejsResourceProvider = [];
    async function installRequireProvider(fs, rootPath) {
        if (simpleFileSystemScriptLoader == null) {
            simpleFileSystemScriptLoader = new CSimpleFileSystemScriptLoader(exports.installedRequirejsResourceProvider);
            base_1.requirejs.addScriptLoader(simpleFileSystemScriptLoader, true);
        }
        exports.installedRequirejsResourceProvider.push({ fs, rootPath: rootPath ?? 'www' });
        return { fs, rootPath: rootPath ?? 'www' };
    }
    function getSimpleFileSysteNormalizedWWWRoot() {
        let wwwroot = (0, webutils_1.getWWWRoot)().replace(/\\/g, '/');
        if (!wwwroot.startsWith('/')) {
            wwwroot = '/' + wwwroot;
        }
        return wwwroot;
    }
});
