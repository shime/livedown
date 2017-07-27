var path = require('path')
var fs = require('fs')

var express = require('express')
var http = require('http')
var socket = require('socket.io')
var chokidar = require('chokidar')
var parser = require('body-parser')
var request = require('request')
var markdownIt = require('markdown-it')
var markdownItCheckbox = require('markdown-it-checkbox')
var markdownItEmoji = require('markdown-it-emoji')
var markdownItGitHubHeadings = require('markdown-it-github-headings')

var md = markdownIt({
  html: true,
  linkify: true
})
md.use(markdownItCheckbox)
md.use(markdownItEmoji)
md.use(markdownItGitHubHeadings, {
  prefix: ''
})

var app = express()
var server = http.Server(app)
var io = socket(server)

var utils = require('./utils')

module.exports = function (opts) {
  return new Server(opts)
}

var ImageExtensions = 'jpg jpeg gif png svg bmp xbm'.split(' ')

function Server (opts) {
  opts = opts || {}

  var self = this

  this.port = opts.port || 1337
  this.URI = 'http://localhost:' + this.port
  this.sock = {emit: function () {}}

  this.listen = function (next) {
    server.listen(self.port, next)
  }

  this.watch = function (path) {
    var self = this
    chokidar.watch(path).on('change', function (path, stats) {
      fs.readFile(path, 'utf8', function (err, data) {
        if (err) throw err
        data = data || ''
        self.sock.emit('content', md.render(data))
      })
    })
  }
}

Server.prototype.stop = function (next) {
  request.del(this.URI, {
    headers: {
      'Content-Type': 'application/json'
    }
  }, next)
}

Server.prototype.start = function (filePath, next) {
  var self = this
  var sendFileOpts = {}

  if (utils.isPathRelative(filePath)) {
    sendFileOpts.root = path.resolve(__dirname)
  }

  this.stop(function () {
    self.watch(filePath)
    self.listen(next)
  })

  io.on('connection', function (sock) {
    self.sock = sock
    self.sock.emit('title', path.basename(filePath))
    fs.readFile(filePath, 'utf8', function (err, data) {
      if (err) throw err
      data = data || ''
      self.sock.emit('content', md.render(data))
    })
  })

  app.use(parser.json())
  app.use(express.static(path.join(__dirname, 'public')))
  app.use(function (req, res, next) {
    if (new RegExp('.' + ImageExtensions.join('|') + '$').test(req.path)) {
      res.sendFile(path.join(filePath, '../' + req.path), sendFileOpts)
    } else {
      next()
    }
  })

  app.get('/', function (req, res) {
    res.sendFile(path.join(__dirname, 'index.html'))
  })

  app.delete('/', function (req, res) {
    io.emit('kill')
    res.end()
    process.exit()
  })
}
