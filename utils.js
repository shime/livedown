var path = require('path')

module.exports = {
  isPathRelative: function(p){
    return path.normalize(p) != path.resolve(p)
  }
}
