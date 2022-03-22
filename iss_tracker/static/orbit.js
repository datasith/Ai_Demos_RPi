/**
 * orbits-js
 * @author Rossen Georgiev @ {@link https://github.com/rossengeorgiev}
 * @description A tiny library that can parse TLE, and display the orbit on the map
 * @requires: GMaps API 3
 *
 * @version 1.2.1
 * @namespace
 */
var orbits = {
    version: '1.2.1',
    /**
     * @namespace
     */
    util: {}
};

/**
 * merge two objects together, b takes precedence
 * @param   {Object} a - First object instance
 * @param   {Object} b - Second object instance
 * @returns {Object}
 */
orbits.util.mergeOpts = function(a, b) {
    var k, result = {};
    for(k in a) result[k] = a[k];
    for(k in b) result[k] = b[k];
    return result;
};

/**
 * takes a Date instance and return julian day
 * @param   {Date} date - Date instance
 * @returns {float}
 */
orbits.util.jday = function(date) {
    return (date.getTime() / 86400000.0) + 2440587.5;
};

/**
 * takes a Date instance and returns Greenwich mean sidereal time in radii
 * @param   {Date} date - Date instance
 * @returns {float}
 */
orbits.util.gmst = function(date) {
    var jd = orbits.util.jday(date);
    //t is the time difference in Julian centuries of Universal Time (UT1) from J2000.0.
    var t = (jd - 2451545.0) / 36525;
    // based on http://www.space-plasma.qmul.ac.uk/heliocoords/systems2art/node10.html
    var gmst = 67310.54841 + (876600.0*3600 + 8640184.812866) * t + 0.093104 * t*t - 0.0000062 * t*t*t;
    gmst = (gmst * (Math.PI/180) / 240.0) % (Math.PI*2);
    gmst += (gmst<0) ? Math.PI*2 : 0;
    return gmst;
};

/**
 * Get distance to true horizon in meters
 * @param   {float} altitude - In meters
 * @returns {float}
 */
orbits.util.getDistanceToHorizon = function(altitude) {
    return Math.sqrt(12.756 * altitude) * 1000;
};

orbits.util.halfEarthCircumference = parseInt(6371 * Math.PI * 500);

/**
 * Calculate position of the sun for a given date
 * @param   {Date} date - An instance of Date
 * @returns {float[]} [latitude, longitude]
 */
orbits.util.calculatePositionOfSun = function(date) {
    date = (date instanceof Date) ? date : new Date();

    var rad = 0.017453292519943295;

    // based on NOAA solar calculations
    var mins_past_midnight = (date.getUTCHours() * 60 + date.getUTCMinutes()) / 1440;
    var jc = (this.jday(date) - 2451545)/36525;
    var mean_long_sun = (280.46646+jc*(36000.76983+jc*0.0003032)) % 360;
    var mean_anom_sun = 357.52911+jc*(35999.05029-0.0001537*jc);
    var sun_eq = Math.sin(rad*mean_anom_sun)*(1.914602-jc*(0.004817+0.000014*jc))+Math.sin(rad*2*mean_anom_sun)*(0.019993-0.000101*jc)+Math.sin(rad*3*mean_anom_sun)*0.000289;
    var sun_true_long = mean_long_sun + sun_eq;
    var sun_app_long = sun_true_long - 0.00569 - 0.00478*Math.sin(rad*125.04-1934.136*jc);
    var mean_obliq_ecliptic = 23+(26+((21.448-jc*(46.815+jc*(0.00059-jc*0.001813))))/60)/60;
    var obliq_corr = mean_obliq_ecliptic + 0.00256*Math.cos(rad*125.04-1934.136*jc);
    var lat = Math.asin(Math.sin(rad*obliq_corr)*Math.sin(rad*sun_app_long)) / rad;
    var eccent = 0.016708634-jc*(0.000042037+0.0000001267*jc);
    var y = Math.tan(rad*(obliq_corr/2))*Math.tan(rad*(obliq_corr/2));
    var rq_of_time = 4*((y*Math.sin(2*rad*mean_long_sun)-2*eccent*Math.sin(rad*mean_anom_sun)+4*eccent*y*Math.sin(rad*mean_anom_sun)*Math.cos(2*rad*mean_long_sun)-0.5*y*y*Math.sin(4*rad*mean_long_sun)-1.25*eccent*eccent*Math.sin(2*rad*mean_anom_sun))/rad);
    var true_solar_time = (mins_past_midnight*1440+rq_of_time) % 1440;
    var lng = -((true_solar_time/4 < 0) ? true_solar_time/4 + 180 : true_solar_time/4 - 180);

    return [lat, lng];
};

