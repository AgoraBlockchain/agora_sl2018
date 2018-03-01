// fillSelect takes a list of names to put in the selection and a callback
// associated with each. The callback must be a function such as:
// function(name) { ... }
// the default will be the first name given
function fillSelect(names,callback) {
    const select = $("#select-polling");
    names.forEach((name,idx) => {
        const opt = $("<option></option>")
            .text(name)
        if (idx == 0)
            opt.attr("selected",true)

        opt.appendTo(select);
    });
    select.change(callback);
}


// fill the aggregated textarea => TO CHANGE with a nice graph
function fillAggregated(aggregated) {
    //$("#aggregated-results").text(JSON.stringify(aggregated));
    //$("#aggregated-row").css('display','');
    const rows = Object.keys(aggregated).map(key => [key,aggregated[key]]);
    const drawChart = function() {
        // Create the data table.
        var data = new google.visualization.DataTable();
        data.addColumn('string', 'Candidate');
        data.addColumn('number', 'Votes');
        data.addRows(rows);
        // Set chart options
        var options = {'title':titleChart,
                       'width':500,
                       'height':300};

        // Instantiate and draw our chart, passing in some options.
        var chart = new google.visualization.PieChart(document.getElementById('piechart'));
        chart.draw(data, options);

    }

    // Set a callback to run when the Google Visualization API is loaded.
    google.charts.setOnLoadCallback(drawChart);
}

// fillTable takes the data returned by fetchData and display each object in the
// array as one line in the table.
function fillTable(data,keys) {
    $("#results-table tbody tr").remove();
    // first set up the table columns according to the first entry
    for(var i = 0; i < data.length; i++) {
        console.log("Appending row["+i+"] = ",data[i]);
        appendRow(keys,data[i]);
    }
}

// appendRow fills up the table with the given object (row) by using only the
// keys specified.
function appendRow(keys,row) {
    const tr = $("<tr></tr>");
    for(var i = 0; i < keys.length; i++) {
        const key = keys[i];
        var text = row[key];
        if (text === undefined) text = "";
        $("<td></td>").text(text).appendTo(tr);
    }
    $("#results-table tbody").append(tr);
}

// fillHeaders fills up the header table columns
function fillHeaders(keys) {
    const tr = $('<tr></tr>').attr({ class: ["class2", "class3"].join(' ') });
    for(var i = 0; i < keys.length; i++) {
        const th = $('<th></th>').text(keys[i]).attr({scope:"col"}).appendTo(tr);
    }
    $("#results-table thead").append(tr);
}

// displayInfo writes some info about the roster and the skipchain id the page
// is using
function displayInfo(roster,genesisID) {
    $("#title-skipid").text("skipchain ID: " + genesisID);
}



