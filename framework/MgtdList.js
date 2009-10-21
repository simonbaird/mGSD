
merge(Tiddler.prototype,{
	// doesn't belong here..
	ticklerIsActive: function() {
		var defaultHourToActivate = 5; // fixme put elsewhere
		var hourToActivate = config.mGTD.getOptTxt('tickleractivatehour') || defaultHourToActivate;
		var nowTime = new Date();
		nowTime.setHours(nowTime.getHours() - hourToActivate); // i'm confused because of UTC versus local. I think mgtd_date is UTC. But has hh:mm:ss is 00:00:00 in local time
		// a tickler without a date is active now. so please add a date to your ticklers. thanks Arkady Grudzinsky
		return (!this.fields.mgtd_date || nowTime.convertToYYYYMMDDHHMM() >= this.fields.mgtd_date );
		
	}

});
merge(config.macros,{

	ticklerAlert: {
		handler: function (place,macroName,params,wikifier,paramString,tiddler) {
			var realmFilter = '';
			if (!config.mGTD.getOptChk('AlertsIgnoreRealm'))
				realmFilter = ' && tiddler.tags.containsAny(config.macros.mgtdList.getActiveRealms())';
			var theList = fastTagged('Tickler').
						filterByTagExpr('!Actioned').
								filterByEval('tiddler.ticklerIsActive()'+realmFilter);
			if (theList.length > 0) {
				var blinker = createTiddlyElement(place,'blink');
				wikify('{{ticklerAlert{[[*ticklers*|Ticklers Requiring Action]]}}}',blinker,null,tiddler);
			}
		}
	},
	mgtdList: {

		getActiveRealms: function() {
			return store.fetchTiddler("MgtdSettings").getByIndex("Realm");
		},

		noActiveRealmMessage: function() {
			// this doesn't work like it ought to?????
			if (this.getActiveRealms().length == 0) {
				//clearMessage();
				displayMessage("Error: No active realms. Please activate at least one realm."); 
			}
		},
		
		getRealm: function(tiddlerTitle) {

			// if we're in a project inherit the realm from the project
			var inTiddler = store.fetchTiddler(tiddlerTitle);
			if (inTiddler && inTiddler.tags.contains('Project')) {
				// get the realm from the project
				return inTiddler.getByIndex('Realm');
			}	

			// otherwise use the active realm 
			var active = config.macros.mgtdList.getActiveRealms();

			if (active.length == 1) {
				return active[0];
			}
			else if (active.length == 0) {
				var fudge = fastTagged('Realm')[0].title;	 // this is a little bit random but they should be seeing the warning by now and fixing it
				return fudge;
			}
			else {
				// if there's more than one active realm use a slice to get the realm priority and choose the highest one
				// TODO, make this prettier
				var toBeat = "zzzzzzz";
				var soFar = active[0];
				for (var i=0;i<active.length;i++) {
					var pri = store.getTiddlerSlice(active[i],"priority");
					if (pri && pri < toBeat) {
						toBeat = pri;
						soFar = active[i];
					}
				}
				return soFar;
			}
		},

		getNewButton: function(tags,extraTags) {
			if (typeof tags != 'string')
				tags = String.encodeTiddlyLinkList(tags);
			return '<<newSavedTiddler label:+ tag:"'+tags+'">>'; // newSavedTiddler wants tags in one param?
		},

		getNewButton: function(tags,extraTags) {
			if (typeof tags != 'string')
				tags = String.encodeTiddlyLinkList(tags);
			return '<<newSavedTiddler prompt:"Enter name for new %1:" tooltip:"Create a new %1" label:"+" tag:"%0">>'.format([
					tags, // newSavedTiddler wants tags in one param?
					tags.readBracketedList()[0] // just show first tag in prompt and tooltip. it's the important one
				]); 
		},


		handler: function (place,macroName,params,wikifier,paramString,tiddler) {

			this.noActiveRealmMessage();

			var pp = paramString.parseParams("tags",null,true);

			// title of the list
			var title = getParam(pp,"title","");

			// local means only look at tiddlers tagged with this tiddler
			// global means look at every tiddler
			var tagMode = getParam(pp,"mode","local");

			// optional. ignored unless mode global. specify for speed gains
			var startTag = getParam(pp,"startTag");

			// eg, "Next && !Done"
			var tagExpr = getParam(pp,"tags","");

			// additional filter. gets eval'ed
			var whereExpr = getParam(pp,"where","");

			// group by another tag
			var groupBy = getParam(pp,"group","");

			// group by count only mode
			var groupCountOnly = getParam(pp,"groupCountOnly","");

			// filter the groups by tag expr
			var gTagExpr = getParam(pp,"gTag","");

			// or eval'ed expression
			var gWhereExpr = getParam(pp,"gWhere","");

			// how to render list items
			var viewType = getParam(pp,"view","plain");

			// how to render headings
			var gViewType = getParam(pp,"gView",groupBy);

			// if there are tiddlers who aren't grouped then give them this title
			// mainly used to label future actions...
			var leftoverTitle = getParam(pp,"leftoverTitle","No "+groupBy);

			// if set to "yes" then we ignore the realm and show everthing
			var ignoreRealm = getParam(pp, "ignoreRealm","");

			// sort items
			var sortBy = getParam(pp,"sort","title");

			// sort groups
			var gSortBy = getParam(pp,"gSort","title");

			// new button
			var newButton = getParam(pp,"newButton",""); // not using 
			var newButtonTags = getParam(pp,"newButtonTags","");

			// don't show empty list
			var dontShowEmpty = getParam(pp,"dontShowEmpty","");

			newButtonTags = newButtonTags.replace(/\[\(/g," [[").replace(/\)\]/g,"]] "); // change [(..)] to [[..]]

			if (!startTag)
				if (tagMode != "global")
					startTag = tiddler.title;

			var listRefreshContainer = createTiddlyElement(place,"div");

			// TODO one big attribute?
			listRefreshContainer.setAttribute("refresh","macro");
			listRefreshContainer.setAttribute("macroName",macroName);

			listRefreshContainer.setAttribute("title",title);
			listRefreshContainer.setAttribute("startTag",startTag);
			listRefreshContainer.setAttribute("tagMode",tagMode);
			listRefreshContainer.setAttribute("tagExpr",tagExpr);
			listRefreshContainer.setAttribute("groupBy",groupBy);
			listRefreshContainer.setAttribute("groupCountOnly",groupCountOnly);
			listRefreshContainer.setAttribute("gTagExpr",gTagExpr);
			listRefreshContainer.setAttribute("whereExpr",whereExpr);
			listRefreshContainer.setAttribute("gWhereExpr",gWhereExpr);
			listRefreshContainer.setAttribute("sortBy",sortBy);
			listRefreshContainer.setAttribute("gSortBy",gSortBy);
			listRefreshContainer.setAttribute("viewType",viewType);
			listRefreshContainer.setAttribute("gViewType",gViewType);
			listRefreshContainer.setAttribute("ignoreRealm",ignoreRealm);
			listRefreshContainer.setAttribute("leftoverTitle",leftoverTitle);
			listRefreshContainer.setAttribute("newButton",newButton);
			listRefreshContainer.setAttribute("newButtonTags",newButtonTags);
			if (tiddler)
				listRefreshContainer.setAttribute("tiddlerTitle",tiddler.title);
			listRefreshContainer.setAttribute("dontShowEmpty",dontShowEmpty);

			this.refresh(listRefreshContainer);
		},

		refresh: function(place) {

			removeChildren(place);

			var title = place.getAttribute("title");
			var startTag = place.getAttribute("startTag");
			var tagMode = place.getAttribute("tagMode");
			var tagExpr = place.getAttribute("tagExpr");
			var groupBy = place.getAttribute("groupBy");
			var groupCountOnly = place.getAttribute("groupCountOnly");
			var gTagExpr = place.getAttribute("gTagExpr");
			var whereExpr = place.getAttribute("whereExpr");
			var gWhereExpr = place.getAttribute("gWhereExpr");
			var sortBy = place.getAttribute("sortBy");
			var gSortBy = place.getAttribute("gSortBy");
			var viewType = place.getAttribute("viewType");
			var gViewType = place.getAttribute("gViewType");
			var ignoreRealm = place.getAttribute("ignoreRealm");
			var leftoverTitle = place.getAttribute("leftoverTitle");
			var newButton = place.getAttribute("newButton");
			var newButtonTags = place.getAttribute("newButtonTags");
			var tiddlerTitle = place.getAttribute("tiddlerTitle");
			var dontShowEmpty = place.getAttribute("dontShowEmpty");

			var wikifyThis = "";

			wikifyThis += "{{mgtdList{\n";

            if (title != "")
			    wikifyThis += "!"+title

			var nbTags;
			if (newButtonTags != '') {
				nbTags = [
						newButtonTags,                                  // the tags specified in the macro params
						'[['+config.macros.mgtdList.getRealm(tiddlerTitle)+']]',    // the realm. always want a realm
						(tagMode=='global'?'':'[['+tiddlerTitle+']]')   // if not global, then the add tiddler we're in, new here style
					].join(' ');


				var nbList = nbTags.readBracketedList();

				var nbExtra = nbTags;

				// also we want an area. another hack. darn you subprojects.. :)
				if (nbList.contains('Project') && !nbList.containsAny(fastTagged('Area').toTitleList())) {
					var foo = store.fetchTiddler(tiddlerTitle).getByIndex('Area');
					if (foo.length > 0) {
						nbExtra += ' [[' + foo[0] + ']]';
					}
				}

				if (nbList.contains('Project') && !nbList.containsAny(fastTagged('ProjectStatus').toTitleList())) {
					// stupid hack for subprojects list in project dashboards
 					// don't want to create a project with no status
					// this is the hack:
					nbExtra += ' Active';
				}

				// same hack thing for actions
				if (nbList.contains('Action') && !nbList.containsAny(fastTagged('ActionStatus').toTitleList())) {
					nbExtra += ' Next';
				}

				wikifyThis += this.getNewButton(nbExtra);
				// but still use nbTags later on in group headings...

			}


            if (title != "" || newButton != "")
			    wikifyThis += "\n";

			wikifyThis += "{{innerList{\n";

			var checkForContent = wikifyThis;

			var theList = [];
			if (startTag && startTag != 'undefined'/* this sucks */) {
				theList = fastTagged(startTag);
			}
			else {
				// why so hard to get an array of all tiddlers?
				store.forEachTiddler(function(t_title,t_tiddler) { theList.push(t_tiddler); });
			}


			if (tagExpr != "") theList = theList.filterByTagExpr(tagExpr);
			if (whereExpr != "") theList = theList.filterByEval(whereExpr);

			if (ignoreRealm != "yes") {
				var activeRealms = config.macros.mgtdList.getActiveRealms();
				theList = theList.select(function(t) {
					var realm = t.getByIndex("Realm");
					return (
						realm.length == 0 ||  // so something with no realm shows up
						realm.containsAny(activeRealms)
					);
				});
			}

            if (groupBy == "day") {
                // experimental. changing a tag doesn't update modified so
                // this isn't as useful
                theList = theList.groupBy(function(t){return [t.modified.formatString('YYYY-0MM-0DD')];});
				wikifyThis += theList.renderGrouped(viewType,gViewType,leftoverTitle);
            }
			else if (groupBy != "") {
				theList = theList.groupByTag(groupBy,sortBy,gSortBy);
				if (gTagExpr != "") theList = theList.filterGroupsByTagExpr(gTagExpr);
				if (gWhereExpr != "") theList = theList.filterGroupsByEval(gWhereExpr);
				wikifyThis += theList.renderGrouped(viewType,gViewType,leftoverTitle,null,groupCountOnly,nbTags);
			}
			else {
				theList = theList.tiddlerSort(sortBy);
				wikifyThis += theList.render(viewType);
			}

			var emptyList = false;
			if (wikifyThis == checkForContent) {
				emptyList = true;
				wikifyThis += "{{none{none}}}";
			}

			wikifyThis += "}}}\n";
			wikifyThis += "}}}\n";

			if (!(dontShowEmpty == "yes" && emptyList))
				wikify(wikifyThis,place,null,tiddler);

			forceReflow(); // fixes rendering issues. (but probably doubles up rendering time??)

		}
	}

});