/**
 * Calculate LatLng of the sun for a given date
 * @param   {Date} date - An instance of Date
 * @returns {google.maps.LatLng}
 */
orbits.util.calculateLatLngOfSun = function(date) {
    var pos = orbits.util.calculatePositionOfSun(date);
    return new google.maps.LatLng(pos[0], pos[1]);
};

/**
 * Parses a string with one or more TLEs
 * @param       {string} text - A string containing one or more TLEs
 * @returns     {array.<orbits.TLE>} An array of orbit.TLE instances
 */
orbits.util.parseTLE = function(text) {
    "use strict";
    if(!text || typeof text != "string" || text === "") return [];

    var lines = text.split("\n");

    // trim emepty lines
    for(var i = 0; i < lines.length; i++) if(lines[i] === "") lines.splice(i,1);

    // see if we got somethin reasonable
    if(lines.length < 3) return [];
    if(lines.length % 3 !== 0)
        throw new SyntaxError("The number of lines should be multiple of 3");

    // try and make the array
    var three;
    var array = [];
    while(lines.length) array.push(new orbits.TLE(lines.splice(0,3).join("\n")));

    return array;
};

/**
 *Object with the default options for Satellite object
 * @prop {orbits.TLE}                   tle          - An instance of orbits.TLE
 * @prop {string}                       title        - Alternative title to use for the marker, instead of the one from TLE
 * @prop {float}                        pathLength   - The length is in periods. Length = period * pathLength
 * @prop {boolean}                      visible      - Whenever to display the map or not
 * @prop {google.maps.Map}              map          - An instance of google.maps.Map
 * @prop {google.maps.MarkerOptions}    markerOpts   - An instance of google.maps.MarkerOptions
 * @prop {google.maps.CircleOptions}    horzionOpts  - An instance of google.maps.CircleOptions
 * @prop {google.maps.PolylineOptions}  polylineOpts - An instance of google.maps.PolylineOptions
 * @prop {boolean}                      drawShadowPolylines - Whenever to draw indicators when Satellite is shadowed by Earth
 * @prop {google.maps.PolylineOptions}  shadowPolylinesOpts - An instance of google.maps.PolylineOptions
 */
orbits.SatelliteOptions = {
    tle: "",
    title: null,
    pathLength: 1,
    visible: true,
    map: null,
    markerOpts: {
        zIndex: 50,
    },
    horizonOpts: {
        radius: 0,
        zIndex: 10,
        strokeWeight: 2,
        strokeColor: "white",
        strokeOpacity: 0.8,
        fillColor: "white",
        fillOpacity: 0.2,
    },
    polylineOpts: {
        zIndex: 20,
        geodesic: true,
        strokeWeight: 2,
        strokeColor: "yellow",
        strokeOpacity: 1.0
    },
    drawShadowPolylines: true,
    shadowPolylinesOpts: {
        zIndex: 20,
        geodesic: true,
        strokeWeight: 2,
        strokeColor: "blue",
        strokeOpacity: 1.0
    },
};

/**
 *Initializes a Satellite object (requires Google Maps API3)
 * @class
 * @param   {orbits.SatelliteOptions} options - an obj with options, see orbits.SatelliteOptions
 */
orbits.Satellite = function(options) {
    "use strict";
    this.tle = null;
    this.position = null;
    this.path = null;
    this.visible = true;
    this.orbit = null;
    this.date = null;

    // handle options
    options = (typeof options == 'object') ? options : {};

    var opt;
    for(opt in orbits.SatelliteOptions) {
        if(opt in options) {
            if(typeof orbits.SatelliteOptions[opt] === "object" && orbits.SatelliteOptions[opt] !== null) {
                this[opt] = orbits.util.mergeOpts(orbits.SatelliteOptions[opt], options[opt]);
            }
            else {
                this[opt] = options[opt];
            }
        }
        else {
            this[opt] = orbits.SatelliteOptions[opt];
        }
    }

    // init map elements, if note are set
    this.marker = new google.maps.Marker(this.markerOpts);
    this.horizon = new google.maps.Circle(this.horizonOpts);
    this.horizon.bindTo('center', this.marker, 'position');
    this.polyline = new google.maps.Polyline(this.polylineOpts);
    this.shadowPolylines = [];

    // attach markers to map
    if(this.visible) this.setMap(this.map);

    // check if we have TLE and init orbit
    if(this.tle !== null && !(this.tle instanceof orbits.TLE)) this.tle = null;
    if(this.tle !== null) this.setTLE(this.tle);

    // refresh
    this.refresh();
};

