var path     = require('path'),
    fs       = require('fs'),

    express  = require('express')
    app      = express(),
    server   = require('http').Server(app),
    io       = require('socket.io')(server),
    chokidar = require('chokidar'),
    parser   = require('body-parser'),
    request  = require('request'),
    showdown = require('showdown'),
    minimist = require('minimist')

    utils    = require('./utils')

module.exports = function(opts) {
  return new Server(opts)
}

var ImageExtesions = "jpg jpeg gif png svg bmp xbm".split(' ')

var sdc = new showdown.Converter()
sdc.setOption('tasklists', true)
sdc.setOption('literalMidWordUnderscores', true)
sdc.setOption('tables', true)

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
        self.sock.emit('content', sdc.makeHtml(data))
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
  var self  = this,
      sendFileOpts = {}

  if (utils.isPathRelative(filePath))
    sendFileOpts.root = path.resolve(__dirname)

  this.stop(function(){
    self.watch(filePath)
    self.listen(next)
  })

  io.on('connection', function (socket) {
    self.sock = socket
    self.sock.emit('title', path.basename(filePath))
    fs.readFile(filePath, 'utf8', function(err, data){
      var data = data || ""
      self.sock.emit('content', sdc.makeHtml(data))
    })
  })

  app.use(parser.json())
  app.use(express.static(path.join(__dirname, 'public')))
  app.use(function(req, res, next){
    if (new RegExp('.' + ImageExtesions.join('|') + "$").test(req.path)){
      res.sendFile(path.join(filePath, '../' + req.path), sendFileOpts)
    } else {
      next()
    }
  })

  app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html')
  })

  app.delete('/', function(req, res){
    io.emit('kill');
    res.end()
    process.exit()
  })
}
