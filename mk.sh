#!/bin/sh

RUBY=/usr/local/opt/ruby186/bin/ruby
mGSD=$PWD
MPTW=$mGSD/../MPTW
cd $MPTW
$RUBY build.rb
cp upload/empty.html $mGSD/empties
cd $mGSD
$RUBY build.rb
