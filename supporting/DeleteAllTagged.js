/***
|Name|DeleteAllTaggedPlugin|
|Based on|http://ido-xp.tiddlyspot.com/#DeleteAllTaggedPlugin|
|Version|MGTD Hacked|

An adaptation of DeleteDoneTasks (Simon Baird) by Ido Magal
To use this insert {{{<<deleteAllTagged>>}}} into the desired tiddler.

Modified quite a bit by Simon for MonkeyGTD
Now only works with MgtdIndexedTags...

Example usage:
{{{<<deleteAllTagged>>}}}
<<deleteAllTagged>>
***/
//{{{

config.macros.deleteAllTagged = {
	handler: function ( place,macroName,params,wikifier,paramString,tiddler ) {
		var buttonTitle = params[0] ? params[0] : "Delete tiddlers tagged '"+tiddler.title+"'"; // simon's tweak
		var tagToDelete = params[1] ? params[1] : tiddler.title;
		var alsoDeleteThisTiddler = params[2] ? params[2] : "";
		var tagExpr = params[3] ? params[3] : tagToDelete;
		var whereExpr = params[4] ? params[4] : "true";
		createTiddlyButton( place, buttonTitle, "Delete every tiddler tagged with '"+tiddler.title+"'",
			this.deleteAllTagged( tagToDelete, alsoDeleteThisTiddler == "delete", tagExpr, whereExpr ));
	},

	deleteAllTagged: function(tag,deleteMe,tagExpr,whereExpr) {
		return function() {
			var collected = fastTagged(tag).filterByTagExpr('[['+tagExpr+']]').filterByEval(whereExpr).toTitleList();
			if (collected.length == 0) {
				alert( "None found." );
			}
			else {
				if (confirm( "Found these tiddlers:\n'"
						+ collected.join( "', '" ) + "'\n\n\n"
						+ "Are you sure you want to delete these?" )) {
					store.suspendNotifications();
					for ( var i=0;i<collected.length;i++ ) {
						store.removeTiddler( collected[i] );
						story.closeTiddler( collected[i], true );
						displayMessage( "Deleted '"+collected[i]+"'" );
					}
					store.resumeNotifications();
				}
			}
			if (deleteMe) {
				if (confirm("Also delete this tiddler, '"+tag+"'?")) {
					store.removeTiddler( tag );
					story.closeTiddler( tag, true );
					displayMessage( "Deleted '"+tag+"'" );
				}
			}
		}
	}
};

//}}}

