//NOTES:  
//QC Tests:
//MULTIPLE POLYGONS (Calico) - 8945001992
//RPZ
//Parcel 2033250060 - eligible to obtain a parking permit for a Residential Parking Zone (future test - RPZ)
//Parcel 2033250030 - Residential Parking zone is either in the process of being proposed or is already existing (future test)
//No existing RPZ found (Green) - Parcel 2033250010
//PTAG Regulated (Gray) - 7735000040
//Not Eligible (Red-brown) - 2009090013

define([
        "esri/symbols/SimpleLineSymbol",
        "esri/symbols/SimpleFillSymbol",
        "esri/tasks/BufferParameters",
        "esri/tasks/query",
        "esri/tasks/QueryTask",
        "esri/SpatialReference",
        "esri/tasks/GeometryService", 
        "dojo/_base/array", 
        "dijit/form/Button",
        "dojo/dom",
        "dojo/_base/Color",
            'dojo/dnd/Moveable',  //start moveable info window
            'dojo/query',
            'dojo/on',
            'dojo/dom-style',
            'dojo/dom-class'

], function (
          SimpleLineSymbol,
          SimpleFillSymbol,
          BufferParameters,
          Query, QueryTask, SpatialReference,    
          GeometryService, 
          arrayUtils, 
          Button,  
          dom,
          Color,  
            Moveable,
            dQuery,
            on,
            domStyle,
            domClass

  ) {

        //Begin Setup - put into config file eventually
        clickIdentify = true;  //Toggle to false when using other click widgets (measure) 
        var map;
        var address = ""; //Current address
        var r = "";   // Retrieving report...

        //Contact information
        var contactInfo = "<div style='clear:both;'><p><b>To Volunteer | Para Ser Voluntario | Tình nguyện:</b> <br> <a href='mailto:CommunityCleanup@cityoftacoma.org'>CommunityCleanup@cityoftacoma.org</a> <br> </p></div>";  
        var closeButton = "";  //update depending on popup type (mobile vs desktop)
        var mobileSpacer = "<div style='width:100%; height:10px; padding-bottom:15px;'>&nbsp;</div>";   //blank space to cover up scrolled over text (doesn't cover 100%!!!)
        var candidate_location;  //current candidate location geometry  - location variable for both ESRI geocode and address match location
        //------------------------------------------------------------------------

        //Geometry Service - used to perform the buffer
        gsvc = new esri.tasks.GeometryService("https://gis.cityoftacoma.org/arcgis/rest/services/Utilities/Geometry/GeometryServer");

        //Current Parcel
        currentParcel="";

        //Buffer parcel parameters for additional queries
        paramsBuffer = new BufferParameters();
        paramsBuffer.distances = [ -2 ];  //inside buffer   - fix for narrow parcels like 5003642450
        paramsBuffer.bufferSpatialReference = new esri.SpatialReference({wkid: 102100});
        paramsBuffer.unit = esri.tasks.GeometryService["UNIT_FOOT"];

       //Buffer parcel parameters for RPZ Nearby query
        //paramsBuffer_RPZ = new BufferParameters();
        //paramsBuffer_RPZ.distances = [ 50 ];  //outside buffer
        //paramsBuffer_RPZ.bufferSpatialReference = new esri.SpatialReference({wkid: 102100});
        //paramsBuffer_RPZ.unit = esri.tasks.GeometryService["UNIT_FOOT"];

        //Query layer - parcel (base)
        var qtparcel = new QueryTask("https://gis.cityoftacoma.org/arcgis/rest/services/PDS/DARTparcels_PUBLIC/MapServer/3");
        var qparcel = new Query();
        
        //Query layer - Cleanup Areas  
        //var qtNCS = new QueryTask("https://services3.arcgis.com/SCwJH1pD8WSn5T5y/arcgis/rest/services/NCS_Cleanup_Areas/FeatureServer/0");  //2017
        //var qtNCS = new QueryTask("https://services3.arcgis.com/SCwJH1pD8WSn5T5y/ArcGIS/rest/services/NCS_Cleanup_Areas_2018/FeatureServer/0");  //2018
        var qtNCS = new QueryTask("https://services3.arcgis.com/SCwJH1pD8WSn5T5y/arcgis/rest/services/NCS_Cleanup_Areas_2019/FeatureServer/0");  //2019
        var qNCS = new Query();
            qparcel.returnGeometry = qNCS.returnGeometry = true;
            qparcel.outFields = qNCS.outFields = ["*"];  //return all fields

        //Parcel symbol
          var symbolParcel = new SimpleFillSymbol(
            SimpleFillSymbol.STYLE_NULL,
            new SimpleLineSymbol(
              SimpleLineSymbol.STYLE_SOLID,
              new Color([255,0,0]), 
              2
            ),new Color([255,255,0,0.25])
          );
          //This sample requires a proxy page to handle communications with the ArcGIS Server services. You will need to
          //replace the url below with the location of a proxy on your machine. See the 'Using the proxy page' help topic
          //for details on setting up a proxy page.
          //esri.config.defaults.io.proxyUrl = "/website/labels/proxy.ashx";
          //esri.config.defaults.io.alwaysUseProxy = false;

        //END Setup------------------------------------------------------------------------------------------------------------------

      var mjm_ClickReportFunctions = {

       newReport: function(currentMap, mapClick, SR) {
        map = currentMap;  //update map & close button
        candidate_location = mapClick; //reset for popup window 
        paramsBuffer.outSpatialReference = SR; //Update SR 
        //paramsBuffer_RPZ.outSpatialReference = SR; //Update SR 

        //Make map's infoWindow draggable/moveable if not a mobile popup -----------------------------------------
        //(https://jsfiddle.net/gavinr/cu8wL3b0/light/)

          //Determine if desktop or mobile popup being used
          if (map.infoWindow.domNode.className != "esriPopupMobile") {
            closeButton = "<div style='float:right;'><button dojoType='dijit/form/Button' type='button' onClick=\"document.getElementsByClassName('titleButton close')[0].click();\"><b>Close</b></button><br>&nbsp;</div>";
            var handle = dQuery(".title", map.infoWindow.domNode)[0];
            var dnd = new Moveable(map.infoWindow.domNode, {
                handle: handle
            });

              //When infoWindow moved, hide pointer arrow:
              on(dnd, 'FirstMove', function() {
                  // hide pointer and outerpointer (used depending on where the pointer is shown)
                  theNodes = [".outerPointer", ".pointer"];
                  arrayUtils.forEach(theNodes, function(theNode) {
                    var arrowNode =  dQuery(theNode, map.infoWindow.domNode)[0];
                       if (domStyle.get(arrowNode, "display") === "block") {
                        domStyle.set(arrowNode, "display", "none");  
                           //Reset infoWindow (put back pointer) when closed
                          var closeReset = dQuery(".titleButton.close", map.infoWindow.domNode)[0];
                            on(closeReset, 'click', function() {
                                     domStyle.set(arrowNode, "display", "");  //reset - blank will let it rebuild correctly on next open
                             }.bind(this));
                       };
                 });

              }.bind(this));
            } else {
              //Mobile popup
              closeButton = ""; //Don't use close button
              if (dQuery(".titleButton.arrow.hidden", map.infoWindow.domNode)[0] !== undefined) {
                //https://dojotoolkit.org/reference-guide/1.7/dojo/replaceClass.html
                domClass.replace(dQuery(".titleButton.arrow.hidden", map.infoWindow.domNode)[0], "", "hidden");  //Update mobile popup node class removing 'hidden'
              }
            } //end mobile popup check
       //---------------------------------------------------------------------------------------------------
        
	        if (clickIdentify){
	          //Only do if other click widgets (measure) are not being used
	          this.executeQueries(mapClick);  //need to be consistent with geocoders (sends map point)  
	        }
        },

        executeQueries: function(e) {
          this.cleanUp();
          qparcel.geometry = e;  // use the map click, geocode, or device location for the query geometry
          qtparcel.execute(qparcel, this.handleQueryParcel);  //query for a parcel at location
        },

        cleanUp: function() {
          map.graphics.clear(); //remove all graphics - buffer and points
          if (map.infoWindow.isShowing) {
           map.infoWindow.hide(); //Close existing popups
          }
        },
        
        handleQueryParcel: function(results) {
          currentParcel = "";  //clear out previous results
          parcel = results.features;
            //Parcel info 
            if (parcel.length>0) {
              //Parcel found - update address/parcel info
              var title = "Tacoma 2019 Community Cleanup";
              currentParcel = parcel[0].attributes["TaxParcelNumber"];
              address = "<div><b>Address | Dirección | Địa chỉ nhà:</b><br>&nbsp;" + parcel[0].attributes["Site_Address"]  + "</div>"; 
                address += "<div style='clear:both;' id='messages'></div>"; //place holder id='messages'for the rest of the query info - filled in by deferred functions
              
              //Use parcel geometry for RPP query - put results into 'messages' div
              paramsBuffer.geometries = [parcel[0].geometry];
              var bufferedGeometries = gsvc.buffer(paramsBuffer);  //BUFFER the parcel
                    //Using dojo deferred 'then' function to set callback and errback functions
                    bufferedGeometries.then(function(bufferedGeometries) {
                      //First Deferred - Parcel buffer results
                        qNCS.geometry = bufferedGeometries[0];  //Query with buffer polygon - use parcel inside buffer, not map click point
                        qtNCS.execute(qNCS, function(results) {  
                          //Second Deferred (execute) - Query with buffer polygon results
                          var r="";
                          var NCS_Message = "";
                          var NCSResults = results.features;
                              //update NCSResults info
                              if (NCSResults.length>0) {  //for each polygon in parcel
                                      arrayUtils.forEach(NCSResults, function(NCSResultsRec) { //loop through multiple records (just 1 now)
                                        NCS_Message += "<div style='clear:both;'></div>";
                                        NCS_Message += "<div>";
                                        //http://dojotoolkit.org/reference-guide/1.10/dojo/date/locale/format.html
                                        NCS_Message += "<b>Date | Fecha | tháng ngày năm: </b><br>&nbsp;<span style='background-color:yellow;'>" + NCSResultsRec.attributes.Date__Fecha__ngày_tháng_năm_ + "</span><br>";
                                        NCS_Message += "<b>Time | Hora | Mấy giờ: </b><br>&nbsp;<span style='background-color:yellow;'>" + NCSResultsRec.attributes.Time__Hora__Mấy_giờ + "</span><br>";
                                        NCS_Message += "<b>Location | Ubicación | Ở: </b><br>&nbsp;<span style='background-color:yellow;'>" + NCSResultsRec.attributes.Location__Locación___Ở + "</span><br>";
                                        //https://developers.google.com/maps/documentation/urls/guide#directions-action
                                        NCS_Message += "&nbsp;<a title='Driving Directions | Direcciones | đường đi' href=\"https://www.google.com/maps/dir/?api=1&origin=" + parcel[0].attributes["Site_Address"]  + ",Tacoma,WA&destination=" + NCSResultsRec.attributes.Location__Locación___Ở + ",Tacoma,WA&travelmode=driving" + "\" target=\"_blank\">Driving Directions | Direcciones | đường đi</a><br>";
                                        NCS_Message += "<b>Paper Shredding: </b><br>&nbsp;" + NCSResultsRec.attributes.Shredding + "<br>";

                                        NCS_Message += "<b>Neighborhood | Vecindario | cộng đồng: </b><br>&nbsp;" + NCSResultsRec.attributes.Neighborhood_Group__Vecindario_ + "<br>";
                                        NCS_Message += "<b>Note: </b><i>Multi-family units and businesses do not qualify for this service. </i>";
                                        NCS_Message += "</div>";
                                      });

                                  r = NCS_Message + contactInfo + closeButton + mobileSpacer;

                              } else {
                                  r = "<div style='clear:both;'><hr color='#ACB1DB'></div>Tacoma residents who live in single-family or duplex homes are eligible to participate in the program for FREE.<br> There isn't a community cleanup scheduled for this neighborhood.  To participate in a scheduled cleanup please call 311.<div style='clear:both;'><hr color='#ACB1DB'></div>" + contactInfo + closeButton;
                              }

                          dom.byId('messages').innerHTML = r;    //update report message

                        }, function(err){
                          //Second Deferred Error
                          alert("Error in identify: " + err.message);
                          console.error("Identify Error: " + err.message);
                        });
 
                     }, function(err) {
                        //First Deferred Error
                        alert("Error retrieving parcel results: " + err.message);
                        console.error("Parcel Buffer Error: " + err.message);
                    });  

             } else {
                  //Not a parcel - REMOVE PARCEL INFO
                  var title = "Non-parcel"
                  address = "<div><i>This location is not a parcel.</i> </div><div id='messages'></div>";
                  address += "<div><i>Try clicking a nearby parcel.</i></div>" + closeButton;
                  map.setLevel(18);  //zoom to level 18 since there isn't a parcel to zoom to
            }        

             //Open info window and update content
             map.infoWindow.setTitle(title);
             var infoDiv = document.createElement("div");
              infoDiv.innerHTML = address;
              map.infoWindow.setContent(infoDiv); //add content details          

            //display the info window with the address information
            var screenPnt = map.toScreen(candidate_location);  //from map click or geocode

                map.infoWindow.show(screenPnt);  //open popup

          arrayUtils.forEach(parcel, function(feat) {
            feat.setSymbol(symbolParcel);
            map.graphics.add(feat);  // Add the parcel boundary to the map
            map.setExtent(feat._extent.expand(3.0));  //Zoom map to a multiple of parcel extent
          });

          map.centerAt(candidate_location);    //no offset

        } //last function
         
      }; //end mjm_ClickReportFunctions

  return mjm_ClickReportFunctions;  //Return an object that exposes new functions

});

