/* -*- mode: js2; js2-basic-offset: 4; indent-tabs-mode: nil -*- */

(function() {
var mobile = false;
var page;
var allTunes;
var filterText;
var rhythmFilter;
var studyOnly;
var selectedRow;
var currentObject;
var upIsBack = false;
var inEdit = false;
var editId = null;
var dialogUp = false;
var randomPosition = -1;
var randomRows = [];

var COLUMN_COUNT = 5;
var MOBILE_COLUMN_COUNT = 3;
var BASE_TITLE = "Owen Taylor's Tunebook";

RHYTHMS = {
    'air': "Airs",
    'barn dance': "Barn Dances",
    'fling': "Flings",
    'highland': "Highlands",
    'hornpipe': "Hornpipes",
    'jig': "Jigs",
    'march': "Marches",
    'mazurka': "Mazurkas",
    'piece': "Pieces",
    'polka': "Polkas",
    'reel': "Reels",
    'schottische': "Schottisches",
    'set dance': "Set Dances",
    'slide': "Slides",
    'slip jig': "Slip Jigs",
    'strathspey': "Strathspeys",
    'waltz': "Waltzes",
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
    " ",
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
    var newRhythm = $("#filterRhythm").val();

    if (newFilter == filterText && newStudyOnly == studyOnly && newRhythm == rhythmFilter)
        return;

    filterText = newFilter;
    studyOnly = newStudyOnly;
    rhythmFilter = newRhythm;

    refilter();
}

function refilter() {
    var filterRegexp = new RegExp(filterText, 'i');
    var filterFunction = function(tune) {
        if (studyOnly && tune.study != 1)
            return false;

        if (rhythmFilter != "all" && tune.rhythm != rhythmFilter)
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

                row.filtered = false;
                $(row).show();
            } else {
                row.filtered = true;
                $(row).hide();
            }
        }

        if (lastheader)
            $(lastheader).hide();
    }
}

function findRow(tuneId) {
    tuneId = parseInt(tuneId);

    var rows = document.getElementById("tuneBody").childNodes;
    for (var i = 0; i < rows.length; i++) {
        var row = rows[i];
        if (row.tune && row.tune.id == tuneId)
            return row;
    }

    return null;
}

function getRowY(row) {
    var parent = row;
    var rowY = 0;
    while (parent) {
        rowY += parent.offsetTop;
        parent = parent.offsetParent;
    }

    return rowY;
}

function scrollRowVisible(row) {
    var rowY = getRowY(row);
    var rowHeight = row.offsetHeight;

    var visibleMin = document.getElementById("headerDiv").offsetHeight + window.scrollY;
    var visibleMax = window.innerHeight + window.scrollY;

    if (rowY < visibleMin) {
        window.scrollTo(0, window.scrollY - (visibleMin - rowY));
    } else if (rowY + rowHeight > visibleMax) {
        window.scrollTo(0, window.scrollY + (rowY + rowHeight - visibleMax));
    }
}

function centerRow(row) {
    var rowY = getRowY(row);
    var rowHeight = row.offsetHeight;

    var visibleMin = document.getElementById("headerDiv").offsetHeight + window.scrollY;
    var visibleMax = window.innerHeight + window.scrollY;

    window.scrollTo(0, window.scrollY + ((rowY + rowHeight / 2) - (visibleMin + visibleMax) / 2));
}

