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
            let tscPath = (0, path_1.join)(exports.outputDir, 'node_modules', 'typescript', 'bin', 'tsc');
            let sourceRootPath = dir.substring(exports.sourceDir.length + 1).split(path_1.sep).map(v => '..').join('/');
            let include = config.include ?? ["./**/*.ts", "./**/*.tsx"];
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
            let returnCode = await (0, util_1.runCommand)(`node ${tscPath} -p ${dir}`);
            if (returnCode !== 0)
                status.currentBuildError.push('tsc failed.');
        },
        rollup: async function (dir, config) {
            let rollup = (await new Promise((resolve_1, reject_1) => { require(['rollup'], resolve_1, reject_1); })).rollup;
            let nodeResolve = (await new Promise((resolve_2, reject_2) => { require(['@rollup/plugin-node-resolve'], resolve_2, reject_2); })).default;
            let commonjs = (await new Promise((resolve_3, reject_3) => { require(['@rollup/plugin-commonjs'], resolve_3, reject_3); })).default;
            let json = (await new Promise((resolve_4, reject_4) => { require(['@rollup/plugin-json'], resolve_4, reject_4); })).default;
            let terser = (await new Promise((resolve_5, reject_5) => { require(['@rollup/plugin-terser'], resolve_5, reject_5); })).default;
            let replacer = (await new Promise((resolve_6, reject_6) => { require(['@rollup/plugin-replace'], resolve_6, reject_6); })).default;
            for (let mod of config.entryModules) {
                let existed = false;
                try {
                    await fs.access((0, path_1.join)(exports.outputDir, mod + '.js'), fs_1.constants.R_OK);
                    existed = true;
                }
                catch (e) {
                    existed = false;
                }
                if (!existed) {
                    let task = await rollup({
                        input: [mod],
                        plugins: [
                            nodeResolve({ modulePaths: [(0, path_1.join)(exports.outputDir, 'node_modules')], browser: true }),
                            commonjs(),
                            json(),
                            terser(),
                            //Slow the rollup, But "React" need this.
                            replacer({
                                'process.env.NODE_ENV': JSON.stringify('production')
                            })
                        ],
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