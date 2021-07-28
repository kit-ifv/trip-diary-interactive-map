	// ------------------------//
	// Data sources and layout //
    //-------------------------//

    //OSM map source, position ans zoom level
	var osmUrl = 'https://a.tile.openstreetmap.de/{z}/{x}/{y}.png';
	var lat = 49.012448;
    var lon = 8.404270;
    var alt = 600;
	
	//Additional layer
	var addKitLayer = true;
	var kitUrl = 'https://www.kit.edu/campusplan/public/layers/kit/{z}/{x}/{y}.png';
	
	//Marker icons and information popup
	var popupDurationMs = 1500;
	
	var originIcon = new L.icon({
		iconUrl: 'https://chart.apis.google.com/chart?chst=d_map_pin_letter&chld=%E2%80%A2|e85141&chf=a,s,ee00FFFF', 
		iconAnchor:   [10,33]
	});
	
	var destinationIcon = new L.icon({
		iconUrl: 'https://chart.apis.google.com/chart?chst=d_map_pin_letter&chld=%E2%80%A2|2ecc71&chf=a,s,ee00FFFF', 
		iconAnchor:   [10,33]
	});
	

	//Zone styles
	function idleZoneStyle(feature) {
		return {
			fillColor: 'blue', 
			fillOpacity: 0.1,  
			weight: 2,
			opacity: 0.3,
			color: 'blue',
			dashArray: '4'
		};
	}
	
	function originZoneStyle(feature) {
		return {
			fillColor: 'red', 
			fillOpacity: 0.3,  
			weight: 2,
			opacity: 1,
			color: 'red',
			dashArray: '4'
		};
	}
	
	function destinationZoneStyle(feature) {
		return {
			fillColor: 'green', 
			fillOpacity: 0.3,  
			weight: 2,
			opacity: 1,
			color: 'green',
			dashArray: '4'
		};
	}
		
	
	// ------------------------//
	// Combining layers to map //
    //-------------------------//
	
	var map = null;
	var zoneLayer = null;
	
    var originMarkers = null;
	var destinationMarkers = null;
	
	// mapping from O_ID and D_ID to respective object/value
	var markerMap = [];
	var clusterMap = [];
	var zoneMap = [];
	var styleMap = [];
	var iconMap = [];
	var resultMap = [];
	
	const O_ID = "ORIGIN_ID";
	const D_ID = "DESTINATION_ID";
    var popup = L.popup();
	
    function initMap(){
		console.log("Using osm source: " + osmUrl);

		// Create the map object
		map = L.map('map').setView([lat, lon], 14);
	  
		// Add osm layer to the map
		L.tileLayer(osmUrl, {
			attribution: '&copy; <a href="https://www.openstreetmap.com/copyright">OpenStreetMap</a> contributors, CC-BY-SA',
			minZoom: 1,
			maxZoom: 19
		}).addTo(map);
		
		if (addKitLayer) {
			// west
			L.tileLayer(kitUrl, {
				detectRetina: true,
				minZoom: 13,
				maxZoom: 19,
				zIndex: 2,
				bounds: [
					[49.019608, 8.365166],
					[49.024113, 8.369146]
				]
			}).addTo(map);
	
			// south
			L.tileLayer(kitUrl, {
				detectRetina: true,
				minZoom: 13,
				maxZoom: 19,
				zIndex: 3,
				bounds: [
					[49.007740, 8.399972],
					[49.019963, 8.428413]
				]
			}).addTo(map);

			// east
			L.tileLayer(kitUrl, {
				minZoom: 13,
				maxZoom: 19,
				zIndex: 4,
				bounds: [
					[49.020372, 8.427647],
					[49.024853, 8.434883]
				]
			}).addTo(map);

			// north
			L.tileLayer(kitUrl, {
				detectRetina: true,
				minZoom: 13,
				maxZoom: 19,
				zIndex: 5,
				bounds: [
					[49.087723, 8.419273],
					[49.114386, 8.447196]
				]
			}).addTo(map);	
		}
		
	  
		// Create marker clusters for origin and destination markers
		originMarkers = L.markerClusterGroup({ animateAddingMarkers: true });
		destinationMarkers = L.markerClusterGroup({ animateAddingMarkers: true });
		clusterMap[O_ID] = originMarkers;
		clusterMap[D_ID] = destinationMarkers;
		
		styleMap[O_ID] = originZoneStyle;
		styleMap[D_ID] = destinationZoneStyle;
		iconMap[O_ID] = originIcon;
		iconMap[D_ID] = destinationIcon;  

		// Results are written to fields: TODO make configurable
		resultMap[O_ID] = "v_43";
		resultMap[D_ID] = "v_44";
	  
	  	// Add zone layer with idle style
		zoneLayer = L.geoJson(null, {style: idleZoneStyle});
		zoneLayer.addData(jsonData);
		zoneLayer.addTo(map);
	  
	  	// Add on click behavior for arkers and map
		originMarkers.on('click', onOriginMakerClick);
		destinationMarkers.on('click', onDestinationMakerClick);
		map.on('click', onMapClick);

		// Check session storage for previous destination
		// Simulate click at stored coordinates
		if (sessionStorage.lastLat && sessionStorage.lastLng) {
			var lastLat = parseFloat(sessionStorage.lastLat);
			var lastLng = parseFloat(sessionStorage.lastLng);

			var zoom = 14;
			if (sessionStorage.lastZoom) {
				zoom = parseInt(sessionStorage.lastZoom);
			}
			
			map.setView([lastLat, lastLng], Math.max(Math.min(zoom,17), 12));
			
			handleMapClick(L.latLng(lastLat, lastLng));
		}
    }
	

    // ---------------------//
	// Mouse click behavior //
    //----------------------//

    // Removing placed markers
	function onOriginMakerClick(m) {
		removeMarker(O_ID, m);
	}
	
	function onDestinationMakerClick(m) {
		removeMarker(D_ID, m);
		sessionStorage.removeItem("lastLat");
		sessionStorage.removeItem("lastLng");
		sessionStorage.removeItem("lastZoom");
	}
	
	function removeMarker(markerId, m) {
		map.removeLayer(zoneMap[markerId]);
		zoneMap[markerId] = null;
		resultMap[markerId].value = "";

		document.getElementById(resultMap[markerId]).value = ""
		
		markerCluster = clusterMap[markerId];
		
		lastClicked = m.layer;
		markerCluster.removeLayer(lastClicked);
		map.addLayer(markerCluster);
		markerMap[markerId] = null;
	}


	//Adding new markers
    function onMapClick(e) {
    	handleMapClick(e.latlng)
    }

    function handleMapClick(latlng) {
    	var id = null;
		var text = "";
		
		//Check origin marker first
		if (markerMap[O_ID] == null) {			
			id = O_ID;
			text = "Origin ";

		  //If origin marker already exists: check destination marker
		} else if (markerMap[D_ID] == null) {		
			id = D_ID;
			text = "Destination ";

			sessionStorage.setItem("lastLat", latlng.lat);
			sessionStorage.setItem("lastLng", latlng.lng);
			sessionStorage.setItem("lastZoom", map.getZoom())
		}
		
		// Create new marker if one is missing
		if (id != null) {

			polygons = findContainingPolygons(latlng);

			if (polygons.length > 0) {
				poly = polygons[0];

				createMarker(id, latlng);
					
				addSingleZoneLayer(id, poly);
				displayPopup(latlng, text + poly.feature.properties.NAME);
	            
				var elem = document.getElementById(resultMap[id]);
				elem.value = parseInt(poly.feature.properties.NO);
				console.log(id + ": " + elem.value);
			}
			
		}
    }

	function findContainingPolygons(latlng) {
		selPoly = [];
	
		zoneLayer.eachLayer(function (layer) {
			isInside = turf.inside(L.marker(latlng).toGeoJSON(), layer.toGeoJSON());
		
			if (isInside) {
				selPoly.push(layer);
				console.log("Marker in " + layer.feature.properties.NAME + "(" + layer.feature.properties.NO + ")");
			}
		});

		return selPoly;
	}

	function createMarker(markerId, latlng) {
		markerIcon = iconMap[markerId];
	
		marker = L.marker(latlng, {icon:markerIcon});
		markerMap[markerId] = marker;
		
		markerCluster = clusterMap[markerId];
		markerCluster.addLayer(marker);
		
		map.addLayer(markerCluster);
	}
	
	function displayPopup(latlng, message) {
		popup.setLatLng(latlng)
				 .setContent(message)
				 .openOn(map);
		
		setTimeout(() => { map.closePopup(); }, popupDurationMs);
	}

	function addSingleZoneLayer(markerId, poly) {
		marker = markerMap[markerId];
		style = styleMap[markerId];		
		zoneMap[markerId] = L.geoJson(poly.feature, {style: style}).addTo(map);
	}

    $(document).ready(function(){
        initMap();
    });
