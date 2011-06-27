
config.indexedTags = {

  // will be populated with our tag lists
  tagLists: {},

  // will be populated with our tag indexes
  indexes: {},

  // will be populated with the tags that need indexing
  tagsToIndex: [],

  saveTiddlerHijack: function(title,newTitle,newBody,modifier,modified,tags,fields) {
    var before = store.getTiddler(title);
    var oldTags = before ? [].concat(before.tags) : null;  // concat so we get a dup

    store.suspendNotifications();
    var result = this.saveTiddler_orig_indexedTags(title,newTitle,newBody,modifier,modified,tags,fields);
    var newTags = store.getTiddler(newTitle).tags;

    config.indexedTags.updateTagLists(title,oldTags,newTitle,newTags);
    config.indexedTags.updateIndexes(title,newTitle,newTags);

    store.resumeNotifications();
    store.notify(title,true);

    return result;
  },

  removeTiddlerHijack: function(title) {
    var before = store.getTiddler(title);
    var oldTags = before ? [].concat(before.tags) : null;  // concat so we get a dup

    store.suspendNotifications();
    this.removeTiddler_orig_indexedTags(title);

    config.indexedTags.updateTagLists(title,oldTags);
    config.indexedTags.updateIndexes(title);

    store.resumeNotifications();
    store.notify(title,true);
  },

  setTiddlerTagHijack: function(title,status,tag) {

    clearMessage(); // unrelated to indexedTags but....

    var before = store.getTiddler(title);
    var oldTags = before ? [].concat(before.tags) : null;  // concat so we get a dup

    store.suspendNotifications();
    this.setTiddlerTag_orig_indexedTags(title,status,tag);

    var after = store.getTiddler(title);
    var newTags = after ? after.tags : null;

    config.indexedTags.updateTagLists(title,oldTags,title,newTags);
    config.indexedTags.updateIndexes(title,title,newTags);

    store.resumeNotifications();
    store.notify(title,true);

  },

  updateTagLists: function(title,oldTags,newTitle,newTags) {
    if (oldTags)
      oldTags.each(function(tagName) {
        if (!config.indexedTags.tagLists[tagName])
          config.indexedTags.tagLists[tagName] = []; // fixes TiddlerEncryption/MTS, thanks Patrick Ohly.
        config.indexedTags.tagLists[tagName].remove(title);
      });
    if (newTags)
      newTags.each(function(tagName) {
        if (!config.indexedTags.tagLists[tagName])
          config.indexedTags.tagLists[tagName] = [];
        config.indexedTags.tagLists[tagName].pushUnique(newTitle);
      });
  },

  updateIndexes: function(title,newTitle,newTags) {
    delete config.indexedTags.indexes[title];
    if (newTags) {
      config.indexedTags.indexes[newTitle] = {};
      config.indexedTags.tagsToIndex.each(function(tagToIndex) {
        config.indexedTags.indexes[newTitle][tagToIndex] = [];
        newTags.each(function(tag) {
          if (config.indexedTags.tagLists[tagToIndex] && config.indexedTags.tagLists[tagToIndex].contains(tag)) {
            config.indexedTags.indexes[newTitle][tagToIndex].pushUnique(tag);
          }
        });
      });
    }
  },

  initTagLists: function() {
    store.getTags().map(function(pair) { return pair[0]; }).each(function(t) {
      config.indexedTags.tagLists[t] = store.getTaggedTiddlers(t).map(function(tt) { return tt.title; });
    });
  },

  initIndexes: function() {
    store.forEachTiddler(function(title,tiddler) {
      config.indexedTags.updateIndexes(title,title,tiddler.tags);
    });
  },

  dump: function() {
    alert(this.indexes["Buy petrol for mower"]["Project"]);
    alert(this.indexes["Buy petrol for mower"]["Realm"]);
  },

  tiddlerMethods: {
    getByIndex: function(tag) {
      return config.indexedTags.indexes[this.title][tag];
    },

    hasParent: function(tag) {
      return this.getByIndex(tag).length > 0
    },

    hasNoParent: function(tag) {
      return !this.hasParent(tag);
    },

    hasActiveProject: function() {
      var projs = this.getByIndex("Project");

      if (projs.length == 0)
        // no project but we will say it's active
        // because otherwise it will not show up anywhere
        return true;

      for (var i=0;i<projs.length;i++)
        if (
          (config.indexedTags.indexes[projs[i]]['ProjectStatus'].contains('Active'))
          &&
          !store.fetchTiddler(projs[i]).tags.contains('Complete') // seems stupid
          )
          return true;
      return false;
    },

    hasStarredProject: function() {
      // similar to hasActiveProject
      // thanks to Bernhardt Rainer
      var projs = this.getByIndex("Project");

      if (projs.length == 0)
        return false;

      for (var i=0;i<projs.length;i++)
        if (
          (config.indexedTags.indexes[projs[i]]['ProjectStatus'].contains('Starred'))
          &&
          !store.fetchTiddler(projs[i]).tags.contains('Complete') // seems stupid
          )
          return true;
      return false;
    },

    getAreasForAction: function() {
      // we will go to some trouble to permit actions in multiple areas
      // either explicitly or via their project...
      // also permit multiple projects......
      // explicit:
      var result = [];
      result = result.concat(this.getByIndex("Area"));
      // implicit (via project/s):
      var projs = this.getByIndex("Project");
      for (var i=0;i<projs.length;i++)
        result = result.concat(store.fetchTiddler(projs[i]).getByIndex("Area"));
      return result;
    },

    hasNextAction: function() {
      var children = fastTagged(this.title).filterByTagExpr('Action && !Done && (Next || [(Waiting For)])');
      return children.length > 0;
    },

    hasTickler: function() {
      var children = fastTagged(this.title).filterByTagExpr('Tickler && !Actioned');
      return children.length > 0;
    },

    hasSubProject: function() {
      var children = fastTagged(this.title).filterByTagExpr('Project && !Complete && Active');
      return children.length > 0;
    },

    hasNextActionOrSubProject: function() {
      return (this.hasSubProject() || this.hasNextAction());
    },

    hasNextActionOrSubProjectOrTickler: function() {
      return (this.hasSubProject() || this.hasNextAction() || this.hasTickler());
    }
  },

  globalMethods: {
    fastTagged: function(tag) {
      var list = config.indexedTags.tagLists[tag];
      return (list?list:[]).map(function(t){return store.getTiddler(t);});
    }
  },

  init: function(tagsToIndex) {

    merge(window,this.globalMethods);
    merge(Tiddler.prototype,this.tiddlerMethods);

    this.tagsToIndex = tagsToIndex;
    this.initTagLists();
    this.initIndexes();

    TiddlyWiki.prototype.saveTiddler_orig_indexedTags = TiddlyWiki.prototype.saveTiddler;
    TiddlyWiki.prototype.removeTiddler_orig_indexedTags = TiddlyWiki.prototype.removeTiddler;
    TiddlyWiki.prototype.setTiddlerTag_orig_indexedTags = TiddlyWiki.prototype.setTiddlerTag;
    TiddlyWiki.prototype.saveTiddler = this.saveTiddlerHijack;
    TiddlyWiki.prototype.removeTiddler = this.removeTiddlerHijack;
    TiddlyWiki.prototype.setTiddlerTag = this.setTiddlerTagHijack;

  }
};

config.indexedTags.init(config.mGTD.tagsToIndex);
