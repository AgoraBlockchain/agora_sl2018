// colors to use to decorate the chart and the table
const staticColors = ['#e0440e', '#e6693e', '#ec8f6e', '#f3b49f', '#f6c7b6'];

// fillPage takes care of filling the page with the data, the fields and the
// aggregated data
function fillPage(data,fields,agg) {
    fillSelect(data,fields);
    // fill the table
    var [prunedData,prunedFields] = prune(data,fields);
    fillHeaders(prunedFields);
    fillTable(prunedData,prunedFields);
    // fill the aggregated data
    fillAggregated(agg);
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
function fillSelect(data,fields) {
    // selectCallback is called whenever a selection changes from the drop down
    // list of polling station names
    const callback = function(event) {
        const selection = $("select option:selected").text();
        if (selection === selectKeyAll) {
            fillTable(data,fields);
            return
        }
        const key = fields[0];
        const filtered = data.filter(dict => dict[key] === selection);
        var [prunedData,prunedFields] = prune(filtered,fields);
        fillTable(prunedData,prunedFields);

    }
    // list of all polling station names
    const names = [selectKeyAll].concat(data.map(entry => entry[fields[0]]));
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
    const rows = Object.keys(aggregated).map(key => [key,aggregated[key]]);
    const selectedColors = fieldsToColors(rows);
      /*  var n = 18;*/
        //for(var i =0; i < n;i++) {
            //rows.push(["candidat"+i,i*8]);
        //}

    const drawChart = function() {
        // create the data table.
        var data = new google.visualization.DataTable();
        data.addColumn('string', 'Candidate');
        data.addColumn('number', 'Votes');
        data.addRows(rows);

        // set chart options
        var options = {'title':"",
            sliceVisibilityThreshold: 0.000005,
            pieResidueSliceLabel: "Other",
            chartArea: {left: 0, top: 0, width: "100%", height: "100%"},
            colors: selectedColors,
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

// fillTable takes the data returned by fetchData and display each object in the
// array as one line in the table.
function fillTable(data,keys) {
    $("#results-table tbody tr").remove();
        // set up the table columns according to the first entry
    for(var i = 0; i < data.length; i++) {
        //console.log("Appending row["+i+"] = ",data[i]);
        appendRow(keys,data[i]);
    }
}

// appendRow fills up the table with the given object (row) by using only the
// keys specified.
function appendRow(keys,row) {
    const tr = $("<tr></tr>");
    const getDiv = function(text) {
        return '<div class="vote">'+text+'</div>';
    }
    for(var i = 0; i < keys.length; i++) {
        const key = keys[i];
        var text = row[key];
        if (text === undefined) text = "";
        $("<td></td>").html(getDiv(text)).appendTo(tr);
    }
    $("#results-table tbody").append(tr);
}

// fillHeaders fills up the header table columns
function fillHeaders(fields) {
    const tr = $('<tr></tr>').attr({ class: ["class2", "class3"].join(' ') });
    const selectedColors = fieldsToColors(fields);
    // returns the HTML that is put for one field and color
    const htmlTh = function(i) {
        const field = fields[i];
        const color = selectedColors[i];
        return '<div class="candidate-color" style="background:' + color +
            ';"></div><div class="candidate-name">'+field+'</div>';
    };

    for(var i = 0; i < fields.length; i++) {
        //const th = $('<th></th>').text([i]).attr({class:"candidate",scope:"col"}).appendTo(tr);
        const th = $('<th></th>').html(htmlTh(i)).attr({class:"candidate",scope:"col"}).appendTo(tr);
    }
    $("#results-table thead").append(tr);
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
