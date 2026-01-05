define(["require", "exports", "./util"], function (require, exports, util_1) {
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
                if (!config.transpileOnly) {
                    util_1.console.info('force use transpileOnly on non-node platform');
                    config.transpileOnly = true;
                }
                const { getTypescriptModuleTjs } = await new Promise((resolve_1, reject_1) => { require(['partic2/packageManager/nodecompat'], resolve_1, reject_1); });
                ts = await getTypescriptModuleTjs();
                ts = ts.default ?? ts;
            }
            else {
                ts = await new Promise((resolve_2, reject_2) => { require(['typescript'], resolve_2, reject_2); });
                ts = ts.default ?? ts;
            }
            if (config.transpileOnly === true) {
                let include = config.include ?? ["./**/*.ts", "./**/*.tsx"];
                let files = await (0, util_1.simpleGlob)(include, { cwd: dir });
                for (let t1 of files) {
                    let filePath = path.join(dir, t1);
                    let fileInfo = await fs.stat(filePath);
                    let mtime = fileInfo.mtime.getTime();
                    let moduleName = dir.substring(exports.sourceDir.length + 1).replace(/\\/g, '/') + '/' + t1.replace(/.tsx?$/, '');
                    moduleName = moduleName.replace(/\/\/+/g, '/');
                    if (mtime > status.lastBuildTime) {
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
            }
            else {
                let tscPath = path.join(exports.outputDir, '..', 'npmdeps', 'node_modules', 'typescript', 'bin', 'tsc');
                let sourceRootPath = dir.substring(exports.sourceDir.length + 1).split(/[\\/]/).map(v => '..').join('/');
                let include = config.include ?? ["./**/*.ts", "./**/*.tsx"];
                try {
                    await fs.access(path.join(dir, 'tsconfig.json'));
                }
                catch (err) {
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
                        if (config.exclude != undefined) {
                            tsconfig.exclude = config.exclude;
                        }
                        await fs.writeFile(path.join(dir, 'tsconfig.json'), new TextEncoder().encode(JSON.stringify(tsconfig)));
                    }
                    else {
                        throw err;
                    }
                }
                let files = await (0, util_1.simpleGlob)(include, { cwd: dir });
                let latestMtime = 0;
                for (let t1 of files) {
                    let fileInfo = await fs.stat(path.join(dir, t1));
                    let mtime = fileInfo.mtime.getTime();
                    if (mtime > latestMtime)
                        latestMtime = mtime;
                }
                if (status.lastSuccessBuildTime > latestMtime) {
                    util_1.console.info('typescript loader: No file modified since last build, skiped.');
                    return;
                }
                let returnCode = await util_1.__internal__.runCommand(`node ${tscPath} -p ${dir}`);
                if (returnCode !== 0)
                    status.currentBuildError.push('tsc failed.');
            }
        },
        rollup: async function (dir, config) {
            const { fs, path } = await (0, util_1.getNodeCompatApi)();
            if (globalThis?.process?.versions?.node == undefined) {
                //TODO: use cdn https://cdnjs.cloudflare.com/ and wrap amd custom?
                util_1.console.info('rollup are not supported yet on non-node platform');
            }
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
                            // TODO:How to handle builtin node module?
                            /*
                            if((globalThis as any).requirejs.__nodeenv.require.resolve.paths(source)==null){
                                return true;
                            }
                            */
                            if (source != mod && config.entryModules.includes(source)) {
                                return true;
                            }
                            return false;
                        }
                    });
                    await task.write({
                        file: path.join(exports.outputDir, mod + '.js'),
                        format: 'amd'
                    });
                }
            }
        },
        subpackage: async function (dir, config, status) {
            status.subpackages.push(...config.packages);
        }
    };
});
//# sourceMappingURL=loaders.js.map