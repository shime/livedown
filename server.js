var path = require('path')
var fs = require('fs')

var express = require('express')
var http = require('http')
var socket = require('socket.io')
var chokidar = require('chokidar')
var parser = require('body-parser')
var request = require('request')
var markdownIt = require('markdown-it')
var markdownItTaskCheckbox = require('markdown-it-task-checkbox')
var markdownItEmoji = require('markdown-it-emoji')
var markdownItGitHubHeadings = require('markdown-it-github-headings')
var detectHtml = require('detect-one-changed').detectHtml

var app = express()
var server = http.Server(app)
var io = socket(server)

var utils = require('./utils')

module.exports = function (opts) {
  return new Server(opts)
}

function Server (opts) {
  opts = opts || {}

  var self = this

  this.fileContentsCache = new Map()
  this.port = opts.port || 1337
  this.URI = 'http://localhost:' + this.port
  this.sock = {emit: function () {}}

  this.listen = function (next) {
    server.listen(self.port, next)
  }

  this.watch = function (path) {
    var self = this
    chokidar.watch(path).on('change', function (path, stats) {
      self.emitFile(path)
    })
  }
}

Server.prototype.emitFile = function (filePath) {
  var self = this
  var md = markdownIt({
    html: true,
    linkify: true
  })
  md.use(markdownItTaskCheckbox)
  md.use(markdownItEmoji)
  md.use(markdownItGitHubHeadings, {
    prefix: ''
  })
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, 'utf8', function (err, data) {
      if (err) reject(err)
      data = data || ''
      var cache = self.fileContentsCache
      var currentRendered = md.render(data)
      var prevRendered = cache.get(filePath)
      cache.set(filePath, currentRendered)
      if (cache && cache.has(filePath) && prevRendered) {
        currentRendered = detectHtml(prevRendered, currentRendered, { position: false, ast: false }).text
      }
      self.sock.emit('content', currentRendered)
      resolve()
    })
  })
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
    self.emitFile(filePath)
  })

  app.use(parser.json())
  app.get('/', function (req, res) {
    res.sendFile(path.join(__dirname, 'index.html'))
  })
  app.use(express.static(path.join(__dirname, 'public')))
  app.use(express.static(path.dirname(filePath)))

  app.delete('/', function (req, res) {
    io.emit('kill')
    res.end()
    process.exit()
  })
}
