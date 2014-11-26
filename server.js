var path     = require('path'),
    fs       = require('fs'),

    express  = require('express')
    app      = express(),
    server   = require('http').Server(app),
    io       = require('socket.io')(server),
    chokidar = require('chokidar'),
    parser   = require('body-parser'),
    request  = require('request'),
    marked   = require('marked'),
    minimist = require('minimist')

module.exports = function(opts) {
  return new Server(opts)
}

var ImageExtesions = "jpg jpeg gif png svg bmp xbm".split(' ')

function Server(opts){
  var opts = opts || {}

  this.port      = opts.port || 1337
  this.URI       = "http://localhost:" + this.port
  this.sock      = {emit: function(){}}

  this.listen    = function(next){
    var self = this
    server.listen(this.port, next)
  }

  this.watch = function(path){
    var self = this
    chokidar.watch(path).on('change', function(path, stats) {
      fs.readFile(path, 'utf8', function(err, data){
        var data = data || ""
        self.sock.emit('content', marked(data))
      })
    })
  }
}

Server.prototype.stop = function(next){
  var self = this
  request.del(this.URI,
              {headers: {"Content-Type": "application/json"}}, function(err){
                if (err) return next(err)
                next()
              })
}

Server.prototype.start = function(filePath, next){
  var self  = this

  this.stop(function(){
    self.watch(filePath)
    self.listen(next)
  })

  io.on('connection', function (socket) {
    self.sock = socket
    self.sock.emit('title', path.basename(filePath))
    fs.readFile(filePath, 'utf8', function(err, data){
      var data = data || ""
      self.sock.emit('content', marked(data))
    })
  })

  app.use(parser.json())
  app.use(express.static(path.join(__dirname, 'public')))
  app.use(function(req, res, next){
    if (new RegExp('.' + ImageExtesions.join('|') + "$").test(req.path)){
      res.sendFile(path.join(filePath, '../' + req.path))
    } else {
      next()
    }
  })

  app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html')
  })

  app.delete('/', function(req, res){
    res.end()
    process.exit()
  })
}
