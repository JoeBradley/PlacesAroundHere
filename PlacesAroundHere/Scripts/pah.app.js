var apiKey = 'AIzaSyAgEo8gj45S6Ac7V4RqO4ulAMQBvQcEMoQ';

var imageBaseUrl = "https://maps.googleapis.com/maps/api/streetview?key=" + apiKey + "&size=600x300&pitch=10&fov=120&location=";
var metaDataBaseUrl = "https://maps.googleapis.com/maps/api/streetview/metadata?key=" + apiKey + "&size=600x300&pitch=10&fov=120&location=";

var berlin = { lat: 52.5200, lng: 13.4050 };

var map;
var searchBox;
var markers = [];
var selectedMarker = null;
var isLoaded = false;
var photosTemplate;

function initMap() {
    photosTemplate = Handlebars.compile($("#PhotosTemplate").html());

    bindEventHandlers();

    map = new google.maps.Map(document.getElementById('Map'), {
        zoom: 12,
        center: berlin
    });

    // Create the search box and link it to the UI element.
    var searchBox = new google.maps.places.SearchBox(document.getElementById('MapSearch'));

    google.maps.event.addListener(map, 'click', function (event) {
        console.log("Click position: " + JSON.stringify(event));
        var latLng = event.latLng;
        addMarker(latLng);
    });

    searchBox.addListener('places_changed', function () {
        var places = searchBox.getPlaces();

        if (places.length == 0) {
            return;
        }

        var bounds = new google.maps.LatLngBounds();
        places.forEach(function (place) {
            if (!place.geometry) {
                return;
            }
            if (place.geometry.viewport) {
                // Only geocodes have viewport.
                bounds.union(place.geometry.viewport);
            } else {
                bounds.extend(place.geometry.location);
            }
        });
        map.fitBounds(bounds);
    });

    loadMarkerFromQueryString();
}

function loadMarkerFromQueryString() {
    var latLngStr = getQueryStringParameterByName("latlng");

    if (latLngStr !== null) {
        var latLng = { lat: Number(latLngStr.split(",")[0]), lng: Number(latLngStr.split(",")[1]) };
        addMarker(latLng);
    }
}

function addMarker(latLng) {

    console.log("Add Marker at: " + JSON.stringify(latLng));

    var marker = new google.maps.Marker({
        position: latLng,
        map: map
    });

    markers.push(marker);

    hidePhotoMarkers();

    selectedMarker = marker;

    setLatLngText(marker.getPosition().toUrlValue());

    setUrl(marker.getPosition().toUrlValue());

    console.log("Marker: " + JSON.stringify(marker.getPosition()));

    marker.addListener("click", function () {
        showMarkerImages(marker);
    });

    getMarkerImages(marker);

    map.panTo(latLng);
}

function setLatLngText(latLngUrl) {
    $("#markerlink").html(latLngUrl).attr("href", window.location.origin + "?latlng=" + latLngUrl);
}

function hidePhotoMarkers() {
    if (selectedMarker !== null) {
        $.each(selectedMarker.photoMarkers, function (index, photoMarker) {
            photoMarker.setMap(null);
        });
    }
}

function showPhotoMarkers() {
    if (selectedMarker !== null) {
        $.each(selectedMarker.photoMarkers, function (index, photoMarker) {
            photoMarker.setMap(map);
        });
    }
}

