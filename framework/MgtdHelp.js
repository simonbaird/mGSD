
function wikifiedMessage(message) {
  wikify(message,getMessageDiv());
}

merge(config.macros,{

  help: {

    handler: function (place,macroName,params,wikifier,paramString,tiddler) {
      createTiddlyButton(place,"?","help",function() {
        var useThis = params[0]?params[0]:tiddler.title;
        var help = store.getTiddlerText("MonkeyGTDHelp##"+useThis);
        help = help?help:"//No help for <nowiki>"+useThis+"</nowiki>//";
        var helpContent = "{{help{\n''[[MonkeyGTD Documentation|http://www.tiddlywiki.org/wiki/MonkeyGTD]]''\n" +
          "!<nowiki>" + useThis + "</nowiki>\n" +
          help + "\n\n" +
          "[[More...|http://www.tiddlywiki.org/wiki/MonkeyGTD/"+useThis+"]]" +
          "\n}}}\n" +
          "";

        // doesn't work at all. I have no idea how to use TW popups apparently ...
        //var popup = Popup.create(place,"div","popupTiddler");
        //wikify(helpContent,popup,null,tiddler);
        //Popup.show();

        // stick with this for now
        clearMessage();
        wikifiedMessage(helpContent);

        return false;
      });
    }
  }

});
