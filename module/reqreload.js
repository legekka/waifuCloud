// reqreload.js
// require cache reloader shortifier

var decache = require('decache');

module.exports = (modulename) => {
    decache(modulename);
    return require(modulename);
}