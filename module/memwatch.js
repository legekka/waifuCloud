// memwatch.js
// memory-leak watcher

var limit = 500;

module.exports = {
    start: () => {
        setInterval(() => {
            var memrss = process.memoryUsage().rss;
            if (memrss / 1024 / 1024 > limit) {
                console.log('Memory overload: ' + (memrss / 1024 / 1024).toFixed(2) + ' MB / ' + limit.toFixed(2) + " MB");
                process.exit(2);
            }
            memrss = null;
        }, 1000);
    }
}