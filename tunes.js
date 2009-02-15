/* -*- mode: js2; js2-basic-offset: 4; indent-tabs-mode: nil -*- */

var allTunes;
var filterText;
var selectedRhythm;
var studyOnly;
var selectedRow;
var inEdit = false;
var editRow;

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

function selectRow(row) {
    if (selectedRow == row)
        return;

    if (selectedRow) {
        $(selectedRow).removeClass("selected-row");
    }

    selectedRow = row;

    if (!selectedRow) {
        $("#editAction").attr("disabled", 1);
        return;
    }

    $("#editAction").removeAttr("disabled");

    $(selectedRow).addClass("selected-row");
    fillInfo(row.tune);
}

function fillInfo(tune) {
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

function selectMaxlevel(level) {
    $("#editMaxlevelParent").children().removeClass("level-select-selected");
    $("#editMaxlevel" + level).addClass("level-select-selected");
}

function getLevel() {
    var level;
    for (level = 1; level <= 5; level++) {
        if ($("#editLevel" + level).hasClass("level-select-selected"))
            return level;
    }

    throw "No selected level";
}

function getMaxlevel() {
    var level;
    for (level = 1; level <= 5; level++) {
        if ($("#editMaxlevel" + level).hasClass("level-select-selected"))
            return level;
    }

    throw "No selected maxlevel";
}

function fillEdit(tune) {
    $("#editName").val(tune.name);
    $("#editAka").val(tune.aka != null ? tune.aka : "");
    $("#editRhythm").val(tune.rhythm);
    $("#editKey").val(tune.key);
    $("#editComposer").val(tune.composer != null ? tune.composer : "");
    $("#editRefs").val(tune.refs != null ? tune.refs : "");
    $("#editIncipit").val(tune.incipit != null ? tune.incipit : "");
    $("#editSince").val(tune.since != null ? tune.since : "");
    selectLevel(tune.level);
    selectMaxlevel(tune.maxlevel != null ? tune.maxlevel : tune.level);
    $("#editNotes").val(tune.notes != null ? tune.notes : "");
    if (tune.study)
        $("#editStudy").attr("checked", true);
    else
        $("#editStudy").removeAttr("checked");
}

function emptyEdit() {
    $("#editName").val("");
    $("#editAka").val("");
    $("#editRhythm").val("reel");
    $("#editKey").val("");
    $("#editComposer").val("");
    $("#editRefs").val("");
    $("#editIncipit").val("");
    $("#editSince").val("");
    selectLevel(5);
    selectMaxlevel(5);
    $("#editNotes").val("");
    $("#editStudy").removeAttr("checked");
}

function fetchEditData() {
    var result = {
        name : $("#editName").val(),
        aka : $("#editAka").val(),
        rhythm : $("#editRhythm").val(),
        key : $("#editKey").val(),
        composer : $("#editComposer").val(),
        refs : $("#editRefs").val(),
        incipit : $("#editIncipit").val(),
        since : $("#editSince").val(),
        level : getLevel(),
        maxlevel : getMaxlevel(),
        notes : $("#editNotes").val(),
        study : $("#editStudy").attr("checked") ? '1' : '0'
    };

    if (editRow != null) {
        result.id = editRow.tune.id;
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
            }
            else if (m[2] != null) {
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

    $(tr).click(function(event) {
        if (!inEdit) {
            selectRow(tr);
        }

        // Keeping the focus on an input area is necessary so that
        // we get keystrokes like Up/Down arrow keys. Unfortunately,
        $("#filterInput").focus();
    });

    $(tr).dblclick(function(event) {
        if (!inEdit) {
            selectRow(tr);
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

        var tr;
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
                th.colSpan = COLUMN_COUNT;
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
                selectRow(tr);
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

    for (id in newTunes) {
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
            allTunes = data;
            updateTuneElements();
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

    $(document.body).keydown(function(event) {
        if (selectedRow && !inEdit) {
            if (event.keyCode == 38) { // Up arrow
                event.preventDefault();
                event.stopPropagation();
                var node = selectedRow.previousSibling;
                while (node) {
                    if (node.tune != null && !node.filtered) {
                        selectRow(node);
                        break;
                    }
                    node = node.previousSibling;
                }
            }
            else if (event.keyCode == 40) { // Down arrow
                event.preventDefault();
                event.stopPropagation();
                var node = selectedRow.nextSibling;
                while (node) {
                    if (node.tune != null && !node.filtered) {
                        selectRow(node);
                        break;
                    }
                    node = node.nextSibling;
                }
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
    $("#editName").focus();
}

function infoMode() {
    $("#infoDiv").show();
    $("#editDiv").hide();
    $("#editAction").show();
    $("#newAction").show();
    $("#cancelAction").hide();
    $("#saveAction").hide();
    $("#filterInput").focus();
}

function actionEdit() {
    if (!selectedRow)
        return;

    fillEdit(selectedRow.tune);
    editRow = selectedRow;
    inEdit = true;
    editMode();
}

function actionNew() {
    emptyEdit();
    selectRow(null);
    inEdit = true;
    editMode();
}

function actionCancel() {
    infoMode();
    editRow = null;
    inEdit = false;
}

function actionSave() {
    $.ajax({
        url: "update.cgi",
        type: "POST",
        data: fetchEditData(),
        dataType: "json",
        success: function(tune, status) {
            editRow = null;
            inEdit = false;
            updateTunes([tune]);
            infoMode();
        },
        error: function(request, textStatus, errorThrown) {
            alert(request.responseText);
        }
    });
}
