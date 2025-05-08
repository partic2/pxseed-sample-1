define(["require", "exports", "partic2/jsutils1/base", "partic2/jsutils1/webutils"], function (require, exports, base_1, webutils_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.pathCompat = exports.NodeFsAdapter = void 0;
    //node compatible fs, To used in isomorphic-git
    class NodeFsCompatDirent {
        constructor(fileType, name, path) {
            this.fileType = fileType;
            this.name = name;
            this.path = path;
        }
        ;
        isFile() { return this.fileType == 'file'; }
        isDirectory() { return this.fileType == 'dir'; }
        isBlockDevice() { return false; }
        isCharacterDevice() { return false; }
        isSymbolicLink() { return false; }
        isFIFO() { return false; }
        isSocket() { return false; }
    }
    class NodeFsCompatStats extends NodeFsCompatDirent {
        constructor() {
            super(...arguments);
            this.dev = 0;
            this.ino = 0;
            this.mode = 0o777;
            this.nlink = 0;
            this.uid = 0;
            this.gid = 0;
            this.rdev = 0;
            this.size = 0;
            this.blksize = 0;
            this.blocks = 0;
            this.atime = new Date(0);
            this.mtime = new Date(0);
            this.ctime = new Date(0);
            this.birthtime = new Date(0);
        }
        get atimeMs() { return this.atime.getTime(); }
        ;
        get mtimeMs() { return this.mtime.getTime(); }
        ;
        get ctimeMs() { return this.ctime.getTime(); }
        ;
        get birthtimeMs() { return this.birthtime.getTime(); }
        ;
    }
    class NodeFsAdapter {
        constructor(wrapped) {
            this.wrapped = wrapped;
            this.readFile = (async (path, options) => {
                let data = await this.wrapped.readAll(path);
                if (data == null) {
                    let err = new Error('File not existed.');
                    err.name = 'ENOENT';
                    throw err;
                }
                if (options?.encoding != undefined) {
                    (0, base_1.assert)(options.encoding.toLowerCase() == 'utf8');
                    return new TextDecoder().decode(data);
                }
                else {
                    return data;
                }
            });
            this.writeFile = (async (path, data, options) => {
                if (options?.encoding != undefined) {
                    (0, base_1.assert)(options.encoding.toLowerCase() == 'utf8');
                }
                if (typeof data === 'string') {
                    data = new TextEncoder().encode(data);
                }
                await this.wrapped.writeAll(path, data);
            });
            this.unlink = (async (path) => {
                await this.wrapped.delete2(path);
            });
            this.readdir = (async (path2, opt) => {
                let result = await this.wrapped.listdir(path2);
                if (opt?.withFileTypes != true) {
                    return result.map(v => v.name);
                }
                else {
                    return result.map(v => new NodeFsCompatDirent(v.type, v.name, webutils_1.path.join(path2, v.name)));
                }
            });
            this.mkdir = (async (path2, opt) => {
                let result = await this.wrapped.listdir(path2);
                this.wrapped.mkdir(path2);
            });
            this.rmdir = (async (path) => {
                if ((await this.wrapped.listdir(path)).length == 0) {
                    await this.wrapped.delete2(path);
                }
                else {
                    throw new Error('rmdir failed, directory not empty.');
                }
            });
            this.stat = (async (path) => {
                let sr = await this.wrapped.stat(path);
                let nst = new NodeFsCompatStats(await this.wrapped.filetype(path), path, path);
                Object.assign(nst, sr);
            });
            this.lstat = (async (path) => {
                return await this.stat(path);
            });
            this.readlink = (async () => {
                throw new Error('Not implemented');
            });
            this.symlink = (async () => {
                throw new Error('Not implemented');
            });
            this.chmod = (async (path, mode) => {
            });
        }
    }
    exports.NodeFsAdapter = NodeFsAdapter;
    exports.pathCompat = (function () {
        //https://github.com/ionic-team/rollup-plugin-node-polyfills/blob/master/polyfills/path.js
        function normalizeArray(parts, allowAboveRoot) {
            // if the path tries to go above the root, `up` ends up > 0
            var up = 0;
            for (var i = parts.length - 1; i >= 0; i--) {
                var last = parts[i];
                if (last === '.') {
                    parts.splice(i, 1);
                }
                else if (last === '..') {
                    parts.splice(i, 1);
                    up++;
                }
                else if (up) {
                    parts.splice(i, 1);
                    up--;
                }
            }
            // if the path is allowed to go above the root, restore leading ..s
            if (allowAboveRoot) {
                for (; up--; up) {
                    parts.unshift('..');
                }
            }
            return parts;
        }
        // Split a filename into [root, dir, basename, ext], unix version
        // 'root' is just a slash, or nothing.
        var splitPathRe = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
        var splitPath = function (filename) {
            return splitPathRe.exec(filename).slice(1);
        };
        // path.resolve([from ...], to)
        // posix version
        function resolve(...args) {
            var resolvedPath = '', resolvedAbsolute = false;
            for (var i = args.length - 1; i >= -1 && !resolvedAbsolute; i--) {
                var path = (i >= 0) ? args[i] : '/';
                // Skip empty and invalid entries
                if (typeof path !== 'string') {
                    throw new TypeError('Arguments to path.resolve must be strings');
                }
                else if (!path) {
                    continue;
                }
                resolvedPath = path + '/' + resolvedPath;
                resolvedAbsolute = path.charAt(0) === '/';
            }
            // At this point the path should be resolved to a full absolute path, but
            // handle relative paths to be safe (might happen when process.cwd() fails)
            // Normalize the path
            resolvedPath = normalizeArray(resolvedPath.split('/').filter(function (p) {
                return !!p;
            }), !resolvedAbsolute).join('/');
            return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
        }
        ;
        // path.normalize(path)
        // posix version
        function normalize(path) {
            var isPathAbsolute = isAbsolute(path), trailingSlash = path.substring(-1) === '/';
            // Normalize the path
            path = normalizeArray(path.split('/').filter(function (p) {
                return !!p;
            }), !isPathAbsolute).join('/');
            if (!path && !isPathAbsolute) {
                path = '.';
            }
            if (path && trailingSlash) {
                path += '/';
            }
            return (isPathAbsolute ? '/' : '') + path;
        }
        ;
        // posix version
        function isAbsolute(path) {
            return path.charAt(0) === '/';
        }
        // posix version
        function join() {
            var paths = Array.prototype.slice.call(arguments, 0);
            return normalize(paths.filter(function (p, index) {
                if (typeof p !== 'string') {
                    throw new TypeError('Arguments to path.join must be strings');
                }
                return p;
            }).join('/'));
        }
        // path.relative(from, to)
        // posix version
        function relative(from, to) {
            from = resolve(from).substring(1);
            to = resolve(to).substring(1);
            function trim(arr) {
                var start = 0;
                for (; start < arr.length; start++) {
                    if (arr[start] !== '')
                        break;
                }
                var end = arr.length - 1;
                for (; end >= 0; end--) {
                    if (arr[end] !== '')
                        break;
                }
                if (start > end)
                    return [];
                return arr.slice(start, end - start + 1);
            }
            var fromParts = trim(from.split('/'));
            var toParts = trim(to.split('/'));
            var length = Math.min(fromParts.length, toParts.length);
            var samePartsLength = length;
            for (var i = 0; i < length; i++) {
                if (fromParts[i] !== toParts[i]) {
                    samePartsLength = i;
                    break;
                }
            }
            var outputParts = [];
            for (var i = samePartsLength; i < fromParts.length; i++) {
                outputParts.push('..');
            }
            outputParts = outputParts.concat(toParts.slice(samePartsLength));
            return outputParts.join('/');
        }
        var sep = '/';
        var delimiter = ':';
        function dirname(path) {
            var result = splitPath(path), root = result[0], dir = result[1];
            if (!root && !dir) {
                // No dirname whatsoever
                return '.';
            }
            if (dir) {
                // It has a dirname, strip trailing slash
                dir = dir.substring(0, dir.length - 1);
            }
            return root + dir;
        }
        function basename(path, ext) {
            var f = splitPath(path)[2];
            // TODO: make this comparison case-insensitive on windows?
            if (ext && f.substr(-1 * ext.length) === ext) {
                f = f.substr(0, f.length - ext.length);
            }
            return f;
        }
        function extname(path) {
            return splitPath(path)[3];
        }
        return {
            extname: extname,
            basename: basename,
            dirname: dirname,
            sep: sep,
            delimiter: delimiter,
            relative: relative,
            join: join,
            isAbsolute: isAbsolute,
            normalize: normalize,
            resolve: resolve
        };
    })();
});
//# sourceMappingURL=nodecompat.js.map