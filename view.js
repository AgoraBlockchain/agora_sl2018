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
    fillTable(prunedData,prunedFields,agg);
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
            fillTable(data,fields.slice(1),agg);
            return
        }
        const key = fields[0];
        const filtered = data.filter(dict => dict[key] === selection);
        var [prunedData,prunedFields] = prune(filtered,fields);
        fillTable(prunedData,prunedFields,agg);

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
    console.log("SORTED DATA",rows);
        var n = 18;
        for(var i =0; i < n;i++) {
            rows.push(["candidat"+i,i*8]);
        }

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

// fillTable takes the data returned by fetchData and display each object in the
// array as one line in the table.
function fillTable(data,keys,agg) {
    // sort by value
    // if data has more than one row => we show everything in same order as pie
    // chart
    // if data has one length, then we just compare numbers
    var sortedKeys = keys.slice();
    if (data.length == 1) {
        sortedKeys = sortedKeys.sort(function(a,b) {
            var va = data[0][a];
            var vb = data[0][b];
            if (va < vb)
                return 1;
            if (va > vb)
                return -1;
            return 0;
        });
    }
    if (data.length > 1) {
        sortedKeys = sortedKeys.sort(function(a,b) {
            var va = agg[a];
            var vb = agg[b];
             if (va < vb)
                return 1;
            if (va > vb)
                return -1;
            return 0;
        });
    }
    fillHeaders(sortedKeys);
    $("#results-table tbody tr").remove();
        // set up the table columns according to the first entry
    for(var i = 0; i < data.length; i++) {
        //console.log("Appending row["+i+"] = ",data[i]);
        appendRow(sortedKeys,data[i]);
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
        $("<td class='vote-c'></td>").html(getDiv(text)).appendTo(tr);
    }
    $("#results-table tbody").append(tr);
}

// fillHeaders fills up the header table columns
function fillHeaders(fields) {
    $("#results-table thead tr").remove();
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
