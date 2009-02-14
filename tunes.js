/* -*- mode: js2; js2-basic-offset: 4; indent-tabs-mode: nil -*- */

var filterText;
var selectedRhythm;
var studyOnly;
var hoverRow;
var hoverTimeout;

var HOVER_TIME = 500;
var COLUMN_COUNT = 5;

RHYTHMS = {
    'hornpipe': "Hornpipes",
    'jig': "Jigs",
    'reel': "Reels",
    'slip jig': "Slip Jigs",
    'slide': "Slides",
    'mazurka': "Mazurkas"
};

function _make(element, cls, text) {
    var div = document.createElement(element);
    if (text != null)
        div.appendChild(document.createTextNode(text));
    if (cls)
        div.className = cls;

    return div;
}

var LEVEL_SYMBOLS = [
    "\u25cF", // BLACK CIRCLE
    "\u25d1", // CIRCLE WITH RIGHT HALF BLACK // \u25d0", // CIRCLE WITH LEFT HALF BLACK
    "\u25d4", // CIRCLE WITH RIGHT QUADRANT BLACK // \u2022", // BULLET
    "\u25cb", // WHITE CIRCLE // \u25e6", // WHITE BULLET
    " "
];

function _makeLevelSymbol(level, maxlevel) {
    var span = _make("span");

    if (maxlevel != null)
        span.appendChild(_make("span", "symbol-maxlevel", LEVEL_SYMBOLS[maxlevel - 1]));
    span.appendChild(_make("span", "symbol-level", LEVEL_SYMBOLS[level - 1]));

    return span;
}

function filterChanged() {
    var newFilter = $("#filterInput").val();
    var newStudyOnly = $("#studyOnly").attr('checked');

    if (newFilter == filterText && newStudyOnly == studyOnly)
        return;

    filterText = newFilter;
    studyOnly = newStudyOnly;

    refilter();
}

function refilter() {
    var filterRegexp = new RegExp(filterText, 'i');
    var filterFunction = function(tune) {
        if (studyOnly && tune.study != 1)
            return false;

        if (selectedRhythm != "all" && tune.rhythm != selectedRhythm)
            return false;

        return filterRegexp.test(tune.name) || (tune.aka != null && filterRegexp.test(tune.aka));
    };


    var tuneBody = document.getElementById("tuneBody");
    var rows = tuneBody.childNodes;
    var lastheader = null;
    var i;
    for (i = 0; i < rows.length; i++) {
        var row = rows[i];

        if (row.nodeType != Node.ELEMENT_NODE)
            continue;

        if (row.tune == null) {
            // A header
            if (lastheader)
                $(lastheader).hide();
            lastheader = row;
        } else {
            if (filterFunction(row.tune)) {
                // A visible tune
                if (lastheader) {
                    $(lastheader).show();
                    lastheader = null;
                }

                $(row).show();
            } else {
                $(row).hide();
            }
        }

      if (lastheader)
          $(lastheader).hide();
    }
}

function showHover(row) {
    var tune = row.tune;

    var infoDiv = $("#infoDiv");
    infoDiv.empty();

    var nameDiv = _make("div", "info-name");
    nameDiv.appendChild(_makeLevelSymbol(tune.level, tune.maxlevel));
    nameDiv.appendChild(_make("span", "info-name-text", "\u2009" + tune.name)); // \u2009 = THIN SPACE
    infoDiv.append(nameDiv);

    if (tune.aka != null) {
        var akas = tune.aka.split(/\s*;\s*/);
        var i;
        for (i = 0; i < akas.length; i++) {
            infoDiv.append(_make("div", "info-aka", akas[i]));
        }
    }

    var details = RHYTHMS[tune.rhythm].slice(0, -1) + " - " + tune.key;
    if (tune.structure)
        details += " - " + tune.structure;
    infoDiv.append(_make("div", "info-details", details));

    if (tune.refs != null) {
        var refsDiv = _make("div", "info-refs");
        linkify(tune.refs, refsDiv);
        infoDiv.append(refsDiv);
    }

    if (tune.incipit != null) {
        var incipitDiv = _make("div", "info-incipit");
        incipitDiv.appendChild(_make("span", "info-label", "Starts: "));
        incipitDiv.appendChild(_make("span", "info-value", tune.incipit));
        infoDiv.append(incipitDiv);
    }

    if (tune.since != null) {
        var sinceDiv = _make("div", "info-since");
        sinceDiv.appendChild(_make("span", "info-label", "Since: "));
        sinceDiv.appendChild(_make("span", "info-value", tune.since));
        infoDiv.append(sinceDiv);
    }

    if (tune.notes != null) {
        var notesDiv = _make("div", "info-notes");
        linkify(tune.notes, notesDiv);
        infoDiv.append(notesDiv);
    }
}

