// command.js
// incoming command parsing

module.exports = {
    command: (connection, db, cmd) => {
        switch (cmd.name) {
            case 'data_count': {
                var resp = {
                    "job_id": cmd.job_id,
                    "response": db.length
                }
                connection.sendUTF8(JSON.stringify(resp));
            }
        }
    }
}