/**
 * Set a Date instance or null to use the current datetime.
 * Call refresh() to update the position afterward.
 * @param   {Date} date - An instance of Date
 */
orbits.Satellite.prototype.setDate = function(date) {
    this.date = date;
};

/**
 * Set the map instance to use
 * @param   {google.maps.Map} map - An instance of google.maps.Map
 */
orbits.Satellite.prototype.setMap = function(map) {
    this.map = map;
    this.marker.setMap(this.map);
    this.horizon.setMap(this.map);
    this.polyline.setMap(this.map);
    this.shadowPolylines.forEach(function(v) { v.setMap(this.map); });
};

/**
 *Recalculates the position and updates the markers
 */
orbits.Satellite.prototype.refresh = function() {
    if(!this.visible || this.orbit === null || this.map === null) return;

    this.orbit.setDate(this.date);
    this.orbit.propagate();
    this.position = this.orbit.getLatLng();
    this.marker.setPosition(this.position);
    var alt = this.orbit.getAltitude() * 1000;
    this.horizon.setRadius(orbits.util.getDistanceToHorizon(alt));
};

/**
 *Redraw path
 */
orbits.Satellite.prototype.refresh_path = function() {
    if(this.pathLength >= 1.0/180) this._updatePoly();
};

/**
 * Set TLE for this satellite
 * @param   {orbits.TLE} tle - An instance of orbits.TLE
 */
orbits.Satellite.prototype.setTLE = function(tle) {
    this.orbit = new orbits.Orbit(tle);
    this.marker.setTitle(tle.name);
};

orbits.Satellite.prototype._updatePoly = function() {
    var dt = (this.orbit.getPeriod() * 1000) / 180;
    var date = (this.date) ? this.date : new Date();
    this.path = [];
    this.shadowPolylines.forEach(function(v) { v.setMap(null); });
    this.shadowPolylines = [];
    var night = false;
    var curr_path = [];
    var curr_poly = null;
    var curr_date = null;
    var curr_night = null;

    var i = 0;
    var jj = (180 * this.pathLength) + 1;
    for(; i <= jj; i++) {
        curr_date = new Date(date.getTime() + dt*i);
        this.orbit.setDate(curr_date);
        this.orbit.propagate();
        var pos = this.orbit.getLatLng();
        this.path.push(pos);

        if(!this.drawShadowPolylines) continue;

        var dist = google.maps.geometry.spherical.computeDistanceBetween(orbits.util.calculateLatLngOfSun(curr_date), pos);
        curr_night = dist > orbits.util.halfEarthCircumference + orbits.util.getDistanceToHorizon(this.orbit.getAltitude() * 1000);

        if(night === true && curr_night === true) {
            curr_path.push(pos);
        }
        else if(night === true && curr_night === false) {
            curr_poly.setPath(curr_path);
        }
        else if(night === false && curr_night === true) {
            curr_poly = new google.maps.Polyline(this.shadowPolylinesOpts);
            curr_poly.setMap(this.map);
            this.shadowPolylines.push(curr_poly);

            curr_path = [pos];
        }
        night = curr_night;
    }

    if(night) curr_poly.setPath(curr_path);

    this.polyline.setPath(this.path);
};

/**
 * Initializes a TLE object containing parsed TLE
 * @class
 * @param {string} text - A TLE string of 3 lines
 */
orbits.TLE = function(text) {
    this.text = text;
    this.parse(this.text);
};

/**
 * Parses TLE string and sets the proporties
 * @param {string} text - A TLE string of 3 lines
 */
