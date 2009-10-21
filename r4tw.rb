#
# =r4tw
# Author:: Simon Baird
# URL:: http://simonbaird.com/r4tw
# License:: http://en.wikipedia.org/wiki/MIT_license
# r4tw is some ruby classes for manipuating TiddlyWikis and tiddlers.
# It is similar to cook and ginsu but cooler.
#
# <i>$Rev: 3872 $</i>
# 
# ===Known problems
# from_remote_tw can be problematic if importing from a 2.1 TW into a 2.2 TW.
#


#---------------------------------------------------------------------
#-- General purpose utils

require 'pathname'
require 'open-uri'
require 'set'

def read_file(file_name) #:nodoc:
  File.read(file_name)
end

def fetch_url(url) #:nodoc:
  open(url).read.to_s
end

def this_dir(this_file=$0) #:nodoc:
  Pathname.new(this_file).expand_path.dirname
end

class String
  def to_file(file_name) #:nodoc:
    File.open(file_name,"w") { |f| f << self }
  end
end


#---------------------------------------------------------------------
#-- TiddlyWiki related utils

class String

  def escapeLineBreaks
    gsub(/\\/m,"\\s").gsub(/\n/m,"\\n").gsub(/\r/m,"")
  end
  
  def unescapeLineBreaks
    # not sure what \b is for
    gsub(/\\n/m,"\n").gsub(/\\b/m," ").gsub(/\\s/,"\\").gsub(/\r/m,"")
  end
  
  def encodeHTML
    gsub(/&/m,"&amp;").gsub(/</m,"&lt;").gsub(/>/m,"&gt;").gsub(/\"/m,"&quot;")
  end
  
  def decodeHTML
    gsub(/&amp;/m,"&").gsub(/&lt;/m,"<").gsub(/&gt;/m,">").gsub(/&quot;/m,"\"")
  end

  def readBrackettedList
    # scan is a beautiful thing
    scan(/\[\[([^\]]+)\]\]|(\S+)/).map {|m| m[0]||m[1]}
  end  

  def toBrackettedList
    self
  end

end

class Array

  def toBrackettedList
    map{ |i| (i =~ /\s/) ? ("[["+i+"]]") : i }.join(" ")
  end    

end

class Time

  def convertToLocalYYYYMMDDHHMM()
    self.localtime.strftime("%Y%m%d%H%M")    
  end
    
  def convertToYYYYMMDDHHMM()
    self.utc.strftime("%Y%m%d%H%M")    
  end
    
  def Time.convertFromYYYYMMDDHHMM(date_string)
    m = date_string.match(/(\d\d\d\d)(\d\d)(\d\d)(\d\d)(\d\d)/)
    Time.utc(m[1],m[2],m[3],m[4],m[5])        
  end
    
end


#---------------------------------------------------------------------
# Tiddler
#

# =Tiddler
# For creating and manipulating tiddlers
# ===Example
#  puts Tiddler.new({'tiddler'=>'Hello','text'=>'Hi there','tags'=>['tag1','tag2']})

