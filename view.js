// colors to use to decorate the chart and the table
const staticColors = ['#35A1EA', '#4BC0BF', '#FFCD55', '#FE9E40', '#FF6383', '#9898FE', '#1288A6', '#1E3798', '#966393', '#56203D', '#815355', '#C3B299', '#CBD4C2', '#755C1B', '#7A4419', '#515A47'];

// fillPage takes care of filling the page with the data, the fields and the
// aggregated data
function fillPage(data,fields,agg) {
    // fill the aggregated data pie chart
    fillAggregated(agg);
    // fill select list
    fillSelect(data,fields,agg);
    // fill the table
    var [prunedData,prunedFields] = prune(data,fields);
    // show by default the aggregated table
    fillTableAggregegated(prunedFields,agg);
    hideWaitingDialog();
}

// remove the first entry of each since it's polling station data
function prune(data,fields) {
    const toPrune = fields[0];
    const prunedFields = fields.slice(1);
    const prunedData = data.map(row => {
        // take only the value for the pruned fields
        return prunedFields.reduce((acc,f) => {
            acc[f] = row[f];
            return acc;
        },{});
    });
    return [prunedData,prunedFields];
}

// fillSelect takes a list of names to put in the selection and a callback
// associated with each. The callback must be a function such as:
// function(name) { ... }
// the default will be the first name given
function fillSelect(data,fields,agg) {
    // selectCallback is called whenever a selection changes from the drop down
    // list of polling station names
    const callback = function(event) {
        const selection = $("select option:selected").text();
        if (selection === selectKeyAll) {
            // do not show the polling station column
            fillTableAggregegated(fields.slice(1),agg);
            return
        }
        // do not show the polling station column
        const key = fields[0];
        const filtered = data.filter(dict => dict[key] === selection);
        var [prunedData,prunedFields] = prune(filtered,fields);
        fillTableDetail(prunedFields,prunedData);

    }
    // list of all polling station names
    const names = [selectKeyAll].concat(data.map(entry => entry[fields[0]]));
    //const names = data.map(entry => entry[fields[0]]);
    const select = $("#select-polling");
    select.remove("option");
    names.forEach((name,idx) => {
        const html = '<div class="selection">'+name+'</div>';
        const opt = $("<option></option>").html(html);
        if (idx == 0)
            opt.attr("selected",true)

        opt.appendTo(select);
    });
    select.change(callback);
}


// fieldsToColors makes a deterministic mapping from a field name to a color
// the same color is used to draw the table and the chart
function fieldsToColors(fields) {
    return fields.map((v,i) => staticColors[i]);
}
// fill the aggregated textarea => TO CHANGE with a nice graph
function fillAggregated(aggregated) {
    // sort by vote
    const rows = Object.keys(aggregated).map(key => [key.trim(),aggregated[key]])
        .sort(function(a,b) {
            if (a[1] < b[1]) {
                return  1;
            }
            if (a[1] > b[1]) {
                return -1;
            }
            return 0;
        });
        /*var n = 18;
        for(var i =0; i < n;i++) {
            rows.push(["candidat"+i,i*8]);
        }*/

    const selectedColors = fieldsToColors(rows);

    const drawChart = function() {
        // create the data table.
        var data = new google.visualization.DataTable();
        data.addColumn('string', 'Candidate');
        data.addColumn('number', 'Votes');
        data.addRows(rows);

        // set chart options
        var options = {'title':"",
                       backgroundColor: { fill:'transparent' },
                       colors: selectedColors,
                       legend: {
                           position: 'right',
                           alignment: "center",
                           maxLines: 3,
                           textStyle:{
                               color: "#3E3E3E",
                               fontName: "LatoWebLight",
                               fontSize: 20,
                           }
                       },
                       sliceVisibilityThreshold: 0.000002,
                       pieResidueSliceLabel: "Other",
                       chartArea: {
                           left: 0,
                           top: 25,
                           width: "100%",
                           height: "90%"
                       }
                      };

        // instantiate and draw our chart, passing in some options.
        var chart = new google.visualization.PieChart(document.getElementById('piechart'));
        chart.draw(data, options);
    }

    $(window).resize(function(){
      drawChart();
    });
    // Set a callback to run when the Google Visualization API is loaded.
    google.charts.setOnLoadCallback(drawChart);
}

const tableLargeId = "#results-table";
const tableMobileId = "#results-table-mobile";

// fillTableDetail constructs the detailled table
function fillTableDetail(keys,data) {
    const sortedKeys = keys.slice();
    sortedKeys.sort(function(a,b) {
        var va = data[0][a];
        var vb = data[0][b];
        if (va < vb)
            return 1;
        if (va > vb)
            return -1;
        return 0;
    });

    const line = withPercentage(data[0]);
    constructLargeTable(sortedKeys,line);
    constructMobileTable(sortedKeys,line);
}

