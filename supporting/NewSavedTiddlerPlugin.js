config.macros.newSavedTiddler={};
config.macros.newSavedTiddler.handler = function(place,macroName,params,wikifier,paramString,tiddler) {
	if (readOnly) {
		return false;
	}
	var p = paramString.parseParams("anon",null,true,false,false);
	var label = getParam(p,"label","NewSavedTiddler");
	var tooltip = getParam(p,"tooltip","");
	//
	// if no tooltip specified, try prompt, title, label
	//
	if (!tooltip) {
		var tPrompt = getParam(p,"prompt","");
		var title  = getParam(p,"title","");
		var label  = getParam(p,"label","");
		if (tPrompt) {
			tooltip = tPrompt;
		}
		else if (title) {
			tooltip = 'Create a ' + title;
		}
		else if (label) {
			tooltip = 'Create a ' + label;
		}
		else {
			tooltip = 'Create a new saved tiddler';
		}
	}
	var btn = createTiddlyButton(place,label,tooltip,this.onClick);
	btn.params = paramString;
	return false;
};

config.macros.newSavedTiddler.onClick = function(e) {
	var p = this.params.parseParams("anon",null,true,false,false);
	var titlePrompt = getParam(p,"prompt","");
	//
	// if no titlePrompt for the popup, try using the title or label fields
	// to personalize the prompt
	//
	if (!titlePrompt) {
		var titleT = getParam(p,"title","");
		var labelT = getParam(p,"label","");
		if (titleT) {
			titlePrompt = 'Enter name for ' + titleT + ":";
		}
		else if (labelT) {
			titlePrompt = 'Enter name for ' + labelT + ":";
		}
		else {
			// default prompt
			titlePrompt = 'Enter name for new tiddler:';
		}
	}
	var title = prompt(titlePrompt,"");
	if (title) {
		if (typeof config.macros.newTiddler.getName == "function")  {
			title = config.macros.newTiddler.getName(title); // from NewMeansNewPlugin
		}
		var text = getParam(p,"text","");
		var tags = getParam(p,"tag","");
		var fields = getParam(p,"fields","").decodeHashMap();
		tags = tags.replace(/\[\(/g,'[[');
		tags = tags.replace(/\)\]/g,']]');

                // Oveek: a fix for TiddlyWeb
                // http://groups.google.com/group/TiddlyWikiDev/browse_thread/thread/edff49f9a9e9f47b/e02cb3c4ba88f819?pli=1
                merge(fields, config.defaultCustomFields, true); 

		var tiddler = store.saveTiddler(title,title,text,config.options.txtUserName,new Date(),tags,fields);
		autoSaveChanges(null,[tiddler]);
		story.displayTiddler(this,title);
	}
	return false;
}

