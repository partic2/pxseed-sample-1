define("partic2/packageManager/pxseedloaderbuilder", ["require", "exports", "partic2/tjshelper/tjsbuilder", "partic2/jsutils1/webutils", "partic2/jsutils1/base", "partic2/CodeRunner/jsutils2"], function (require, exports, tjsbuilder_1, webutils_1, base_1, jsutils2_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.PxseedLoaderBuilder = void 0;
    exports.defaultBuild = defaultBuild;
    (0, jsutils2_1.setupAsyncHook)();
    let __name__ = base_1.requirejs.getLocalRequireModule(require);
    let log = base_1.logger.getLogger(__name__);
    let pathsep = (0, webutils_1.getWWWRoot)().includes('\\') ? '\\' : '/';
    function onlyJsCssBuildInfoFilesFilter(p) {
        return p.endsWith('.js') || p.endsWith('.pxseed.status.json') || p.endsWith('.css');
    }
    let corePackOutputs = [
        { path: ['www', 'index.html'] },
        { path: ['www', 'noderun.js'] },
        { path: ['www', 'pxseedInit.js'] },
        { path: ['www', 'require.js'] },
        { path: ['www', 'txikirun.js'] },
        { path: ['www', 'preact.js'] },
        { path: ['www', 'pxseedBuildScript'], filter: onlyJsCssBuildInfoFilesFilter },
        { path: ['www', 'pxseedServer2023'], filter: onlyJsCssBuildInfoFilesFilter },
        { path: ['www', 'pxprpc'], filter: onlyJsCssBuildInfoFilesFilter },
        { path: ['www', 'partic2', 'CodeRunner'], filter: onlyJsCssBuildInfoFilesFilter },
        { path: ['www', 'partic2', 'JsNotebook'], filter: (p) => onlyJsCssBuildInfoFilesFilter(p) && !p.startsWith('__temp/') && !p.startsWith('workspace/') },
        { path: ['www', 'partic2', 'jsutils1'], filter: onlyJsCssBuildInfoFilesFilter },
        { path: ['www', 'partic2', 'nodehelper'], filter: (p) => onlyJsCssBuildInfoFilesFilter(p) && !p.startsWith('__temp/') },
        { path: ['www', 'partic2', 'pComponentUi'], filter: onlyJsCssBuildInfoFilesFilter },
        { path: ['www', 'partic2', 'packageManager'], filter: (p) => onlyJsCssBuildInfoFilesFilter(p) && !p.startsWith('__temp/') && p != 'typescript4tjs.js' },
        { path: ['www', 'partic2', 'pxprpcBinding'], filter: onlyJsCssBuildInfoFilesFilter },
        { path: ['www', 'partic2', 'pxprpcClient'], filter: onlyJsCssBuildInfoFilesFilter },
        { path: ['www', 'partic2', 'pxseedMedia1'] },
        { path: ['www', 'partic2', 'tjshelper'], filter: onlyJsCssBuildInfoFilesFilter }
    ];
    class PxseedLoaderBuilder {
        constructor() {
            this.git = 'git';
            this.cmake = 'cmake';
            this.pxseedLoaderSource = null;
            this.desktopBuildToolchains = null;
            this.cmakeGenerator = null;
            this.androidBuild = null;
            this.AndroidHome = null;
            this.AndroidNdk = null;
            this.androidBuildSdkVersion = null;
            this.tjsi = null;
            this.depsSourceDirs = null;
            this.androidAbi = ['arm64-v8a', 'armeabi-v7a'];
            this.skipDepsCheck = false;
            //Extend library.
            this.androidNoExtend = false;
            //Enable geckoview on android(enlarge the .apk size).
            this.androidEnableGeckoView = false;
            this.debugBuild = false;
        }
        async ensureTjsi() {Promise.__onAsyncEnter();try{
            if (this.tjsi == null)
                this.tjsi = await  Promise.__onAwait((0, tjsbuilder_1.buildTjs)());
            return this.tjsi;
        }finally{Promise.__onAsyncExit();}}
        async whichExec(name) {Promise.__onAsyncEnter();try{
            let tjsi = await  Promise.__onAwait(this.ensureTjsi());
            let path1 = tjsi.env.PATH;
            let pathsSep = path1.includes(';') ? ';' : ':';
            let path1List = path1.split(pathsSep);
            let found = null;
            for (let t1 of path1List) {
                try {
                    let t2 = t1 + pathsep + name;
                    await  Promise.__onAwait(tjsi.stat(t2));
                    found = t2;
                    break;
                }
                catch (err) { }
                ;
                try {
                    let t2 = t1 + pathsep + name + '.exe';
                    await  Promise.__onAwait(tjsi.stat(t2));
                    found = t2;
                    break;
                }
                catch (err) { }
                ;
            }
            return found;
        }finally{Promise.__onAsyncExit();}}
        async runCommand(cmd, cwd) {Promise.__onAsyncEnter();try{
            log.info('run command:\n ' + cmd.join(' ') + '\n in ' + (cwd ?? '.'));
            let tjsi = await  Promise.__onAwait(this.ensureTjsi());
            let proc = await  Promise.__onAwait(tjsi.spawn(cmd, { stdout: 'inherit', stderr: 'inherit', cwd }));
            let runstat = await  Promise.__onAwait(proc.wait());
            log.info('commmand done.');
            (0, base_1.assert)(runstat.exit_status == 0, 'process exit with code ' + runstat.exit_status);
        }finally{Promise.__onAsyncExit();}}
        async listDir(dir) {Promise.__onAsyncEnter();try{
            let tjsi = await  Promise.__onAwait(this.ensureTjsi());
            let children = new Array();
            let iter = await  Promise.__onAwait(tjsi.readDir(dir));
            try {
                for (let ch = await  Promise.__onAwait(iter.next()); !ch.done; ch = await  Promise.__onAwait(iter.next())) {
                    children.push({ name: ch.value.name, path: [dir, ch.value.name].join(pathsep), type: ch.value.isDirectory ? 'dir' : 'file' });
                }
            }
            finally {
                await  Promise.__onAwait(iter.close());
            }
            return children;
        }finally{Promise.__onAsyncExit();}}
        dirname(path) {
            return path.split(/[\\\/]/g).slice(0, -1).join(pathsep);
        }
        async copyFilesNewer(dest, src, ignore, maxDepth) {Promise.__onAsyncEnter();try{
            let tjsi = await  Promise.__onAwait(this.ensureTjsi());
            if (maxDepth == undefined) {
                maxDepth = 30;
            }
            if (maxDepth == 0) {
                return;
            }
            let statSrc = await  Promise.__onAwait(tjsi.stat(src));
            if (statSrc.isFile) {
                if (ignore != undefined && ignore(src)) {
                    return;
                }
                let needCopy = false;
                try {
                    let dfile = await  Promise.__onAwait(tjsi.stat(dest));
                    let sfile2 = statSrc;
                    if (dfile.mtim.getTime() < sfile2.mtim.getTime()) {
                        needCopy = true;
                    }
                }
                catch (e) {
                    needCopy = true;
                }
                if (needCopy) {
                    try {
                        await  Promise.__onAwait(tjsi.makeDir(this.dirname(dest), { recursive: true }));
                        await  Promise.__onAwait(tjsi.copyFile(src, dest));
                    }
                    catch (err) {
                        log.warning(err);
                    }
                }
            }
            else if (statSrc.isDirectory) {
                let children = await  Promise.__onAwait(this.listDir(src));
                for (let t1 of children) {
                    await  Promise.__onAwait(this.copyFilesNewer([dest, t1.name].join(pathsep), [src, t1.name].join(pathsep), ignore, maxDepth - 1));
                }
            }
        }finally{Promise.__onAsyncExit();}}
        async writeFile(path, data) {Promise.__onAsyncEnter();try{
            let tjsi = await  Promise.__onAwait(this.ensureTjsi());
            let f = await  Promise.__onAwait(tjsi.open(path, 'w'));
            try {
                await  Promise.__onAwait(f.write(data, 0));
            }
            finally {
                await  Promise.__onAwait(f.close().catch(() => { }));
            }
        }finally{Promise.__onAsyncExit();}}
        async ensurePxseedLoaderSource() {Promise.__onAsyncEnter();try{
            let tjsi = await  Promise.__onAwait(this.ensureTjsi());
            if (this.pxseedLoaderSource === null) {
                if (tjsi.env.PXSEEDLOADER_SOURCE_DIR != null && tjsi.env.PXSEEDLOADER_SOURCE_DIR != '') {
                    this.pxseedLoaderSource = tjsi.env.PXSEEDLOADER_SOURCE_DIR;
                }
            }
            if (this.pxseedLoaderSource === null) {
                this.pxseedLoaderSource = [(0, webutils_1.getWWWRoot)(), ...__name__.split('/'), 'data', 'pxseedloadersource'].join(pathsep);
                log.info(`pxseed loader source not defined, use ${this.pxseedLoaderSource}`);
            }
            try {
                await  Promise.__onAwait(tjsi.stat(this.pxseedLoaderSource));
            }
            catch (err) {
                log.info('No source found, clone from remote.');
                await  Promise.__onAwait(tjsi.makeDir(this.pxseedLoaderSource, { recursive: true }));
                await  Promise.__onAwait(this.runCommand([this.git, 'clone', '--depth=1', 'https://gitee.com/partic/xplatj2.git', this.pxseedLoaderSource]));
            }
        }finally{Promise.__onAsyncExit();}}
        async build() {Promise.__onAsyncEnter();try{
            if (this.pxseedLoaderSource == null) {
                await  Promise.__onAwait(this.ensurePxseedLoaderSource());
            }
            let tjsi = await  Promise.__onAwait(this.ensureTjsi());
            try {
                let configJs = new TextDecoder().decode(await  Promise.__onAwait(tjsi.readFile(this.pxseedLoaderSource + '/launcher/build_config.txt')));
                new Function('c', configJs)(this);
            }
            catch (err) { }
            ;
            await  Promise.__onAwait(this.initializeEnviron());
            let flags = new Array();
            flags.push(`buildTime=${new Date().getTime()}`);
            flags.push(`androidEnableGeckoView=${this.androidEnableGeckoView}`);
            await  Promise.__onAwait(this.writeFile([this.pxseedLoaderSource, 'commonj', 'src', 'main', 'assets', 'res', 'pxseedloader-flags.txt'].join(pathsep), (0, jsutils2_1.utf8conv)(flags.join('\n'))));
            if (this.androidBuild)
                await  Promise.__onAwait(this.buildAndroidRelease());
            await  Promise.__onAwait(this.buildDesktopRelease());
        }finally{Promise.__onAsyncExit();}}
        async detectCmakeGenerator() {Promise.__onAsyncEnter();try{
            if (this.tjsi.system.platform == 'linux') {
                this.cmakeGenerator = 'Unix Makefiles';
            }
            else if (this.tjsi.system.platform == 'windows') {
                this.cmakeGenerator = 'MinGW Makefiles';
            }
            else {
                let make = await  Promise.__onAwait(this.whichExec('make'));
                if (make !== null) {
                    this.cmakeGenerator = 'Unix Makefiles';
                }
                if (make == null) {
                    make = await  Promise.__onAwait(this.whichExec('mingw32-make'));
                    if (make !== null) {
                        this.cmakeGenerator = 'MinGW Makefiles';
                    }
                }
            }
        }finally{Promise.__onAsyncExit();}}
        async pullDeps(dir) {Promise.__onAsyncEnter();try{
            let tjsi = await  Promise.__onAwait(this.ensureTjsi());
            try {
                await  Promise.__onAwait(tjsi.stat([dir, 'deps', 'pull_deps.py'].join(pathsep)));
                let pullList = new Array();
                let pullStats = (0, jsutils2_1.utf8conv)(await  Promise.__onAwait(tjsi.readFile([dir, 'deps', 'pull_deps.py'].join(pathsep)))).match(/pull\(.+\)/g).slice(1);
                pullStats.forEach(t1 => new Function('pull', t1)((name, url, branch) => pullList.push({ name, url, branch })));
                for (let t1 of pullList) {
                    let targetDir = [this.depsSourceDirs, t1.name].join(pathsep);
                    let existed = false;
                    try {
                        await  Promise.__onAwait(tjsi.stat(targetDir));
                        existed = true;
                    }
                    catch (err) { }
                    if (existed) {
                        await  Promise.__onAwait(this.runCommand([this.git, '-C', targetDir, 'pull', '--rebase']));
                    }
                    else {
                        await  Promise.__onAwait(this.runCommand([this.git, 'clone', t1.url, '-b', t1.branch, '--depth=1', targetDir]));
                    }
                    await  Promise.__onAwait(this.pullDeps(targetDir));
                }
            }
            catch (err) { }
            ;
        }finally{Promise.__onAsyncExit();}}
        async initializeEnviron() {Promise.__onAsyncEnter();try{
            let tjsi = await  Promise.__onAwait(this.ensureTjsi());
            if (this.cmakeGenerator == null) {
                this.detectCmakeGenerator();
            }
            if (this.depsSourceDirs == null) {
                this.depsSourceDirs = tjsi.env.DEPS_SOURCE_DIRS;
            }
            if (this.depsSourceDirs == null || this.depsSourceDirs == '') {
                this.depsSourceDirs = [this.pxseedLoaderSource, 'deps'].join(pathsep);
            }
            if (this.depsSourceDirs != tjsi.env.DEPS_SOURCE_DIRS) {
                tjsi.env.DEPS_SOURCE_DIRS = this.depsSourceDirs;
            }
            if (this.AndroidHome == null && tjsi.env.ANDROID_HOME != undefined) {
                this.AndroidHome = tjsi.env.ANDROID_HOME;
            }
            if (this.androidBuild === null) {
                this.androidBuild = this.AndroidHome != null;
            }
            if (this.androidBuild && this.AndroidNdk == null) {
                let ndksDir = [this.AndroidHome, 'ndk'].join(pathsep);
                for (let t1 of await  Promise.__onAwait(this.listDir(ndksDir))) {
                    try {
                        await  Promise.__onAwait(tjsi.stat([t1.path, 'build', 'cmake', 'android.toolchain.cmake'].join(pathsep)));
                        this.AndroidNdk = t1.path;
                        break;
                    }
                    catch (err) { }
                    ;
                }
                (0, base_1.assert)(this.AndroidNdk != null, 'ANDROID NDK not found.Install it first');
                if (this.androidBuildSdkVersion == null) {
                    let buildGradle = new TextDecoder().decode(await  Promise.__onAwait(tjsi.readFile(this.pxseedLoaderSource + '/android-project/build.gradle')));
                    let foundMinSdkVersion = buildGradle.match(/minSdkVersion\s*(\d+)/);
                    if (foundMinSdkVersion == null) {
                        this.androidBuildSdkVersion = 21;
                    }
                    else {
                        this.androidBuildSdkVersion = Number(foundMinSdkVersion[1]);
                    }
                }
            }
            if (this.desktopBuildToolchains == null) {
                this.desktopBuildToolchains = {};
                if (tjsi.env.CC != null && tjsi.env.CC != '' && tjsi.env.CXX != null && tjsi.env.CXX != '') {
                    this.desktopBuildToolchains.hostToolchain = { CC: tjsi.env.CC, CXX: tjsi.env.CXX };
                }
            }
            if (!this.skipDepsCheck) {
                await  Promise.__onAwait(this.pullDeps(this.pxseedLoaderSource));
            }
            await  Promise.__onAwait(this.preparePxseedJsCoreEnviron());
        }finally{Promise.__onAsyncExit();}}
        async preparePxseedJsCoreEnviron() {Promise.__onAsyncEnter();try{
            try {
                await  Promise.__onAwait(this.copyFilesNewer(this.pxseedLoaderSource + '/commonj/src/main/assets/res/tjs-initialize', this.pxseedLoaderSource + '/deps/txiki.js/src/js'));
            }
            catch (err) { }
            let pxseedRoot = this.dirname((0, webutils_1.getWWWRoot)());
            for (let t1 of corePackOutputs) {
                let sourcePath = [pxseedRoot, ...t1.path].join(pathsep);
                let destPath = this.pxseedLoaderSource + '/commonj/src/main/assets/res/pxseed/' + t1.path.join(pathsep);
                let filter = t1.filter;
                await  Promise.__onAwait(this.copyFilesNewer(destPath, sourcePath, (path) => {
                    if (filter == undefined)
                        return false;
                    let relpath = path.substring(sourcePath.length + 1).replace(/\\/g, '/');
                    return !filter(relpath);
                }));
            }
        }finally{Promise.__onAsyncExit();}}
        async buildAndroidRelease() {Promise.__onAsyncEnter();try{
            let tjsi = await  Promise.__onAwait(this.ensureTjsi());
            await  Promise.__onAwait(this.writeFile(this.pxseedLoaderSource + '/android-project/build-options.properties', new TextEncoder().encode(`
noExtend=${this.androidNoExtend}
enableGeckoView=${this.androidEnableGeckoView}
`)));
            for (let currAbi of this.androidAbi) {
                let flags = [this.cmake];
                flags.push(`-DANDROID_NATIVE_API_LEVEL=${this.androidBuildSdkVersion}`);
                flags.push(`-DCMAKE_TOOLCHAIN_FILE=${this.AndroidNdk.replace(/\\/g, '/')}/build/cmake/android.toolchain.cmake`);
                if (this.debugBuild) {
                    flags.push('-DCMAKE_BUILD_TYPE=DEBUG');
                }
                else {
                    flags.push('-DCMAKE_BUILD_TYPE=RELEASE');
                }
                flags.push(`-DANDROID_ABI=${currAbi}`);
                flags.push('-G', `${this.cmakeGenerator}`);
                flags.push('-S', this.pxseedLoaderSource + '/launcher');
                let builddir = [this.pxseedLoaderSource, 'launcher', 'build', 'android', currAbi].join(pathsep);
                flags.push('-B', builddir);
                await  Promise.__onAwait(this.runCommand(flags));
                await  Promise.__onAwait(this.runCommand([this.cmake, '--build', builddir]));
                let jniDir = this.pxseedLoaderSource + '/android-project/src/main/jniLibs/' + currAbi;
                await  Promise.__onAwait(tjsi.makeDir(jniDir, { recursive: true }));
                let sodir = this.pxseedLoaderSource + '/launcher/build/android/' + currAbi + '/build-sdl';
                for (let sofile of await  Promise.__onAwait(this.listDir(sodir))) {
                    if (sofile.name.endsWith('.so')) {
                        try {
                            await  Promise.__onAwait(tjsi.copyFile(sofile.path, jniDir + '/' + sofile.name));
                        }
                        catch (err) { }
                        ;
                    }
                }
                await  Promise.__onAwait(tjsi.copyFile(builddir + '/build-pxprpc_rtbridge/libpxprpc_rtbridge.so', jniDir + '/libpxprpc_rtbridge.so'));
            }
            if (tjsi.system.platform === 'windows') {
                await  Promise.__onAwait(this.runCommand(['cmd', '/c', this.pxseedLoaderSource + '/android-project/gradlew.bat', 'assembleRelease'], [this.pxseedLoaderSource, 'android-project'].join(pathsep)));
            }
            else {
                await  Promise.__onAwait(this.runCommand([this.pxseedLoaderSource + '/android-project/gradlew', 'assembleRelease'], [this.pxseedLoaderSource, 'android-project'].join(pathsep)));
            }
            for (let t1 of this.androidAbi) {
                await  Promise.__onAwait(tjsi.copyFile(this.pxseedLoaderSource + `/android-project/build/outputs/apk/release/pxseedloader-${t1}-release.apk`, this.pxseedLoaderSource + `/launcher/build/pxseedloader-${t1}-release.apk`));
            }
            await  Promise.__onAwait(tjsi.copyFile(this.pxseedLoaderSource + `/android-project/build/outputs/apk/release/pxseedloader-universal-release.apk`, this.pxseedLoaderSource + `/launcher/build/pxseedloader-universal-release.apk`));
        }finally{Promise.__onAsyncExit();}}
        async buildDesktopRelease() {Promise.__onAsyncEnter();try{
            let tjsi = await  Promise.__onAwait(this.ensureTjsi());
            let pathssep = tjsi.system.platform === 'windows' ? ';' : ':';
            for (let [name, buildToolchain] of Object.entries(this.desktopBuildToolchains)) {
                let savedenv = {};
                if (buildToolchain.APPENDENV != undefined) {
                    savedenv.PATH = tjsi.env.PATH;
                    savedenv.LD_LIBRARY_PATH = tjsi.env.LD_LIBRARY_PATH;
                    if (buildToolchain.APPENDENV.PATH != undefined) {
                        tjsi.env.PATH = [...buildToolchain.APPENDENV.PATH, tjsi.env.PATH,].join(pathssep);
                    }
                    if (buildToolchain.APPENDENV.LD_LIBRARY_PATH != undefined) {
                        tjsi.env.LD_LIBRARY_PATH = [...buildToolchain.APPENDENV.LD_LIBRARY_PATH, tjsi.env.PATH,].join(pathssep);
                    }
                }
                try {
                    let flags = [this.cmake];
                    if (this.debugBuild) {
                        flags.push('-DCMAKE_BUILD_TYPE=DEBUG');
                    }
                    else {
                        flags.push('-DCMAKE_BUILD_TYPE=RELEASE');
                    }
                    flags.push(`-DCMAKE_C_COMPILER=${buildToolchain.CC.replace(/\\/g, '/')}`);
                    flags.push(`-DCMAKE_CXX_COMPILER=${buildToolchain.CXX.replace(/\\/g, '/')}`);
                    flags.push('-S', this.pxseedLoaderSource + '/launcher');
                    flags.push('-G', `${this.cmakeGenerator}`);
                    let builddir = [this.pxseedLoaderSource, 'launcher', 'build', name].join(pathsep);
                    flags.push('-B', builddir);
                    await  Promise.__onAwait(this.runCommand(flags));
                    await  Promise.__onAwait(this.runCommand([this.cmake, '--build', builddir]));
                    let outdir = this.pxseedLoaderSource + '/launcher/build/' + name + '_release';
                    await  Promise.__onAwait(tjsi.makeDir(outdir, { recursive: true }));
                    let copyFiles = ['launcher', 'launcher.exe', 'build-sdl/SDL3.dll', 'build-sdl/libSDL3.so',
                        'build-pxprpc_rtbridge/libpxprpc_rtbridge.dll', 'build-pxprpc_rtbridge/libpxprpc_rtbridge.so'];
                    for (let t1 of copyFiles) {
                        let filename = t1.split(/[\\\/]/g).at(-1);
                        try {
                            await  Promise.__onAwait(tjsi.copyFile(builddir + '/' + t1, outdir + '/' + filename));
                        }
                        catch (err) { }
                        ;
                    }
                    await  Promise.__onAwait(this.copyFilesNewer(outdir, this.pxseedLoaderSource + '/commonj/src/main/assets'));
                }
                finally {
                    if (buildToolchain.APPENDENV != undefined) {
                        tjsi.env.PATH = savedenv.PATH;
                        tjsi.env.LD_LIBRARY_PATH = savedenv.LD_LIBRARY_PATH;
                    }
                }
            }
        }finally{Promise.__onAsyncExit();}}
    }
    exports.PxseedLoaderBuilder = PxseedLoaderBuilder;
    async function defaultBuild(configFile) {Promise.__onAsyncEnter();try{
        log.info('prepare default build.');
        try {
            let buildConfig = new PxseedLoaderBuilder();
            let tjsi = await  Promise.__onAwait((0, tjsbuilder_1.buildTjs)());
            let configJs = '';
            if (configFile != undefined) {
                configJs = new TextDecoder().decode(await  Promise.__onAwait(tjsi.readFile(configFile)));
            }
            else { }
            if (configJs != '')
                new Function('c', configJs)(buildConfig);
            await  Promise.__onAwait(buildConfig.ensurePxseedLoaderSource());
            await  Promise.__onAwait(buildConfig.build());
        }
        catch (err) {
            log.error(err.message + '\n' + err.stack);
        }
    }finally{Promise.__onAsyncExit();}}
});
