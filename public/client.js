/* global io, hljs, $, mermaid */

var socket = io.connect(window.location.origin)

hljs.configure({ languages: [] })

socket.on('content', function (data) {
  $('.markdown-body').html(data)
  $('code').each(function (_, block) {
    $(this).parent().addClass($(this).attr('class'))
  })
  $('code.language-mermaid').each(function (_, block) {
    $(this).parent().html(mermaid.mermaidAPI.render('mermaid-' + _, block.innerText))
  })
  $('pre').each(function (_, block) {
    hljs.highlightBlock(block)
  })
})

socket.on('title', function (data) {
  $('title').html(data)
})

socket.on('kill', function () {
  window.open('', '_self', '')
  window.close()
})
