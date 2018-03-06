// colors to use to decorate the chart and the table
const staticColors = ['#005BB0', '#177BD9', '#73AFE8', '#B9D7F3', '#00B0DC', '#5CD7F6', '#A2E8FA', '#D0F3FC', '#24955B', '#33D582', '#6EEFAC', '#B6F7D5', '#7D10F2', '#A051F5', '#CFA8FA', '#E7D3FC', '#E55000', '#EC7F45', '#F5BFA2', '#FCEFE7', '#9B0331', '#F2044C', '#F5487C', '#FBBACE', '#879DB1'];

// key representing "all" data from the drop down list
const selectAreasAll = "All Areas";
const selectPollsAll = "All Polling Stations";
const titleChart = "Election Results";

// fillPage takes care of filling the page with the data, the fields and the
// aggregated data
function fillPage(skipchainData) {
    const data = skipchainData.data;
    const fields = skipchainData.fields;
    const agg = skipchainData.aggregated;
    const areas = skipchainData.areas;
    const sortedFields = fields.slice();
    var [prunedData, prunedFields] = prune(data, fields);
    prunedFields.sort(function (a, b) {
        var va = agg[a];
        var vb = agg[b];
        if (va < vb)
            return 1;
        if (va > vb)
            return -1;
        return 0;
    });
    const colors = fieldsToColors(prunedFields);
    const global = {
        data: data,
        fields: fields,
        agg: agg,
        areas: areas,
        sortedFields: prunedFields,
        colors: colors,
    }
    // fill the aggregated data pie chart
    //fillAggregated(global);
    // fill select list
    //fillSelect(data,fields,agg,areas);
    fillSelect(global);
    // fill the table
    // show by default the aggregated table
    fillTableAggregegated(prunedFields, agg,colors);
    hideWaitingDialog();
}

// aggregateData returns an aggregated version of all the datas. It computes the
// sum for each candidate for each pollign stations.
// data is expected to be an array of dictionary where each item represents the
// data of one pollign station
// Fields are the fields to aggregate. All candidate1 values will be aggregated
// together for example.
// NOTE: fields MUST NOT INCLUDE the polling station column, i.e. the first
// column of the csv
function aggregateData(data,fields) {
    const aggregated = {};
    // arr2.reduce((acc,key) => { acc[key] = di.map(entry => entry[key]).reduce((a,b) => a+b,0); return acc },{})
    return fields.reduce((acc,key) => {
        acc[key] = data.map(entry => entry[key]).reduce((a,b) => a+b,0);
        return acc;
    }, {});
}

//
function sortAggregatedFields(agg,fields) {
    const copy = fields.slice();
    copy.sort(function (a, b) {
                var va = agg[a];
        var vb = agg[b];
        if (va < vb)
            return 1;
        if (va > vb)
            return -1;
        return 0;
    });
    setStaticFields(copy);
    return copy;
}

const blankNoteID = "Blank Note";
const invalidNoteID = "Invalid Note";

function sortDetailledFields(row,fields) {
    const copy = fields.slice();
    copy.sort(function (a, b) {
        if (a == blankNoteID || a == invalidNoteID)
            return 1;

        if (b == blankNoteID || b == invalidNoteID)
            return -1;

        var va = row[a];
        var vb = row[b];

        if (va < vb)
            return 1;
        if (va > vb)
            return -1;
        return 0;
    });
    setStaticFields(copy);
    return copy;
}

// setStaticFields puts the fields invalidNoteID and blankNoteID at the end in a
// deterministic order
function setStaticFields(copy) {
    const length = copy.length;
    for(var i = 0; i < length-1; i++) {
        const v = copy[i];
        if (v == blankNoteID) {
            copy[i] = copy[length-2];
            copy[length-2] = v;
            continue;
        }
        if (v == invalidNoteID) {
            copy[i] = copy[length-1];
            copy[length-1] = v;
            continue;
        }
    }
}

// remove the first two entry of each since it's polling station data
function prune(data, fields) {
    // remove Polling station AND area
    const prunedFields = pruneFields(fields);
    const prunedDataa = pruneData(data,prunedFields);
    return [prunedDataa, prunedFields];
}

function pruneData(data,prunedFields) {
    return data.map(row => {
        // take only the value for the pruned fields
        return prunedFields.reduce((acc, f) => {
            acc[f] = row[f];
            return acc;
        }, {});
    });

}

function pruneFields(fields) {
    return fields.slice(2);
}

