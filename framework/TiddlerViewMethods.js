
// for displaying tiddlers in lists

// idea: use <<tiddler with:?>>

if (!config.mGTD) config.mGTD = {};

config.mGTD.data = {
  starOn:    'data:image/gif;base64,R0lGODlhDwAPAMQfAF9h4RYVnZeQJC0u0lRQU42R6P/7Fv74L05NrRkZxi4tW52XXv71D8nAIWxnjnRxr3NuMJKOluXbBe7kCa2x7UFD1vPoB77D8Jqe6n6B5tvTUr62BMrP8lJPh1xbuv///yH5BAEAAB8ALAAAAAAPAA8AAAWD4CeOWQKMaDpESepi3tFlLgpExlK9RT9ohkYi08N8KhWP8nEwMBwIDyJRSTgO2CaDYcBOCAlMgtDYmhmTDSFQ+HAqgbLZIlAMLqiKw7m1EAYuFQsGEhITEwItKBc/EgIEAhINAUYkCBIQAQMBEGonIwAKa21iCgo7IxQDFRQjF1VtHyEAOw==',
  starOff:   'data:image/gif;base64,R0lGODlhDwAPALMPAP///8zj++r7/7vb/rHW/tPt/9Lk+qzT/rbY/sHh/8Te/N7q+Nzy/7nY/djn+f///yH5BAEAAA8ALAAAAAAPAA8AAARg8MkZjpo4k0KyNwlQBB42MICAfEF7APDRBsYzIEkewGKeDI1DgUckMg6GTdFIqC0QgyUgQVhgGkOi4OBBCJYdzILAywIGNcoOgCAQvowBRpE4kgzCQgPjQCAcEwsNTRIRADs=',

  unicodeStar: "\u2605" // "black star"
};


