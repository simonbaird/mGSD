/***
|''Name:''|DatePickerLibrary|
|''Description:''|DatePicker library for use with macros|
|''Author:''|Saq Imtiaz ( lewcid@gmail.com )|
|''Code Repository:''|http://svn.tiddlywiki.org/Trunk/contributors/SaqImtiaz/libraries/DatePicker.js|
|''Version:''|0.9|
|''Date:''|06/04/2007|
|''License:''|[[Creative Commons Attribution-ShareAlike 3.0 License|http://creativecommons.org/licenses/by-sa/3.0/]]|
|''~CoreVersion:''|2.3.0|
***/

// /%
//!BEGIN-PLUGIN-CODE
//{{{
function $id(n) {
	return document.getElementById(n);
}

DatePicker = {
	
	days : ['S','M','T','W','T','F','S'],
		
	cells : new Array(42),
	
	setup : function(){
		var cte = createTiddlyElement;
		var table = this.table = cte(null,"table","datePickerTable");
		table.style.display = 'none';
        document.body.appendChild(table);
		var thead = cte(table,"thead");
		var hRow = cte(thead,"tr");
		hRow.onclick = stopEvent;
		cte(hRow,"td",null,"datePickerNav","<<").onclick = DatePicker.prevm;
		cte(hRow,"td","datePickerMNS",null,null,{colSpan:"5"});
		cte(hRow,"td",null,"datePickerNav",">>",{align:"right"}).onclick=DatePicker.nextm; 
		
		var tbody = cte(table,"tbody","datePickerTableBody");
		var dayRow = cte(tbody,"tr",null,"datePickerDaysHeader");
		
		for (var i=0; i<this.days.length; i++){
			cte(dayRow,"td",null,null,this.days[i]);
		}      
	},
	
	show : function(el,dateObj,cb) {
		var me = DatePicker;
		var now = me.now = new Date();
		if (!dateObj)
			dateObj = now;
		me.root = el;
		if (cb)
			me.root.datePickerCallback = cb;
		me.scc = { m : now.getMonth(), y : now.getFullYear(), d : now.getDate() };
				
		Popup.place(el,me.table,{x:0,y:1});

		
		var cur = [dateObj.getDate(),dateObj.getMonth()+1,dateObj.getFullYear()];

		me.cc = { m : cur[1]-1, y : cur[2] };
		me.sd = { m : cur[1]-1, y : cur[2], d : cur[0] };   
		me.fillCalendar(cur[0],me.scc.d,cur[1]-1,cur[2]);
	},
	
	fillCalendar : function(hd,today,cm,cy) {
		var me = DatePicker;
		
		var sd = me.now.getDate();
		var td = new Date(cy,cm,1)
		var cd = td.getDay();

		$id('datePickerMNS').innerHTML = td.formatString('MMM YYYY')
		
		var tbody = $id('datePickerTableBody');
		removeChildren(tbody);
		var dowRow = createTiddlyElement(tbody,"tr",null,"datePickerDowRow");

		for (var d=0;d<=7;d++) {
			// dow headings
			createTiddlyElement(dowRow,"td",null,null,DatePicker.days[d]);
		}
		
		var days = (new Date(cy, cm+1, 0)).getDate();
		var day = 1;
		for (var j=1;j<=6;j++) { //rows
			var row = createTiddlyElement(tbody,"tr",null,"datePickerDayRow");
			for (var t=1; t<=7; t++) { //cells
				var d = 7 * (j-1) - (-t); //id key      
				if ( (d >= (cd -(-1))) && (d<=cd-(-(days))) ) {
					var dip = ( ((d-cd < sd) && (cm == me.scc.m) && (cy == me.scc.y)) || (cm < me.scc.m && cy == me.scc.y) || (cy < me.scc.y) );
					var htd = ( (hd != '') && (d-cd == hd) );
					var hToday = ( (today != '') && (d-cd == today) && cy == me.scc.y && cm == me.scc.m );
					if (htd)
						_class = 'highlightedDate';                
					else if (dip)
						_class = 'oldDate';
					else if (hToday && ! htd)
						_class = 'todayDate';
					else
						_class = 'defaultDate';
					if (t == 1 || t == 7) {
						// weekend
						_class += ' weekend';
					}
					var cell = createTiddlyElement(row,"td","datePickerDay"+d,_class,d-cd);
					cell.onmouseover = function(e){addClass(this,'tdover');};
					cell.onmouseout = function(e){removeClass(this,'tdover');};
					cell.onclick = me.selectDate;
					me.cells[d] = new Date(cy,cm,d-cd);
				}
				else {
					var cell = createTiddlyElement(row,"td","datePickerDay"+d,"emptyDate");
				}
				day++;
			}
			if(day > days + cd)
				break;
		} 
	},
	
	nextm : function() {
		var me = DatePicker;        
		me.cc.m += 1;
		if (me.cc.m >= 12) {
			me.cc.m = 0;
			me.cc.y++;
		}
		me.fillCalendar(me.getDayStatus(me.cc.m,me.cc.y),me.scc.d,me.cc.m,me.cc.y);
		return false;
	},
	
	prevm : function() {
		var me = DatePicker;
		me.cc.m -= 1;
		if (me.cc.m < 0) {
			me.cc.m = 11;
			me.cc.y--;
		}
		me.fillCalendar(me.getDayStatus(me.cc.m,me.cc.y),me.scc.d,me.cc.m,me.cc.y);
		return false;
	},
	
	getDayStatus : function(ccm,ccy){
		return (ccy == this.sd.y && ccm == this.sd.m)? this.sd.d : '';
	},
	
	selectDate : function(ev){
		var e = ev ? ev : window.event;
		var me = DatePicker;
		var date = me.cells[resolveTarget(e).id.substring(13,resolveTarget(e).id.length)];
		if (me.root.datePickerCallback && typeof me.root.datePickerCallback == 'function')
			me.root.datePickerCallback(me.root,date);
		$id('datePickerTable').style.display = 'none';
		return false;
	},
	
	onclick : function(ev){
		$id("datePickerTable").style.display = 'none';
		return false;
	},
	
	create : function(el,dateObj,cb){
		el.onclick = el.onfocus = function(e){DatePicker.show(el,dateObj,cb);stopEvent(e)};
	},
	
	css: "table#datePickerTable td.datePickerNav {\n"+
		"    cursor:pointer;\n"+
		"}\n"+
		"\n"+
		".datePickerDaysHeader td {\n"+
		"    text-align:center;\n"+
		"    background:#ABABAB;\n"+
		"    font:12px Arial;\n"+
		"}\n"+
		"\n"+
		".datePickerDayRow td {\n"+
		"    width:18px;\n"+
		"    height:18px;\n"+
		"}\n"+
		"\n"+
		"td#datePickerMNS, td.datePickerNav {\n"+
		"    font:bold 13px Arial;\n"+
		"}\n"+
		"\n"+
		"table#datePickerTable {\n"+
		"    position:absolute;\n"+
		"    border-collapse:collapse;\n"+
		"    background:#FFFFFF;\n"+
		"    border:1px solid #ABABAB;\n"+
		"    display:none;   \n"+
		"}\n"+
		"\n"+
		"table#datePickerTable td{\n"+
		"    padding: 3px;\n"+
		"}\n"+
		"\n"+
		"td#datePickerMNS {\n"+
		"    text-align: center;\n"+
		"}\n"+
		"\n"+
		"tr.datePickerDayRow td {\n"+
		"    background-color : #C4D3EA;\n"+
		"    cursor : pointer;\n"+
		"    border : 1px solid #6487AE;\n"+
		"    text-align : center;\n"+
		"	font : 10px Arial;\n"+
		"}\n"+
		"\n"+
		"tr.datePickerDayRow td.defaultDate {\n"+
		"	color : #333333;	\n"+
		"	text-decoration : none;   \n"+
		"}\n"+
		"\n"+
		"tr.datePickerDayRow td.emptyDate {\n"+
		"    cursor:default; \n"+
		"}\n"+
		"\n"+
		"tr.datePickerDayRow td.oldDate {\n"+
		"	color : #ABABAB;\n"+
		"    text-decoration : line-through;\n"+
		"}\n"+
		"\n"+
		"tr.datePickerDayRow td.highlightedDate {\n"+
		"    background : #FFF799;\n"+
		"	font-weight : bold;\n"+
		"	color : #333333;\n"+
		"}\n"+
		"\n"+
		"tr.datePickerDayRow td.todayDate {\n"+
		"	font-weight : bold;\n"+
		"	color : red;\n"+
		"}\n"+
		"\n"+
		"table#datePickerTable tr.datePickerDayRow td.tdover {\n"+
		"    background:#fc6;\n"+
		"}",
	
	init : function(){
		this.setup();
		addEvent(document,'click',DatePicker.onclick);
		config.shadowTiddlers['StyleSheetDatePicker'] = this.css;
		if(store)
			store.addNotification('StyleSheetDatePicker',refreshStyles);
	}
};

DatePicker.init();
//}}}
//!END-PLUGIN-CODE
// %/