// fillSelect creates two select list:
//  one for the areas
//  one for the polling stations
function fillSelect(global) {
    const data = global.data;
    const fields = global.fields;
    const agg = global.agg;
    const areas = global.areas;
    const sortedFields = global.sortedFields;
    const colors = global.colors;
    const [prunedData,prunedFields] = prune(data,fields);
    // callbackPolls is called whenever a selection changes from the drop down
    // list of polling station names
    const callbackPolls = function(event) {
        const prunedFields = pruneFields(fields);
        const pollSelection = $("#select-polling option:selected").text();
        const areaSelection = $("#select-area option:selected").text();
        // show aggregted poll stations from the area
        if (pollSelection === selectPollsAll) {
            const polls = areas[areaSelection];
            const filteredData = data.filter(row => polls.includes(row[fields[0]]));
            const prunedData = pruneData(filteredData,prunedFields);
            const pollAgg = aggregateData(prunedData,prunedFields);
            fillTableAggregegated(prunedFields,pollAgg,colors);
            return;
        }
        const key = fields[0];
        const filtered = data.filter(dict => dict[key] === pollSelection);
        var prunedData = pruneData(filtered,prunedFields);
        fillTableDetail(prunedFields,prunedData,colors);
    }

    const callbackArea = function(event) {
        // Hide in any case
        const selectPolls = $("#select-polling");
        selectPolls.contents().remove();
        selectPolls.addClass("d-none");

        const selection = $("#select-area option:selected").text();
        if (selection === selectAreasAll) {
            // Hide
            //fillTableAggregegated(fields.slice(2),agg,colors);
            fillTableAggregegated(sortedFields,agg,colors);
            return;
        }

        // list of all polling station names
        selectPolls.change(callbackPolls);
        const names = [selectPollsAll].concat(areas[selection]);
        names.forEach((name,idx) => {
            const html = '<div class="selection">'+name+'</div>';
            const opt = $("<option></option>").attr({value:name}).html(html);
            if (idx == 0)
                opt.attr("selected",true)

            opt.appendTo(selectPolls);
        });
        // trigger the polling names
        selectPolls.val(names[0]).trigger('change');
        $("#select-polling").removeClass("d-none");
    }

    /////////////////////
    // areas select
    // //////////////////
    const areaNames = [selectAreasAll].concat(Object.keys(areas));
    const selectAreas = $("#select-area");
    // clear any previous options
    selectAreas.contents().remove();
    selectAreas.change(callbackArea);
    areaNames.forEach((area,idx) => {
        const html = '<div class="selection-area">'+area+'</div>';
        const opt = $("<option></option>").attr({value:area}).html(html);
        if (idx == 0)
            opt.attr("selected", true)

        opt.appendTo(selectAreas);
    });
    // call it first
    selectAreas.val(selectAreasAll).trigger('change');
}

// fieldsToColors makes a deterministic mapping from a field name to a color
// the same color is used to draw the table and the chart
function fieldsToColors(candidates) {
    const mapping = {};
    candidates.forEach((candidate,idx) => {
        mapping[candidate] = staticColors[idx];
    });
    return mapping;
}
// fill the aggregated textarea => TO CHANGE with a nice graph
function fillAggregated(global) {
    // take sorted by vote
    // [candidate, vote]
    const rows = global.sortedFields.map(c => [c.trim(), global.agg[c]])
    const selectedColors = global.sortedFields.map(c => global.colors[c]);

    const drawChart = function () {
        // create the data table.
        var data = new google.visualization.DataTable();
        data.addColumn('string', 'Candidate');
        data.addColumn('number', 'Votes');
        data.addRows(rows);

        // set chart options
        var options = {
            'title': "",
            backgroundColor: {
                fill: 'transparent'
            },
            colors: selectedColors,
            fontName: "LatoWebLight",
            legend: {
                position: 'right',
                alignment: "right",
                maxLines: 3,
                textStyle: {
                    color: "#3E3E3E",
                    fontName: "LatoWebLight",
                    fontSize: 20,
                }
            },
            sliceVisibilityThreshold: 0.02,
            pieResidueSliceLabel: "Other",
            chartArea: {
                left: 0,
                top: 25,
                width: "100%",
                height: "90%"
            }
        };

        // set chart options
        var optionsMobile = {
            'title': "",
            backgroundColor: {
                fill: 'transparent'
            },
            colors: selectedColors,
            fontName: "LatoWebLight",
            fontSize: 10,
            legend: {
                position: 'right',
                alignment: "center",
                textStyle: {
                    color: "#3E3E3E",
                    fontName: "LatoWebLight",
                    fontSize: 12,
                }
            },
            sliceVisibilityThreshold: 0.02,
            pieResidueSliceLabel: "Other",
            chartArea: {
                left: 0,
                top: 25,
                width: "100%",
                height: "100%"
            }
        };

        // instantiate and draw our chart, passing in some options.
        var chart = new google.visualization.PieChart(document.getElementById('piechart'));
        var mq = window.matchMedia("(min-width: 768px)");
        if (mq.matches) {
            chart.draw(data, options);
        }else {
            chart.draw(data, optionsMobile);
        }
    }

    $(window).resize(function () {
        drawChart();
    });
    // Set a callback to run when the Google Visualization API is loaded.
    google.charts.setOnLoadCallback(drawChart);
}

