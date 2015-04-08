#!/usr/bin/env ruby

require 'pathname'
Dir.chdir Pathname.new(File.dirname(__FILE__)).realpath

#$LOAD_PATH.unshift("../r4tw") 
require './r4tw'
require 'fileutils'

$version_number = '3.1.9';

initial = [
	['Work',          'Realm',         "order:1\npriority:1"],
	['Personal',      'Realm',         "order:2\npriority:2"],

	['Home Maintenance', 'Area Personal'],
	['Recreation',       'Area Personal'],
	['Family',       'Area Personal'],
	['Friends',       'Area Personal'],
	['Budget',       'Area Work'],
	['Research',       'Area Work'],
	['Training',       'Area Work'],
	['Customer Relations',       'Area Work'],

 	['Weekend',       'Context'],
	['Call',          'Context'],
	['Home',          'Context'],
	['Office',        'Context'],
	['Errand',        'Context'],
	['Email',         'Context'],
	['Offline',       'Context'],
	['Low Energy',    'Context'],
	['Reading',       'Context'],

]

make_tw {

  # actually this is an mptw empty file not a bare one
  source_file            '../MPTW/empties/empty.html'

  # generate some content
  content = ""

  add_tiddler_from_file("tiddlers/MgtdSettings.tiddler")
  initial.each { |t| add_tiddler_from_scratch('tiddler' => t[0], 'tags' => t[1], 'text' => t[2]||'') }
  get_tiddler('MgtdSettings').add_tags(['Work', 'Personal', 'AlertsIgnoreRealm', 'MultipleContexts']) # default both realms on..
  get_tiddler('MgtdSettings').fields['ticklerdateformat'] = 'ddd, DD-mmm-YY'; # set default tickler date format. gotcha: use lowercase only for fields please.
  get_tiddler('MgtdSettings').fields['newjournaldateformat'] = 'ddd DD-mmm-YY, 0hh:0mm'; # set default tickler date format. gotcha: use lowercase only for fields please.
  get_tiddler('MgtdSettings').fields['tickleractivatehour'] = '5'; # set default tickler date format. gotcha: use lowercase only for fields please.
  to_file          "upload/initial.html"

}
