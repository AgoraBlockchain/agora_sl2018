// //////////////////
// Constants
// //////////////////
// basePath of the sierra leone page for production setting
const productionBasePath = "sl2018/"
// page showing the results for the first round
const firstRound = productionBasePath + "results.html";
// page showing the results for the second round
const secondRound = productionBasePath + "results2.html";
// where to find the config information to fetch the data
const dataFolder = "data/";
// the url to get the roster
const rosterURL = dataFolder + "public.toml";
// the url to get the genesis file
const genesisURL = dataFolder + "genesis.txt";
// ethereum data.json
const ethDataJson = dataFolder + "data.json";
const ethContractAddr = dataFolder + "contract.address";
const ethContractAbi = dataFolder + "contract.abi";

// key representing "all" data from the drop down list
const selectKeyAll = "All polling stations";
const titleChart = "Election Results";


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
    initLogic();
    initView();
    /*var dialog = bootbox.dialog({
        title: 'Agora - Sierra Leone 2018 elections',
        message: '<p><i class="fa fa-spin fa-spinner"></i> Loading and verifying election data...</p>',
        closeButton: false
    });*/

    // show the loading message
    // first collect the skipchain info
    collectSkipchain().then((info) => {
        // then display
        var [data,fields,agg] = info;
        fillPage(data,fields,agg);
        /*setTimeout(function() {
            dialog.modal("hide");
        },1000);*/

    //loading overlay
    setTimeout(
        function () {
            $('#loading-overlay').css({
                'visibility': 'hidden',
                'opacity': '0'
            });
            $('body,html').css('overflow','visible');
        }, 500);

        return Promise.resolve(info);
    }).then((skipInfo) => {
        const p1 = Promise.resolve(skipInfo);
        const p2 = collectEthereum();
        return Promise.all([p1,p2]);
    }).then(info => {
        var [skip, ethData] = info;
        var [skipData, skipFields, agg] = skip;
        console.log("ethereum data resolved");
        if (isEqual(skipData,skipFields,ethData)) {
            console.log("DATA ARE EQUAL");
        } else {
            console.log("DATA ARE NOT EQUAL");
        }
    }).catch(err => {
        //dialog.find(".bootbox-body").html('<div class="alert alert-danger"> Oups. There\'s an error, it\'s our fault and we\'re working to fix!</div>');
        throw err;
    });
});

// checkMismatch looks if there is any discrepancies between ethereum data and
// skipchain data. THERE SHOULD NOT BE.
// It returns a boolean if both data are equal
// It returns false if both data are not equal
function isEqual(skipData,skipFields, ethData) {
    const key = skipFields[0];
    const lengthEqual = skipData.length === ethData.length;
    if (!lengthEqual) {
        console.log("not same length",skipData.length," vs ", ethData.length);
        //console.log(ethData);
        return false;
    }
    //console.log("isEqual eth data",ethData);
    for(var i = 0; i < skipData.length; i++) {
        const skipName = skipData[i][key];
        const ethName = ethData[i].Data[0];
        if (skipName !== ethName) {
            console.log("name not equal",skipName," vs ",ethName);
            return false;
        }
    }
    return true;
}

// collectEthereum does the following:
//  1. grabs data.json (output from geens/cli command) file and parses it
//  2. run the verifier command library
function collectEthereum() {
    // get the data
    const fetchData = new Promise(function(resolve,reject) {
        $.ajax({
            url: getBasePathFor(ethDataJson),
            dataType: "json",
            contentType: "application/json; charset=utf-8",
        }).done(function(jsonData) {
            console.log("ethereum data json file fetched successfully.");
            resolve(jsonData);
        }).fail(function(obj,text,err) {
            console.log("error fetching data json file: " + text);
            reject(err);
        });
    });

    // get the smart contract address
    const fetchAddress = new Promise(function(resolve,reject) {
        $.ajax({
            url: getBasePathFor(ethContractAddr),
            dataType: "text",
            contentType: "text/plain",
        }).done(function(address) {
            console.log("ethereum contract address fetched successfully.",address);
            resolve(address.trim());
        }).fail(function(obj,text,err) {
            console.log("error fetching contract address file: " + text);
            reject(err);
        });

    });

    // get the both then verify the data
    return Promise.all([fetchData,fetchAddress]).then(data => {
        var [pollingData,address] = data;
        //console.log("pollingData: ",pollingData);
        //console.log("address: ",address);
        const dataPromise = Promise.resolve(pollingData);
        const ethPromise = verifier.getObjectAndVerify(pollingData,address,ethContractAbi);
        return Promise.all([dataPromise,ethPromise]);
        }).then((info) => {
            var [data,hash] = info;
            return Promise.resolve(data);
        });
}

// collectSkipchain does the following:
// 1. fetch the skipchain for latest block
// 2. interpet the data in CSV
// 3. aggregate the data
// 4. sets the global value to be the data + aggregated
// It returns a Promise containing
// [data,fields,aggregated]
function collectSkipchain() {
    // start fetching the info to contact the skipchain: roster & genesis id
    return fetchInfo().then(info => {
        var [roster,genesisID] = info;
        //displayInfo(roster,genesisID);
        // fetch the data from the roster on the given skipchain id
        //return fetchDataFake(roster,genesisID);
        return fetchData(roster,genesisID);
    }).then(csvParsed => {
        skipData = csvParsed.data;
        skipFields = csvParsed.meta.fields;
        aggregated = aggregateData(skipData,skipFields.slice(1))
        //console.log(skipData);
        //console.log(aggregated);
        return Promise.resolve([skipData,skipFields,aggregated]);
    });
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
        //console.log(storage);
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

function getBasePathFor(file) {
    if (isTestPage()) {
        return file;
    }
    //  productionBasePath + file;
    return  file;
}

function isTestPage() {
    if (window.location.href.match(/test.agora.vote/))
        return true;

    if (window.location.href.match("file://"))
        return true;

    return false;
}

const keyTest = "test";
const keyRound1 = "sl2018-1";
const keyRound2 = "sl2018-2";

// dataKey returns a different key if we are on the test page than if we are on
// the final page
function dataKey() {
    if (isTestPage()) {
        return keyTest;
    }
    const url = window.location.href;
    if (url.match(firstRound))
        return keyRound1;

    if (url.match(secondRound))
        return keyRound2;
}

// fetchInfo will fetch the roster and the genesis block id and return a Promise
// which holds [roster,genesisID] as a value.
function fetchInfo() {

    const rosterPromise = new Promise(function(resolve,reject) {
        $.ajax({
            url: getBasePathFor(rosterURL),
            dataType: "text",
            contentType: "text/plain",
        }).done(function(roster) {
                console.log("roster fetched sucesfully: " + roster);
                resolve(roster.trim());
        }).fail(function(obj, text,err) {
            console.log("error fetching roster @ : " + text);
            reject(err);
        });
    });

    const genesisPromise = new Promise(function(resolve,reject) {
        $.ajax({
            url: getBasePathFor(genesisURL),
            dataType: "text",
            contentType: "text/plain",
        }).done(function(roster) {

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

function initLogic() {
    // Load the Visualization API and the corechart package.
    google.charts.load('current', {'packages':['corechart']});
}