function setCurrentObject(obj, changeHistory) {
    if (changeHistory === undefined)
        changeHistory = true;

    if (!mobile)
        changeHistory = false;

    if (currentObject == obj)
        return;

    var hadObject = !!currentObject;

    if (changeHistory && hadObject && !obj && upIsBack) {
        history.back();
        return;
    }

    if (!mobile) {
        if (obj && obj != 'new')
            scrollRowVisible(obj);

        if (selectedRow)
            $(selectedRow).removeClass("selected-row");
    }

    currentObject = obj;
    if (currentObject == 'new')
        selectedRow = null;
    else
        selectedRow = obj;

    if (!currentObject) {
        if (mobile)
            document.title = "Owen Taylor's Tunebook";

        if (hadObject) {
            /* If we go up, not via history.back() we are going *forward* */
            if (changeHistory)
                history.pushState(null, null, '?');

            upIsBack = false;
            randomRows = [];
            randomPosition = -1;

            $("#editAction").attr("disabled", 1);
            $("#deleteAction").attr("disabled", 1);

            $("#sideDiv").hide();
            $("#headerDiv").show();
            $("#tunesDiv").show();
        }

        return;
    }

    var id = (obj == 'new') ? 'new' : obj.tune.id;

    if (hadObject) {
        if (changeHistory)
            history.replaceState(id, null, '?tune=' + id);
    } else {
        $("#editAction").removeAttr("disabled");
        $("#deleteAction").removeAttr("disabled");

        if (mobile) {
            $("#sideDiv").show();
            $("#headerDiv").hide();
            $("#tunesDiv").hide();

            if (changeHistory) {
                history.pushState(id, null, '?tune=' + id);
                upIsBack = true;
            }
        }
    }

    if (mobile) {
        var name = (obj == 'new') ? 'New' : obj.tune.name;
        document.title = name + " - Owen Taylor's Tunebook";
    }

    if (selectedRow) {
        if (!mobile)
            $(selectedRow).addClass("selected-row");
        fillInfo(selectedRow.tune);
    }
}

