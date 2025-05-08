define(["require", "exports", "fs/promises", "fs", "path", "tinyglobby", "./util"], function (require, exports, fs, fs_1, path_1, tinyglobby_1, util_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.pxseedBuiltinLoader = exports.outputDir = exports.sourceDir = void 0;
    exports.sourceDir = (0, path_1.join)((0, path_1.dirname)((0, path_1.dirname)(__dirname)), 'source');
    exports.outputDir = (0, path_1.join)((0, path_1.dirname)((0, path_1.dirname)(__dirname)), 'www');
    exports.pxseedBuiltinLoader = {
        copyFiles: async function (dir, config) {
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
            for (let subpath of await (0, tinyglobby_1.glob)(include, { cwd: dir })) {
                let dest = (0, path_1.join)(outDir, subpath);
                let src = (0, path_1.join)(dir, subpath);
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
                        await fs.mkdir((0, path_1.dirname)(dest), { recursive: true });
                    }
                    catch (e) { }
                    ;
                    await fs.copyFile(src, dest);
                }
            }
        },
        typescript: async function (dir, config, status) {
            if (config.transpileOnly === true) {
                let ts = (await new Promise((resolve_1, reject_1) => { require(['typescript'], resolve_1, reject_1); }));
                ts = (ts.default ?? ts);
                let include = config.include ?? ["./**/*.ts", "./**/*.tsx"];
                let files = await (0, tinyglobby_1.glob)(include, { cwd: dir });
                for (let t1 of files) {
                    let filePath = (0, path_1.join)(dir, t1);
                    let fileInfo = await fs.stat(filePath);
                    let mtime = fileInfo.mtime.getTime();
                    let moduleName = dir.substring(exports.sourceDir.length + 1).replace(/\\/g, '/') + '/' + t1.replace(/.tsx?$/, '');
                    moduleName = moduleName.replace(/\/\/+/g, '/');
                    if (mtime > status.lastBuildTime) {
                        console.info('typescript transpile ' + t1);
                        let transpiled = '';
                        if (t1.endsWith('.ts')) {
                            transpiled = ts.transpile(new TextDecoder().decode(await fs.readFile(filePath)), { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.AMD, esModuleInterop: false }, filePath, [], moduleName);
                        }
                        else if (t1.endsWith('.tsx')) {
                            transpiled = ts.transpile(new TextDecoder().decode(await fs.readFile(filePath)), { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.AMD, esModuleInterop: false, jsx: ts.JsxEmit.React }, filePath, [], moduleName);
                        }
                        let outputPath = (0, path_1.join)(exports.outputDir, dir.substring(exports.sourceDir.length + 1).replace(/\\/g, '/'), t1.replace(/.tsx?$/, '.js'));
                        await fs.mkdir((0, path_1.dirname)(outputPath), { recursive: true });
                        await fs.writeFile(outputPath, new TextEncoder().encode(transpiled));
                    }
                }
            }
            else {
                let tscPath = (0, path_1.join)(exports.outputDir, 'node_modules', 'typescript', 'bin', 'tsc');
                let sourceRootPath = dir.substring(exports.sourceDir.length + 1).split(path_1.sep).map(v => '..').join('/');
                let include = config.include ?? ["./**/*.ts", "./**/*.tsx"];
                try {
                    await fs.access((0, path_1.join)(dir, 'tsconfig.json'));
                }
                catch (err) {
                    if (err.code == 'ENOENT') {
                        let tsconfig = {
                            "compilerOptions": {
                                "paths": {
                                    "*": [`${sourceRootPath}/*`, `${sourceRootPath}/../www/node_modules/*`]
                                },
                            },
                            "extends": `${sourceRootPath}/tsconfig.base.json`,
                            "include": include
                        };
                        if (config.exclude != undefined) {
                            tsconfig.exclude = config.exclude;
                        }
                        await fs.writeFile((0, path_1.join)(dir, 'tsconfig.json'), new TextEncoder().encode(JSON.stringify(tsconfig)));
                    }
                    else {
                        throw err;
                    }
                }
                let files = await (0, tinyglobby_1.glob)(include, { cwd: dir });
                let latestMtime = 0;
                for (let t1 of files) {
                    let fileInfo = await fs.stat((0, path_1.join)(dir, t1));
                    let mtime = fileInfo.mtime.getTime();
                    if (mtime > latestMtime)
                        latestMtime = mtime;
                }
                if (status.lastSuccessBuildTime > latestMtime) {
                    console.info('typescript loader: No file modified since last build, skiped.');
                    return;
                }
                let returnCode = await (0, util_1.runCommand)(`node ${tscPath} -p ${dir}`);
                if (returnCode !== 0)
                    status.currentBuildError.push('tsc failed.');
            }
        },
        rollup: async function (dir, config) {
            let rollup = (await new Promise((resolve_2, reject_2) => { require(['rollup'], resolve_2, reject_2); })).rollup;
            let nodeResolve = (await new Promise((resolve_3, reject_3) => { require(['@rollup/plugin-node-resolve'], resolve_3, reject_3); })).default;
            let commonjs = (await new Promise((resolve_4, reject_4) => { require(['@rollup/plugin-commonjs'], resolve_4, reject_4); })).default;
            let json = (await new Promise((resolve_5, reject_5) => { require(['@rollup/plugin-json'], resolve_5, reject_5); })).default;
            let terser = (await new Promise((resolve_6, reject_6) => { require(['@rollup/plugin-terser'], resolve_6, reject_6); })).default;
            let replacer = (await new Promise((resolve_7, reject_7) => { require(['@rollup/plugin-replace'], resolve_7, reject_7); })).default;
            for (let i1 = 0; i1 < config.entryModules.length && i1 < 0xffff; i1++) {
                let mod = config.entryModules[i1];
                let existed = false;
                try {
                    await fs.access((0, path_1.join)(exports.outputDir, mod + '.js'), fs_1.constants.R_OK);
                    existed = true;
                }
                catch (e) {
                    existed = false;
                }
                if (!existed) {
                    console.info(`create bundle for ${mod}`);
                    let plugins = [
                        nodeResolve({ modulePaths: [(0, path_1.join)(exports.outputDir, 'node_modules')], browser: true }),
                        commonjs(),
                        json(),
                        //Slow the rollup, But "React" need this.
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
                            if (globalThis.requirejs.__nodeenv.require.resolve.paths(source) == null) {
                                return true;
                            }
                            else if (source.endsWith('/')) {
                                //Some import like 'process/', Don't make external.
                                return true;
                            }
                            if (source != mod && !/^[\/\.]/.test(source) && !/^[a-zA-Z]:\\/.test(source)) {
                                if (!config.entryModules.includes(source)) {
                                    config.entryModules.push(source);
                                }
                                return true;
                            }
                            return false;
                        }
                    });
                    await task.write({
                        file: (0, path_1.join)(exports.outputDir, mod + '.js'),
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