orbits.TLE.prototype.parse = function(text) {
    "use strict";
    var lines = text.split("\n");

    if(lines.length != 3) throw new SyntaxError("Invalid TLE syntax");

    // parse first line
    this.name = lines[0].substring(0,24).trim();

    // parse second line
    if(lines[1][0] != "1") throw new SyntaxError("Invalid TLE syntax");

    // TODO: verify line using the checksum in field 14

    /**
     * Satellite Number
     * @type {int}
     * @readonly
     */
    this.satelite_number = parseInt(lines[1].substring(2,7));

    /**
     * Classification (U=Unclassified)
     * @type {string}
     * @readonly
     */
    this.classification = lines[1].substring(7,8);

    /**
     * International Designator (Last two digits of launch year, eg. '98')
     * @type {string}
     * @readonly
     */
    this.intd_year = lines[1].substring(9,11);

    /**
     * International Designator (Launch number of the year, eg. '067')
     * @type {string}
     * @readonly
     */
    this.intd_ln = lines[1].substring(11,14);

    /**
     * International Designator (Piece of the launch, eg. 'A')
     * @type {string}
     * @readonly
     */
    this.intd_place = lines[1].substring(14,17).trim();

    /**
     * International Designator (eg. 98067A)
     * @type {string}
     * @readonly
     */
    this.intd = lines[1].substring(9,17).trim();

    /**
     * Epoch Year (Full year)
     * @type {int}
     * @readonly
     */
    this.epoch_year = parseInt(lines[1].substring(18,20));
    this.epoch_year += (this.epoch_year < 57) ? 2000 : 1000;

    /**
     * Epoch (Day of the year and fractional portion of the day)
     * @type {float}
     * @readonly
     */
    this.epoch_day = parseFloat(lines[1].substring(20,32));

    /**
     * First Time Derivative of the Mean Motion divided by two
     * @type {float}
     * @readonly
     */
    this.ftd = parseFloat(lines[1].substring(33,43));

    /**
     * Second Time Derivative of Mean Motion divided by six
     * @type {float}
     * @readonly
     */
    this.std = 0;
    var tmp = lines[1].substring(44,52).split(/[+-]/);
    if(tmp.length == 3) this.std = -1 * parseFloat("."+tmp[1].trim()) * Math.pow(10,-parseInt(tmp[2]));
    else this.std = parseFloat("."+tmp[0].trim()) * Math.pow(10,-parseInt(tmp[1]));

    /**
     * BSTAR drag term
     * @type {float}
     * @readonly
     */
    this.bstar = 0;
    tmp = lines[1].substring(53,61).split(/[+-]/);
    if(tmp.length == 3) this.bstar = -1 * parseFloat("."+tmp[1].trim()) * Math.pow(10,-parseInt(tmp[2]));
    else this.bstar = parseFloat("."+tmp[0].trim()) * Math.pow(10,-parseInt(tmp[1]));

    /**
     * The number 0 (Originally this should have been "Ephemeris type")
     * @type {int}
     * @readonly
     */
    this.ehemeris_type = parseInt(lines[1].substring(62,63));

    /**
     * Element set number. incremented when a new TLE is generated for this object.
     * @type {int}
     * @readonly
     */
    this.element_number = parseInt(lines[1].substring(64,68));

    // parse third line
    if(lines[2][0] != "2") throw new SyntaxError("Invalid TLE syntax");

    // TODO: verify line using the checksum in field 14

    /**
     * Inclination [Degrees]
     * @type {float}
     * @readonly
     */
    this.inclination = parseFloat(lines[2].substring(8,16));

    /**
     * Right Ascension of the Ascending Node [Degrees]
     * @type {float}
     * @readonly
     */
    this.right_ascension = parseFloat(lines[2].substring(17,25));

    /**
     * Eccentricity
     * @type {float}
     * @readonly
     */
    this.eccentricity = parseFloat("."+lines[2].substring(26,33).trim());

    /**
     * Argument of Perigee [Degrees]
     * @type {float}
     * @readonly
     */
    this.argument_of_perigee = parseFloat(lines[2].substring(34,42));

    /**
     * Mean Anomaly [Degrees]
     * @type {float}
     * @readonly
     */
    this.mean_anomaly = parseFloat(lines[2].substring(43,51));

    /**
     * Mean Motion [Revs per day]
     * @type {float}
     * @readonly
     */
    this.mean_motion = parseFloat(lines[2].substring(52,63));

    /**
     * Revolution number at epoch [Revs]
     * @type {int}
     * @readonly
     */
    this.epoch_rev_number = parseInt(lines[2].substring(63,68));
};

