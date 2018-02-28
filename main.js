// //////////////////
// Constants
// //////////////////
// the url to get the roster
const rosterURL = "public.toml";
// the url to get the genesis file
const genesisURL = "genesis.txt";

// ////////////////
// Modules
// ///////////////
const net = cothority.net;
const misc = cothority.misc;

// //////////////
// Global data
// /////////////
var data = {};
var fields = [];

// init page
$(function() {
    // show the loading message
    var dialog = bootbox.dialog({
        title: 'Agora - Sierra Leone 2018 elections',
        message: '<p><i class="fa fa-spin fa-spinner"></i> Loading and verifying election data...</p>',
        closeButton: false
    });
    // start fetching the info to contact the skipchain: roster & genesis id
    fetchInfo().then(info => {
        var [roster,genesisID] = info;
        displayInfo(roster,genesisID);
        // fetch the data from the roster on the given skipchain id
        //return fetchDataFake(roster,genesisID);
        return fetchData(roster,genesisID);
    }).then(csvParsed => {
        data = csvParsed.data;
        fields = csvParsed.meta.fields;
        console.log("data retrieved with fields ",fields);
        // then fill up the table
        fillTable(data);
        console.log("table filled up with data");
        const aggResults = aggregateData(data,fields.slice(1))
        console.log("aggregated results:");
        console.log(aggResults);
        setTimeout(function() {
            dialog.modal("hide");
        },1000);
    }).catch(err => {
        dialog.find(".bootbox-body").html('<div class="alert alert-danger"> Oups. There\'s an error, it\'s our fault and we\'re working to fix!</div>');
        //console.log(err);
        throw err;
    });
});

// aggregateData returns an aggregated version of all the datas. It computes the
// sum for each candidate for each pollign stations.
// data is expected to be an array of dictionary where each item represents the
// data of one pollign station
// [
//  { polling: <name>, candidate1: <x vote> }
//  ...
// ]
//
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

// fetchData returns the data as an array of objects, the keys being the column
// names and the value being the cells value of the final table.
function fetchData(rosterTOML,genesisID) {
    const roster = cothority.Roster.fromTOML(rosterTOML);
    console.log("using genesisID",genesisID);
    const cisc = new cothority.cisc.Client(roster.curve(),roster,genesisID);
    return cisc.getStorage().then(storage => {
        const table = processCiscStorage(storage);
        return Promise.resolve(table);
    });
}

// expected storage dict
// key: dataKey()
// value: csv file
// IT returns the output of Papa library
// It returns a dictionnary where the keys are the polling station names and the
// value is a dictionary of Candidate X => vote
function processCiscStorage(storage) {
    const csv = storage[dataKey()];
    if ((csv === undefined) || (csv == "")) {
        console.log(storage);
        throw new Error("there is no data associated with " + dataKey());
    }

    const parsed = Papa.parse(csv.trim(), {
        header:true,
        dynamicTyping: true,
    });

    // replace "" by 0 for all numerical columns
    parsed.data.forEach(dict => {
        const keys = Object.keys(dict);
        // remove the first column since its NOT number but polling station
        // names
        keys.shift();
        keys.forEach(key => {
            if (typeof dict[key] !== "number") {
                dict[key] = 0;
            }
        });
    });
    return parsed;
}

// dataKey returns a different key if we are on the test page than if we are on
// the final page
function dataKey() {
    if (window.location.href.match(/sl2018.agora.vote/)) {
        return "sl2018";
    }
    return "test";
}

// fillTable takes the data returned by fetchData and display each object in the
// array as one line in the table.
function fillTable(data) {
    // first set up the table columns according to the first entry
    const keys = Object.keys(data[0]);
    console.log("keys detected: " + keys.join(" - "));
    addHeader(keys);
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

// addHeader fills up the header table columns
function addHeader(keys) {
    $("#results-table")
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


// fetchInfo will fetch the roster and the genesis block id and return a Promise
// which holds [roster,genesisID] as a value.
function fetchInfo() {

    const rosterPromise = new Promise(function(resolve,reject) {
        $.ajax({
            url: rosterURL,
            dataType: "text"
        }).done(function(roster) {
                console.log("roster fetched sucesfully: " + roster);
                resolve(roster.trim());
        }).fail(function(obj, text,err) {
            console.log("error fetching roster: " + text);
            reject(err);
        });
    });

    const genesisPromise = new Promise(function(resolve,reject) {
        $.ajax({
            url:genesisURL,
            dataType: "text"
        }).done(function(genesis) {
            console.log("genesis id fetched successfully: " + genesis);
            resolve(genesis.trim());
        }).fail(function(obj,text,err) {
            console.log("error fetching genesis id: " + text);
            reject(err);
        });
    });

    return Promise.all([rosterPromise,genesisPromise])
}
