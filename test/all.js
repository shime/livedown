/* global describe, it, before, beforeEach, after, afterEach */

var expect = require('expect.js')
var Browser = require('zombie')
var server = require('./../server')()
var fs = require('fs')

Browser.localhost('localhost', 1337)
var browser = new Browser()

describe('livedown', function () {
  before(function () {
    server.start('test/fixtures/basic.md')
  })

  it('renders markdown correctly', function (done) {
    browser.visit('/', {runScripts: true}, function (error) {
      if (error) throw error
      expect(browser.evaluate("$('.markdown-body h1').text()")).to.be('h1')
      done()
    })
  })

  describe('content changes', function () {
    var fixtureContent
    var fixturePath = 'test/fixtures/basic.md'

    beforeEach(function () {
      fixtureContent = fs.readFileSync(fixturePath, 'utf8')
    })

    it('live updates the rendered markdown', function (done) {
      browser.visit('/', function (error) {
        if (error) throw error
        fs.writeFile(fixturePath, '## h2', function () {
          setTimeout(function () {
            expect(browser.evaluate("$('.markdown-body h2').text()")).to.be('h2')
            done()
          }, 500)
        })
      })
    })

    afterEach(function () {
      fs.writeFileSync(fixturePath, fixtureContent)
    })
  })

  after(function () {
    server.stop()
  })
})
