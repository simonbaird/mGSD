
// requires MgtdIndexedTags for the fastTagged and getByIndex methods
// TODO make these usable without MgtdIndexedTags if it doesn't exist

merge(Tiddler.prototype,{


  addTag: function(tag) {
    store.setTiddlerTag(this.title,true,tag);
  },

  removeTag: function(tag) {
    store.setTiddlerTag(this.title,false,tag);
  },

  setTagFromGroup: function(tagGroup,tag) {
    var tagList = fastTagged(tagGroup);

    // it goes slow if you don't do this
    store.suspendNotifications();

    // remove all the tags in the group
    for (var i=0;i<tagList.length;i++)
      this.removeTag(tagList[i].title);

    // add the one selected
    if (tag)
      this.addTag(tag);

    // touch the modified date so we can sort usefully
    this.modified = new Date();

    // resume notification and notify
    store.resumeNotifications();
    store.notify(this.title,true);
  },

  toggleTag: function(tag) {
    store.setTiddlerTag(this.title,!this.hasTag(tag),tag);
    // touch the modified date
    this.modified = new Date();
  },

  hasTag: function(tag) {
    return this.tags.contains(tag);
  },

  getParent: function(tag) {
    return this.getByIndex(tag);
  },

  // experimental
  getGrandParent: function(parentTag,grandParentTag) {
    // eg tiddler.getGrandParent('Project','Area') ??
    var result = [];
    this.getByIndex(parentTag).each(function(parentTiddler){
      // because can be multiple
      store.fetchTiddler(parentTiddler).getByIndex(grandParentTag).each(function(grandParentTiddler){
        result.push(grandParentTiddler);
      });
    });
    return result;
  },

  // experimental. does this belong elsewhere?
  actionInArea: function(area) {
    //return this.getParent(area).contains(area) || this.getGrandParent('Project','Area').contains(area);
    return this.getGrandParent('Project','Area').contains(area);
  },

//-----------------------------------

  // experimental. try action dependencies

  actionsDependantOnThisAction: function() {
    return fastTagged(this.title).filterByTagExpr("Action && (Future || Next) && !Done");
  },

  autoNextAnyWaitingActions: function() {
    // XXX exactly what each am I using here?
    // because it looks like this gets munged
    // inside the each function. this makes me think
    // i'm not using the each i think i'm using
    // eek.
    var thisTiddler = this;
    this.actionsDependantOnThisAction().each(function(t){
      if (thisTiddler.hasTag('Done')) {
        if (t.actionCanBecomeNext()) {
          // we still have to check because it might have multiple dependencies
          if (!t.hasTag('Next')) {
            t.setTagFromGroup('ActionStatus','Next');
            displayMessage('Setting dependent action "' + t.title + '" to Next');
          }
        }
      }
      else {
        // this is because what if we go in reverse, ie untick the done checkbox
        // also why we need Future || Next in actionsDependantOnThisAction
        // don't need to check anything because any one dependency is enough to trigger going back to Future
        if (!t.hasTag('Future')) {
          t.setTagFromGroup('ActionStatus','Future');
          displayMessage('Setting dependent action "' + t.title + '" to Future');
        }
      }
    });
  },

  actionGetDependencies: function() {
    // an action with a parent action
    // we will take to mean that the parent action
    // must be done before this action
    // can become a next action
    return this.getParent('Action');
  },

  actionCanBecomeNext: function() {
    var result = true;
    this.actionGetDependencies().each(function(t){
      if (!store.fetchTiddler(t).hasTag('Done')) {
        // an action this action depends on is not done
        result = false;
      }
    });
    return result;
  },

//-----------------------------------

  hasParent: function(tag) {
    return this.getParent(tag).length > 0;
  },

  realmMismatchWithParent: function(tag) {
    var myRealm = this.getParent('Realm')[0];

    if (!myRealm)
      return true; // no realm, should be fixed..

    var myParent = this.getParent(tag)[0];
    if (!myParent)
      return false; // nothing to be mismatched with

    var parentTiddler = store.fetchTiddler(this.getParent(tag)[0]);
    if (!parentTiddler)
      return true; // doubt it would ever happen but...

    parentRealm = parentTiddler.getParent('Realm')[0]; // we assume one realm only...
    if (!parentRealm)
      return true;

    return parentRealm != myRealm;
  }

});