const tableLargeId = "#results-table";
const tableMobileId = "#results-table-mobile";

// fillTableDetail constructs the detailled table
function fillTableDetail(keys, data,colors) {
    const sortedKeys = sortDetailledFields(data,keys);
    const line = withPercentage(data[0]);
    const selectedColors = sortedKeys.map(c => colors[c]);
    constructLargeTable(sortedKeys, line,selectedColors);
    constructMobileTable(sortedKeys, line,selectedColors);
}

// fillTableAggregegated constructs the aggregated table
function fillTableAggregegated(fields, agg, colors) {
    const sortedFields = sortAggregatedFields(agg,fields);
    const line = withPercentage(agg);
    const selectedColors = sortedFields.map(c => colors[c]);
    constructLargeTable(sortedFields, line,selectedColors);
    constructMobileTable(sortedFields, line,selectedColors);
}

// constructMobileTable creates the table a  mobile screen
function constructMobileTable(sortedKeys, line, selectedColors) {
    const tbody = $(tableMobileId).find("tbody");

    $(tableMobileId).find("tbody tr").remove();
    sortedKeys.forEach((key, idx) => {
        const tr = $("<tr></tr>");
        var vote = line[key];
        // add candidate
        const color = selectedColors[idx];
        $('<td class="candidate-td"></td>').html(candidateTd(key, color)).appendTo(tr);
        // add vote
        voteTd(vote).appendTo(tr);
        tbody.append(tr);
    });
}

// Number of cells for which the table wraps over
const wrapOverCell = 8;

// constructLargeTable creates the table for a large screen
function constructLargeTable(sortedKeys, line,selectedColors) {
    //constructLargeHeaders(sortedKeys);

    const tableBody = $(tableLargeId).find("tbody");
    tableBody.find("tr").remove();

    // returns the HTML that is put for one field and color

    var candidateRow = $("<tr></tr>");
    var voteRow = $("<tr></tr>");
    sortedKeys.forEach((key, idx) => {
        // append candidate
        const color = selectedColors[idx];
        const candidateCell = $('<td></td>')
            .html(candidateTd(key, color))
            .attr({
                class: "candidate",
                scope: "col"
            })
            .appendTo(candidateRow);
        // append vote
        const vote = line[key];
        voteTd(vote).appendTo(voteRow);
        // wrap over?
        const mustWrap = ((idx + 1) % wrapOverCell) === 0;
        const isAtEnd = idx === (sortedKeys.length - 1);
        if (mustWrap || isAtEnd) {
            // append the two rows and create a new second tuple
            tableBody.append(candidateRow);
            tableBody.append(voteRow);
            candidateRow = $("<tr></tr>");
            voteRow = $("<tr></tr>");
        }
    });
}


// fillHeaders fills up the header table columns
function constructLargeHeaders(fields) {
    $(tableLargeId).find("tbody tr").remove();

    const tr = $('<tr></tr>');
    const selectedColors = fieldsToColors(fields);
    // returns the HTML that is put for one field and color
    const htmlTh = function (i) {
        const field = fields[i];
        const color = selectedColors[i];
        return '<div class="candidate-color" style="background:' + color +
            ';"></div>' + candidateDiv(field);
    };

    for (var i = 0; i < fields.length; i++) {
        const th = $('<th></th>').html(htmlTh(i)).attr({
            class: "candidate",
            scope: "col"
        }).appendTo(tr);
    }
    $(tableLargeId).find("tbody").append(tr);
}

function candidateTd(name, color) {
    return '<div class="candidate-color" style="background:' + color +
        ';"></div>' + candidateDiv(name);
};

// voteTd returns the td used for displaying a vote
function voteTd(text) {
    if (text === undefined) text = "";
    const num = text[0];
    const perc = text[1];
    const html = '<div class="vote">' + num + '<br>' + perc + '%</div>';
    return $("<td class='vote-c'></td>").html(html);
}


// candidateDiv returns the div to write to a candidate name
function candidateDiv(text) {
    return '<div class="candidate-name">' + text + '</div>';
}

// withPercentage returns an array of [vote,%]
// votes is a dictionary Cendidate => Count
// output is a dictionary Candidate => [Count, percentage]
function withPercentage(line) {
    const keys = Object.keys(line);
    const total = keys.reduce((acc, key) => acc + line[key], 0);
    return keys.reduce((acc, key) => {
        const v = line[key];
        acc[key] = [v, (v / total * 100).toFixed(2)];
        return acc;
    }, {});
}

function initView() {
    showWaitingDialog();
}

// XXX NOT WORKING FOR THE MOMENT
var dialog = null;
var callBack;
// showWaitingDialog shos the dialog with some waiting information
function showWaitingDialog() {
    callBack = function () {}
}

// hideWaitingDialog hides the dialog with a timeout of 70ms because it can't be
// too fast
function hideWaitingDialog() {
    //callBack();
}
