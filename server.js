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
// Note: using a forked version of markdown-it-katex until
// the official version updates to support katex 0.10.x
var markdownItKatex = require('@iktakahiro/markdown-it-katex')

function getMd () {
  var md = markdownIt({
    html: true,
    linkify: true
  })
  md.use(markdownItTaskCheckbox)
  md.use(markdownItEmoji)
  md.use(markdownItGitHubHeadings, {
    prefix: ''
  })
  md.use(markdownItKatex)
  return md
}
var md = getMd()

var app = express()
var server = http.Server(app)
var io = socket(server)

module.exports = function (opts) {
  return new Server(opts)
}

function Server (opts) {
  opts = opts || {}

  var self = this

  this.port = opts.port || 1337
  this.URI = 'http://localhost:' + this.port
  this.pathToSock = {}
  this.dirname = ''
  this.relativePath = ''
  this.originalRelativePath = ''
  this.watcher = chokidar.watch()

  this.watcher.on('change', function (changedPath, stats) {
    var relativePath = path.join(
      '/', // relative to pseudo-root of web server
      path.relative(self.dirname, changedPath))

    // early return for performance
    if (!(relativePath in self.pathToSock))
      return

    md = getMd()
    fs.readFile(changedPath, 'utf8', function (err, data) {
      if (err) throw err
      data = data || ''

      // early return for correctness
      if (!(relativePath in self.pathToSock))
        return
      self.pathToSock[relativePath].emit('content', md.render(data))
    })
  })

  this.listen = function (next) {
    server.listen(self.port, next)
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

  // set the pseudo-root of the web server to the
  // dirname of the argv-passed file
  self.dirname = path.dirname(filePath)

  // current file being served
  self.relativePath = path.basename(filePath)

  // original file being served
  self.originalRelativePath = self.relativePath

  // stop any previously-started Livedown server listening on this port
  this.stop(function () {
    self.listen(next)
  })

  io.on('connection', function (sock) {
    // HACK: dealing with the back/forward cache; see client.js

    // Markdown file asking for rendered content
    sock.on('hello', function (relativePath) {
      var fullPath = path.join(self.dirname, relativePath)
      self.pathToSock[relativePath] = sock
      self.watcher.add(fullPath)
      md = getMd()
      fs.readFile(fullPath, 'utf8', function (err, data) {
        if (err) throw err
        data = data || ''
        var s = self.pathToSock[relativePath]
        s.emit('title', path.basename(self.relativePath))
        s.emit('content', md.render(data))
      })
    })

    // Markdown file indicating it doesn't currently need attention
    sock.on('goodbye', function (relativePath) {
      delete self.pathToSock[relativePath]
      self.watcher.unwatch(path.join(self.dirname, relativePath))
    })
  })

  app.use(parser.json())
  app.use(express.static(path.join(__dirname, 'public')))

  // redirect the root path to the file specified
  // in command line args
  app.get('/', function (req, res) {
    res.redirect(self.originalRelativePath)
  })

  // handle all Markdown files appropriately:
  //    - send index.html
  //    - the Markdown file itself will later be rendered
  //      into HTML and sent via socket.io
  app.get('/*.md', function (req, res) {
    self.relativePath = req.path
    res.sendFile(path.join(__dirname, 'index.html'))
  })

  // serve non-Markdown static files as-is
  app.use(express.static(path.dirname(filePath)))

  // provides functionality for killing the process via HTTP,
  // e.g. for the editor plugins
  app.delete('/', function (req, res) {
    io.emit('kill')
    res.end()
    process.exit()
  })
}
