
merge(config.macros, {
  eval: {
    handler: function(place,macroName,params,wikifier,paramString,tiddler) {
      wikify(eval(paramString),place,null,tiddler);
    }
  }
});
