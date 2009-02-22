/* -*- mode: js2; js2-basic-offset: 4; indent-tabs-mode: nil -*- */
// ==UserScript==

// @name           TuneMonkey
// @namespace      http://fishsoup.net/userscripts
// @description    Add/Edit tunes from irishtune.info and thesession.org
// @include        http://www.irishtune.info/tune/*
// @include        http://www.thesession.org/tunes/display/*

// You can change the base URL by setting the:
//
//    greasemonkey.scriptvals.http://fishsoup.net/userscripts/TuneMonkey.baseUrl
//
// preference in about:config
//
var baseUrl = GM_getValue("baseUrl", "http://tunes.fishsoup.net/");

function buildQueryString(tuneParams) {
    var result = null;

    var k;
    for (k in tuneParams) {
        var component = k + "=" + encodeURIComponent(tuneParams[k]);
        if (result == null)
            result = component;
        else
            result += "&" + component;
    }

    if (result == null)
        return "";
    else
        return "?" + result;
}

function createTuneDiv(tuneParams) {
    var tuneDiv = document.createElement("div");
    tuneDiv.id = "fishTunesDiv";
    tuneDiv.style.position = "fixed";
    tuneDiv.style.right = "0px";
    tuneDiv.style.bottom = "0px";
    tuneDiv.style.background = "white";
    tuneDiv.style.border = "1px solid black";
    tuneDiv.style.padding = "0.5em";

    var link = document.createElement("a");
    link.appendChild(document.createTextNode("Add to tunes"));
    link.href = baseUrl + "edit.html" + buildQueryString(tuneParams);
    link.target = "_blank";
    tuneDiv.appendChild(link);

    document.body.appendChild(tuneDiv);
}

function onTunesQueryResponse(tunes) {
    if (tunes.length == 0)
        return;

    var tuneDiv = document.getElementById("fishTunesDiv");
    tuneDiv.removeChild(tuneDiv.firstChild);

    var i;
    for (i = 0; i < tunes.length; i++) {
        var tune = tunes[i];
        var div = document.createElement("div");
        var a = document.createElement("a");
        a.appendChild(document.createTextNode(tune.name));
        a.href = baseUrl + "edit.html?id=" + tune.id;
        a.target = "_blank";
        div.appendChild(a);
        tuneDiv.appendChild(div);
    }
}

function queryTunes(ref) {
    GM_xmlhttpRequest({
        method: "GET",
        url: baseUrl + "query.cgi?ref=" + ref,
        onload: function(details) {
            if (details.status == 200) {
                // DO YOU TRUST tunes.fishsoup.net??? YOU BETTER
                var tunes = eval(details.responseText);
                    onTunesQueryResponse(tunes);
                }
        }
    });
}

