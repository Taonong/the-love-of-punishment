(function() {
    function main() {

    }

    function sendTdLog(db, table, data) {
        var self = this;
        if (window.Treasure2) {
            (new window.Treasure2({
                writeKey: "8378/25839e06ce4cc1cab55c1c1f1e49d336d6d1d48f",
                database: db //'popin_comment_fe'
            })).addRecord(table, data);
        } else {
            setTimeout(function () {
                self.sendTdLog(db, table, data);
            });
        }
    }

    main();
})()