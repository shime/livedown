var expect  = require('expect.js'),
    exec    = require('child_process').exec,
    Browser = require('zombie'),
    server  = require('./../server')(),
    fs      = require('fs')

Browser.localhost('localhost', 1337)
var browser = new Browser()

describe('livedown', function(){
  before(function(){
    server.start('test/fixtures/basic.md')
  })

  it('renders markdown correctly', function(done){
    browser.visit('/', function (error) {
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
      browser.visit('/', function (error) {
        if (error) { return done(error) }

        fs.writeFile(fixturePath, '## h2', function(error){
          if (error) { return done(error) }

          setTimeout(function(){
            expect(browser.evaluate("$('.markdown-body h2').text()")).to.be('h2')
            done()
          }, 100)
        })
      });
    })

    afterEach(function(){
      fs.writeFileSync(fixturePath, fixtureContent)
    })
  })

  after(function(){
    server.stop()
  })
})
