var expect  = require('expect.js'),
    Browser = require('zombie'),
    server  = require('./../server')(),
    fs      = require('fs')

Browser.localhost('localhost', 1337)

describe('livedown', function(){
  before(function(){
    server.start('test/fixtures/basic.md')
  })

  before(function(done){
    this.browser = Browser.create()
    this.browser.visit('/', done)
  })

  it('renders markdown correctly', function(done){
    expect(this.browser.window.$(".markdown-body h1").text()).to.be('h1')
    done()
  })

  describe('content changes', function(){
    var fixtureContent,
        fixturePath = 'test/fixtures/basic.md'

    before(function(done){
      fs.readFile(fixturePath, 'utf8', function(error, data){
        if (error) { return done(error) }

        fixtureContent = data;
        done();
      })
    })

    before(function(done) {
      fs.writeFile(fixturePath, '## h2', done)
    })

    before(function(done) {
      this.browser.visit('/', done)
    })

    it('live updates the rendered markdown', function(done){
      expect(this.browser.window.$(".markdown-body h2").text()).to.be('h2')
      done()
    })

    after(function(done){
      fs.writeFile(fixturePath, fixtureContent, done)
    })
  })

  after(function(){
    server.stop()
  })
})