/**
 * Takes a date instance and returns the different between it and TLE's epoch
 * @param       {Date} date - A instance of Date
 * @returns     {int} delta time in millis
 */
orbits.TLE.prototype.dtime = function(date) {
    var a = orbits.util.jday(date);
    var b = orbits.util.jday(new Date(Date.UTC(this.epoch_year, 0, 0, 0, 0, 0) + this.epoch_day * 86400000));
    return (a - b) * 1440.0; // in minutes
};

/**
 * Returns the TLE string
 * @returns {string} TLE string in 3 lines
 */
orbits.TLE.prototype.toString = function() {
    return this.text;
};

/**
 * Takes orbit.TLE object and initialized the SGP4 model
 * @class
 * @param  {orbit.TLE} tleObj - An instance of orbits.TLE
 */
orbits.Orbit = function(tleObj) {
    "use strict";
    this.tle = tleObj;
    this.date = null;

    // init constants
    this.ck2 =5.413080e-4;
    this.ck4 = 0.62098875e-6;
    this.e6a = 1.0e-6;
    this.qoms2t = 1.88027916e-9;
    this.s = 1.01222928;
    this.xj3 = -0.253881e-5;
    this.xke = 0.743669161e-1;
    this.xkmper = 6378.137; // Earth's radius WGS-84
    this.xflat = 0.00335281066; // WGS-84 flattening
    this.xminpday = 1440.0;
    this.ae = 1.0;
    this.pi = Math.PI;
    this.pio2 = this.pi / 2;
    this.twopi = 2 * this.pi;
    this.x3pio2 = 3 * this.pio2;

    this.torad = this.pi/180;
    this.tothrd = 0.66666667;

    this.xinc = this.tle.inclination * this.torad;
    this.xnodeo = this.tle.right_ascension * this.torad;
    this.eo = this.tle.eccentricity;
    this.omegao  = this.tle.argument_of_perigee * this.torad;
    this.xmo = this.tle.mean_anomaly * this.torad;
    this.xno = this.tle.mean_motion * this.twopi / 1440.0;
    this.bstar = this.tle.bstar;

    // recover orignal mean motion (xnodp) and semimajor axis (adop)
    var a1 = Math.pow(this.xke / this.xno, this.tothrd);
    var cosio = Math.cos(this.xinc);
    var theta2 = cosio*cosio;
    var x3thm1 = 3.0 * theta2 - 1;
    var eosq = this.eo * this.eo;
    var betao2= 1.0 - eosq;
    var betao = Math.sqrt(betao2);
    var del1 = 1.5 * this.ck2 * x3thm1 / (a1*a1 * betao*betao2);
    var ao = a1 * (1 - del1 * ((1.0/3.0) + del1 * (1.0 + (134.0/81.0) * del1)));
    var delo = 1.5 * this.ck2 * x3thm1/(ao * ao * betao * betao2);
    var xnodp = this.xno/(1.0 + delo); //original_mean_motion
    var aodp = ao/(1.0 - delo); //semi_major_axis

    // initialization
    this.isimp = ((aodp*(1.0-this.eo)/this.ae) < (220.0/this.xkmper+this.ae)) ? 1 : 0;

    var s4 = this.s;
    var qoms24 = this.qoms2t;
    var perige = (aodp * (1.0-this.eo) - this.ae) * this.xkmper;
    if (perige < 156.0){
        s4 = perige - 78.0;
        if (perige <= 98.0){
          s4 = 20.0;
        } else {
          qoms24 = Math.pow(((120.0 - s4)*this.ae/this.xkmper), 4);
          s4 = s4/this.xkmper+this.ae;
        }
    }
    var pinvsq = 1.0/(aodp * aodp * betao2 * betao2);
    var tsi = 1.0/(aodp - s4);
    var eta = aodp * this.eo * tsi;
    var etasq = eta * eta;
    var eeta = this.eo * eta;
    var psisq = Math.abs(1.0 - etasq);
    var coef = qoms24 * Math.pow(tsi,4);
    var coef1 = coef/Math.pow(psisq,3.5);

    var c2 = coef1 * xnodp * (aodp * (1.0 + 1.5 * etasq + eeta * (4.0 + etasq)) + 0.75 * this.ck2 * tsi/psisq * x3thm1 * (8.0 + 3.0 * etasq * (8.0 + etasq)));
    var c1 = this.bstar * c2;
    var sinio = Math.sin(this.xinc);
    var a3ovk2 = -this.xj3/this.ck2 * Math.pow(this.ae,3);
    var c3 = coef * tsi * a3ovk2 * xnodp * this.ae * sinio/this.eo;
    var x1mth2 = 1.0 - theta2;
    var c4 = 2.0 * xnodp * coef1 * aodp * betao2 * (eta * (2.0 + 0.5 * etasq) + this.eo * (0.5 + 2.0 * etasq) - 2.0 * this.ck2 * tsi/(aodp * psisq) * (-3.0 * x3thm1 * (1.0 - 2.0 * eeta + etasq * (1.5 - 0.5 * eeta)) + 0.75 * x1mth2 * (2.0 * etasq - eeta * (1.0 + etasq)) * Math.cos((2.0 * this.omegao))));
    this.c5 = 2.0 * coef1 * aodp * betao2 * (1.0 + 2.75 * (etasq + eeta) + eeta * etasq);

    var theta4 = theta2 * theta2;
    var temp1 = 3.0 * this.ck2 * pinvsq * xnodp;
    var temp2 = temp1 * this.ck2 * pinvsq;
    var temp3 = 1.25 * this.ck4 * pinvsq * pinvsq * xnodp;
    this.xmdot = xnodp + 0.5 * temp1 * betao * x3thm1 + 0.0625 * temp2 * betao * (13.0 - 78.0 * theta2 + 137.0 * theta4);

    var x1m5th = 1.0 - 5.0 * theta2;
    this.omgdot = -0.5 * temp1 * x1m5th + 0.0625 * temp2 * (7.0 - 114.0 * theta2 + 395.0 * theta4) + temp3 * (3.0 - 36.0 * theta2 + 49.0 * theta4);
    var xhdot1 = -temp1 * cosio;
    this.xnodot = xhdot1 + (0.5 * temp2 * (4.0 - 19.0 * theta2) + 2.0 * temp3 * (3.0 - 7.0 * theta2)) * cosio;
    this.omgcof = this.bstar * c3 * Math.cos(this.omegao);
    this.xmcof = -this.tothrd * coef * this.bstar * this.ae/eeta;
    this.xnodcf = 3.5 * betao2 * xhdot1 * c1;
    this.t2cof = 1.5 * c1;
    this.xlcof = 0.125 * a3ovk2 * sinio * (3.0 + 5.0 * cosio)/(1.0 + cosio);
    this.aycof = 0.25 * a3ovk2 * sinio;
    this.delmo = Math.pow((1.0 + eta * Math.cos(this.xmo)),3);
    this.sinmo = Math.sin(this.xmo);
    this.x7thm1 = 7.0 * theta2 - 1.0;

    var d2, d3, d4;
    if (this.isimp != 1){
        var c1sq = c1 * c1;
        d2 = 4.0 * aodp * tsi * c1sq;
        var temp = d2 * tsi * c1/3.0;
        d3 = (17.0 * aodp + s4) * temp;
        d4 = 0.5 * temp * aodp * tsi * (221.0 * aodp + 31.0 * s4) * c1;
        this.t3cof = d2 + 2.0 * c1sq;
        this.t4cof = 0.25 * (3.0 * d3 + c1 * (12.0 * d2 + 10.0 * c1sq));
        this.t5cof = 0.2 * (3.0 * d4 + 12.0 * c1 * d3 + 6.0 * d2 * d2 + 15.0 * c1sq * (2.0 * d2 + c1sq));
    }

    // set variables that are needed in the calculate() routine
    this.aodp = aodp;
    this.c1 = c1;
    this.c4 = c4;
    this.cosio = cosio;
    this.d2 = d2;
    this.d3 = d3;
    this.d4 = d4;
    this.eta = eta;
    this.sinio = sinio;
    this.x3thm1 = x3thm1;
    this.x1mth2 = x1mth2;
    this.xnodp = xnodp;
};

