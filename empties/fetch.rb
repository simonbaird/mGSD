
require '../r4tw.rb'

make_tw {
  source_file 'http://mptw.tiddlyspot.com/empty.html'
  # why do I need this?
  @use_pre = true
  to_file 'empty.html'
}
