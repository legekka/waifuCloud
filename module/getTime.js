
module.exports = function getTime(format) {
    var da = new Date();
    switch (format) {
        case 'time': return da.getHours() + ':' + da.getMinutes() + ':' + da.getSeconds();
            break;
        case 'date': return da.getFullYear() + '-' + (da.getMonth() + 1) + '-' + da.getDate();
            break;
        case 'stamp': return da.getFullYear() + '_' + (da.getMonth() + 1) + '_' + da.getDate() + '-' + da.getHours() + '_' + da.getMinutes() + '_' + da.getSeconds();
            break;
        default: return da.getFullYear() + '-' + (da.getMonth() + 1) + '-' + da.getDate() + ' ' + da.getHours() + ':' + da.getMinutes() + ':' + da.getSeconds();
            break;
    }
}