
merge(Array.prototype,{

  each: function(func) {
    for (var i=0;i<this.length;i++)
      func(this[i]);
  },

  // TODO, there is a map in the core now. Is it same as this or different?
  map: function(func) {
    var result = [];
    this.each(function(item) {
      result.push(func(item));
    });
    return result;
  },

  select: function(func) {
    var result = [];
    this.each(function(item) {
      if (func(item))
        result.push(item);
    });
    return result;
  },

  reject: function(func) {
    var result = [];
    this.each(function(item) {
      if (!func(item))
        result.push(item);
    });
    return result;
  }

});

//------------------------------------------

merge(String.prototype,{

  parseTagExpr: function(debug) {

    if (this.trim() == "")
      return "(true)";

    var logicOps = /(!|&&|\|\||\(|\))/g;

    var spaced = this.
      // because square brackets in templates are no good
      // this means you can use [(With Spaces)] instead of [[With Spaces]]
      replace(/\[\(/g," [[").
      replace(/\)\]/g,"]] ").
      // space things out so we can use readBracketedList. tricky eh?
      replace(logicOps," $1 ");


    var expr = "";

    var tokens = spaced.readBracketedList(false); // false means not unique. nice one JR!

    tokens.each(function(tok) {

      if (tok.match(logicOps)) {
        expr += tok;
      }
      else if (tok.match(/^parent:/)) {
        // experimental
        var lookForTagInParent = tok.split(":")[1];
        expr += "tiddler.parents().anyHasTag('"+lookForTagInParent+"')";
      }
      else {
        expr += "tiddler.tags.contains('%0')".format([
            // fix single quote bug. hurrah
            // but still have nasty round bracket bug
            tok.replace(/'/,"\\'")
          ]);
      }
    });

    if (debug)
      alert(expr);

    return '('+expr+')';
  }

});

merge(Tiddler.prototype,{

  matchesEvalExpr: function(evalExpr) {
    var tiddler = this;
    return eval(evalExpr);
  },

  matchesTagExpr: function(tagExpr) {
    return this.matchesEvalExpr(tagExpr.parseTagExpr());
  },

  olderThanDays: function(days) {
    return this.modified.getTime() < (new Date()).getTime() - days*1000*60*60*24;
  }

});

//------------------------------------

merge(Tiddler.prototype,{

  render: function(method,renderOptions) {
    var renderMethod = "render_"+method;
    if (this[renderMethod])
      return this["render_"+method](renderOptions);
    else
      return "*** cant render "+renderMethod+" ***";
  },

  renderUtil: function(formatString,formatValues) {
    return formatString.format(formatValues);
  },

  sorter: function(field) {
    var sortMethod = "sort_"+field;
    if (this[sortMethod])
      return this[sortMethod]();
    else
      return this[field];
  },

  sorterUtil: function(otherTiddler,method) {
    var desc = false;

    if (method.substring(0,1) == "-") {
      desc = true;
      method = method.substring(1);
    }

    if (this.sorter(method) > otherTiddler.sorter(method))
      return (desc ? -1 : +1);
    else if (this.sorter(method) < otherTiddler.sorter(method))
      return (desc ? +1 : -1);
    else
      return 0;
  }

});

merge(String.prototype,{
  sorterUtil: function(otherTiddler,method) {

    var t1 = store.getTiddler(this);
    var t2 = store.getTiddler(otherTiddler);

    if (method.substring(0,1) == "-") {
      desc = true;
    }

    if (t1 && t2)
      return t1.sorterUtil(t2,method);
    // this part is a little flakey but I'm aiming to
    // put the None heading last in all cases
    else if (t2)
      return +1;
    else if (t1)
      return -1;
    else {
      // neither exist as tiddlers might as well compare strings
      if (this < otherTiddler)
        return (desc ? +1 : -1);
      else if (this > otherTiddler)
        return (desc ? -1 : +1);
      else
        return 0;
    }
  }
});

//------------------------------------------

merge(Array.prototype,{

  // returns a hash
  groupBy_hash: function(func) {
    var result = {};
    var leftOverGroup = '__NONE__';
    this.each(function(item) {
      var groups = func(item);
      if (groups.length > 0) {
        groups.each(function(group) {
          if (!result[group])
            result[group] = [];
          result[group].push(item);
        });
      }
      else {
        if (!result[leftOverGroup])
          result[leftOverGroup] = [];
        result[leftOverGroup].push(item);
      }
    });
    return result;
  },

  // returns an array of arrays, like Hash#sort in ruby
  groupBy: function(func,itemSort,groupSort) {

    if (!itemSort) itemSort = "title";
    if (!groupSort) groupSort = "-title";

    var result = this.groupBy_hash(func);
    var sortedResult = [];
    for (var g in result)
      sortedResult.push([g,result[g].sort(function(a,b){return a.sorterUtil(b,itemSort);})]);
    return sortedResult.sort(function(a,b){return a[0].sorterUtil(b[0],groupSort);});
  },

  // for convenience since it's mostly what we want
  groupByTag: function(tag,itemSort,groupSort) {
    return this.groupBy(function(t){return t.getByIndex(tag);},itemSort,groupSort);
  }

});

//------------------------------------------

// for lists of tiddlers
merge(Array.prototype,{

  filterByEval: function(evalExpr) {
    return this.select(function(t) {
      return t.matchesEvalExpr(evalExpr);
    });
  },

  filterByTagExpr: function(tagExpr) {
    return this.filterByEval(tagExpr.parseTagExpr());
  },

  filterGroupsByEval: function(evalExpr) {
    // presumes the group name is a tiddler
    return this.select(function(tGroup) {
      var tiddler = store.getTiddler(tGroup[0]);
      return tiddler && tiddler.matchesEvalExpr(evalExpr);
    });
  },

  filterGroupsByTagExpr: function(tagExpr) {
    return this.filterGroupsByEval(tagExpr.parseTagExpr());
  },

  render: function(renderMethod,renderOptions) {
    return this.map(function(tiddler){
      return tiddler.render(renderMethod,renderOptions);
    }).join("\n");
  },

  renderGrouped: function(listRenderMethod,headingRenderMethod,noneHeading,renderOptions,groupCountOnly,nbTags) {
    // do I ever use renderOptions??
    // this lost some elegance when I shoehorned the groupCountOnly part in. todo refactor
    // then lost some more with the nbTags addition...
    // might need some reworking
    var result = "";
    this.each(function(g) {
      var groupName = g[0];
      var groupItems = g[1];

      var showCount = "";
      if (groupCountOnly && groupCountOnly != "")
        showCount = groupItems.length > 0 ? " ("+groupItems.length+")" : "";

      var makeHeading = (groupCountOnly&&groupCountOnly!="") ? "" : "!!";
      var newButtonMarkup = "";

      // this sucks
      if (nbTags && nbTags != '') {
        newButtonMarkup = " "+config.macros.mgtdList.getNewButton(nbTags + " [["+groupName+"]]");
      }

      if (groupName == "__NONE__") {
        result = result + makeHeading + "{{noneHeading{[[("+(noneHeading?noneHeading:"No "+headingRenderMethod)+")]]}}}"+showCount+"\n";
      }
      else {
        var gTiddler = store.getTiddler(groupName);
        if (gTiddler) {
          result = result + makeHeading+gTiddler.render(headingRenderMethod)+showCount+newButtonMarkup+"\n";
        }
        else {
          result = result + makeHeading+"[["+groupName+"]]"+showCount+newButtonMarkup+"\n";
        }
      }
      if (!groupCountOnly || groupCountOnly == "")
        result = result + groupItems.render(listRenderMethod,renderOptions) + "\n";
    });

    if (groupCountOnly && groupCountOnly != "")
      result = result.replace(/\n$/,''); // hack. remove trailing linefeed

    return result;
  },

  tiddlerSort: function(sortBy) {
    return this.sort(function(a,b) { return a.sorterUtil(b,sortBy); });
  },

  toTitleList: function() {
    return this.map(function(t){return t.title;});
  }


});

//------------------------------------------