/**
 *calculates position and velocity vectors based date set on the Orbit object
 */
orbits.Orbit.prototype.propagate = function() {
    "use strict";
    var date = (this.date === null) ? new Date() : this.date;
    var tsince = this.tle.dtime(date);

    // update for secular gravity and atmospheric drag

    var xmdf = this.xmo + this.xmdot * tsince;
    var omgadf = this.omegao + this.omgdot * tsince;
    var xnoddf = this.xnodeo + this.xnodot * tsince;
    var omega = omgadf;
    var xmp = xmdf;
    var tsq = tsince * tsince;
    var xnode = xnoddf + this.xnodcf * tsq;
    var tempa= 1.0 - this.c1 * tsince;
    var tempe = this.bstar * this.c4 * tsince;
    var templ = this.t2cof * tsq;

    var temp;
    if (this.isimp != 1){
        var delomg = this.omgcof * tsince;
        var delm = this.xmcof * (Math.pow((1.0 + this.eta * Math.cos(xmdf)),3) - this.delmo);
        temp = delomg + delm;
        xmp = xmdf + temp;
        omega = omgadf - temp;
        var tcube = tsq * tsince;
        var tfour = tsince * tcube;
        tempa = tempa - this.d2 * tsq - this.d3 * tcube - this.d4 * tfour;
        tempe = tempe + this.bstar * this.c5 * (Math.sin(xmp) - this.sinmo);
        templ = templ + this.t3cof * tcube + tfour * (this.t4cof + tsince * this.t5cof);
    }
    var a = this.aodp * tempa * tempa;
    var e = this.eo - tempe;
    var xl = xmp + omega + xnode + this.xnodp * templ;
    var beta = Math.sqrt(1.0 - e*e);
    var xn = this.xke/Math.pow(a,1.5);

    // long period periodics
    var axn = e * Math.cos(omega);
    temp = 1.0/(a * beta * beta);
    var xll = temp * this.xlcof * axn;
    var aynl = temp * this.aycof;
    var xlt = xl + xll;
    var ayn = e * Math.sin(omega) + aynl;

    // solve keplers equation

    var capu = (xlt-xnode)%(2.0*Math.PI);
    var temp2 = capu;
    var i;
    var temp3, temp4, temp5, temp6;
    var sinepw, cosepw;
    for (i=1; i<=10; i++){
        sinepw = Math.sin(temp2);
        cosepw = Math.cos(temp2);
        temp3 = axn * sinepw;
        temp4 = ayn * cosepw;
        temp5 = axn * cosepw;
        temp6 = ayn * sinepw;
        var epw = (capu - temp4 + temp3 - temp2)/(1.0 - temp5 - temp6) + temp2;
        if (Math.abs(epw - temp2) <= this.e6a){
            break;
        }
        temp2 = epw;
    }
     // short period preliminary quantities

    var ecose = temp5 + temp6;
    var esine = temp3 - temp4;
    var elsq = axn * axn + ayn * ayn;
    temp = 1.0 - elsq;
    var pl = a*temp;
    var r = a*(1.0 - ecose);
    var temp1 = 1.0/r;
    var rdot = this.xke * Math.sqrt(a) * esine * temp1;
    var rfdot = this.xke * Math.sqrt(pl) * temp1;
    temp2 = a*temp1;
    var betal = Math.sqrt(temp);
    temp3 = 1.0/(1.0 + betal);
    var cosu = temp2 * (cosepw - axn + ayn * esine * temp3);
    var sinu = temp2 * (sinepw - ayn - axn * esine * temp3);
    var u = Math.atan2(sinu,cosu);
    u += (u<0) ? 2* Math.PI : 0;
    var sin2u = 2.0 * sinu * cosu;
    var cos2u = 2.0 * cosu * cosu - 1.0;
    temp = 1.0/pl;
    temp1 = this.ck2 * temp;
    temp2 = temp1 * temp;

    // update for short periodics

    var rk = r*(1.0 - 1.5 * temp2 * betal * this.x3thm1) + 0.5 * temp1 * this.x1mth2 * cos2u;
    var uk = u-0.25 * temp2 * this.x7thm1 * sin2u;
    var xnodek = xnode + 1.5 * temp2 * this.cosio * sin2u;
    var xinck = this.xinc + 1.5 * temp2 * this.cosio * this.sinio * cos2u;
    var rdotk = rdot - xn * temp1 * this.x1mth2 * sin2u;
    var rfdotk = rfdot + xn * temp1 * (this.x1mth2 * cos2u + 1.5 * this.x3thm1);

    // orientation vectors

    var sinuk = Math.sin(uk);
    var cosuk = Math.cos(uk);
    var sinik = Math.sin(xinck);
    var cosik = Math.cos(xinck);
    var sinnok = Math.sin(xnodek);
    var cosnok = Math.cos(xnodek);
    var xmx = -sinnok * cosik;
    var xmy = cosnok * cosik;
    var ux = xmx * sinuk + cosnok * cosuk;
    var uy = xmy * sinuk + sinnok * cosuk;
    var uz = sinik * sinuk;
    var vx = xmx * cosuk - cosnok * sinuk;
    var vy = xmy * cosuk - sinnok * sinuk;
    var vz = sinik * cosuk;

    // position and velocity in km
    this.x = (rk * ux) * this.xkmper;
    this.y = (rk * uy) * this.xkmper;
    this.z = (rk * uz) * this.xkmper;
    this.xdot = (rdotk * ux + rfdotk * vx) * this.xkmper;
    this.ydot = (rdotk * uy + rfdotk * vy) * this.xkmper;
    this.zdot = (rdotk * uz + rfdotk * vz) * this.xkmper;

    /**
     * orbit period in seconds
     * @type {float}
     * @readonly
     */
    this.period = this.twopi * Math.sqrt(Math.pow(this.aodp * this.xkmper , 3)/398600.4);

    /**
     * velocity in km per second
     * @type {float}
     * @readonly
     */
    this.velocity = Math.sqrt(this.xdot*this.xdot + this.ydot*this.ydot + this.zdot*this.zdot) / 60; // kmps

    // lat, lon and altitude
    // based on http://www.celestrak.com/columns/v02n03/

    a = 6378.137;
    var b = 6356.7523142;
    var R = Math.sqrt(this.x*this.x + this.y*this.y);
    var f = (a - b)/a;
    var gmst = orbits.util.gmst(date);

    var e2 = ((2*f) - (f*f));
    var longitude = Math.atan2(this.y, this.x) - gmst;
    var latitude = Math.atan2(this.z, R);

    var C;
    var iterations = 20;
    while(iterations--) {
        C = 1 / Math.sqrt( 1 - e2*(Math.sin(latitude)*Math.sin(latitude)) );
        latitude = Math.atan2 (this.z + (a*C*e2*Math.sin(latitude)), R);
    }

    /**
     * Altitude in kms
     * @type {float}
     * @readonly
     */
    this.altitude = (R/Math.cos(latitude)) - (a*C);

    // convert from radii to degrees
    longitude  = (longitude / this.torad) % 360;
    if(longitude > 180) longitude = 360 - longitude;
    else if(longitude < -180) longitude = 360 + longitude;
    latitude  = (latitude / this.torad);

    /**
     * latitude in degrees
     * @type {float}
     * @readonly
     */
    this.latitude = latitude;

    /**
     * longtitude in degrees
     * @type {float}
     * @readonly
     */
    this.longitude = longitude;
};

/**
 * Change the datetime, or null for to use current
 * @param {Date} date
 */
orbits.Orbit.prototype.setDate = function(date) {
    this.date = date;
};

/**
 * get position
 * @returns {float[]} [latitude, longitude]
 */
orbits.Orbit.prototype.getPosition = function() {
    return [this.latitude, this.longitude];
};

/**
 * get position in LatLng
 * @returns {google.maps.LatLng}
 */
orbits.Orbit.prototype.getLatLng = function() {
    return new google.maps.LatLng(this.latitude, this.longitude);
};

/**
 * get altitude in km
 * @returns {float}
 */
orbits.Orbit.prototype.getAltitude = function() {
    return this.altitude;
};

/**
 * get velocity in km per seconds
 * @returns {float}
 */
orbits.Orbit.prototype.getVelocity = function() {
    return this.velocity;
};

/**
 *get period in seconds
 * @returns {float}
 */
orbits.Orbit.prototype.getPeriod = function() {
    return this.period;
};