function setHoverRow(row) {
    if (row == hoverRow)
        return;

    if (hoverTimeout) {
        clearTimeout(hoverTimeout);
        hoverTimeout = null;
    }

    hoverRow = row;

    if (row) {
        hoverTimeout = setTimeout(function() {
                                      showHover(row);
                                  }, HOVER_TIME);
    }
}

function compareTunes(a, b) {
    if (a.rhythm < b.rhythm)
        return -1;
    else if (a.rhythm > b.rhythm)
        return 1;

    if (a.key < b.key)
        return -1;
    else if (a.key > b.key)
        return 1;

    if (a.name < b.name)
        return -1;
    else if (a.name > b.name)
        return 1;

    // Use id as a last resort to get stable comparison
    if (a.id < b.id)
        return -1;
    else if (a.name > b.name)
        return 1;

    return 0;
};

function linkifyAppendPlain(str, parent, start, end) {
    if (start == end)
        return;

    parent.appendChild(document.createTextNode(str.slice(start, end)));
}

function linkifyAppendLink(parent, text, href) {
    var a = document.createElement("a");
    a.appendChild(document.createTextNode(text));
    a.href = href;
    a.target = "_blank";
    parent.appendChild(a);
}

var LINKIFY_REGEXP = /(?:ng(\d+))|(?:ts(\d+))/g;

function linkify(str, parent) {
    LINKIFY_REGEXP.lastIndex = 0;
    while (true) {
        var start = LINKIFY_REGEXP.lastIndex;
        var m = LINKIFY_REGEXP.exec(str);
        if (m == null) {
            linkifyAppendPlain(str, parent, start, str.length);
            return;
        } else {
            linkifyAppendPlain(str, parent, start, m.index);
            if (m[1] != null) {
                linkifyAppendLink(parent,
                                  "NG" + m[1],
                                  "http://www.irishtune.info/tune/" + m[1] + "/");
            }
            else if (m[2] != null) {
                linkifyAppendLink(parent,
                                  "TS" + m[2],
                                  "http://www.thesession.org/tunes/display" + m[2]);
            }
        }
    }
}

function createTuneRow(tune) {
    var tr = document.createElement("tr");
    // Backreference for future use
    tr.tune = tune;

    var td;

    td = document.createElement("td");
    td.appendChild(_makeLevelSymbol(tune.level, tune.maxlevel));
    tr.appendChild(td);

    var name = tune.name;
    if (tune.aka != null)
        name += " (" + tune.aka + ")";

    td = document.createElement("td");
    if (tune.refs != null)
        linkify(tune.refs, td);
    tr.appendChild(td);

    td = document.createElement("td");
    td.appendChild(document.createTextNode(name));
    if (tune.study == 1)
        td.className = "study-name";
    tr.appendChild(td);

    td = document.createElement("td");
    if (tune.since != null)
        td.appendChild(document.createTextNode(tune.since));
    tr.appendChild(td);

    td = document.createElement("td");
    td.className = "tune-flags";
    flags = "";
    if (tune.incipit != null)
        flags += "\u266b"; // BEAMED EIGHTH NOTES
    if (tune.notes != null)
        flags += "\u270d"; // WRITING HAND

    td.appendChild(document.createTextNode(flags));
    tr.appendChild(td);

    $(tr).mouseover(function() {
        setHoverRow(tr);
    });

    $(tr).mouseout(function() {
        if (tr == hoverRow)
            setHoverRow(null);
    });

    return tr;
}

