// Created by Saq. Taken from tw.lewcid.org

config.macros.toggleSideBar={};

config.macros.toggleSideBar.settings={
         styleHide :  "#sidebar { display: none;}\n"+"#contentWrapper #displayArea { margin-right: 1em;}\n"+"",
         styleShow : " ",
         arrow1: "<<",
         arrow2: ">>"
         //arrow1: "«",
         //arrow2: "»"
};

config.macros.toggleSideBar.handler=function (place,macroName,params,wikifier,paramString,tiddler)
{
          var tooltip= params[1]||'toggle sidebar';
          var mode = (params[2] && params[2]=="hide")? "hide":"show";
          var arrow = (mode == "hide")? this.settings.arrow1:this.settings.arrow2;
          var label= (params[0]&&params[0]!='.')?params[0]+" "+arrow:arrow;
          var theBtn = createTiddlyButton(place,label,tooltip,this.onToggleSideBar,"button HideSideBarButton");
          if (mode == "hide")
             { 
             (document.getElementById("sidebar")).setAttribute("toggle","hide");
              setStylesheet(this.settings.styleHide,"ToggleSideBarStyles");
             }
};

config.macros.toggleSideBar.onToggleSideBar = function(){
          var sidebar = document.getElementById("sidebar");
          var settings = config.macros.toggleSideBar.settings;
          if (sidebar.getAttribute("toggle")=='hide')
             {
              setStylesheet(settings.styleShow,"ToggleSideBarStyles");
              sidebar.setAttribute("toggle","show");
              this.firstChild.data= (this.firstChild.data).replace(settings.arrow1,settings.arrow2);
              }
          else
              {    
               setStylesheet(settings.styleHide,"ToggleSideBarStyles");
               sidebar.setAttribute("toggle","hide");
               this.firstChild.data= (this.firstChild.data).replace(settings.arrow2,settings.arrow1);
              }

     return false;
}