function findTuneHeaderInfo() {
    var h1s = document.getElementsByTagName("h1");
    for (var i = 0; i < h1s.length; i++) {
        var text = h1s[i].textContent;
        m = text.match(/.*#\s*(\d+)\s+\(([^\)]*)\)\s*$/);
        if (m) {
            return [m[1], m[2]];
        }
    }

    return [null, null];
}

function findTuneBasicInfo() {
    var tables = document.getElementsByTagName("table");
    for (var i = 0; i < tables.length; i++) {
        var table = tables[i];
        if (table.className != "tuneinfo")
            continue;
        var trs = table.getElementsByTagName("tr");
        if (trs.length < 2)
            continue;
        var tr = trs[1];
        var tds = tr.getElementsByTagName("td");
        var data = [];
        for (var j = 0; j < tds.length; j++)
            data.push(tds[j].textContent);
        if (data.length == 1) { /* Rhythm */
            return [data[0], null, null];
        } else if (data.length == 2) { /* Rhythm, Key */
            return [data[0], data[1], null];
        } else if (data.length == 3) { /* Rhythm, Bars, Key */
            bars = parseInt(data[1]);
            if (bars == 16)
                structure = "AB";
            else if (bars == 24)
                structure = "ABC";
            else if (bars == 32)
                structure = "AABB";
            else if (bars == 40)
                structure = "ABCDE";
            else if (bars == 48)
                structure = "AABBCC";
            else if (bars == 56)
                structure = "ABCDEFG";
            else if (bars == 64)
                structure = "AABBCCDD";
            else if (bars == 80)
                structure = "AABBCCDDEE";
            else
                structure = null;

            return [data[0], data[2], structure];
        } else { /* Rhythm, Bars, Structure, Key */
            return [data[0], data[3], data[2]];
        }
    }

    return [null, null, null];
}

function findTuneComposer() {
    var divs = document.getElementsByTagName("div");
    for (var i = 0; i < divs.length; i++) {
        var div = divs[i];
        if (div.className == "data") {
            var m = div.textContent.match(/\(\s*composed by\s+(.*?)\s*\)/i);
                if (m)
                    return m[1];
                else
                    return null;
        }
    }

    return null;
}

function startIrishTunePage() {
    var headerInfo = findTuneHeaderInfo();
    var ngId = headerInfo[0]; var name = headerInfo[1];
    var basicInfo = findTuneBasicInfo();
    var rhythm = basicInfo[0]; var key = basicInfo[1]; var structure = basicInfo[2];
    var composer = findTuneComposer();

    var tuneParams = {};
    if (ngId != null)
        tuneParams['refs'] = 'ng' + ngId;
    if (name != null)
        tuneParams['name'] = name;
    if (rhythm != null)
        tuneParams['rhythm'] = rhythm.toLowerCase();
    if (key != null) {
        var m = key.match(/([ABCDEFG][b#]?)\s+([A-Z]+)/i);
        if (m)
            tuneParams['key'] = m[1] + m[2].slice(0,3).toLowerCase();
    }
    if (structure != null)
        tuneParams['structure'] = structure;
    if (composer != null)
        tuneParams['composer'] = composer;

    createTuneDiv(tuneParams);

    if (ngId != null)
        queryTunes("ng" + ngId);
}

function startTheSessionPage(tsId) {
    var abc = document.getElementById("abc");
    if (!abc)
        return;

    var lines = abc.textContent.split(/\n/);
    var i;
    var m;
    var title;
    var rhythm;
    var key;
    var composer;
    for (i = 0; i < lines.length; i++) {
        var line = lines[i];
        if (title == null) {
            m = line.match(/^T:\s*(.*?)\s*$/);
            if (m)
                    title = m[1];
        }
        if (rhythm == null) {
            m = line.match(/^R:\s*(.*?)\s*$/);
                if (m)
                    rhythm = m[1];
        }
        if (key == null) {
            m = line.match(/^K:\s*(.*?)\s*$/);
            if (m)
                key = m[1];
        }
        if (composer == null) {
            m = line.match(/^C:\s*(.*?)\s*$/);
            if (m)
                composer = m[1];
        }
    }

    var tuneParams = {};

    tuneParams['refs'] = 'ts' + tsId;

    if (title) {
        m = title.match(/^(.*?)\s*,\s*the\s*$/i);
        if (m) {
            title = "The " + m[1];
        }

        tuneParams['name'] = title;
    }

    if (key) {
        key = key.replace(/\s+/g, "");
        m = key.match(/^([A-G][b#]?)(.*)/);
        if (m) {
            if (m[2] == "")
                key = m[1] + "maj";
            else if (m[2] == "m")
                key = m[1] + "min";
            else
                key = m[1] + m[2].slice(0,3).toLowerCase();
            }

        tuneParams['key'] = key;
    }

    if (rhythm) {
        tuneParams['rhythm'] = rhythm.toLowerCase();
    }

    if (composer) {
        tuneParams['composer'] = composer.toLowerCase();
    }

    createTuneDiv(tuneParams);
    queryTunes("ts" + tsId);
}

var irishTune = /^http:\/\/www.irishtune.info\/tune\/([^/]+)/.exec(document.location.href);
if (irishTune) {
    startIrishTunePage();
}

var theSessionMatch = /^http:\/\/www.thesession.org\/tunes\/display\/([^/]+)/.exec(document.location.href);
if (theSessionMatch) {
    startTheSessionPage(theSessionMatch[1]);
}

// ==/UserScript==
