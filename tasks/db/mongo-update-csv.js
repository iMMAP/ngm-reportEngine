#!/usr/bin/env node

/* 

Desciption:
    update mongodb collection data using data imported from csv file
    replacement for upsert (update-insert) functionality in mongoimport v3.0, for v4.2 the upsert works fine 

Usage:

    // call this script from ngmReportEngine folder to utilize its node packages
    cd /home/ubuntu/nginx/www/ngm-reportEngine/task/db/

    // add --dryRun to simulate update and show what changes will be made without performing update
    node mongo-update-csv.js update-org-name.csv --database ngmReportHub --collection collection --filterFields admin0pcode,organization_tag --updateFields organization_name --dryRun
    
    // import from update-org-name.csv update organization_name field, filter by admin0pcode, organization_tag fields
    node mongo-update-csv.js update-org-name.csv --database ngmReportHub --collection collection --filterFields admin0pcode,organization_tag --updateFields organization_name
    
    // call dryRun after the update to check update result
    node mongo-update-csv.js update-org-name.csv --database ngmReportHub --collection collection --filterFields admin0pcode,organization_tag --updateFields organization_name --dryRun

TODO:
    support for ObjectId() field type

*/

const fs = require('fs');
const path = require('path');
const csv = require('fast-csv');
const MongoClient = require('mongodb').MongoClient;
const assert = require('assert');

var argv = require('yargs')(process.argv.slice(2))
    .usage('Usage: node $0 <csv-file> --database [num] --collection [string] --filterFields [string] --updateFields [string]')
    .demand(1, 'Missing required positional arguments: <csv-file>')
    .option('url', {
        alias: 'u',
        default: 'mongodb://localhost:27017',
        description: 'mongodb url',
        type: 'string'
    })
    .option('database', {
        alias: 'd',
        requiresArg: true,
        demand: true,
        description: 'database name',
        type: 'string'
    })
    .option('collection', {
        alias: 'c',
        requiresArg: true,
        demand: true,
        description: 'collection name',
        type: 'string'
    })
    .option('filterFields', {
        alias: 'f',
        requiresArg: true,
        demand: true,
        description: 'field name(s) as the match filter, comma separated',
        type: 'string'
    })
    .option('updateFields', {
        alias: 'e',
        requiresArg: true,
        demand: true,
        description: 'field name(s) to be updated, comma separated',
        type: 'string'
    })
    .option('dryRun', {
        alias: 'r',
        requiresArg: false,
        description: 'simulate update without actually performing it'
    })
    .help('h')
    .alias('h', 'help')
    .argv;

var filterFields = argv.filterFields.split(',');
var updateFields = argv.updateFields.split(',');

// console.dir(filterFields);
// console.dir(updateFields);
// console.dir(argv);
// console.dir(argv._);
// console.dir(__dirname);
// console.dir(argv._[0]);
// console.log(argv.database + '.' + argv.collection);

MongoClient.connect(argv.url, function (err, connection) {
    assert.equal(null, err);
    console.log("Connected to " + argv.url);

    var docCount = 0;
    var updateCount = 0;
    function checkCloseConnection(connection, docCount, updateCount) {
        if (updateCount == docCount) { connection.close() };
    };

    fs.createReadStream(path.resolve(__dirname, argv._[0]))
        .pipe(csv.parse({ headers: true }))
        .on('error', error => console.error(error))
        .on('data', row => {
            // console.log(row);
            var filter = filterFields.reduce(function (acc, field, i) { acc[field] = row[field]; return acc; }, {});
            var set = updateFields.reduce(function (acc, field, i) { acc[field] = row[field]; return acc; }, {});
            // console.log(filter);
            // console.log(set);

            if (argv.dryRun == true) {
                connection.db(argv.database).collection(argv.collection).find(filter).toArray(function (err, docs) {
                    assert.equal(err, null);
                    docs.forEach(doc => {
                        var oldSet = updateFields.reduce(function (acc, field, i) { acc[field] = doc[field]; return acc; }, {});
                        console.log(argv.database + '.' + argv.collection, "filter", filter, "\nchange:", oldSet, "\nto:    ", set);
                    });
                    updateCount++;
                    checkCloseConnection(connection, docCount, updateCount);
                });
            } else {
                connection.db(argv.database).collection(argv.collection).updateMany(
                    filter,
                    { $set: set },
                    function (err, result) {
                        assert.equal(err, null);
                        console.log(argv.database + '.' + argv.collection, "filter", filter, "set", set);

                        updateCount++;
                        checkCloseConnection(connection, docCount, updateCount);
                    }
                );
            }

        })
        .on('end', rowCount => {
            console.log(`Parsed ${rowCount} rows from csv`);
            docCount = rowCount;
            checkCloseConnection(connection, docCount, updateCount);
        });

});
