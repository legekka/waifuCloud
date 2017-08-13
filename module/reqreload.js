// reqreload.js
// require cache reloader shortifier

module.exports = (modulename) => {
    delete require.cache[require.resolve(modulename)];
    return require(modulename);
}