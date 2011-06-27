merge(config.macros,{
  processInbox: {
    handler: function(place,macroName,params,wikifier,paramString,tiddler) {

      var shortHand = {
        Action: {
          'W': 'Waiting For',
          'N': 'Next',
          'F': 'Future',
          'S': 'Starred'
        },
        Project: {
          'A': 'Active',
          'SM': 'Someday/Maybe',
          'S': 'Starred'
        }
      };

      wikify("Quick add projects and actions (See [[About Quick Add]] for more info):\n",place);
      var pi = createTiddlyElement(place,"textarea",null,"piBox");

      wikify("\n",place);

      var a1 = createTiddlyCheckbox(place,"Open created projects",true,null);
      a1.id = 'piShowProjects';

      var a2 = createTiddlyCheckbox(place,"Open created actions",true,null);
      a2.id = 'piShowActions';

      wikify("\n",place);

      var btn = createTiddlyButton(place,"quick add now","create these items",function(e) {
        var lines = pi.value.split("\n");
        var currentProject = "";
        var displayThese = [];

        for (var i=0;i<lines.length;i++) {

          var fields_and_text = lines[i].trim().split(/[|;]{2}/); // anything after || is to become tiddler content


          var fields = fields_and_text[0].trim().split(/[|;]/);
          var tiddlerText = fields_and_text[1];


          if (!fields[0] || fields[0].trim() == "") {
            currentProject = "";
          }
          else {

            var title = fields.shift();
            //alert(title);

            // add the realm
            fields.push(config.macros.mgtdList.getRealm());

            if (title.substr(0,1) != '.') {

              //alert("project "+title);

              currentProject = title;

              if (document.getElementById('piShowProjects').checked)
                displayThese.push(title);

              fields.push("Project"); // make it a project
              //fields.push("Active"); // make it active

              if (!fields.containsAny(['SM','A']))
                fields.push('A');

              fields = fields.map(function(f) {
                if (shortHand['Project'][f])
                  return shortHand['Project'][f];
                else
                  return f;
              });

              if (store.tiddlerExists(title))
                alert("Warning: '"+title+"' already exists, did not create");
              else
                store.saveTiddler(
                  title,title,
                  tiddlerText ? tiddlerText : "", // content
                  config.options.txtUserName,
                  new Date(),
                  fields, // tags
                  null // extra fields
                );
            }
            else {
              //alert("action "+title);

              // default to next actions
              if (!fields.containsAny(['N','F','W']))
                fields.push('N');

              fields = fields.map(function(f) {
                if (shortHand['Action'][f])
                  return shortHand['Action'][f];
                else
                  return f;
              });

              //alert("action "+title);
              title = title.trim();
              title = title.replace(/^\.+/,'');

              // If the action is already existing
              // let's presume that we want to create it as a unique action.
              // Use some code from NewMeansNewPlugin.
              if (config.macros.newTiddler.getName)
                title = config.macros.newTiddler.getName(title);

              if (document.getElementById('piShowActions').checked)
                displayThese.push(title);

              fields.push("Action"); // make it an action
              if (currentProject.trim() != "")
                fields.push(currentProject); // make it in this project

              // these should be configurable
              var automagicContexts = {
                'Call':'call',
                'Errand':'buy'
              };
              for (amc in automagicContexts) {
                var checkExists = store.fetchTiddler(amc);
                var startString = automagicContexts[amc];
                if (title.substr(0,startString.length).toLowerCase() == startString && checkExists && checkExists.hasTag('Context')) {
                  fields.push(amc);
                }
              }

              if (store.tiddlerExists(title))
                alert("Warning: '"+title+" already exists, did not create");
              else
                store.saveTiddler(
                  title,title,
                  tiddlerText ? tiddlerText : "", // content
                  config.options.txtUserName,
                  new Date(),
                  fields, // tags
                  null // extra fields
                );
            }
          }
        }

        for (var ii=0;ii<displayThese.length;ii++)
          story.displayTiddler("bottom",displayThese[ii]);

        displayMessage("Quick add items created");

        // Clear the quick add text area and close the slider. (jQuery anyone?)
        jQuery(pi).val('');
        jQuery(pi).closest('.sliderPanel').hide();

        return false;
      }); // end of createTiddlyButton

      // A button to clear the textarea
      createTiddlyButton(place,"clear","Clear text",function(){ jQuery(pi).val(''); });

      // A button to close the slider
      createTiddlyButton(place,"close","Close Quick Add",function(){ jQuery(pi).closest('.sliderPanel').hide(); });

    }
  }
});