// fillTableAggregegated constructs the aggregated table
function fillTableAggregegated(keys,agg) {
    const sortedKeys = keys.slice();
    sortedKeys.sort(function(a,b) {
        var va = agg[a];
        var vb = agg[b];
         if (va < vb)
            return 1;
        if (va > vb)
            return -1;
        return 0;
    });

    const line = withPercentage(sortedKeys.reduce((acc,key) => {
        acc[key] = agg[key];
        return acc;
    },{}));

    constructLargeTable(sortedKeys,line);
    constructMobileTable(sortedKeys,line);
}

const mobileHeaderCandidate = "Candidate";
const mobileHeaderVote = "Count";

// constructMobileTable creates the table a  mobile screen
function constructMobileTable(sortedKeys,line) {
    $(tableMobileId).find("thead tr").remove();
    // headers are two columns: polling station | vote
    const tr = $('<tr></tr>');
    $("<th></th>").html('<div class="candidate-name">' + mobileHeaderCandidate
        + '</div>').appendTo(tr);
    $("<th></th>").html('<div class="candidate-vote">' + mobileHeaderVote
        + '</div>').appendTo(tr);
    $(tableMobileId).find("thead").append(tr);


    $(tableMobileId).find("tbody tr").remove();
    const tbody = $(tableMobileId).find("tbody");
    sortedKeys.forEach(key => {
        const tr = $("<tr></tr>");
        var vote = line[key];
        // add candidate
        $('<td class="candidate-td"></td>').html(candidateDiv(key)).appendTo(tr);
        // add vote
        voteTd(vote).appendTo(tr);
        tbody.append(tr);
    });
}

// Number of cells for which the table wraps over
const wrapOverCell = 8;

// constructLargeTable creates the table for a large screen
function constructLargeTable(sortedKeys,line) {
    //constructLargeHeaders(sortedKeys);

    const tableBody = $(tableLargeId).find("tbody");
    tableBody.find("tr").remove();

    const selectedColors = fieldsToColors(sortedKeys);
    // returns the HTML that is put for one field and color
    const candidateTd = function(i) {
        const field = sortedKeys[i];
        const color = selectedColors[i];
        return '<div class="candidate-color" style="background:' + color +
            ';"></div>' + candidateDiv(field);
    };

    var candidateRow = $("<tr></tr>");
    var voteRow = $("<tr></tr>");
    sortedKeys.forEach((key,idx) => {
        // append candidate
        const candidateCell = $('<td></td>')
            .html(candidateTd(idx))
            .attr({class:"candidate",scope:"col"})
            .appendTo(candidateRow);
        // append vote
        const vote = line[key];
        voteTd(vote).appendTo(voteRow);
        // wrap over?
        const mustWrap = ((idx+1) % wrapOverCell) === 0;
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
    const htmlTh = function(i) {
        const field = fields[i];
        const color = selectedColors[i];
        return '<div class="candidate-color" style="background:' + color +
            ';"></div>' + candidateDiv(field);
    };

    for(var i = 0; i < fields.length; i++) {
        const th = $('<th></th>').html(htmlTh(i)).attr({class:"candidate",scope:"col"}).appendTo(tr);
    }
    $(tableLargeId).find("tbody").append(tr);
}

// voteTd returns the td used for displaying a vote
function voteTd(text) {
    if (text === undefined) text = "";
    const num = text[0];
    const perc = text[1];
    const html = '<div class="vote">'+num+'<br>'+perc+'%</div>';
    return $("<td class='vote-c'></td>").html(html);
}


// candidateDiv returns the div to write to a candidate name
function candidateDiv(text) {
    return '<div class="candidate-name">'+text+'</div>';
}

// withPercentage returns an array of [vote,%]
// votes is a dictionary Cendidate => Count
// output is a dictionary Candidate => [Count, percentage]
function withPercentage(line) {
    const keys = Object.keys(line);
    const total = keys.reduce((acc,key) => acc+line[key],0);
    return keys.reduce((acc,key) => {
        const v = line[key];
        acc[key] = [v,(v / total * 100).toFixed(2)];
        return acc;
    },{});
}
// displayInfo writes some info about the roster and the skipchain id the page
// is using
//function displayInfo(roster,genesisID) {
//    $("#title-skipid").text("skipchain ID: " + genesisID);
//}


function initView() {
    showWaitingDialog();
}

// XXX NOT WORKING FOR THE MOMENT
var dialog = null;
var callBack;
// showWaitingDialog shos the dialog with some waiting information
function showWaitingDialog() {
    callBack = function() {
    }
}

// hideWaitingDialog hides the dialog with a timeout of 70ms because it can't be
// too fast
function hideWaitingDialog() {
    //callBack();
}
