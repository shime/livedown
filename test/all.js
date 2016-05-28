var expect  = require('expect.js'),
    Browser = require('zombie'),
    server  = require('./../server')(),
    fs      = require('fs')

Browser.localhost('localhost', 1337)
var browser = Browser.create()

describe('livedown', function(){
  before(function(){
    server.start('test/fixtures/basic.md')
  })

  it('renders markdown correctly', function(done){
    browser.visit('/', function(error) {
      if (error) { return done(error) }

      expect(browser.evaluate("$('.markdown-body h1').text()")).to.be('h1')
      done()
    });
  })

  describe('content changes', function(){
    var fixtureContent,
        fixturePath = 'test/fixtures/basic.md'

    beforeEach(function(){
      fixtureContent = fs.readFileSync(fixturePath, 'utf8')
    })

    it('live updates the rendered markdown', function(done){
      fs.writeFile(fixturePath, '## h2', function(error){
        if (error) { return done(error) }

        browser.visit('/', function(error) {
          if (error) { return done(error) }

          expect(browser.evaluate("$('.markdown-body h2').text()")).to.be('h2')
          done()
        })
      })
    })

    afterEach(function(){
      fs.writeFileSync(fixturePath, fixtureContent)
    })
  })

  after(function(){
    server.stop()
  })
})