merge(Tiddler.prototype,{

  render_Action: function() { return this.renderUtil(
    '{{action{'+
    '<<toggleTag Done [[%0]] ->>'+
    '<<multiToggleTag tag:ActionStatus title:[[%0]]>>'+
    //'<<multiSelectTag tag:Project title:[[%0]]>>'+
    //'<<multiCheckboxTag tag:ActionStatus title:[[%0]]>>'+
    '<<singleToggleTag tag:Starred title:[[%0]]>>'+
    ' &nbsp;[[%0]] '+
    '<<deleteTiddler [[%0]]>>'+
    '}}}'+
    '{{notesLink{<<showNotesIcon [[%0]]>>}}}',
    [
      this.title
    ]
  );},

  render_Tickler: function() {
    var repeatType = this.getByIndex('TicklerRepeatType');
    var doneControl = "";
    if (repeatType.length == 0 || repeatType.contains('Once')) {
      // show normal done checkbox
      doneControl = '<<toggleTag Actioned [[%0]] ->>';
    }
    else if (repeatType.contains('Daily'))       { doneControl = '<<addDay [[%0]]>>' }
    else if (repeatType.contains('Weekly'))      { doneControl = '<<addWeek [[%0]]>>' }
    else if (repeatType.contains('Fortnightly')) { doneControl = '<<addFortnight [[%0]]>>' }
    else if (repeatType.contains('Monthly'))     { doneControl = '<<addMonth [[%0]]>>' }
    else if (repeatType.contains('Yearly'))      { doneControl = '<<addYear [[%0]]>>' }

    var pLink = "";
    if (config.mGTD.getOptChk('FullContactInActionLists')) {
      pLink += "{{projLinkFull{<<linkToParent Project [[title]] [[%0]]>>}}}".format([this.title]);
    }
    else {
      pLink += "{{projLink{<<linkToParent Project '[P]' [[%0]]>>}}}".format([this.title]);
    }

    return this.renderUtil(
    '{{tickler{'+
        '%1'+
    '<<singleToggleTag tag:Starred title:[[%0]]>>'+
    '<<dateChooser [[%0]]>>'+
    '&nbsp;[[%0]]'+
    '<<deleteTiddler [[%0]]>>'+
    '}}}'+
    '{{notesLink{<<showNotesIcon [[%0]]>>}}}'+
    ' %2',
    [
      this.title,
            doneControl.format([this.title]),
      pLink
    ]
  );},

  render_Project: function() { return this.renderUtil(
    '{{project{'+
    '<<toggleTag Complete [[%0]] ->>'+
    '<<multiToggleTag tag:ProjectStatus title:[[%0]]>>'+
    //'<<multiSelectTag tag:Project title:[[%0]]>>'+
    //'<<multiCheckboxTag tag:ActionStatus title:[[%0]]>>'+
    '<<singleToggleTag tag:Starred title:[[%0]]>>'+
    ' &nbsp;[[%0]] }}}'+
    '{{notesLink{<<showNotesIcon [[%0]]>>}}}'+
    "{{projLink{<<linkToParent Project '[P]' [[%0]]>>}}}"+
    "{{projLink{<<linkToParent Contact '[C]' [[%0]]>>}}}"+
    "",
    [
      this.title
    ]
  );},

  render_ProjectArea: function() {
    var aLink = "";
      return this.renderUtil(
    '{{project{'+
    '<<toggleTag Complete [[%0]] ->>'+
    '<<multiToggleTag tag:ProjectStatus title:[[%0]]>>'+
    //'<<multiSelectTag tag:Project title:[[%0]]>>'+
    //'<<multiCheckboxTag tag:ActionStatus title:[[%0]]>>'+
    '<<singleToggleTag tag:Starred title:[[%0]]>>'+
    ' &nbsp;[[%0]] }}}'+
    '{{notesLink{<<showNotesIcon [[%0]]>>}}}'+
    "{{projLink{<<linkToParent Area    '[A]' [[%0]]>>}}}"+
    "{{projLink{<<linkToParent Project '[P]' [[%0]]>>}}}"+
    "{{projLink{<<linkToParent Contact '[C]' [[%0]]>>}}}"+
    "",
    [
      this.title,
      aLink
    ]
  );},


  render_ProjectBare: function() { return this.renderUtil(
    '{{project{'+
    '<<singleToggleTag tag:Starred title:[[%0]]>>'+
    '&nbsp;[[%0]] }}}'+
    '{{notesLink{<<showNotesIcon [[%0]]>>}}}',
    [
      this.title
    ]
  );},

  render_ProjectComplete: function() { return this.renderUtil(
    '{{project{'+
    '<<toggleTag Complete [[%0]] ->>'+
    '<<singleToggleTag tag:Starred title:[[%0]]>>'+
    '&nbsp;[[%0]] }}}'+
    '{{notesLink{<<showNotesIcon [[%0]]>>}}}',
    [
      this.title
    ]
  );},


  render_ActionProj: function() {

    // actually it's not going to be easy to have
    // an action in more than one project
    // but just in case....
    var pLink = "";
    if (config.mGTD.getOptChk('FullAreaInActionLists')) {
      pLink += "{{projLinkFull{<<linkToParent Area [[title]] [[%0]]>>}}}".format([this.title]);
    }
    else {
      pLink += "{{projLink{<<linkToParent Area '[A]' [[%0]]>>}}}".format([this.title]);
    }

    if (config.mGTD.getOptChk('FullProjectInActionLists')) {
      pLink += "{{projLinkFull{<<linkToParent Project [[title]] [[%0]]>>}}}".format([this.title]);
    }
    else {
      pLink += "{{projLink{<<linkToParent Project '[P]' [[%0]]>>}}}".format([this.title]);
    }

    if (config.mGTD.getOptChk('FullContactInActionLists')) {
      pLink += "{{projLinkFull{<<linkToParent Contact [[title]] [[%0]]>>}}}".format([this.title]);
    }
    else {
      pLink += "{{projLink{<<linkToParent Contact '[C]' [[%0]]>>}}}".format([this.title]);
    }

    return this.renderUtil(
    '{{action{'+
    '<<toggleTag Done [[%0]] ->>'+
    '<<multiToggleTag tag:ActionStatus title:[[%0]]>>'+
    '<<singleToggleTag tag:Starred title:[[%0]]>>'+
    ' &nbsp;[[%0]]'+
    '<<deleteTiddler [[%0]]>>'+
    '}}}'+
    '{{notesLink{<<showNotesIcon [[%0]]>>}}}'+
    ' %1',
    [
      this.title,
      pLink
    ]
  );},

  render_DoneAction: function() { return this.renderUtil(
    '{{action{'+
    '<<toggleTag Done [[%0]] ->>'+
    '<<singleToggleTag tag:Starred title:[[%0]]>>'+
    ' [[%0]] '+
    '<<deleteTiddler [[%0]]>>'+
    '}}}'+
    '{{notesLink{<<showNotesIcon [[%0]]>>}}}',
    [
      this.title
    ]
  );},

  render_ProjectHeading: function() { return this.renderUtil(
    '{{project{'+
    '[[%0]] '+
    '<<toggleTag Complete [[%0]] ->>'+
    '@@font-size:80%;<<multiToggleTag tag:ProjectStatus title:[[%0]]>>@@'+
    '<<singleToggleTag tag:Starred title:[[%0]]>>'+
    '}}}',
    [
      this.title
    ]
  );},

  render_Context: function() { return this.renderUtil(
    '[[%0]]',
    [
      this.title
    ]
  );},

  render_plain: function() { return this.renderUtil(
    '{{plain{[[%0]]}}}',
    [
      this.title
    ]
  );},

  render_star: function() { return this.renderUtil(
    '{{plain{'+
    '<<singleToggleTag tag:Starred title:[[%0]]>>'+
    '[[%0]]}}}'+
    '{{notesLink{<<showNotesIcon [[%0]]>>}}}',
    [
      this.title
    ]
  );},


  // TODO. this seems stupid
  render_bold: function() { return this.renderUtil(
    "[[%0]]",
    [
      this.title
    ]
  );}


});
