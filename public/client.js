/* global io, hljs, $ */

var socket = io.connect(window.location.origin)

hljs.configure({ languages: [] })

var pageshow = function (event) {
  // HACK: you would assume we wouldn't ever need to reload
  // the window, and instead could just send 'ready' again;
  // I don't know why this doesn't work :(
  if (event.persisted)
    window.location.reload()
  else
    socket.emit('hello', window.location.pathname)
}

var pagehide = function (event) {
  $('body').css('opacity', '0')
  socket.emit('goodbye', window.location.pathname)
}

// HACK: override the page cache. To do this, we need
// to always reload the page (on pageshow). However, this
// will show the previous/cached version of the page for a split
// second, so to work around this we make the body's opacity 0 whenever
// leaving a page (on pageleave).
// Inspiration:
//    - https://webkit.org/blog/516/webkit-page-cache-ii-the-unload-event/
//    - https://github.com/yujiosaka/socket.io-cache-example
//    - https://developer.mozilla.org/en-US/docs/Web/Events/beforeunload
// Related:
//    - https://webkit.org/blog/427/webkit-page-cache-i-the-basics/
//    - https://developer.mozilla.org/en-US/docs/Mozilla/Firefox/Releases/1.5/Using_Firefox_1.5_caching#New_browser_events
window.addEventListener('pageshow', pageshow)
window.addEventListener('beforeunload', pagehide)

socket.on('content', function (data) {
  $('.markdown-body').html(data)
  $('code').each(function (_, block) {
    $(this).parent().addClass($(this).attr('class'))
  })
  $('pre').each(function (_, block) {
    hljs.highlightBlock(block)
  })
  $('.markdown-body').addClass('ready')
})

socket.on('title', function (data) {
  $('title').html(data)
})

socket.on('kill', function () {
  window.open('', '_self', '')
  window.close()
})
