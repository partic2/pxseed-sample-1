define(["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.sqlDb = void 0;
    class sqlDb {
        queryToArray(sql) {
            let arr = [sql];
            arr.raw = arr;
            return this.queryToArrayTpl(arr);
        }
        queryToMap(sql) {
            let arr = [sql];
            arr.raw = arr;
            return this.queryToMapTpl(arr);
        }
        ;
        execSql(sql) {
            let arr = [sql];
            arr.raw = arr;
            return this.execSqlTpl(arr);
        }
        ;
    }
    exports.sqlDb = sqlDb;
});
//# sourceMappingURL=base.js.map