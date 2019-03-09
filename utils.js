var path = require('path')

module.exports = {
  isPathRelative: function (p) {
    return path.normalize(p) !== path.resolve(p)
  },
  /**
   * splits cmd on space characters unless they are quoted
   * example: "'google chrome' --incognito" ==> ['google chrome', '--incognito']
   */
  splitCommandLine: function (cmd) {
    if (cmd) {
      return cmd.match(/([^\s"']+|["'][^"']*["'])+/g)
        .map(function (s) { return s.replace(/["']/g, '') })
    }
    return []
  }
}