class Tiddler

  @@main_fields = %w[tiddler modifier modified created tags]
  # and soon to be changecount?

  # text is not really a field in TiddlyWiki it makes
  # things easier to make it one here. It could possibly
  # clash with a real field called text. Ignore this fact for now...

  @@defaults = {
      'tiddler'  => 'New Tiddler',
      'modified' => Time.now.convertToYYYYMMDDHHMM,
      'created'  => Time.now.convertToYYYYMMDDHHMM,
      'modifier' => 'YourName',
      'tags'     => '',
      'text'     => '', 
  }

  # used by from_file
  @@default_ext_tag_map = {
      '.js'      => %[systemConfig],
      '.html'    => %[html],
      '.css'     => %[css],
      '.pub'     => %[systemServer],
      '.palette' => %[palette],
      '.theme'   => %[systemTheme],
  }
  
  attr_accessor :fields

  # Depending on the arguments this can be used to create or import a tiddler in various ways.
  # 
  # ===From scratch
  # If the argument is a Hash then it is used to specify a tiddler to be created from
  # scratch.
  # 
  # Example:
  #  t = Tiddler.new.from({
  #    'tiddler'=>'HelloThere',
  #    'text'=>'And welcome',
  #  })
  # Other built-in fields are +modified+, +created+, +modifier+ and +tags+. Any other
  # fields you add will be created as tiddler extended fields. Text is the contents of
  # the tiddler. Tiddler is the title of the tiddler. 
  #
  #
  # ===From a file
  # If the argument looks like a file name (ie a string that doesn't match the other
  # criteria then create a tiddler with the name being the file name and the
  # contents being the contents of the file. Does some guessing about tags based on 
  # the file's extension. (This is customisable, see code for details). Also reads the
  # file modified date and uses it.
  # 
  # Example:
  #  t = Tiddler.new.from("myplugin.js")
  # 
  # ===From a TiddlyWiki
  # If the argument is in the form file.html#TiddlerName or http://sitename.com/#TiddlerName
  # then import TiddlerName from the specified location
  # 
  # Example:
  #  t1 = Tiddler.new.from("myfile.html#SomeTiddler")
  #  t2 = Tiddler.new.from("http://www.tiddlywiki.com/#HelloThere")
  # 
  # 
  # ===From a url
  # Creates a tiddler from a url. The entire contents of the page are the contents
  # of the tiddler. You should set the 'tiddler' field and other fields using a hash 
  # as the second argument in the same format as creating a tiddler from scratch.
  # There is no automatic tagging for this one so you should add tags yourself as required
  # 
  # Example:
  #  t = Tiddler.new.from(
  #    "http://svn.somewhere.org/Trunk/HelloWorld.js",
  #    {'tiddler'=>'HelloWorld','tags'=>'systemConfig'}
  #  )
  # 
  # 
  # ===From a div string
  # If the argument is a string containing a tiddler div such
  # as would be found in a TiddlyWiki storeArea then the tiddler
  # is created from that div
  #
  def initialize(*args)
    @fields = {}
 
    case args[0]
      when Hash
        from_scratch(*args)

      when Tiddler
        from_tiddler(*args)
        
      when /^\s*<div/
        from_div(*args)

      when /#/
        from_tiddler(from_tw(*args))
        
      when /^(ftp|http|file):/
        from_url(*args)

      when String
        from_file(*args)

    end
    
  end


  # Intende to become private but not yet because
  # all the test units use them
  # 
  #private  
  
  def from_tiddler(other_tiddler)
    @fields = {}
    @fields.update(other_tiddler.fields)
  end
  
  def from_scratch(fields={}) #:nodoc:
    @fields = @@defaults.merge(fields)
    @fields['tags'] &&= @fields['tags'].toBrackettedList # in case it's an array
    self
  end
  
  def from_div(div_str,use_pre=true) #:nodoc:
    match_data = div_str.match(/<div([^>]+)>(.*?)<\/div>/m)
    field_str = match_data[1]
    text_str = match_data[2]

    field_str.scan(/ ([\w\.]+)="([^"]+)"/) do |field_name,field_value|
      if field_name == "title"
        field_name = "tiddler"
      end
      @fields[field_name] = field_value
    end

    text_str.sub!(/\n<pre>/,'')
    text_str.sub!(/<\/pre>\n/,'')

    if (use_pre)
      @fields['text'] = text_str.decodeHTML
    else
      @fields['text'] = text_str.unescapeLineBreaks.decodeHTML
    end

    self
  end

  def from_file(file_name, fields={}, ext_tag_map=@@default_ext_tag_map) #:nodoc:
    ext = File.extname(file_name)
    base = File.basename(file_name,ext)
    @fields = @@defaults.merge(fields)    
    @fields['tiddler'] = base
    @fields['text'] = read_file(file_name)
    @fields['created'] = File.mtime(file_name).convertToYYYYMMDDHHMM
    # @fields['modified'] = @fields['created']
    @fields['tags'] = ext_tag_map[ext].toBrackettedList if ext_tag_map[ext]
    self
  end

  def from_url(url,fields={}) #:nodoc:
    @fields = @@defaults.merge(fields)    
    @fields['text'] = fetch_url(url)
    self
  end

  def from_tw(tiddler_url) #:nodoc:
    # this works if url is a local file, eg "somefile.html#TiddlerName"
    # as well as if it's a remote file, eg "http://somewhere.com/#TiddlerName"
    location,tiddler_name = tiddler_url.split("#")
    TiddlyWiki.new.source_empty(location).get_tiddler(tiddler_name)
  end
  
  alias from_remote_tw from_tw #:nodoc:
  alias from_local_tw from_tw #:nodoc:

  # Returns a hash containing the tiddlers extended fields
  # Probably would include changecount at this stage at least
  def extended_fields
    @fields.keys.reject{ |f| @@main_fields.include?(f) || f == 'text' }.sort
  end

  # Converts to a div suitable for a TiddlyWiki store area
  def to_s(use_pre=true)

    fields_string =
      @@main_fields.
        reject{ |f|
          use_pre and (
            # seems like we have to leave out modified if there is none
            (f == 'modified' and !@fields[f]) or
            (f == 'modifier' and !@fields[f]) or
            # seems like we have to not print tags="" any more
            (f == 'tags' and (!@fields[f] or @fields[f].length == 0))
          )
        }.
        map { |f|
          # support old style tiddler=""
          # and new style title=""
          if f == 'tiddler' and use_pre
            field_name = 'title'
          else
            field_name = f
          end
          %{#{field_name}="#{@fields[f]}"}
        } +
      extended_fields.
        map{ |f| %{#{f}="#{@fields[f]}"} }    

    if use_pre
      # gotcha: the \n chars were being turned into newlines so don't do it this way:
      #"<div #{fields_string.join(' ')}>\n<pre>#{@fields['text'].encodeHTML}</pre>\n</div>" 
      "<div #{fields_string.join(' ')}>\n<pre>"+@fields['text'].encodeHTML+"</pre>\n</div>" 
    else
      "<div #{fields_string.join(' ')}>"+@fields['text'].escapeLineBreaks.encodeHTML+"</div>"
    end


  end

  alias to_div to_s #:nodoc:

  # Lets you access fields like this:
  #  tiddler.name
  #  tiddler.created
  # etc
  #
  def method_missing(method,*args)

    method = method.to_s

    synonyms = {
      'name'    => 'tiddler',
      'title'   => 'tiddler',
      'content' => 'text',
      'body'    => 'text',
    }

    method = synonyms[method] || method

    if @@main_fields.include? method or @fields[method]
      @fields[method]
    else
      raise "No such field or method #{method}"
    end

  end

  # Add some text to the end of a tiddler's content
  def append_content(new_content)
    @fields['text'] += new_content
    self
  end
  
  # Add some text to the beginning of a tiddler's content
  def prepend_content(new_content)
    @fields['text'] = new_content + @fields['text']
    self
  end
  
  # Renames a tiddler
  def rename(new_name)
    @fields['tiddler'] = new_name
    self
  end

  # Makes a copy of this tiddler
  def copy
    Tiddler.new.from_div(self.to_div)
  end

  # Makes a copy of this tiddler with a new title
  def copy_to(new_title)
    copy.rename(new_title)
  end
  
  # Adds a tag
  def add_tag(new_tag)
    @fields['tags'] ||= ''
    @fields['tags'] = @fields['tags'].
      readBrackettedList.
      push(new_tag).
      uniq.
      toBrackettedList

    self
  end

  # Adds a list of tags
  def add_tags(tags)
    tags.each { |tag| add_tag(tag) }
  end

  # Removes a single tag
  def remove_tag(old_tag)
    @fields['tags'] = @fields['tags'].
      readBrackettedList.
      reject { |tag| tag == old_tag }.
      toBrackettedList

    self
  end

  # Removes a list of tags
  def remove_tags(tags)
    tags.each { |tag| remove_tags(tag) }
  end

  # Returns true if a tiddler has a particular tag
  def has_tag(tag) 
    fields['tags'] && fields['tags'].readBrackettedList.include?(tag)
  end

  def has_tags(tags) 
    fields['tags'] && tags.to_set.subset?(fields['tags'].readBrackettedList.to_set)
  end

  # Returns a Hash containing all tiddler slices
  def get_slices
    if not @slices
      @slices = {}
      # look familiar?
      slice_re = /(?:[\'\/]*~?(\w+)[\'\/]*\:[\'\/]*\s*(.*?)\s*$)|(?:\|[\'\/]*~?(\w+)\:?[\'\/]*\|\s*(.*?)\s*\|)/m
      text.scan(slice_re).each do |l1,v1,l2,v2|
        @slices[l1||l2] = v1||v2;
      end
    end
    @slices
  end

  # Returns a tiddler slice
  def get_slice(slice)
    get_slices[slice]
  end

  #
  # Experimental. Provides access to plugin meta slices.
  # Returns one meta value or a hash of them if no argument is given
  #
  def plugin_meta(slice=nil)
    # see http://www.tiddlywiki.com/#ExamplePlugin
    if not @plugin_meta
      meta = %w[Name Description Version Date Source Author License CoreVersion Browser]
      @plugin_meta = get_slices.reject{|k,v| not meta.include?(k)}
    end
    if slice
      @plugin_meta[slice]
    else
      @plugin_meta
    end
  end

end

#---------------------------------------------------------------------
# =Tiddlywiki
# Create and manipulate TiddlyWiki files 
#

class TiddlyWiki

  attr_accessor :orig_tiddlers, :tiddlers, :raw

  # doesn't do much. probably should allow an empty file param
  def initialize(use_pre=true)
    @use_pre = use_pre
    @tiddlers = []
  end

  # this should replace all the add_tiddler_from_blah methods
  # but actually they are still there below
  # testing required
  def method_missing(method_name,*args);
    case method_name.to_s
    when /^add_tiddler_(.*)$/
      add_tiddler(Tiddler.new.send($1,*args))
    end
  end

  # initialise a TiddlyWiki from a source file
  # will treat empty_file as a url if it looks like one
  # note that it doesn't have to be literally empty
  def source_empty(empty_file,&block)
    @empty_file = empty_file
    if empty_file =~ /^https?/
      @raw = fetch_url(@empty_file)
    else
      @raw = read_file(@empty_file)
    end

    # stupid ctrl (\r) char
    #@raw.eat_ctrl_m!

    if @raw !~ /var version = \{title: "TiddlyWiki", major: 2, minor: [23456]/ # fix me
      @use_pre = false
    end

    @core_hacks = []
    @orig_tiddlers = get_orig_tiddlers
    @tiddlers = @orig_tiddlers
      
    instance_eval(&block) if block
    
    self
  end

  # reads an empty from a file on disk
  def source_file(file_name="empty.html") 
    source_empty(file_name)
  end

  # reads an empty file from a url
  def source_url(url="http://www.tiddlywiki.com/empty.html")
    source_empty(url)
  end

  # important regexp
  # if this doesn't work we are screwed
  @@store_regexp = /^(.*<div id="storeArea">\n?)(.*)(\n?<\/div>\r?\n<!--.*)$/m # stupid ctrl-m \r char

  # everything before the store
  # TODO make these private
  def pre_store #:nodoc:
    @raw.sub(@@store_regexp,'\1')
  end

  # the store itself
  def store #:nodoc:
    @raw.sub(@@store_regexp,'\2')
  end

  # everything after the store
  def post_store #:nodoc:
    @raw.sub(@@store_regexp,'\3')
  end

  # returns an array of tiddler divs
  def tiddler_divs #:nodoc:
    ## the old way, one tiddler per line...
    # store.strip.to_a
    ## the new way
    store.scan(/(<div ti[^>]+>.*?<\/div>)/m).map { |m| m[0] }
    # did I mention that scan is a beautiful thing?
  end

  # add a core hack
  # it will be applied to the entire TW core like this gsub(regexp,replace)
  def add_core_hack(regexp,replace)
    # this is always a bad idea... ;)
    @core_hacks.push([regexp,replace])
  end

  def get_orig_tiddlers #:nodoc:
    tiddler_divs.map do |tiddler_div|
      Tiddler.new.from_div(tiddler_div,@use_pre)
    end
  end

  # an array of tiddler titles
  def tiddler_titles
    @tiddlers.map { |t| t.name }
  end

  # returns an array of tiddlers containing a particular tag
  def tiddlers_with_tag(tag)
    @tiddlers.select{|t| t.has_tag(tag)}
  end

  def tiddlers_with_tags(tags)
    @tiddlers.select{|t| t.has_tags(tags)}
  end

  # adds a tiddler
  def add_tiddler(tiddler)
    remove_tiddler(tiddler.name)
    @tiddlers << tiddler
    tiddler
  end


  # removes a tiddler by name
  def remove_tiddler(tiddler_name)
    @tiddlers.reject!{|t| t.name == tiddler_name}
  end

  # adds a shadow tiddler
  # note that tags and other fields aren't preserved
  def add_shadow_tiddler(tiddler)
    # shadow tiddlers currently implemented as core_hacks
    add_core_hack(
      /^\/\/ End of scripts\n/m,
      "\\0\nconfig.shadowTiddlers[\"#{tiddler.name}\"] = #{tiddler.text.dump};\n\n"
    )
  end
  
  # adds a shadow tiddler from a file
  def add_shadow_tiddler_from_file(file_name)
    add_shadow_tiddler Tiddler.new.from_file("#{file_name}")
  end

  # add tiddlers from a list of file names
  # ignores file names starting with #
  # so you can do this
  #  %w[
  #   foo
  #   bar
  #   #baz
  #  ]
  # and it will skip baz
  def add_tiddlers(file_names)
    file_names.reject{|f| f.match(/^#/)}.each do |f|
      add_tiddler_from_file(f)
    end
  end

  def add_tiddler_from(*args)
    add_tiddler Tiddler.new(*args)
  end
  
  def add_tiddlers_from(tiddler_list)
     tiddler_list.each { |t| add_tiddler Tiddler.new(t) }
  end


  # add tiddlers from files found in directory dir_name
  # TODO exclude pattern?
  def add_tiddlers_from_dir(dir_name)
    add_tiddlers(Dir.glob("#{dir_name}/*"))
  end

  # add shadow tiddlers from files found in directory dir_name
  def add_shadow_tiddlers_from_dir(dir_name)
    Dir.glob("#{dir_name}/*").each do |f|
      add_shadow_tiddler_from_file(f)
    end
  end

  # add a list of files found in dir_name packaged as javascript to create shadow tiddlers
  # append the javascript to the contents of file_name
  # (needs more explanation perhaps)
  # see also package_as
  def package_as_from_dir(file_name,dir_name)
    package_as(file_name,Dir.glob("#{dir_name}/*"))
  end

  # if you have a file containing just tiddler divs you can read them 
  # all in with this
  def add_tiddlers_from_file(file_name)
    # a file full of divs
    File.read(file_name).to_a.inject([]) do |tiddlers,tiddler_div|
      @tiddlers << Tiddler.new.from_div(tiddler_div,@use_pre)
    end
  end

  # get a tidler by name
  def get_tiddler(tiddler_title)
    @tiddlers.select{|t| t.name == tiddler_title}.first
  end

  # output the TiddlyWiki file
  def to_s
    pre_store_hacked = pre_store
    post_store_hacked = post_store
    @core_hacks.each do |hack|
      pre_store_hacked.gsub!(hack[0],hack[1])
      post_store_hacked.gsub!(hack[0],hack[1])
    end
    "#{pre_store_hacked}#{store_to_s}#{post_store_hacked}"
  end

  # output just the contents of the store
  def store_to_s
    # not sure about this bit. breaks some tests if I put it in
    #((@use_pre and @tiddlers.length > 0) ? "\n" : "") +
    @tiddlers.sort_by{|t| t.name}.inject(""){ |out,t|out << t.to_div(@use_pre) << "\n"}
  end

  # writes just the store area to a file
  # the file can be used with ImportTiddlers to save download bandwidth
  def store_to_file(file_name)
    File.open(file_name,"w") { |f| f << "<div id=\"storeArea\">\n#{store_to_s}</div>\n" }
    puts "Wrote store only to '#{file_name}'"
  end

  # writes just the store contents to a file
  def store_to_divs(file_name)
    File.open(file_name,"w") { |f| f << store_to_s }
    puts "Wrote tiddlers only to '#{file_name}'"
  end

  # writes the entire TiddlyWiki to a file
  def to_file(file_name)
    File.open(file_name,"w") { |f| f << to_s }
    puts "Wrote tw file to '#{file_name}'"
  end

  # takes a list of file_names, reads their content
  # and converts them to javascript creation of shadow tiddlers
  # then appends that to the contents of file_name
  # (sorry, confusing)
  def package_as(file_name,package_file_names)
    new_tiddler = add_tiddler Tiddler.new.from_file(file_name)
    new_tiddler.append_content(package(package_file_names))
    # date of the most recently modified
    new_tiddler.fields['modified'] = package_file_names.push(file_name).map{|f| File.mtime(f)}.max.convertToYYYYMMDDHHMM
  end
  
  # TODO make private?
  def package(file_names) #:nodoc:
    "//{{{\nmerge(config.shadowTiddlers,{\n\n"+
    ((file_names.map do |f|
      Tiddler.new.from_file(f)
    end).map do |t|
      "'" + t.name + "':[\n " + 
          t.text.chomp.dump.gsub(/\\t/,"\t").gsub(/\\n/,"\",\n \"").gsub(/\\#/,"#") + "\n].join(\"\\n\")"
    end).join(",\n\n")+
    "\n\n});\n//}}}\n"
  end

  # copy all tiddlers from another TW file into this TW
  # good for creating Tiddlyspot flavours
  def copy_all_tiddlers_from(file_name)
    TiddlyWiki.new.source_empty(file_name).tiddlers.each do |t|
      add_tiddler t
    end
  end

  # write all tiddlers to files in dir_name
  def write_all_tiddlers_to(dir_name)
    tiddlers.each do |t|

      ext = 'tiddler'

      # TODO improve this
      if t.tags and t.tags.include? "systemConfig"
        ext = 'js'
      elsif t.name =~ /Template/
        ext = 'html'
      elsif t.name =~ /(StyleSheet|Styles)/
        ext = 'css'
      end

      t.text.to_file("#{dir_name}/#{t.name}.#{ext}")
    end
  end

end

#
# A short hand for DSL style TiddlyWiki creation. Takes a block of TiddlyWiki methods that get instance_eval'ed
#
def make_tw(source=nil,&block)
  tw = TiddlyWiki.new(true)
  tw.source_empty(source) if source
  tw.instance_eval(&block) if block
  tw
end