function getMarkerImages(marker) {

    marker.photos = new Array();
    marker.photoMarkers = new Array();

    var center = marker.getPosition();

    console.log("getMarkerImages: " + JSON.stringify(center));

    var location = marker.getPosition().toUrlValue();
    var url = imageBaseUrl + location;

    console.log("Url: " + url);

    marker.photos.push({ "url": url });

    var d = 100;
    var rings = new Array(90, 30);
    var calls = 0;
    var done = 0;
    var i = 1;

    $.each(rings, function (index, r) {
        console.log(r);
        for (var angle = 0; angle < 360; angle = angle + 45) {
            var latLng = GetLatLngOffset(center, d, angle);
            var location = latLng.lat + "," + latLng.lng;
            var imageUrl = imageBaseUrl + location;
            var metaDataUrl = metaDataBaseUrl + location;

            marker.photos.push({ "url": imageUrl });

            var photoMarker = new google.maps.Marker({
                position: latLng,
                label: (i++).toString(),
                icon: colorPin('RED'),
                map: map
            });

            //photoMarker.addListener("click", function () {
            //    console.log("clicked photo marker");
            //    var photoId = $('#Photos').find("a[name='photo_" + i + "']");

            //    $('#Photos').animate({ scrollTop: photoId.top }, 'slow');
            //});

            marker.photoMarkers.push(photoMarker);

            //calls++;
            //$.get(metaDataUrl, function (response) {
            //    if (response.status == "OK") {
            //        marker.photos.push({ "url": imageUrl });
            //    }
            //}).always(function () {
            //    done++;
            //    console.log("done: " + done);
            //});
        }
        d = d * 2;
    });

    //// wait for all ajax calls to complete, then show the images
    //var wait = setInterval(function () {
    //    if (done >= calls) {
    //        showMarkerImages(marker);
    //        clearInterval(wait);
    //    }
    //}, 100);

    // Show the images
    showMarkerImages(marker);
}

function colorPin(color) {
    return {
        path: 'M 0,0 C -2,-20 -10,-22 -10,-30 A 10,10 0 1,1 10,-30 C 10,-22 2,-20 0,0 z M -2,-30 a 2,2 0 1,1 4,0 2,2 0 1,1 -4,0',
        fillColor: color,
        fillOpacity: 0.2,
        strokeColor: '#EEE',
        strokeWeight: 1,
        scale: 1,
    };
}

function showMarkerImages(marker) {
    hidePhotoMarkers();
    selectedMarker = marker;
    showPhotoMarkers();
    $("#Photos").html(photosTemplate(marker));
    setUrl(marker.getPosition().toUrlValue());
}

function ConvertDegreesToRadians(degrees) { return degrees * (Math.PI / 180.0); }

function ConvertRadiansToDegrees(radians) { return radians * (180 / Math.PI); }

function GetLatLngOffset(latLng, distance, angle) {

    /** http://www.movable-type.co.uk/scripts/latlong.html
    * φ is latitude, λ is longitude,
    * θ is the bearing (clockwise from north),
    * δ is the angular distance d/R;
    * d being the distance travelled, R the earth’s radius*
    **/
    var radius = 6371e3; // meters
    var δ = Number(distance) / radius; // angular distance in radians
    var θ = ConvertDegreesToRadians(Number(angle));
    var φ1 = ConvertDegreesToRadians(latLng.lat());
    var λ1 = ConvertDegreesToRadians(latLng.lng());

    var φ2 = Math.asin(Math.sin(φ1) * Math.cos(δ) +
        Math.cos(φ1) * Math.sin(δ) * Math.cos(θ));

    var λ2 = λ1 + Math.atan2(Math.sin(θ) * Math.sin(δ) * Math.cos(φ1),
      Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2));

    // normalise to -180..+180°
    λ2 = (λ2 + 3 * Math.PI) % (2 * Math.PI) - Math.PI;

    var latLng = { lat: ConvertRadiansToDegrees(φ2), lng: ConvertRadiansToDegrees(λ2) };

    return latLng;
}

function bindEventHandlers() {
    document.addEventListener('copy', function (e) {
        var data = $("#markerlink").attr('href');
        showMessage("Url copied to clipboard: " + data);
        e.clipboardData.setData('text/plain', data);
        e.preventDefault(); // We want our data, not data from any selection, to be written to the clipboard
    });

    $('#CopyToClipboard').click(function () {
        document.execCommand("copy");
    });
}

function getQueryStringParameterByName(name) {
    url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}

function showMessage(msg) {
    $('#Message').html(msg);
    $('#MessageContainer').fadeIn();
    setTimeout(function () { $('#MessageContainer').fadeOut(); }, 3000);
}

function setUrl(latLngUrl)
{
    var stateObj = { url: window.location.origin + "?latlng=" + latLngUrl };
    history.pushState(stateObj, "Places near here", stateObj.url);
}