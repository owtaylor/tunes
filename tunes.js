import {$} from "./dependencies.js";

const COLUMN_COUNT = 5;
const MOBILE_COLUMN_COUNT = 3;
const BASE_TITLE = "Owen Taylor's Tunebook";

const RHYTHMS = {
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

function foreachRhythm(callback) {
    const rhythms = [];

    for (const rhythm of Object.keys(RHYTHMS))
        rhythms.push(rhythm);
    rhythms.sort();

    for (const rhythm of rhythms) {
        let rhythmName;
        if (rhythm == 'march')
            rhythmName = "March";
        else if (rhythm == 'waltz')
            rhythmName = "Waltz";
        else
            rhythmName = RHYTHMS[rhythm].slice(0, -1);

        callback(rhythm, rhythmName, RHYTHMS[rhythm]);
    }
}

function _make(element, cls, text) {
    const div = document.createElement(element);
    if (text != null)
        div.appendChild(document.createTextNode(text));
    if (cls)
        div.className = cls;

    return div;
}

const LEVEL_SYMBOLS = [
    "\u25cF", // BLACK CIRCLE
    "\u25d1", // CIRCLE WITH RIGHT HALF BLACK // \u25d0", // CIRCLE WITH LEFT HALF BLACK
    "\u25d4", // CIRCLE WITH RIGHT QUADRANT BLACK // \u2022", // BULLET
    "\u25cb", // WHITE CIRCLE // \u25e6", // WHITE BULLET
    " ",
];

function _makeLevelSymbol(level, maxlevel) {
    const span = _make("span");

    if (maxlevel != null)
        span.appendChild(_make("span", "symbol-maxlevel", LEVEL_SYMBOLS[maxlevel - 1]));
    span.appendChild(_make("span", "symbol-level", LEVEL_SYMBOLS[level - 1]));

    return span;
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

function getQueryParams() {
    const query = window.location.search.substring(1);
    if (query == null || query == "")
        return {};

    const components = query.split(/&/);

    const params = {};
    for (const component of components) {
        const m = component.match(/([^=]+)=(.*)/);
        if (m)
            params[m[1]] = decodeURIComponent(m[2]);
    }

    return params;
}

function buildQueryString(queryParams) {
    let result = null;

    for (const k of Object.keys(queryParams)) {
        const component = k + "=" + encodeURIComponent(queryParams[k]);
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
    const m = document.location.href.match(/([^?]*)/);
    return m[1];
}

function getBaseUrl() {
    const noQueryUrl = getNoQueryUrl();
    const m = noQueryUrl.match(/(.*\/)[^\/]*$/);
    return m[1];
}

function getRelativePath() {
    const noQueryUrl = getNoQueryUrl();
    const m = noQueryUrl.match(/.*\/([^\/]*)$/);
    return m[1];
}

function linkifyAppendPlain(str, parent, start, end) {
    if (start == end)
        return;

    parent.appendChild(document.createTextNode(str.slice(start, end)));
}

function linkifyAppendLink(parent, text, href) {
    const a = document.createElement("a");
    a.appendChild(document.createTextNode(text));
    a.href = href;
    a.target = "_blank";
    parent.appendChild(a);
}

const LINKIFY_REGEXP = /(?:ng(\d+))|(?:ts(\d+))/g;

function linkify(str, parent) {
    LINKIFY_REGEXP.lastIndex = 0;
    while (true) {
        const start = LINKIFY_REGEXP.lastIndex;
        const m = LINKIFY_REGEXP.exec(str);
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

function getUsername() {
    let v = document.cookie;
    if (v == null)
        return null;

    // Strip surrounding whitespace
    v = v.replace(/^\s*(.*?)\s*$/, "$1");
    if (v == "")
        return null;

    const cookies = v.split(/\s*;\s*/);
    for (const cookie of cookies) {
        const m = cookie.match(/^tunes_auth\s*=\s*([a-zA-Z_.]+),/);
        if (m != null) {
            return m[1];
        }
    }

    return null;
}

function logout() {
    document.cookie = "tunes_auth=";
    refresh();
}

// Reload the content of the page, without trigger revalidation as document.location.reload()
function refresh() {
    window.open(document.location.href, "_self");
}

export class IndexPage {
    constructor() {
        this.mobile = false;

        this.tunesById = {};
        this.allTunes = [];
        this.currentObject = null;

        this.randomPosition = -1;
        this.randomRows = [];

        this.upIsBack = false;
        this.dialogUp = false;
        /** @type {HTMLElement} */
        this.selectedRow = null;

        this.filterText = null;
        this.studyOnly = null;
        this.rhythmFilter = null;

        this.inEdit = false;
        this.editPage = new EditPage();
    }

    filterChanged() {
        const newFilter = $("#filterInput").val();
        const newStudyOnly = $("#studyOnly").attr('checked');
        const newRhythm = $("#filterRhythm").val();

        if (newFilter == this.filterText &&
                newStudyOnly == this.studyOnly &&
                newRhythm == this.rhythmFilter)
            return;

        this.filterText = newFilter;
        this.studyOnly = newStudyOnly;
        this.rhythmFilter = newRhythm;

        this.refilter();
    }

    getTuneRows() {
        return /** @type {NodeListOf<HTMLElement>} */(document.querySelectorAll("#tuneBody > tr"));
    }

    refilter() {
        const filterRegexp = new RegExp(this.filterText, 'i');
        const filterFunction = (tune) => {
            if (this.studyOnly && tune.study != 1)
                return false;

            if (this.rhythmFilter != "all" && tune.rhythm != this.rhythmFilter)
                return false;

            return (filterRegexp.test(tune.name) ||
                    (tune.aka != null && filterRegexp.test(tune.aka)));
        };

        const rows = this.getTuneRows();
        let lastheader = null;
        for (const row of rows) {
            const tuneId = row.dataset.tuneId;

            if (tuneId == null) {
                // A header
                if (lastheader)
                    $(lastheader).hide();
                lastheader = row;
            } else {
                const tune = this.tunesById[tuneId];
                if (filterFunction(tune)) {
                    // A visible tune
                    if (lastheader) {
                        $(lastheader).show();
                        lastheader = null;
                    }

                    row.dataset.filtered = "";
                    $(row).show();
                } else {
                    row.dataset.filtered = "true";
                    $(row).hide();
                }
            }

            if (lastheader)
                $(lastheader).hide();
        }
    }

    findRow(tuneId) {
        const rows = this.getTuneRows();
        for (const row of rows) {
            if (row.dataset.tuneId == tuneId + "")
                return row;
        }

        return null;
    }

    getRowY(row) {
        let parent = row;
        let rowY = 0;
        while (parent) {
            rowY += parent.offsetTop;
            parent = parent.offsetParent;
        }

        return rowY;
    }

    scrollRowVisible(row) {
        const rowY = this.getRowY(row);
        const rowHeight = row.offsetHeight;

        const visibleMin = document.getElementById("headerDiv").offsetHeight + window.scrollY;
        const visibleMax = window.innerHeight + window.scrollY;

        if (rowY < visibleMin) {
            window.scrollTo(0, window.scrollY - (visibleMin - rowY));
        } else if (rowY + rowHeight > visibleMax) {
            window.scrollTo(0, window.scrollY + (rowY + rowHeight - visibleMax));
        }
    }

    centerRow(row) {
        const rowY = this.getRowY(row);
        const rowHeight = row.offsetHeight;

        const visibleMin = document.getElementById("headerDiv").offsetHeight + window.scrollY;
        const visibleMax = window.innerHeight + window.scrollY;

        window.scrollTo(
            0, window.scrollY + ((rowY + rowHeight / 2) - (visibleMin + visibleMax) / 2)
        );
    }

    setCurrentObject(obj, changeHistory=true) {
        if (!this.mobile)
            changeHistory = false;

        if (this.currentObject == obj)
            return;

        const hadObject = !!this.currentObject;

        if (changeHistory && hadObject && !obj && this.upIsBack) {
            history.back();
            return;
        }

        if (!this.mobile) {
            if (obj && obj != 'new')
                this.scrollRowVisible(obj);

            if (this.selectedRow)
                $(this.selectedRow).removeClass("selected-row");
        }

        this.currentObject = obj;
        if (this.currentObject == 'new')
            this.selectedRow = null;
        else
            this.selectedRow = obj;

        if (!this.currentObject) {
            if (this.mobile)
                document.title = "Owen Taylor's Tunebook";

            if (hadObject) {
                /* If we go up, not via history.back() we are going *forward* */
                if (changeHistory)
                    history.pushState(null, null, '?');

                this.upIsBack = false;
                this.randomRows = [];
                this.randomPosition = -1;

                $("#editAction").attr("disabled", 1);
                $("#deleteAction").attr("disabled", 1);

                $("#sideDiv").hide();
                $("#headerDiv").show();
                $("#tunesDiv").show();
            }

            return;
        }

        const id = (obj == 'new') ? 'new' : obj.dataset.tuneId;
        const tune = id == 'new' ? null : this.tunesById[id];

        if (hadObject) {
            if (changeHistory)
                history.replaceState(id, null, '?tune=' + id);
        } else {
            $("#editAction").removeAttr("disabled");
            $("#deleteAction").removeAttr("disabled");

            if (this.mobile) {
                $("#sideDiv").show();
                $("#headerDiv").hide();
                $("#tunesDiv").hide();

                if (changeHistory) {
                    history.pushState(id, null, '?tune=' + id);
                    this.upIsBack = true;
                }
            }
        }

        if (this.mobile) {
            const name = (obj == 'new') ? 'New' : tune.name;
            document.title = name + " - Owen Taylor's Tunebook";
        }

        if (this.selectedRow) {
            if (!this.mobile)
                $(this.selectedRow).addClass("selected-row");
            this.fillInfo(tune);
        }
    }

    fillInfo(tune) {
        const infoDiv = $("#infoDiv");
        infoDiv.empty();

        const nameDiv = _make("div", "info-name");
        nameDiv.appendChild(_makeLevelSymbol(tune.level, tune.maxlevel));
        // \u2009 = THIN SPACE
        nameDiv.appendChild(_make("span", "info-name-text", "\u2009" + tune.name));
        infoDiv.append(nameDiv);

        if (tune.aka != null) {
            const akas = tune.aka.split(/\s*;\s*/);
            for (const aka of akas) {
                infoDiv.append(_make("div", "info-aka", aka));
            }
        }

        let details = RHYTHMS[tune.rhythm].slice(0, -1) + " - " + tune.key;
        if (tune.structure)
            details += " - " + tune.structure;
        infoDiv.append(_make("div", "info-details", details));

        if (tune.composer != null) {
            const composerDiv = _make("div", "info-composer");
            composerDiv.appendChild(_make("span", "info-label", "Composer: "));
            composerDiv.appendChild(_make("span", "info-value", tune.composer));
            infoDiv.append(composerDiv);
        }

        if (tune.refs != null) {
            const refsDiv = _make("div", "info-refs");
            linkify(tune.refs, refsDiv);
            infoDiv.append(refsDiv);
        }

        if (tune.incipit != null) {
            const incipitDiv = _make("div", "info-incipit");
            incipitDiv.appendChild(_make("span", "info-label", "Starts: "));
            incipitDiv.appendChild(_make("span", "info-value", tune.incipit));
            infoDiv.append(incipitDiv);
        }

        if (tune.since != null) {
            const sinceDiv = _make("div", "info-since");
            sinceDiv.appendChild(_make("span", "info-label", "Since: "));
            sinceDiv.appendChild(_make("span", "info-value", tune.since));
            infoDiv.append(sinceDiv);
        }

        if (tune.notes != null) {
            const notesDiv = _make("div", "info-notes");
            linkify(tune.notes, notesDiv);
            infoDiv.append(notesDiv);
        }
    }

    createTuneRow(tune) {
        const tr = document.createElement("tr");
        // Backreference for future use
        tr.dataset.tuneId = tune.id;

        {
            const td = document.createElement("td");
            td.appendChild(_makeLevelSymbol(tune.level, tune.maxlevel));
            tr.appendChild(td);
        }

        let name = tune.name;
        if (tune.aka != null)
            name += " (" + tune.aka + ")";

        if (!this.mobile) {
            const td = document.createElement("td");
            if (tune.refs != null)
                linkify(tune.refs, td);
            tr.appendChild(td);
        }

        {
            const td = document.createElement("td");
            td.appendChild(document.createTextNode(name));
            if (tune.study == 1)
                td.className = "study-name";
            tr.appendChild(td);
        }

        if (!this.mobile) {
            const td = document.createElement("td");
            if (tune.since != null)
                td.appendChild(document.createTextNode(tune.since));
            tr.appendChild(td);
        }

        {
            const td = document.createElement("td");
            td.className = "tune-flags";
            let flags = "";
            if (tune.incipit != null)
                flags += "\u266b"; // BEAMED EIGHTH NOTES
            if (tune.notes != null)
                flags += "\u270d"; // WRITING HAND

            td.appendChild(document.createTextNode(flags));
            tr.appendChild(td);
        }

        $(tr).click((event) => {
            if (!this.inEdit) {
                this.setCurrentObject(tr);
            }

            // Keeping the focus on an input area is necessary so that
            // we get keystrokes like Up/Down arrow keys. Unfortunately,
            $("#filterInput").focus();
        });

        $(tr).dblclick((event) => {
            if (!this.inEdit) {
                this.setCurrentObject(tr);
                this.actionEdit();
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
    updateTuneElements() {
        const tuneBody = document.getElementById("tuneBody");

        let rhythm;
        let key;
        let tr;

        // Make a copy of the old rows, since deleting children may confuse things
        // NodeListOf<HTMLElement> doesn't support slice() which we could use to
        // copy a normal array
        const tmp = this.getTuneRows();
        const oldRows = [];
        for (const row of tmp) {
            oldRows.push(row);
        }

        let oldIndex = 0;

        for (const tune of this.allTunes) {
            let oldRow;
            if (oldIndex < oldRows.length)
                oldRow = oldRows[oldIndex];
            else
                oldRow = null;

            // See if we have any stale headers to remove
            if (oldRow && oldRow.dataset.tuneId == null) {
                if (oldRow.dataset.rhythm < tune.rhythm ||
                    (oldRow.dataset.rhythm == tune.rhythm &&
                     oldRow.dataset.key < tune.key)) {
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

                if (oldRow && oldRow.dataset.tuneId == null &&
                    oldRow.dataset.rhythm == tune.rhythm &&
                    oldRow.dataset.key == tune.key) {
                    // Already have the right header in the right place,
                    // may have to adjust its class
                    tr = oldRow;
                    oldIndex++;
                    if (oldIndex < oldRows.length)
                        oldRow = oldRows[oldIndex];
                    else
                        oldRow = null;
                } else {
                    // Create a new header
                    tr = document.createElement("tr");

                    const th = document.createElement("th");
                    th.appendChild(
                        document.createTextNode(RHYTHMS[tune.rhythm] + " - " + tune.key)
                    );
                    th.colSpan = this.mobile ? MOBILE_COLUMN_COUNT : COLUMN_COUNT;
                    tr.appendChild(th);
                    tr.dataset.rhythm = rhythm;
                    tr.dataset.key = key;

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

            if (oldRow && oldRow.dataset.tuneId == tune.id) {
                // Already have this tune, skip it
                oldIndex++;
                if (oldIndex < oldRows.length)
                    oldRow = oldRows[oldIndex];
                else
                    oldRow = null;
            } else {
                // New tune to insert
                tr = this.createTuneRow(tune);
                if (oldRow) {
                    $(oldRow).before(tr);
                } else {
                    tuneBody.appendChild(tr);
                }

                if (this.selectedRow && this.selectedRow.dataset.tuneId == tune.id) {
                    this.setCurrentObject(tr);
                }
            }
        }

        // Any remaining old tunes are dead headers
        for (; oldIndex < oldRows.length; oldIndex++) {
            $(oldRows[oldIndex]).remove();
        }
    }

    removeMatchingRows(toRemove) {
        for (const row of this.getTuneRows()) {
            if (row.dataset.tuneId in toRemove) {
                row.parentNode.removeChild(row);
            }
        }
    }

    updateTunes(tunes) {
        const newTunes = {};
        const replacedTunes = {};
        for (const tune of tunes) {
            newTunes[tune.id] = tune;
        }

        for (let i = 0; i < this.allTunes.length; i++) {
            const tune = this.allTunes[i];
            if (tune.id in newTunes) {
                this.allTunes[i] = newTunes[tune.id];
                this.tunesById[tune.id] = newTunes[tune.id];
                delete newTunes[tune.id];
                replacedTunes[tune.id] = 1;
            }
        }

        for (const tune of Object.values(newTunes)) {
            this.allTunes.push(tune);
            this.tunesById[tune.id] = tune;
        }

        this.allTunes.sort(compareTunes);

        // Remove the rows that are changed, so that the update is a pure insert of
        // new tunes
        this.removeMatchingRows(replacedTunes);

        this.updateTuneElements();
        this.refilter();
    }

    deleteTunes(ids) {
        const deletedMap = {};
        for (const id of ids) {
            delete this.tunesById[id];
            deletedMap[id] = 1;
        }

        const newAllTunes = [];
        for (const tune of this.allTunes) {
            if (!(tune.id in deletedMap))
                newAllTunes.push(tune);
        }

        this.allTunes = newAllTunes;

        this.removeMatchingRows(deletedMap);

        this.updateTuneElements();
        this.refilter();
    }

    // Fill in the Rhythm dropdrown - do this dynamically to avoid
    // having to maintain the rhythm list in the HTML as well
    createRhythmOptions() {
        const filterRhythm = document.getElementById("filterRhythm");

        const addOption = (rhythm, rythmName, rhythmNamePlural) => {
            const option = _make("option", null, rhythmNamePlural);
            option.value = rhythm;
            filterRhythm.appendChild(option);
        };

        addOption("all", null, "All");
        foreachRhythm(addOption);

        this.editPage.createRhythmOptions();
    }

    selectNext() {
        if (!this.selectedRow)
            return false;

        let node = /** @type {HTMLElement} */(this.selectedRow.nextSibling);
        while (node) {
            if (node.dataset.tuneId != null && !node.dataset.filtered) {
                this.setCurrentObject(node);
                return true;
            }
            node = /** @type {HTMLElement} */(node.nextSibling);
        }

        return false;
    }

    selectPrevious() {
        if (!this.selectedRow)
            return false;

        let node = /** @type {HTMLElement} */(this.selectedRow.previousSibling);
        while (node) {
            if (node.dataset.tuneId != null && !node.dataset.filtered) {
                this.setCurrentObject(node);
                return true;
            }
            node = /** @type {HTMLElement} */(node.previousSibling);
        }

        return false;
    }

    onpopstate(event) {
        if (event.state == null) {
            this.setCurrentObject(null, false);
        } else if (event.state == 'new') {
            this.actionNew(false);
        } else {
            const row = this.findRow(event.state);
            if (row) {
                this.setCurrentObject(row, false);
                return;
            }
        }
    }

    selectInitial() {
        const queryParams = getQueryParams();
        if ('tune' in queryParams) {
            if (queryParams['tune'] == 'new') {
                this.actionNew(false);
                history.replaceState('new', null, '?tune=new');
            } else {
                const row = this.findRow(queryParams['tune']);
                if (row) {
                    this.setCurrentObject(row, false);

                    if (this.mobile) {
                        // Get the right state set in the history
                        history.replaceState(
                            row.dataset.tuneId, null, '?tune=' + row.dataset.tuneId
                        );
                    }
                }
            }
        }
    }

    init() {
        const mediaTypeDiv = document.getElementById("mediaTypeDiv");
        if (window.getComputedStyle(mediaTypeDiv).fontWeight == 'bold' ||
            window.getComputedStyle(mediaTypeDiv).fontWeight == "700") {
            this.mobile = true;
            $("#sideDiv").hide();
            $("#tuneRefsCol").remove();
            $("#tuneSinceCol").remove();

            window.addEventListener('popstate', onpopstate, false);
        }

        $.getJSON("query.cgi",
            (data) => {
                this.updateTunes(data);
                this.selectInitial();
            });

        this.createRhythmOptions();
        this.filterChanged();

        $("#editAction").click(() => this.actionEdit());
        $("#deleteAction").click(() => this.actionDelete());
        $("#newAction").click(() => this.actionNew());
        $("#newActionUserDiv").click(() => this.actionNew());
        $("#cancelAction").click(() => this.actionCancel());
        $("#saveAction").click(() => this.actionSave());
        $("#prevAction").click(() => this.actionPrev());
        $("#upAction").click(() => this.actionUp());
        $("#nextAction").click(() => this.actionNext());
        $("#selectRandomAction").click(() => this.selectRandom());

        $("#logoutAction").click(logout);

        $("#dialogCancelButton").click(() => this.dialogCancelClicked());
        $("#dialogOKButton").click(() => this.dialogOKClicked());

        this.editPage.addLevelListeners();

        $("#filterInput").focus();
        // Would have to catch oninput/onpaste to get paste right
        $("#filterInput").keyup(() => this.filterChanged());
        $("#filterInput").change(() => this.filterChanged());
        $("#studyOnly").change(() => this.filterChanged());

        $("#filterRhythm").val("all");
        $("#filterRhythm").change(() => this.filterChanged());

        const username = getUsername();
        if (username != null) {
            $("#userSpan").text(username);
            $("#loginDiv").hide();
            $("#logoutDiv").show();
        }

        $(document.body).keydown((event) => {
            if (this.dialogUp) {
                // This doens't work since we don't get the keystroke
                if (event.keyCode == 27 && this.inEdit) {
                    this.dialogCancelClicked();
                    event.preventDefault();
                }

                return;
            }

            if (this.selectedRow && !this.inEdit) {
                if (event.keyCode == 38) { // Up arrow
                    event.preventDefault();
                    event.stopPropagation();
                    this.selectPrevious();
                } else if (event.keyCode == 40) { // Down arrow
                    event.preventDefault();
                    event.stopPropagation();
                    this.selectNext();
                }
            }
            if (event.keyCode == 27 && this.inEdit) {
                this.actionCancel();
                event.preventDefault();
            }
            if (event.keyCode == 13 && event.ctrlKey && this.inEdit) {
                this.actionSave();
                event.preventDefault();
            }
        });
    }

    editMode() {
        $("#infoDiv").hide();
        $("#editDiv").show();
        $("#editAction").hide();
        $("#deleteAction").hide();
        $("#newAction").hide();
        $("#cancelAction").show();
        $("#saveAction").show();
        $("#editName").focus();
    }

    infoMode() {
        $("#infoDiv").show();
        $("#editDiv").hide();
        $("#editAction").show();
        $("#deleteAction").show();
        if (!this.mobile)
            $("#newAction").show();
        $("#cancelAction").hide();
        $("#saveAction").hide();
        $("#filterInput").focus();
    }

    actionPrev() {
        if (this.randomPosition != -1) {
            if (this.randomPosition > 0) {
                this.randomPosition--;
                this.setCurrentObject(this.randomRows[this.randomPosition]);
            } else {
                this.selectRandom('prev');
            }
        } else {
            this.selectPrevious();
        }
    }

    actionUp() {
        this.setCurrentObject(null);
    }

    actionNext() {
        if (this.randomPosition != -1) {
            if (this.randomPosition < this.randomRows.length - 1) {
                this.randomPosition++;
                this.setCurrentObject(this.randomRows[this.randomPosition]);
            } else {
                this.selectRandom('next');
            }
        } else {
            this.selectNext();
        }
    }

    actionNew(changeHistory) {
        if (changeHistory === undefined)
            changeHistory = true;

        this.editPage.fillEdit();

        this.setCurrentObject('new', changeHistory);
        this.inEdit = true;
        this.editMode();
    }

    actionEdit() {
        if (!this.selectedRow)
            return;

        const tune = this.tunesById[this.selectedRow.dataset.tuneId];
        this.editPage.fillEdit(tune);
        this.inEdit = true;
        this.editMode();
    }

    actionSave() {
        this.editPage.save((tune) => {
            this.inEdit = false;
            this.updateTunes([tune]);
            this.infoMode();
            if (this.currentObject == 'new' && this.mobile) {
                const newRow = this.findRow(tune.id);
                if (newRow)
                    this.setCurrentObject(newRow);
                else
                    this.setCurrentObject(null);
            }
        });
    }

    actionCancel() {
        this.infoMode();
        this.inEdit = false;
        if (this.currentObject == 'new')
            this.setCurrentObject(null);
    }

    actionDelete() {
        if (!this.selectedRow)
            return;

        const tune = this.tunesById[this.selectedRow.dataset.tuneId];
        $("#dialogMessageDiv").text(
            "Really delete \u201c" + tune.name + "\u201d?"
        );
        $("#dialogDiv").show();
        $("#dialogCancelButton").focus();
        this.dialogUp = true;
    }

    dialogOKClicked() {
        $("#dialogDiv").hide();
        this.dialogUp = false;

        // Only one thing that the dialog does now, no need to generalize at the moment

        // Delete the selected row

        if (!this.selectedRow)
            return;

        const deletedId = this.selectedRow.dataset.tuneId;

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
                if (this.selectedRow && this.selectedRow.tune.id == deletedId) {
                    // Try to select some other row
                    if (!this.selectNext() && !this.selectPrevious())
                        this.setCurrentObject(null);
                }

                this.deleteTunes([deletedId]);
            },
            error: function(request, textStatus, errorThrown) {
                alert(request.responseText);
            },
        });
    }

    dialogCancelClicked() {
        $("#dialogDiv").hide();
        this.dialogUp = false;
    }

    selectRandom(type) {
        const rows = this.getTuneRows();
        const tuneRows = [];

        for (const row of rows) {
            if (row.dataset.tuneId && !row.dataset.filtered)
                tuneRows.push(row);
        }

        if (tuneRows.length == 0)
            return;

        const randIndex = Math.floor(Math.random() * tuneRows.length);
        const randomRow = tuneRows[randIndex];

        this.centerRow(randomRow);

        this.randomPosition = 0;
        this.setCurrentObject(randomRow);

        if (this.mobile) {
            if (type == 'prev') {
                this.randomRows.unshift(randomRow);
                this.randomPosition = 0;
            } else {
                this.randomRows.push(randomRow);
                this.randomPosition = this.randomRows.length - 1;
            }
        }
    }
}

export class EditPage {
    constructor() {
        this.editId = null;
    }

    selectLevel(level) {
        $("#editLevelParent").children().removeClass("level-select-selected");
        $("#editLevel" + level).addClass("level-select-selected");
    }

    selectMaxlevel(level) {
        $("#editMaxlevelParent").children().removeClass("level-select-selected");
        $("#editMaxlevel" + level).addClass("level-select-selected");
    }

    getLevel() {
        for (let level = 1; level <= 5; level++) {
            if ($("#editLevel" + level).hasClass("level-select-selected"))
                return level;
        }

        throw new Error("No selected level");
    }

    getMaxlevel() {
        for (let level = 1; level <= 5; level++) {
            if ($("#editMaxlevel" + level).hasClass("level-select-selected"))
                return level;
        }

        throw new Error("No selected maxlevel");
    }

    fillEdit(tune) {
        this.editId = tune.id;

        $("#editName").val(tune.name != null ? tune.name : "");
        $("#editAka").val(tune.aka != null ? tune.aka : "");
        $("#editRhythm").val(tune.rhythm != null ? tune.rhythm : "reel");
        $("#editKey").val(tune.key != null ? tune.key : "");
        $("#editStructure").val(tune.structure != null ? tune.structure : "");
        $("#editComposer").val(tune.composer != null ? tune.composer : "");
        $("#editRefs").val(tune.refs != null ? tune.refs : "");
        $("#editIncipit").val(tune.incipit != null ? tune.incipit : "");
        $("#editSince").val(tune.since != null ? tune.since : "");
        const level = tune.level != null ? tune.level : 5;
        this.selectLevel(level);
        this.selectMaxlevel(tune.maxlevel != null ? tune.maxlevel : level);
        $("#editNotes").val(tune.notes != null ? tune.notes : "");
        if (tune.study)
            $("#editStudy").attr("checked", "checked");
        else
            $("#editStudy").removeAttr("checked");
    }

    fetchEditData() {
        const result = {
            name: $("#editName").val(),
            aka: $("#editAka").val(),
            rhythm: $("#editRhythm").val(),
            key: $("#editKey").val(),
            structure: $("#editStructure").val(),
            composer: $("#editComposer").val(),
            refs: $("#editRefs").val(),
            incipit: $("#editIncipit").val(),
            since: $("#editSince").val(),
            level: this.getLevel(),
            maxlevel: this.getMaxlevel(),
            notes: $("#editNotes").val(),
            study: $("#editStudy").attr("checked") ? '1' : '0',
        };

        if (this.editId != null) {
            result.id = this.editId;
        }

        return result;
    }

    // Fill in the Rhythm dropdrown - do this dynamically to avoid
    // having to maintain the rhythm list in the HTML as well
    createRhythmOptions() {
        const editRhythm = document.getElementById("editRhythm");
        foreachRhythm((rhythm, rhythmName, rhythmNamePlural) => {
            const option = _make("option", null, rhythmName);
            option.value = rhythm;
            editRhythm.appendChild(option);
        });
    }

    addLevelListeners() {
        document.querySelectorAll(".level-select").forEach((item) => {
            item.addEventListener("click", (event) => {
                this.selectLevel(parseInt(/** @type {HTMLElement} */(item).dataset.level));
            });
        });

        document.querySelectorAll(".max-level-select").forEach((item) => {
            item.addEventListener("click", (event) => {
                this.selectMaxlevel(parseInt(/** @type {HTMLElement} */(item).dataset.level));
            });
        });
    }

    init() {
        const username = getUsername();
        if (username != null) {
            $("#userSpan").text(username);
        } else {
            let url;
            if (document.location.search == null || document.location.search == "")
                url = "login.html?next=" + getRelativePath();
            else
                url = "login.html" + document.location.search + "&" + "next=" + getRelativePath();

            window.open(url, "_self");
        }

        this.createRhythmOptions();
        this.addLevelListeners();

        $("#saveAction").click(() => this.actionSave());

        $("#homeLink").attr('href', getBaseUrl());
        $("#newLink").attr('href', getBaseUrl() + "edit.html");

        const queryParams = getQueryParams();

        if (queryParams.id) {
            $.getJSON("query.cgi?id=" + queryParams.id,
                (tunes) => {
                    if (tunes.length > 0) {
                        const tune = tunes[0];
                        document.title = BASE_TITLE + " - Editing " + tune.name;
                        this.fillEdit(tune);
                        this.editId = tune.id;
                    }
                });
        } else {
            document.title = BASE_TITLE + " - New Tune";

            if (!('name' in queryParams))
                queryParams.level = 5;
            if (!('level' in queryParams))
                queryParams.level = 5;

            this.fillEdit(queryParams);
        }

        $("#editName").focus();
    }

    save(onSuccess) {
        $.ajax({
            url: "update.cgi",
            type: "POST",
            contentType: 'application/x-www-form-urlencoded; charset=UTF-8',
            data: this.fetchEditData(),
            dataType: "json",
            success: function(tune, status) {
                onSuccess(tune);
            },
            error: function(request, textStatus, errorThrown) {
                alert(request.responseText);
            },
        });
    }

    actionSave() {
        this.save((tune) => {
            if (this.editId) {
                this.fillEdit(tune);
                document.title = BASE_TITLE + " - Editing " + tune.name;
            } else {
                // We reload to get a better URL and title
                window.open(getNoQueryUrl() + "?id=" + tune.id, "_self");
            }
        });
    }
}

export class LoginPage {
    init() {
        const queryParams = getQueryParams();
        if ('next' in queryParams) {
            const next = queryParams['next'];
            delete queryParams['next'];
            $("#loginNextInput").val(next + buildQueryString(queryParams));
        }
    }
}