function createTuneElements(tunes) {
    var i;
    var tuneBody = document.getElementById("tuneBody");

    var rhythm;
    var key;

    for (i = 0; i < tunes.length; i++) {
        var tune = tunes[i];

        if (tune.rhythm != rhythm || tune.key != key) {
            var tr = document.createElement("tr");
            var th;

            if (tune.rhythm != rhythm) {
                tr.className = "section-header rhythm-header";
            } else {
                tr.className = "section-header";
            }

            th = document.createElement("th");
            th.appendChild(document.createTextNode(RHYTHMS[tune.rhythm] + " - " + tune.key));
            th.colSpan = COLUMN_COUNT;
            tr.appendChild(th);

            tuneBody.appendChild(tr);

            rhythm = tune.rhythm;
            key = tune.key;
        }

        tuneBody.appendChild(createTuneRow(tune));
    }
}

function selectRhythm(rhythm) {
    if (rhythm == selectedRhythm)
        return;

    selectedRhythm = rhythm;

    $("#rhythmDiv").children().removeClass("selected");
    $("#rhythmDiv").children().filter(function() {
        return this.rhythm == rhythm;
    }).addClass("selected");

    refilter();
}

function createRhythmLink(rhythm, text) {
    var a = document.createElement("a");
    a.href= "javascript:void(0)";
    a.appendChild(document.createTextNode(text));
    $(a).click(function() {
        selectRhythm(rhythm);
    });
    a.rhythm = rhythm;

    return a;
}

function getUsername() {
    var v = document.cookie;
    if (v == null)
        return null;

    // Strip surrounding whitespace
    v = v.replace(/^\s*(.*?)\s+$/, "$1");
    if (v == "")
        return null;

    var cookies = v.split("\s*;\s*");
    var i;
    for (i = 0; i < cookies.length; i++) {
        var m = cookies[i].match(/^tunes_auth\s*=\s*([a-zA-Z_.]+),/);
        if (m != null) {
            return m[1];
        }
    }

    return null;
}

function init() {
    $.getJSON("query.cgi",
        function(data) {
            data.sort(compareTunes);
            createTuneElements(data);
            filterChanged();
        });

    $("#filterInput").focus();
    // Would have to catch oninput/onpaste to get paste right
    $("#filterInput").keyup(function() { filterChanged(); });
    $("#filterInput").change(function() { filterChanged(); });
    $("#studyOnly").change(function() { filterChanged(); });

    var rythmDiv = document.getElementById("rhythmDiv");
    var rhythm;

    var rhythms = [];
    for (rhythm in RHYTHMS) {
        rhythms.push(rhythm);
    }

    rhythms.sort();

    rythmDiv.appendChild(createRhythmLink("all", "All"));
    var i;
    for (i = 0; i < rhythms.length; i++) {
        rhythm = rhythms[i];
        rythmDiv.appendChild(document.createTextNode(" "));
        rythmDiv.appendChild(createRhythmLink(rhythm, RHYTHMS[rhythm]));
    }

    selectRhythm("all");

    username = getUsername();
    if (username != null) {
        $("#userSpan").text(username);
        $("#loginDiv").hide();
        $("#logoutDiv").show();
    }
}

// Reload the content of the page, without trigger revalidation as document.location.reload()
function refresh() {
    window.open(document.location.href, "_self", null, true);
}

function logout() {
    document.cookie = "tunes_auth=";
    refresh();
}

function editMode() {
    $("#infoDiv").hide();
    $("#editDiv").show();
    $("#editAction").hide();
    $("#newAction").hide();
    $("#cancelAction").show();
    $("#saveAction").show();
}

function infoMode() {
    $("#infoDiv").show();
    $("#editDiv").hide();
    $("#editAction").show();
    $("#newAction").show();
    $("#cancelAction").hide();
    $("#saveAction").hide();
}

function actionEdit() {
    editMode();
}

function actionNew() {
    editMode();
}

function actionCancel() {
    infoMode();
}

function actionSave() {
    infoMode();
}
