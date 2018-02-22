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
    }).then(data => {
        console.log("data retrieved");
        // then fill up the table
        fillTable(data);
        console.log("table filled up with data");
        dialog.modal("hide");
    }).catch(err => {
        dialog.find(".bootbox-body").html('<div class="alert alert-danger"> Oups. There\'s an error, it\'s our fault and we\'re working to fix!</div>');
        console.log(err);
    });
});

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
        if (text === undefined) text = "<missing data>";
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

const rosterURL = "public.toml";
const genesisURL = "genesis.txt";

const net = cothority.net;
const misc = cothority.misc;
// fetchData returns the data as an array of objects, the keys being the column
// names and the value being the cells value of the final table.
function fetchData(rosterTOML,genesisID) {
    const roster = cothority.Roster.fromTOML(rosterTOML);
    const cisc = new cothority.cisc.Client(roster,genesisID);
    return cisc.getStorage().then(storage => {
        const table = processCiscStorage(storage);
        return Promise.resolve(table);
    });
}

// expected storage dict
// key: dataKey()
// value: csv file
function processCiscStorage(storage) {
    const csv = storage[dataKey()];
    if ((csv === undefined) || (csv == "")) {
        console.log(storage);
        throw new Error("there is no data associated with " + dataKey());
    }

    const parsed = Papa.parse(csv.trim(), {
        header: true
    });
    return parsed.data;
}

// dataKey returns a different key if we are on the test page than if we are on
// the final page
function dataKey() {
    if (window.location.href.match(/sl2018.agora.vote/)) {
        return "sl2018";
    }
    return "test";
}


// fetchData first reads the roster information and the genesisID and then
// contact the skipchain servers and returns an arrays of objects:
function fetchDataFake(rosterTOML, genesisID) {
    // XXX Fake promise returning fake data
    return new Promise(function(resolve,reject) {
       setTimeout(function() {
           const data = [
               {
                   "polling": "freetown #1",
                   "candidate 1": "5670",
                   "candidate 2": "5670",
                   "candidate 3": "5670",
                   "candidate 4": "5670",
                   "candidate 5": "5670",
                   "candidate 6": "5670",
                   "null votes": "5670",
               },
               {
                   "polling": "freetwon #2",
                   "candidate 1": "5670",
                   "candidate 2": "5670",
                   "candidate 3": "5670",
                   "candidate 4": "5670",
                   "candidate 5": "5670",
                   "candidate 6": "5670",
                   "null votes": "5670",
               },
               {
                   "polling": "freetwon #3",
                   "candidate 1": "5670",
                   "candidate 2": "5670",
                   "candidate 3": "5670",
                   "candidate 4": "5670",
                   "candidate 6": "5670",
                   "null votes": "5670",
               },
               {
                   "polling": "freetwon #4",
                   "candidate 1": "5670",
                   "candidate 2": "5670",
                   "candidate 3": "5670",
                   "candidate 4": "5670",
                   "candidate 5": "5670",
                   "candidate 6": "5670",
                   "null votes": "5670",
               },
               {
                   "polling": "freetwon #5",
                   "candidate 1": "5670",
                   "candidate 2": "5670",
                   "candidate 3": "5670",
                   "candidate 4": "5670",
                   "candidate 5": "5670",
                   "candidate 6": "5670",
                   "null votes": "5670",
               },

           ];
           resolve(data);
       }, 700);
   });
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
                resolve(roster);
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