function fillInfo(tune) {
    var infoDiv = $("#infoDiv");
    infoDiv.empty();

    var nameDiv = _make("div", "info-name");
    nameDiv.appendChild(_makeLevelSymbol(tune.level, tune.maxlevel));
    // \u2009 = THIN SPACE
    nameDiv.appendChild(_make("span", "info-name-text", "\u2009" + tune.name));
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

    if (tune.composer != null) {
        var composerDiv = _make("div", "info-composer");
        composerDiv.appendChild(_make("span", "info-label", "Composer: "));
        composerDiv.appendChild(_make("span", "info-value", tune.composer));
        infoDiv.append(composerDiv);
    }

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

function selectLevel(level) {
    $("#editLevelParent").children().removeClass("level-select-selected");
    $("#editLevel" + level).addClass("level-select-selected");
}
window.selectLevel = selectLevel;

function selectMaxlevel(level) {
    $("#editMaxlevelParent").children().removeClass("level-select-selected");
    $("#editMaxlevel" + level).addClass("level-select-selected");
}
window.selectMaxlevel = selectMaxlevel;

function getLevel() {
    var level;
    for (level = 1; level <= 5; level++) {
        if ($("#editLevel" + level).hasClass("level-select-selected"))
            return level;
    }

    throw new Error("No selected level");
}

function getMaxlevel() {
    var level;
    for (level = 1; level <= 5; level++) {
        if ($("#editMaxlevel" + level).hasClass("level-select-selected"))
            return level;
    }

    throw new Error("No selected maxlevel");
}

function fillEdit(tune) {
    $("#editName").val(tune.name != null ? tune.name : "");
    $("#editAka").val(tune.aka != null ? tune.aka : "");
    $("#editRhythm").val(tune.rhythm != null ? tune.rhythm : "reel");
    $("#editKey").val(tune.key != null ? tune.key : "");
    $("#editStructure").val(tune.structure != null ? tune.structure : "");
    $("#editComposer").val(tune.composer != null ? tune.composer : "");
    $("#editRefs").val(tune.refs != null ? tune.refs : "");
    $("#editIncipit").val(tune.incipit != null ? tune.incipit : "");
    $("#editSince").val(tune.since != null ? tune.since : "");
    var level = tune.level != null ? tune.level : 5;
    selectLevel(level);
    selectMaxlevel(tune.maxlevel != null ? tune.maxlevel : level);
    $("#editNotes").val(tune.notes != null ? tune.notes : "");
    if (tune.study)
        $("#editStudy").attr("checked", true);
    else
        $("#editStudy").removeAttr("checked");
}

function fetchEditData() {
    var result = {
        name: $("#editName").val(),
        aka: $("#editAka").val(),
        rhythm: $("#editRhythm").val(),
        key: $("#editKey").val(),
        structure: $("#editStructure").val(),
        composer: $("#editComposer").val(),
        refs: $("#editRefs").val(),
        incipit: $("#editIncipit").val(),
        since: $("#editSince").val(),
        level: getLevel(),
        maxlevel: getMaxlevel(),
        notes: $("#editNotes").val(),
        study: $("#editStudy").attr("checked") ? '1' : '0',
    };

    if (editId != null) {
        result.id = editId;
    }

    return result;
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
            } else if (m[2] != null) {
                linkifyAppendLink(parent,
                    "TS" + m[2],
                    "http://www.thesession.org/tunes/display/" + m[2]);
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

    if (!mobile) {
        td = document.createElement("td");
        if (tune.refs != null)
            linkify(tune.refs, td);
        tr.appendChild(td);
    }

    td = document.createElement("td");
    td.appendChild(document.createTextNode(name));
    if (tune.study == 1)
        td.className = "study-name";
    tr.appendChild(td);

    if (!mobile) {
        td = document.createElement("td");
        if (tune.since != null)
            td.appendChild(document.createTextNode(tune.since));
        tr.appendChild(td);
    }

    td = document.createElement("td");
    td.className = "tune-flags";
    flags = "";
    if (tune.incipit != null)
        flags += "\u266b"; // BEAMED EIGHTH NOTES
    if (tune.notes != null)
        flags += "\u270d"; // WRITING HAND

    td.appendChild(document.createTextNode(flags));
    tr.appendChild(td);

    $(tr).click(function(event) {
        if (!inEdit) {
            setCurrentObject(tr);
        }

        // Keeping the focus on an input area is necessary so that
        // we get keystrokes like Up/Down arrow keys. Unfortunately,
        $("#filterInput").focus();
    });

    $(tr).dblclick(function(event) {
        if (!inEdit) {
            setCurrentObject(tr);
            actionEdit(tr);
        } else {
            $("#filterInput").focus();
        }
    });

    return tr;
}

// When this is called:
//
//  - allTunes has been updated with the correct values
//  - any tunes that have been updated or changed have been removed
//    from the tune table (but headers may have been left)
//  - allTunes and the tune table are sorted in the same order
//
function updateTuneElements() {
    var i;
    var tuneBody = document.getElementById("tuneBody");

    var rhythm;
    var key;
    var tr;

    // Make a copy of the old rows, since deleting children may confuse things
    // element.childNodes() doesn't support slice() which we could use to
    // copy a normal array
    var tmp = tuneBody.childNodes;
    var oldRows = [];
    for (i = 0; i < tmp.length; i++) {
        oldRows.push(tmp[i]);
    }

    var oldIndex = 0;

    for (i = 0; i < allTunes.length; i++) {
        var tune = allTunes[i];

        var oldRow;
        if (oldIndex < oldRows.length)
            oldRow = oldRows[oldIndex];
        else
            oldRow = null;

        // See if we have any stale headers to remove
        if (oldRow && oldRow.tune == null) {
            if (oldRow.rhythm < tune.rhythm ||
                (oldRow.rhythm == tune.rhythm &&
                 oldRow.key < tune.key)) {
                $(oldRow).remove();
                oldIndex++;
                if (oldIndex < oldRows.length)
                    oldRow = oldRows[oldIndex];
                else
                    oldRow = null;
            }
        }

        if (tune.rhythm != rhythm || tune.key != key) {
            // Need a header

            if (oldRow && oldRow.tune == null &&
                oldRow.rhythm == tune.rhythm &&
                oldRow.key == tune.key) {
                // Already have the right header in the right place, may have to adjust its class
                tr = oldRow;
                oldIndex++;
                if (oldIndex < oldRows.length)
                    oldRow = oldRows[oldIndex];
                else
                    oldRow = null;
            } else {
                // Create a new header
                tr = document.createElement("tr");
                var th;

                th = document.createElement("th");
                th.appendChild(document.createTextNode(RHYTHMS[tune.rhythm] + " - " + tune.key));
                th.colSpan = mobile ? MOBILE_COLUMN_COUNT : COLUMN_COUNT;
                tr.appendChild(th);
                tr.rhythm = rhythm;
                tr.key = key;

                if (oldRow) {
                    $(oldRow).before(tr);
                } else {
                    tuneBody.appendChild(tr);
                }
            }


            if (tune.rhythm != rhythm) {
                tr.className = "section-header rhythm-header";
            } else {
                tr.className = "section-header";
            }

            rhythm = tune.rhythm;
            key = tune.key;
        }

        if (oldRow && oldRow.tune && oldRow.tune.id == tune.id) {
            // Already have this tune, skip it
            oldIndex++;
            if (oldIndex < oldRows.length)
                oldRow = oldRows[oldIndex];
            else
                oldRow = null;
        } else {
            // New tune to insert
            tr = createTuneRow(tune);
            if (oldRow) {
                $(oldRow).before(tr);
            } else {
                tuneBody.appendChild(tr);
            }

            if (selectedRow && selectedRow.tune.id == tune.id) {
                setCurrentObject(tr);
            }
        }
    }

    // Any remaining old tunes are dead headers
    for (; oldIndex < oldRows.length; oldIndex++) {
        $(oldRows[oldIndex]).remove();
    }
}

function updateTunes(tunes) {
    var i;
    var tune;
    var newTunes = {};
    var replacedTunes = {};
    for (i = 0; i < tunes.length; i++) {
        tune = tunes[i];
        newTunes[tune.id] = tune;
    }

    for (i = 0; i < allTunes.length; i++) {
        tune = allTunes[i];
        if (tune.id in newTunes) {
            allTunes[i] = newTunes[tune.id];
            delete newTunes[tune.id];
            replacedTunes[tune.id] = 1;
        }
    }

    for (id of newTunes) {
        allTunes.push(newTunes[id]);
    }

    allTunes.sort(compareTunes);

    // Remove the rows that are changed, so that the update is a pure insert of
    // new tunes
    $("#tuneBody").children().filter(function() {
        return this.tune != null && this.tune.id in replacedTunes;
    }).remove();

    updateTuneElements(allTunes);
    refilter();
}

function deleteTunes(ids) {
    var i;

    var deletedMap = {};
    for (i = 0; i < ids.length; i++) {
        deletedMap[ids[i]] = 1;
    }

    var newAllTunes = [];
    for (i = 0; i < allTunes.length; i++) {
        var tune = allTunes[i];
        if (!(tune.id in deletedMap))
            newAllTunes.push(tune);
    }

    allTunes = newAllTunes;

    $("#tuneBody").children().filter(function() {
        return this.tune != null && this.tune.id in deletedMap;
    }).remove();

    updateTuneElements(allTunes);
    refilter();
}

function getUsername() {
    var v = document.cookie;
    if (v == null)
        return null;

    // Strip surrounding whitespace
    v = v.replace(/^\s*(.*?)\s*$/, "$1");
    if (v == "")
        return null;

    var cookies = v.split(/\s*;\s*/);
    var i;
    for (i = 0; i < cookies.length; i++) {
        var m = cookies[i].match(/^tunes_auth\s*=\s*([a-zA-Z_.]+),/);
        if (m != null) {
            return m[1];
        }
    }

    return null;
}

// Fill in the Rhythm dropdrowns - do this dynamically to avoid
// having to maintain the rhythm list in the HTML as well
function createRhythmOptions() {
    var editRhythm = document.getElementById("editRhythm");
    var filterRhythm = document.getElementById("filterRhythm");
    var option;

    var rhythms = [];

    for (const rhythm of Object.keys(RHYTHMS))
        rhythms.push(rhythm);
    rhythms.sort();

    if (filterRhythm) {
        option = _make("option", null, "All");
        option.value = "all";
        filterRhythm.appendChild(option);
    }

    for (const rhythm of rhythms) {
        var rhythmName;
        if (rhythm == 'march')
            rhythmName = "March";
        else if (rhythm == 'waltz')
            rhythmName = "Waltz";
        else
            rhythmName = RHYTHMS[rhythm].slice(0, -1);

        if (editRhythm) {
            option = _make("option", null, rhythmName);
            option.value = rhythm;
            editRhythm.appendChild(option);
        }

        if (filterRhythm) {
            option = _make("option", null, RHYTHMS[rhythm]);
            option.value = rhythm;
            filterRhythm.appendChild(option);
        }
    }
}

function selectNext() {
    if (!selectedRow)
        return false;

    var node = selectedRow.nextSibling;
    while (node) {
        if (node.tune != null && !node.filtered) {
            setCurrentObject(node);
            return true;
        }
        node = node.nextSibling;
    }

    return false;
}

function selectPrevious() {
    if (!selectedRow)
        return false;

    var node = selectedRow.previousSibling;
    while (node) {
        if (node.tune != null && !node.filtered) {
            setCurrentObject(node);
            return true;
        }
        node = node.previousSibling;
    }

    return false;
}

function onpopstate(event) {
    if (event.state == null) {
        setCurrentObject(null, false);
    } else if (event.state == 'new') {
        actionNew(false);
    } else {
        var row = findRow(event.state);
        if (row) {
            setCurrentObject(row, false);
            return;
        }
    }
}

function selectInitial() {
    var queryParams = getQueryParams();
    if ('tune' in queryParams) {
        if (queryParams['tune'] == 'new') {
            actionNew(false);
            history.replaceState('new', null, '?tune=new');
        } else {
            var row = findRow(queryParams['tune']);
            if (row) {
                setCurrentObject(row, false);

                if (mobile) {
                    // Get the right state set in the history
                    history.replaceState(row.tune.id, null, '?tune=' + row.tune.id);
                }
            }
        }
    }
}

function init() {
    page = "index";

    var mediaTypeDiv = document.getElementById("mediaTypeDiv");
    if (window.getComputedStyle(mediaTypeDiv).fontWeight == 'bold' ||
        window.getComputedStyle(mediaTypeDiv).fontWeight == 700) {
        mobile = true;
        $("#sideDiv").hide();
        $("#tuneRefsCol").remove();
        $("#tuneSinceCol").remove();

        window.addEventListener('popstate', onpopstate, false);
    }

    $.getJSON("query.cgi",
        function(data) {
            data.sort(compareTunes);
            allTunes = data;
            updateTuneElements();
            filterChanged();
            selectInitial();
        });

    createRhythmOptions();

    $("#filterInput").focus();
    // Would have to catch oninput/onpaste to get paste right
    $("#filterInput").keyup(filterChanged);
    $("#filterInput").change(filterChanged);
    $("#studyOnly").change(filterChanged);

    $("#filterRhythm").val("all");
    $("#filterRhythm").change(filterChanged);

    username = getUsername();
    if (username != null) {
        $("#userSpan").text(username);
        $("#loginDiv").hide();
        $("#logoutDiv").show();
    }

    $(document.body).keydown(function(event) {
        if (dialogUp) {
            // This doens't work since we don't get the keystroke
            if (event.keyCode == 27 && inEdit) {
                dialogCancelClicked();
                event.preventDefault();
            }

            return;
        }

        if (selectedRow && !inEdit) {
            if (event.keyCode == 38) { // Up arrow
                event.preventDefault();
                event.stopPropagation();
                selectPrevious();
            } else if (event.keyCode == 40) { // Down arrow
                event.preventDefault();
                event.stopPropagation();
                selectNext();
            }
        }
        if (event.keyCode == 27 && inEdit) {
            actionCancel();
            event.preventDefault();
        }
        if (event.keyCode == 13 && event.ctrlKey && inEdit) {
            actionSave();
            event.preventDefault();
        }
    });
}
window.init = init;

function getQueryParams() {
    var query = window.location.search.substring(1);
    if (query == null || query == "")
        return {};

    var components = query.split(/&/);

    var params = {};
    var i;
    for (i = 0; i < components.length; i++) {
        var component = components[i];
        var m = component.match(/([^=]+)=(.*)/);
        if (m)
            params[m[1]] = decodeURIComponent(m[2]);
    }

    return params;
}

function buildQueryString(queryParams) {
    var result = null;

    var k;
    for (k of queryParams) {
        var component = k + "=" + encodeURIComponent(queryParams[k]);
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

function getNoQueryUrl() {
    var m = document.location.href.match(/([^?]*)/);
    return m[1];
}

function getBaseUrl() {
    var noQueryUrl = getNoQueryUrl();
    var m = noQueryUrl.match(/(.*\/)[^\/]*$/);
    return m[1];
}

function getRelativePath() {
    var noQueryUrl = getNoQueryUrl();
    var m = noQueryUrl.match(/.*\/([^\/]*)$/);
    return m[1];
}

function initEditPage() {
    page = "edit";

    var username = getUsername();
    if (username != null) {
        $("#userSpan").text(username);
    } else {
        if (document.location.search == null || document.location.search == "")
            url = "login.html?next=" + getRelativePath();
        else
            url = "login.html" + document.location.search + "&" + "next=" + getRelativePath();

        window.open(url, "_self", null);
    }

    createRhythmOptions();

    $("#homeLink").attr('href', getBaseUrl());
    $("#newLink").attr('href', getBaseUrl() + "edit.html");

    var queryParams = getQueryParams();

    if (queryParams.id) {
        $.getJSON("query.cgi?id=" + queryParams.id,
            function(tunes) {
                if (tunes.length > 0) {
                    var tune = tunes[0];
                    document.title = BASE_TITLE + " - Editing " + tune.name;
                    fillEdit(tune);
                    editId = tune.id;
                }
            });
    } else {
        document.title = BASE_TITLE + " - New Tune";

        if (!('name' in queryParams))
            queryParams.level = 5;
        if (!('level' in queryParams))
            queryParams.level = 5;

        fillEdit(queryParams);
    }

    inEdit = true;
    $("#editName").focus();
}
window.initEditPage = initEditPage;

function initLoginPage() {
    page = "login";

    var queryParams = getQueryParams();
    if ('next' in queryParams) {
        var next = queryParams['next'];
        delete queryParams['next'];
        $("#loginNextInput").val(next + buildQueryString(queryParams));
    }
}
window.initLoginPage = initLoginPage;

// Reload the content of the page, without trigger revalidation as document.location.reload()
function refresh() {
    window.open(document.location.href, "_self", null, true);
}

function logout() {
    document.cookie = "tunes_auth=";
    refresh();
}
window.logout = logout;

function editMode() {
    $("#infoDiv").hide();
    $("#editDiv").show();
    $("#editAction").hide();
    $("#deleteAction").hide();
    $("#newAction").hide();
    $("#cancelAction").show();
    $("#saveAction").show();
    $("#editName").focus();
}

function infoMode() {
    $("#infoDiv").show();
    $("#editDiv").hide();
    $("#editAction").show();
    $("#deleteAction").show();
    if (!mobile)
        $("#newAction").show();
    $("#cancelAction").hide();
    $("#saveAction").hide();
    $("#filterInput").focus();
}

function actionPrev() {
    if (randomPosition != -1) {
        if (randomPosition > 0) {
            randomPosition--;
            setCurrentObject(randomRows[randomPosition]);
        } else {
            selectRandom(type='prev');
        }
    } else {
        selectPrevious();
    }
}
window.actionPrev = actionPrev;

function actionUp() {
    setCurrentObject(null);
}
window.actionUp = actionUp;

function actionNext() {
    if (randomPosition != -1) {
        if (randomPosition < randomRows.length - 1) {
            randomPosition++;
            setCurrentObject(randomRows[randomPosition]);
        } else {
            selectRandom(type='next');
        }
    } else {
        selectNext();
    }
}
window.actionNext = actionNext;

function actionEdit() {
    if (!selectedRow)
        return;

    fillEdit(selectedRow.tune);
    editId = selectedRow.tune.id;
    inEdit = true;
    editMode();
}
window.actionEdit = actionEdit;

function actionDelete() {
    if (!selectedRow)
        return;

    $("#dialogMessageDiv").text("Really delete \u201c" + selectedRow.tune.name + "\u201d?");
    $("#dialogDiv").show();
    $("#dialogCancelButton").focus();
    dialogUp = true;
}
window.actionDelete = actionDelete;

function actionNew(changeHistory) {
    if (changeHistory === undefined)
        changeHistory = true;

    fillEdit({});
    setCurrentObject('new', changeHistory);
    inEdit = true;
    editMode();
}
window.actionCancel = actionCancel;

function actionCancel() {
    infoMode();
    editId = null;
    inEdit = false;
    if (currentObject == 'new')
        setCurrentObject(null);
}
window.actionNew = actionNew;

function actionSave() {
    $.ajax({
        url: "update.cgi",
        type: "POST",
        contentType: 'application/x-www-form-urlencoded; charset=UTF-8',
        data: fetchEditData(),
        dataType: "json",
        success: function(tune, status) {
            if (page == "edit") {
                if (editId) {
                    fillEdit(tune);
                    document.title = BASE_TITLE + " - Editing " + tune.name;
                } else {
                    // We reload to get a better URL and title
                    window.open(getNoQueryUrl() + "?id=" + tune.id, "_self", null);
                }
            } else {
                editId = null;
                inEdit = false;
                updateTunes([tune]);
                infoMode();
                if (currentObject == 'new' && mobile) {
                    var newRow = findRow(tune.id);
                    if (newRow)
                        setCurrentObject(newRow);
                    else
                        setCurrentObject(null);
                }
            }
        },
        error: function(request, textStatus, errorThrown) {
            alert(request.responseText);
        },
    });
}
window.actionSave = actionSave;

function dialogOKClicked() {
    $("#dialogDiv").hide();
    dialogUp = false;

    // Only one thing that the dialog does now, no need to generalize at the moment

    // Delete the selected row

    if (!selectedRow)
        return;

    var deletedId = selectedRow.tune.id;

    $.ajax({
        url: "update.cgi",
        type: "POST",
        contentType: 'application/x-www-form-urlencoded; charset=UTF-8',
        data: {
            action: 'delete',
            id: deletedId,
        },
        dataType: "json",
        success: function(tune, status) {
            if (selectedRow && selectedRow.tune.id == deletedId) {
                // Try to select some other row
                if (!selectNext() && !selectPrevious())
                    setCurrentObject(null);
            }

            deleteTunes([deletedId]);
        },
        error: function(request, textStatus, errorThrown) {
            alert(request.responseText);
        },
    });
}
window.dialogOKClicked = dialogOKClicked;

function dialogCancelClicked() {
    $("#dialogDiv").hide();
    dialogUp = false;
}
window.dialogCancelClicked = dialogCancelClicked;

function selectRandom(type) {
    var rows = document.getElementById("tuneBody").childNodes;
    var tuneRows = [];

    var i;
    for (i = 0; i < rows.length; i++) {
        var row = rows[i];
        if (row.tune && !row.filtered)
            tuneRows.push(i);
    }

    if (tuneRows.length == 0)
        return;


    var randIndex = Math.floor(Math.random() * tuneRows.length);
    var randomRow = rows[tuneRows[randIndex]];

    centerRow(randomRow);

    randomPosition = 0;
    setCurrentObject(randomRow);

    if (mobile) {
        if (type == 'prev') {
            randomRows.unshift(randomRow);
            randomPosition = 0;
        } else {
            randomRows.push(randomRow);
            randomPosition = randomRows.length - 1;
        }
    }
}
window.selectRandom = selectRandom;
})();
