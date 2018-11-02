/* global io, hljs, $ */

var socket = io.connect(window.location.origin)

hljs.configure({languages: []})

socket.on('content', function (data) {
  $('.markdown-body').html(data)
  $('code').each(function (_, block) {
    $(this).parent().addClass($(this).attr('class'))
  })
  $('pre').each(function (_, block) {
    hljs.highlightBlock(block)
  })

  var updated = $('.markdown-body .detected-updated').get(0)
  updated && updated.scrollIntoView && updated.scrollIntoView({ behavior: 'smooth' })
})

socket.on('title', function (data) {
  $('title').html(data)
})

socket.on('kill', function () {
  window.open('', '_self', '')
  window.close()
})