merge(config.macros,{

  singleToggleTag: {

    handler: function(place,macroName,params,wikifier,paramString,tiddler) {

      var pp = paramString.parseParams("tag",null,true);

      if (!tiddler)
        tiddler = store.getTiddler(getParam(pp,"title"));

      var tag = getParam(pp,"tag");
      var t = store.fetchTiddler(tag);

      var title = getParam(pp,"title",tiddler.title);


      var actOnTiddler = store.getTiddler(title);

      var label = store.getTiddlerSlice(t.title,"button");
      var labelOff = store.getTiddlerSlice(t.title,"buttonOff");

      // dreadful hack
      if (tag == "Starred")
        label = config.mGTD.data.unicodeStar;

      var autoClass = "button " + t.title.replace(/[\/ ]/g,'')

      if (!label) label = t.title;
      if (!labelOff) labelOff = label;


      var curState = actOnTiddler.hasTag(tag);

      var cl = createTiddlyButton(place, curState?label:labelOff, t.title, function(e) {
          actOnTiddler.toggleTag(tag);
          return false;
        },
        autoClass + " " + (curState ? "on" : "off")
        );
    }

  },

  groupOfSingleToggleTags: {

    handler: function(place,macroName,params,wikifier,paramString,tiddler) {

      var pp = paramString.parseParams("tag",null,true);

      var useCheckbox = getParam(pp,"useCheckbox","");

      if (!tiddler)
        tiddler = store.getTiddler(getParam(pp,"title"));

      var tag = getParam(pp,"tag");

      var title = getParam(pp,"title",tiddler.title);
      var refresh = getParam(pp,"refresh"); // stupid bit for pagetemplate hack

      var includeNew = getParam(pp,"includeNew","yes"); // default on for the moment..

      var actOnTiddler = store.getTiddler(title);

      //// TODO: refactor. (This realm filtering is copy/pasted this from multiSelectTag...)
      //the extra || condition below should take care of contexts now. so actually you can have realm specific contexts if you want
      var thisRealm = tiddler.getParent('Realm')[0];
      var filterRealm = "";
      if (thisRealm && tag != "Realm") { // && tag != "Context") {
        // only want to see things in my realm (or things that don't have a realm...)
        filterRealm += "(tiddler.tags.contains('"+thisRealm.replace(/'/g,"\\'")+"') || !tiddler.hasParent('Realm'))";
      }

      var getValues = fastTagged(tag).filterByEval(filterRealm == '' ? 'true' : filterRealm).sort(function(a,b){
        return a.sorterUtil(b,"orderSlice");
      });

      getValues.each(function(t) {

        var label = store.getTiddlerSlice(t.title,"button");
        var autoClass = "button " + t.title.replace(/[\/ ]/g,'')

        if (!label)
          label = t.title;

        if (useCheckbox == "yes") {
          // checkbox style toggle tags
          wikify("<<toggleTag [["+t.title+"]] [["+tiddler.title+"]] ->>[["+label+"]]&nbsp;" ,place,null,tiddler);
        }
        else {
          // button style toggle tags
          var cl = createTiddlyButton(place, label, t.title, function(e) {
              actOnTiddler.toggleTag(t.title);
              if (refresh == "page")
                refreshPageTemplate();
              return false;
            },
            autoClass + " " + (actOnTiddler.getByIndex(tag).contains(t.title) ? "on" : "off")
            );
        }
       });

       if (includeNew) {
        // add a button to create...
        createTiddlyButton(place, "+", "New "+tag+"...", function(e) {
            var newItemTitle = config.macros.multiSelectTag.createNewItem(tag);
            if (newItemTitle)
              actOnTiddler.addTag(newItemTitle);
            if (tag == "Realm")
              refreshPageTemplate();
            return false;
          },
          tag == "Realm"?"button off":"button" // the class so it looks right in the top menu
        );
       }
    }

  },

  multiToggleTag: {

    handler: function(place,macroName,params,wikifier,paramString,tiddler) {

      var pp = paramString.parseParams("tag",null,true);

      if (!tiddler)
        tiddler = store.getTiddler(getParam(pp,"title"));

      var tag = getParam(pp,"tag");

      var refresh = getParam(pp,"refresh"); // stupid bit for pagetemplate hack
      var longVersion = getParam(pp,"longVersion");

      var title = getParam(pp,"title",tiddler.title);
      var actOnTiddler = store.getTiddler(title);

      var getValues = fastTagged(tag).sort(function(a,b){
        return a.sorterUtil(b,"orderSlice");
      });


      getValues.each(function(t) {
        var label = store.getTiddlerSlice(t.title,longVersion?"buttonLong":"button");

        var extraClass = store.getTiddlerSlice(t.title,"buttonClass");
        var autoClass = (extraClass ? extraClass : "") + " button " + t.title.replace(/[\/ ]/g,'')
        if (!label) label = t.title;
        var cl = createTiddlyButton(place, label, t.title, function(e) {
            actOnTiddler.setTagFromGroup(tag,t.title);
            if (refresh == "page")
              refreshPageTemplate();
            return false;
          },
          autoClass + " " + (actOnTiddler.getByIndex(tag).contains(t.title) ? "on" : "off")
          );
      });

    }
  },

  multiSelectTag: {

    handler: function(place,macroName,params,wikifier,paramString,tiddler) {

      var pp = paramString.parseParams("tag",null,true);

      if (!tiddler)
        tiddler = store.getTiddler(getParam(pp,"title"));

      var tag = getParam(pp,"tag");
      var refresh = getParam(pp,"refresh"); // stupid bit for pagetemplate hack

      var allowNone = getParam(pp,"allowNone");

      var includeNew = getParam(pp,"includeNew","yes"); // default on for the moment..

      var title = getParam(pp,"title",tiddler.title);
      var actOnTiddler = store.getTiddler(title);

      var selectOptions = [];

      if (allowNone)
        selectOptions.push({name: null, caption:'-'});// TODO this doesn't work right?

      if (includeNew)
        selectOptions.push({name: '__new__', caption:'New '+tag+'...'});

      var getValues = fastTagged(tag).sort(function(a,b){
        return a.sorterUtil(b,"orderSlice");
      });


      // a few automagic filters should make life easier

      var thisRealm = tiddler.getParent('Realm')[0];

      var filterRealm = "";
      var filterComplete = "";

      //the extra || condition below should take care of contexts now. so actually you can have realm specific contexts if you want
      if (thisRealm && tag != "Realm") { // && tag != "Context") {
        // only want to see things in my realm (or things that don't have a realm...)
        filterRealm += "(tiddler.tags.contains('"+thisRealm.replace(/'/g,"\\'")+"') || !tiddler.hasParent('Realm'))";
      }

      if (tag == "Project") {
        // only want to see active projects
        filterComplete += "!tiddler.tags.contains('Complete')";
      }

      // Big thanks to Kralik and whoever wrote this: http://tiddlywiki.org/wiki/MonkeyGTD/Customization_Guide/Waiting_Actions
      if (tag == "Action") {
        // only want to see active actions; actions only show other actions in same project (or no project)
        if (tiddler.hasParent('Project')) {
          // XXX slightly broken for actions with multiple projects. But i can live with it..
          // note: getParent returns an array
          filterComplete += "(!tiddler.tags.contains('Done') && tiddler.tags.contains('"+tiddler.getParent('Project')[0].replace(/'/g,"\\'")+"'))";
        }
        else {
          filterComplete += "(!tiddler.tags.contains('Done') && !tiddler.hasParent('Project'))";
        }

      }

      var filterExpr = "true";

      if (filterRealm != "" && filterComplete != "") {
        filterExpr = filterRealm + " && " + filterComplete;
      }
      else if (filterRealm !=  "") {
        filterExpr = filterRealm;
      }
      else if (filterComplete !=  "") {
        filterExpr = filterComplete;
      }
      // ...yuck

      // exclude ourselves (needed now for action dependencies)
      filterExpr = "((" + filterExpr + ") && (tiddler.title != '" + tiddler.title.replace(/'/g,"\\'") + "'))";

      var currentVal = tiddler.getParent(tag)[0];
      if (currentVal && currentVal != '') {
        // prevent weirdness if the current value isn't in the list
        // eg an action in a completed project
        filterExpr = "(" + filterExpr + ") || tiddler.title == '" + currentVal.replace(/'/g,"\\'") + "'";

      }
      if (tag == "Project" && tiddler.hasTag('Project')) {
        // special case: don't let a project be a subproject of itself
        filterExpr = "(" + filterExpr + ") && tiddler.title != '" + tiddler.title.replace(/'/g,"\\'") + "'";
      }

      // okay now do the filtering
      getValues = getValues.filterByEval(filterExpr);

      getValues.each(function(t) {
        var useTitle = store.getTiddlerSlice(t.title,"button");
        if (!useTitle) useTitle = t.title;
        if (useTitle.length > 50) useTitle = useTitle.substr(0,50) + "...";
        selectOptions.push({name: t.title, caption:useTitle});
      });

      var dd = createTiddlyDropDown(place, function(e) {
          var selectedItem = selectOptions[this.selectedIndex].name;
          if (selectedItem == '__new__') {
            // User is creating a new item on the fly via the dropdown
            var realm = null;
            if (tag != "Realm") {
              // Keep from double tagging in silly ways. Don't want realms to have a realm...
              if (actOnTiddler.hasParent('Realm')) {
                realm = actOnTiddler.getParent('Realm')[0]; // getParent returns array. use first realm
              }
              else {
                realm = config.macros.mgtdList.getRealm();
              }
            }
            selectedItem = config.macros.multiSelectTag.createNewItem(tag, realm);
          }

          // if selectedItem is null this works to remove any
          actOnTiddler.setTagFromGroup(tag,selectedItem);

          // Once again, big thanks to Kralik and whoever wrote this: http://tiddlywiki.org/wiki/MonkeyGTD/Customization_Guide/Waiting_Actions
          // automatically make dependent actions future
          if (tag == "Action") {
            if (selectedItem == null) {
              actOnTiddler.setTagFromGroup("ActionStatus", "Next");
            }
            else {
              actOnTiddler.setTagFromGroup("ActionStatus", "Future");
            }
          }

          if (refresh == "page")
            refreshPageTemplate();

          return false;
        },
        selectOptions,
        actOnTiddler.getByIndex(tag)[0]
      );

    },

    // want to reuse this...
    createNewItem: function(tag, realm) {
      var selectedItem = prompt("Enter name for new "+tag+":","");
      if (selectedItem) {
        selectedItem = config.macros.newTiddler.getName(selectedItem); // from NewMeansNewPlugin
        var tags = [];
        tags.push(tag); // make it into the thing you want
        if (realm) // make sure it's got a realm unless it IS a realm
          tags.push(realm);
        if (tag == "Project")
          tags.push("Active"); // if it's a project then make it active...
        if (tag == "Action")
          tags.push("Next"); // if it's an action then make it next...
        store.saveTiddler(selectedItem,selectedItem,"",config.options.txtUserName,new Date(),tags);
      }
      return selectedItem;
    }


  },

  multiCheckboxTag: {

    handler: function(place,macroName,params,wikifier,paramString,tiddler) {

      var pp = paramString.parseParams("tag",null,true);

      if (!tiddler)
        tiddler = store.getTiddler(getParam(pp,"title"));

      var tag = getParam(pp,"tag");

      var title = getParam(pp,"title",tiddler.title);
      var actOnTiddler = store.getTiddler(title);

      var getValues = fastTagged(tag).sort(function(a,b){
        return a.sorterUtil(b,"orderSlice");
      });

      var output = "";
      getValues.each(function(t) {
        output += "<<toggleTag [[%0]] [[%1]] [[%0]]>>".format([
          t.title,
          actOnTiddler.title
        ]);
      });

      wikify(output,place,null,tiddler);

    }
  },

  // these don't really belong here but never mind..
  convertToFromTickler: {
    handler: function(place,macroName,params,wikifier,paramString,tiddler) {
      if (tiddler.tags.contains('Tickler')) {

        createTiddlyButton(place, "make action", "make this tickler into a next action", function(e) {
            store.suspendNotifications();
            tiddler.removeTag("Tickler");
            tiddler.addTag("Action");
            tiddler.removeTag("Done");
            tiddler.setTagFromGroup("ActionStatus","Next");
            store.resumeNotifications();
            store.notify(tiddler.title,true);
            return false;
          });

        createTiddlyButton(place, "make project", "make this tickler into an active project", function(e) {
            store.suspendNotifications();
            tiddler.removeTag("Tickler");
            tiddler.addTag("Project");
            tiddler.removeTag("Complete");
            tiddler.setTagFromGroup("ProjectStatus",'Active');
            store.resumeNotifications();
            store.notify(tiddler.title,true);
            return false;
          });
      }
      if (tiddler.tags.containsAny(['Action','Project'])) {
        createTiddlyButton(place, "make tickler", "make this item into a tickler", function(e) {
            store.suspendNotifications();
            if (tiddler.hasTag("Project")) {
              // a little trick. it makes any actions associated with this project disappear from action lists
              // thanks to Jorge A. Ramos M.
              tiddler.setTagFromGroup("ProjectStatus",'Someday/Maybe');
            }
            tiddler.removeTag("Action");
            tiddler.removeTag("Project");
            tiddler.addTag("Tickler");
            if (!tiddler.tags.containsAny(['Daily','Weekly','Monthly','Yearly'])) {
              // thanks Kyle Baker
              tiddler.addTag("Once");
            }
            store.resumeNotifications();
            store.notify(tiddler.title,true);
            return false;
          });
      }
    }
  },

  convertActionToSubProj: {
    handler: function(place,macroName,params,wikifier,paramString,tiddler) {
      if (tiddler.tags.contains('Action')) {

        createTiddlyButton(place, "make project", "make this action into a project", function(e) {
            store.suspendNotifications();
            tiddler.removeTag("Action");
            tiddler.removeTag("Next");
            tiddler.removeTag("Future");
            tiddler.removeTag("Waiting For");
            tiddler.removeTag("Done");
            tiddler.addTag("Project");
            tiddler.addTag("Active");
            store.resumeNotifications();
            store.notify(tiddler.title,true);
            return false;
          });

      }
    }
  },


  convertActionToReference: {
    handler: function(place,macroName,params,wikifier,paramString,tiddler) {
      if (tiddler.tags.contains('Action')) {

        createTiddlyButton(place, "make reference", "make this action into a reference item", function(e) {
            store.suspendNotifications();
            tiddler.removeTag("Action");
            tiddler.removeTag("Next");
            tiddler.removeTag("Future");
            tiddler.removeTag("Waiting For");
            tiddler.removeTag("Done");
            tiddler.addTag("Reference");
            store.resumeNotifications();
            store.notify(tiddler.title,true);
            return false;
          });

      }
    }
  },


  linkToParent: {
    handler: function(place,macroName,params,wikifier,paramString,tiddler) {
      var label = params[1] ? params[1] : '>>';
      var useTiddler = params[2] ? store.fetchTiddler(params[2]) : tiddler;
      var links = useTiddler.getByIndex(params[0]);
      var output = "";
      for (var i=0;i<links.length;i++)
        output += ( (i==0?'':' ') + "[[%1|%0]]".format([links[i], label == 'title' ? '['+links[i]+']' : label]) );
      if (output != "")
        wikify(output,place,null,useTiddler);
    }
  },

  // doesn't belong here since it's not a tag thing..
  deleteTiddler: {
    handler: function(place,macroName,params,wikifier,paramString,tiddler) {
      var tiddlerToDelete = params[0];
      if (store.tiddlerExists(tiddlerToDelete)) {
        createTiddlyButton(place, '\u00d7', 'Delete tiddler '+tiddlerToDelete, function(e) {
          var deleteIt = true;
          if (config.options.chkConfirmDelete)
            deleteIt = confirm(config.commands.deleteTiddler.warning.format([tiddlerToDelete]));
          if (deleteIt) {
            story.closeTiddler(tiddlerToDelete);
            store.removeTiddler(tiddlerToDelete);
          }
          return false;
        },'deleteTiddlerButton');
      }
    }
  },

  // contributed by ByteDoc
  showNotesIcon: {

    imageData: "data:image/gif;base64,R0lGODlhDgAOAKU3AHJcM21cQnFhRYBkLXVlSHdoS3hpTH5sQXxtUYpvNMeKCcuRD9CZBdKbGuCbAM+iEtWkHtmmELiqgb+tgeSsPMCwgt6wLMOyhMa1hd22O+m2OM68iuK/QOy8UdHBjOzEKdfGk/XJKujJVPbNZP7RNezRdvTTZf3SbP/Zc/HejPXkfP/jfvfln//ogv7uiPjvsv/1j/v1x///mf//qv/72v//xP//zP///////////////////////////////////yH5BAEKAD8ALAAAAAAOAA4AAAZ6QJBw6PFsNheJEkSz1Z7QKAIUm1mv2BkC85J5v2CZ4cKCmc9omKGScrnfcFdhUmrZ7/hWQdJRrf6AgQQSGRwZFg8mgX+DIgwhHwwcKyiVlQISIxYRJCENlpaYJ5oLDg4WKCeWARKqJxoQEAoQFB22rAe5CQkDvb0AwEEAOw==",

    handler: function(place,macroName,params,wikifier,paramString,tiddler) {
      var useTiddler = params[0] ? store.fetchTiddler(params[0]) : tiddler;
      if (useTiddler.text != "") {
        var safeNoteContent = wikifyPlain(useTiddler.title).trim().replace(/[\[\]\|]/g,'');
        var noteOutput = (safeNoteContent == "") ?
          "{{showNotesIcon{[img[%0]]}}}".format([config.macros.showNotesIcon.imageData]) :
          "{{showNotesIcon{[img[%1|%0]]}}}".format([config.macros.showNotesIcon.imageData,safeNoteContent]);
        var output = (config.browser.isIE ?  "(n)" : noteOutput); // because IE doesn't support data urls
        wikify(output,place,null,useTiddler);
      }
    }
  }

});

TiddlyWiki.prototype.setTiddlerTag_orig_SequencedActionPlugin_mgtd3 = TiddlyWiki.prototype.setTiddlerTag;
TiddlyWiki.prototype.setTiddlerTag = function(title,status,tag) {
  // Thanks Carsten Thiele
  var returnVal = this.setTiddlerTag_orig_SequencedActionPlugin_mgtd3(title,status,tag);
  var tiddler = this.fetchTiddler(title);
  if (tiddler && tag == 'Done' && tiddler.hasTag('Action')) { // not doing ticklers yet...
    tiddler.autoNextAnyWaitingActions();
  }
  return returnVal;
}


setStylesheet(["",
".button.off {font-weight:bold;border-color:#eee;background:#fff;color:#ccc;margin:0px;font-size:100%}",
".button.on {font-weight:bold;border-color:#444;background:#888;color:#fff;margin:0px;font-size:100%}",
".button.tiny { font-size:75%; }",
// TODO move this css elsewhere
"#realmSelector .button.off {margin:0 0.5em;padding:0 1em;border:2px solid #aaa;background:#eee;color:#333;}", // actually reversed, ie off is "on"
"#realmSelector .button.on {margin:0 0.5em;padding:0 1em;border:2px solid #999;background:#999;color:#ccc;}", // actually reversed, ie off is "on"

// TODO put into styles instead of here?
// actions
".viewer .Next.button.on {border-color:#55c;background:#cfa;color:#4a4;}",
".viewer .WaitingFor.button.on {border-color:#b84;background:#fdb;color:#b84;}",
".viewer .Future.button.on {border-color:#48b;background:#bdf;color:#48b;}",

// projects
".viewer .Active.button.on {border-color:#55c;background:#cfa;color:#4a4;}",
".viewer .SomedayMaybe.button.on {border-color:#48b;background:#bdf;color:#48b;}",

// ticklers
".viewer .Enabled.button.on {border-color:#55c;background:#cfa;color:#4a4;}",
".viewer .Disabled.button.on {border-color:#b84;background:#fdb;color:#b84;}",

".viewer .Starred.button {padding:0;font-size:100%;}",
".viewer .Starred.button.on {border-color:#fff;background:#fff;color:#f80;}",
".viewer .Starred.button.off {border-color:#fff;background:#fff;color:#ddd;}",

""].join("\n"),"tTag");

//}}}
