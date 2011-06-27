// it works in view mode, that's why we can't just use edit macro
merge(config.macros, {
  mgtdEditField: {
    handler: function(place,macroName,params,wikifier,paramString,tiddler) {
      var fieldName = params[0];
      var useTiddler = tiddler;
      if (params[1])
        useTiddler = store.fetchTiddler(params[1]);
      var curVal = useTiddler.fields[fieldName] || '';
      var editBox = createTiddlyElement(place,'input',null,'editBox');
      editBox.value = curVal;
      var callback = function(){
        useTiddler.fields[fieldName] = this.value;
        useTiddler.touch(); // see MgtdDateUtils
      }
      editBox.onchange = callback;
    }
  }
});
