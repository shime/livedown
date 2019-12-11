/* global describe, it, before, beforeEach, after, afterEach */

var expect = require('expect.js')
var Browser = require('zombie')
var server = require('./../server')()
var fs = require('fs')
var utils = require('./../utils')

var browser = new Browser()

describe('utils.splitCommandLine', function () {
  it('returns an empty array when given a falsy input', function () {
    expect(utils.splitCommandLine(undefined)).to.eql([])
    expect(utils.splitCommandLine(null)).to.eql([])
    expect(utils.splitCommandLine('')).to.eql([])
  })

  it('splits the input string on spaces unless they are quoted', function () {
    expect(utils.splitCommandLine('firefox -new-window')).to.eql(['firefox', '-new-window'])
    expect(utils.splitCommandLine("'google chrome' --incognito")).to.eql(['google chrome', '--incognito'])
  })
})

describe('livedown', function () {
  before(function (done) {
    server.start('test/fixtures/basic.md', done)
  })

  it('renders markdown correctly', function (done) {
    browser.visit('http://localhost:1337', { runScripts: true }, function (error) {
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
      browser.visit('http://localhost:1337', function (error) {
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
    server.stop(function (err) {
      if (err) throw err
    })
  })
})
