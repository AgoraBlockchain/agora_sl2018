// //////////////////
// Constants
// //////////////////
// the url to get the roster
const rosterURL = "public.toml";
// the url to get the genesis file
const genesisURL = "genesis.txt";
// ethereum data.json
const ethDataJson = "data.json";
const ethContractAddr = "contract.address";
const ethContractAbi = "contract.abi";

// key representing "all" data from the drop down list
const selectKeyAll = "All";
const titleChart = "Election Results";

const keyTest = "test";
const keyProduction = "sl2018";

// ////////////////
// Modules
// ///////////////
const net = cothority.net;
const misc = cothority.misc;

// //////////////
// Global data
// /////////////
var skipData = {};
var skipFields = [];
var aggregated = {};

// init page
$(function() {
    init();
    // show the loading message
    var dialog = bootbox.dialog({
        title: 'Agora - Sierra Leone 2018 elections',
        message: '<p><i class="fa fa-spin fa-spinner"></i> Loading and verifying election data...</p>',
        closeButton: false
    });
    collectSkipchain().then(() => {
        // fill the drop down list with the name of the polling stations
        const list = [selectKeyAll].concat(skipData.map(entry => entry[skipFields[0]]));
        fillSelect(list,selectCallback);
        // fill the table
        fillHeaders(skipFields);
        fillTable(skipData,skipFields);
        // fill the aggregated data
        fillAggregated(aggregated);
        setTimeout(function() {
            dialog.modal("hide");
        },1000);
    }).catch(err => {
        dialog.find(".bootbox-body").html('<div class="alert alert-danger"> Oups. There\'s an error, it\'s our fault and we\'re working to fix!</div>');
        //console.log(err);
        throw err;
    });
});

// collectEthereum does the following:
//  1. grabs data.json (output from geens/cli command) file and parses it
//  2. run the verifier command library
function collectEthereum() {
    // get the data
    const fetchData = new Promise(function(resolve,reject) {
        $.ajax({
            url:ethDataJson,
            dataType: "json"
        }).done(function(jsonData) {
            console.log("ethereum data json file fetched successfully.");
            resolve(JSON.parse(jsonData.trim()));
        }).fail(function(obj,text,err) {
            console.log("error fetching data json file: " + text);
            reject(err);
        });
    });
    const fetchAddress = new Promise(function(resolve,reject) {
        $.ajax({
            url:ethContractAddr,
            dataType: "text"
        }).done(function(address) {
            console.log("ethereum contract address fetched successfully.",address);
            resolve(address.trim());
        }).fail(function(obj,text,err) {
            console.log("error fetching contract address file: " + text);
            reject(err);
        });

    });

    return Promise.all(fetchData,fetchAddress).then(data => {
        var [pollingData,address] = data;
        try {
            verifier.getObjectAndVerify(pollingData,address,ethContractAbi);
            return Promise.resolve(pollingData);
        } catch(err) {
            return Promise.reject(err);
        }
    });
}

// collectSkipchain does the following:
// 1. fetch the skipchain for latest block
// 2. interpet the data in CSV
// 3. aggregate the data
// 4. sets the global value to be the data + aggregated
// It returns a Promise with true if all went well
function collectSkipchain() {
    // start fetching the info to contact the skipchain: roster & genesis id
    return fetchInfo().then(info => {
        var [roster,genesisID] = info;
        displayInfo(roster,genesisID);
        // fetch the data from the roster on the given skipchain id
        //return fetchDataFake(roster,genesisID);
        return fetchData(roster,genesisID);
    }).then(csvParsed => {
        skipData = csvParsed.data;
        skipFields = csvParsed.meta.fields;
        aggregated = aggregateData(skipData,skipFields.slice(1))
        console.log(skipData);
        console.log(aggregated);
        return Promise.resolve(true);
    );
}


// selectCallback is called whenever a selection changes from the drop down
// list of polling station names
function selectCallback(event) {
    const selection = $("select option:selected").text();
    if (selection === selectKeyAll) {
        fillTable(skipData,skipFields);
        return
    }
    const key = skipFields[0];
    const filtered = skipData.filter(dict => dict[key] === selection);
    fillTable(filtered,skipFields);
}

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
        return keyProduction;
    }
    return keyTest;
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

function init() {
    // Load the Visualization API and the corechart package.
    google.charts.load('current', {'packages':['corechart']});
}
