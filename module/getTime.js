
module.exports = function getTime(format) {
    var da = new Date();
    switch (format) {
        case 'time': return da.getHours() + ':' + da.getMinutes() + ':' + da.getSeconds();
            break;
        case 'date': return da.getFullYear() + '-' + (da.getMonth() + 1) + '-' + da.getDate();
            break;
        default: return da.getFullYear() + '-' + (da.getMonth() + 1) + '-' + da.getDate() + ' ' + da.getHours() + ':' + da.getMinutes() + ':' + da.getSeconds();
            break;
    }
}