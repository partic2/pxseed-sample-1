define("pxseedBuildScript/loaders", ["require", "exports", "./util"], function (require, exports, util_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.pxseedBuiltinLoader = exports.inited = exports.outputDir = exports.sourceDir = void 0;
    exports.sourceDir = '';
    exports.outputDir = '';
    exports.inited = (async () => {
        const { path, wwwroot } = await (0, util_1.getNodeCompatApi)();
        exports.sourceDir = path.join(wwwroot, '..', 'source');
        exports.outputDir = wwwroot;
    })();
    exports.pxseedBuiltinLoader = {
        copyFiles: async function (dir, config) {
            const { fs, path } = await (0, util_1.getNodeCompatApi)();
            let tplVar = {
                sourceRoot: exports.sourceDir, outputRoot: exports.outputDir,
                packageSource: dir, packageOutput: exports.outputDir + '/' + dir.substring(exports.sourceDir.length + 1)
            };
            function applyTemplate(source, tpl) {
                let vars = Object.keys(tpl);
                let result = (new Function(...vars, 'return `' + source + '`;'))(...vars.map(p => tpl[p]));
                return result;
            }
            let outDir = config.outDir ?? '${packageOutput}';
            outDir = applyTemplate(outDir, tplVar);
            let include = [];
            for (let t1 of config.include) {
                include.push(applyTemplate(t1, tplVar));
            }
            for (let subpath of await (0, util_1.simpleGlob)(include, { cwd: dir })) {
                let dest = path.join(outDir, subpath);
                let src = path.join(dir, subpath);
                let needCopy = false;
                try {
                    let dfile = await fs.stat(dest);
                    let sfile2 = await fs.stat(src);
                    if (dfile.mtimeMs < sfile2.mtimeMs) {
                        needCopy = true;
                    }
                }
                catch (e) {
                    needCopy = true;
                }
                if (needCopy) {
                    try {
                        await fs.mkdir(path.join(dest, '..'), { recursive: true });
                    }
                    catch (e) { }
                    ;
                    await fs.copyFile(src, dest);
                }
            }
        },
        typescript: async function (dir, config, status) {
            const { fs, path } = await (0, util_1.getNodeCompatApi)();
            let ts;
            if (globalThis?.process?.versions?.node == undefined) {
                //use non node typescript
                const { getTypescriptModuleTjs } = await new Promise((resolve_1, reject_1) => { require(['partic2/packageManager/nodecompat'], resolve_1, reject_1); });
                ts = await getTypescriptModuleTjs();
                ts = ts.default ?? ts;
            }
            else {
                ts = await new Promise((resolve_2, reject_2) => { require(['typescript'], resolve_2, reject_2); });
                ts = ts.default ?? ts;
            }
            let include = config.include ?? ["./**/*.ts", "./**/*.tsx"];
            let files = await (0, util_1.simpleGlob)(include, { cwd: dir });
            for (let t1 of files) {
                try {
                    if (t1.endsWith('.d.ts') || t1.endsWith('.d.tsx'))
                        continue;
                    let filePath = path.join(dir, t1);
                    let fileInfo = await fs.stat(filePath);
                    let mtime = fileInfo.mtime.getTime();
                    let moduleName = dir.substring(exports.sourceDir.length + 1).replace(/\\/g, '/') + '/' + t1.replace(/.tsx?$/, '');
                    moduleName = moduleName.replace(/\/\/+/g, '/');
                    if (mtime > status.lastSuccessBuildTime) {
                        util_1.console.info('typescript transpile ' + t1);
                        let transpiled = '';
                        if (t1.endsWith('.ts')) {
                            transpiled = ts.transpile(new TextDecoder().decode(await fs.readFile(filePath)), { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.AMD, esModuleInterop: false }, filePath, [], moduleName);
                        }
                        else if (t1.endsWith('.tsx')) {
                            transpiled = ts.transpile(new TextDecoder().decode(await fs.readFile(filePath)), { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.AMD, esModuleInterop: false, jsx: ts.JsxEmit.React }, filePath, [], moduleName);
                        }
                        let outputPath = path.join(exports.outputDir, dir.substring(exports.sourceDir.length + 1).replace(/\\/g, '/'), t1.replace(/.tsx?$/, '.js'));
                        await fs.mkdir(path.join(outputPath, '..'), { recursive: true });
                        await fs.writeFile(outputPath, new TextEncoder().encode(transpiled));
                    }
                }
                catch (err) {
                    status.currentBuildError.push('typescript transpile error:file:' + t1 + ' message:' + err.toString());
                }
            }
            if (config.createTsConfig ?? true) {
                try {
                    await fs.access(path.join(dir, 'tsconfig.json'));
                }
                catch (err) {
                    let sourceRootPath = dir.substring(exports.sourceDir.length + 1).split(/[\\/]/).map(v => '..').join('/');
                    if (err.code == 'ENOENT') {
                        let tsconfig = {
                            "compilerOptions": {
                                "paths": {
                                    "*": [`${sourceRootPath}/*`, `${sourceRootPath}/../npmdeps/node_modules/*`]
                                },
                            },
                            "extends": `${sourceRootPath}/tsconfig.base.json`,
                            "include": include
                        };
                        await fs.writeFile(path.join(dir, 'tsconfig.json'), new TextEncoder().encode(JSON.stringify(tsconfig)));
                    }
                    else {
                        throw err;
                    }
                }
            }
        },
        rollup: async function (dir, config, status) {
            //noImplicitExternal: These module will always has no external module dependency except these listed in extryModules.
            //bundle: These module will never be a external dependency except these listed in extryModules.
            const { fs, path } = await (0, util_1.getNodeCompatApi)();
            if (globalThis?.process?.versions?.node == undefined) {
                //TODO: use cdn https://cdnjs.cloudflare.com/ and wrap amd custom?
                util_1.console.warn('rollup are not supported yet on non-node platform');
                return;
            }
            let rollupedJsModule = new Set(status.loadersData.rollup?.rollupedJsModule ?? []);
            for (let i1 = 0; i1 < config.entryModules.length && i1 < 0xffff; i1++) {
                let mod = config.entryModules[i1];
                let existed = false;
                try {
                    await fs.access(path.join(exports.outputDir, mod + '.js'));
                    existed = true;
                }
                catch (e) {
                    existed = false;
                }
                if (!existed) {
                    rollupedJsModule.add(mod);
                    let rollup = (await new Promise((resolve_3, reject_3) => { require(['rollup'], resolve_3, reject_3); })).rollup;
                    let nodeResolve = (await new Promise((resolve_4, reject_4) => { require(['@rollup/plugin-node-resolve'], resolve_4, reject_4); })).default;
                    let commonjs = (await new Promise((resolve_5, reject_5) => { require(['@rollup/plugin-commonjs'], resolve_5, reject_5); })).default;
                    let json = (await new Promise((resolve_6, reject_6) => { require(['@rollup/plugin-json'], resolve_6, reject_6); })).default;
                    let terser = (await new Promise((resolve_7, reject_7) => { require(['@rollup/plugin-terser'], resolve_7, reject_7); })).default;
                    let replacer = (await new Promise((resolve_8, reject_8) => { require(['@rollup/plugin-replace'], resolve_8, reject_8); })).default;
                    util_1.console.info(`create bundle for ${mod}`);
                    let plugins = [
                        nodeResolve({ modulePaths: [path.join(exports.outputDir, '..', 'npmdeps', 'node_modules')], browser: true, preferBuiltins: false }),
                        commonjs(),
                        json(),
                        //Slow the rollup, But some library need this.
                        replacer({
                            'process.env.NODE_ENV': JSON.stringify('production')
                        })
                    ];
                    if (config.compressed !== false) {
                        plugins.push(terser());
                    }
                    let task = await rollup({
                        input: [mod],
                        plugins,
                        external: (source, importer, isResolved) => {
                            let isExternal = false;
                            if (source != mod && config.entryModules.includes(source)) {
                                isExternal = true;
                            }
                            if (source != mod && !(/^\.\.?[\\\/]/.test(source) || source.startsWith('/') || /^[a-zA-Z]:[\\\/]/.test(source)) && !config.noImplicitExternal?.includes(mod) && !config.bundle?.includes(source)) {
                                if (!config.entryModules.includes(source)) {
                                    config.entryModules.push(source);
                                }
                                isExternal = true;
                            }
                            return isExternal;
                        }
                    });
                    await task.write({
                        file: path.join(exports.outputDir, mod + '.js'),
                        format: 'amd'
                    });
                }
            }
            status.loadersData.rollup = { rollupedJsModule: Array.from(rollupedJsModule) };
        },
        subpackage: async function (dir, config, status) {
            status.subpackages.push(...config.packages);
        }
    };
});
