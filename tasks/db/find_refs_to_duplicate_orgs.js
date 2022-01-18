/* 
Description:
    Find collections in ngmHealthCluster with references to duplicate organization in ngmReportHub, 
    delete the duplicates, then update the references.

    Usage:
    // adjust admin0pcode and lt_report_year variables in 'base match' section (line 52 or so)

    // open mongo shell with find_refs_to_duplicate_orgs.js script
    mongo localhost:27017/ngmHealthCluster find_refs_to_duplicate_orgs.js --shell

    // 1. DELETE DUPLICATE ORGANIZATIONS
    
    // show duplicate organizations
    run_query_func(find_duplicate_orgs_query)

    // delete duplicate organizations
    delete_duplicate_organizations()

    // check delete result
    run_query_func(find_duplicate_orgs_query)

    // 2. UPDATE REFERENCES TO DUPLICATE ORGANIZATIONS

    // show references to duplicate organizations
    show_refs_to_duplicate_orgs()

    // update references to duplicate organizations
    update_refs_to_duplicate_orgs()

    // check update result
    show_refs_to_duplicate_orgs()

    // 3. UPDATE REFERENCES TO DUPLICATE AND NON DUPLICATE ORGANIZATIONS

    // show references to duplicate and non duplicate organizations
    show_refs_to_duplicate_orgs(include_non_duplicate=true)

    // update references to duplicate and non duplicate organizations
    update_refs_to_duplicate_orgs(include_non_duplicate=true)

    // check update result
    show_refs_to_duplicate_orgs(include_non_duplicate=true)

Fix issue https://github.com/rafinkanisa/ngm-reportDesk/issues/18

*/

// collections with references to duplicate organizations 
var org_collections = [
    {
        'db_name': 'ngmHealthCluster',
        'collections': [
            "beneficiaries",
            "budgetprogress",
            "location",
            "project",
            "report",
            "stock",
            "stocklocation",
            "stockreport",
            "targetbeneficiaries",
            "targetlocation",
        ],
        'match_fields': [
            'admin0pcode',
            // 'report_year',
        ]
    }, {
        'db_name': 'ngmHealthCluster',
        'collections': [
            "stockwarehouse",
        ],
        'match_fields': [
            'admin0pcode',
        ]
    }, {
        'db_name': 'ngmReportHub',
        'collections': [
            "user",
            "userhistory",
            "userloginhistory",
        ],
        'match_fields': [
            'admin0pcode',
        ]
    },
];

// base match
var admin0pcode = "NG"
var lt_report_year = 2023

function merge_objects(objects) {
    // var merged = {};
    // objects.forEach(function (obj) {
    //     for (var attr in obj) { merged[attr] = obj[attr]; }
    // })
    // return merged;
    return objects.reduce(
        function (merged, obj) { for (var attr in obj) { merged[attr] = obj[attr] }; return merged }, {}
    )
}

function get_match_fields(db_name, collection) {
    var found = org_collections.filter(function (value) {
        return value['db_name'] == db_name && value['collections'].indexOf(collection) >= 0;
    });
    return (found.length && found[0].hasOwnProperty('match_fields')) ? found[0]['match_fields'] : [];
}

function find_refs_to_duplicate_orgs_query(db_name, collection, include_non_duplicate) {
    var pipeline = [
        {
            $match: merge_objects([
                { organization_id: { $ne: null } }, // with or without this line is the same, confirmed using diff
                get_match_fields(db_name, collection).indexOf('admin0pcode') >= 0 ? { admin0pcode: admin0pcode } : {},
                get_match_fields(db_name, collection).indexOf('report_year') >= 0 ? { report_year: { $lt: lt_report_year } } : {},
            ])
        }, {
            $sort: { // make sure ordering is consistent before using diff 
                organization_tag: 1,
                organization_id: 1,
            }
        }, {
            $group: {
                _id: "$organization_tag",
                _ids: {
                    $addToSet: "$_id"
                },
                organization_ids: {
                    $addToSet: "$organization_id"
                },
                document_count: {
                    $sum: 1
                }
            }
        }, {
            $project: {
                _id: true,
                _ids: true,
                _ids_count: { $size: "$_ids" },
                organization_ids: true,
                organization_ids_count: { $size: "$organization_ids" },
                document_count: true,
                has_ref_to_duplicate_orgs: { $gte: [{ $size: "$organization_ids" }, 2] },
            }
        },
    ]

    if (include_non_duplicate != true) {
        pipeline = pipeline.concat([
            {
                $match: {
                    has_ref_to_duplicate_orgs: true,
                }
            }
        ]);
    }

    return db.getSiblingDB(db_name).getCollection(collection).aggregate(pipeline);
}

function get_one_org(org_tag) {
    var cursor = db.getSiblingDB('ngmReportHub').getCollection("organization").find({
        admin0pcode: admin0pcode,
        organization_tag: org_tag,
    }).sort({ createdAt: 1 }).limit(1);
    return cursor.hasNext() ? cursor.next() : null;
}

function show_refs_to_duplicate_orgs(include_non_duplicate) {
    org_collections.forEach(function (collection_set) {
        var db_name = collection_set['db_name'];
        collection_set['collections'].forEach(function (collection) {

            var refs = find_refs_to_duplicate_orgs_query(db_name, collection, include_non_duplicate);
            if (refs.hasNext()) {
                refs.forEach(function (doc) {

                    print('\ncollection:', db_name + '.' + collection, ', org_tag:', doc._id);
                    printjson(doc);

                    print('check by org_ref:');
                    doc.organization_ids.forEach(function (org_id) {
                        var org = db.getSiblingDB('ngmReportHub').getCollection("organization").findOne({ _id: ObjectId(org_id), admin0pcode: admin0pcode })
                        if (org) {
                            print('org_ref:', org_id, ', with org_tag:', org.organization_tag, ', found in ngmReportHub.organization');
                        } else {
                            print('org_ref:', org_id, ', not found in ngmReportHub.organization');
                        };
                    })

                    print('check by org_tag:');
                    var org = get_one_org(doc._id);
                    if (org) {
                        print('org_tag:', org.organization_tag, ', with _id:', org._id, ', found in ngmReportHub.organization (_id will be used to update refs)');
                    } else {
                        print('org_tag:', doc._id, ', not found in ngmReportHub.organization');
                    };
                });

            } else {
                print('\ncollection:', db_name + '.' + collection, ', no reference to duplicate organizations found');
            }
        });
    })
}

function update_refs_to_duplicate_orgs(include_non_duplicate) {
    org_collections.forEach(function (collection_set) {
        var db_name = collection_set['db_name'];
        collection_set['collections'].forEach(function (collection) {

            var refs = find_refs_to_duplicate_orgs_query(db_name, collection, include_non_duplicate);
            if (refs.hasNext()) {
                refs.forEach(function (doc) {
                    print('\ncollection:', db_name + '.' + collection, ', org_tag:', doc._id);
                    var org = get_one_org(doc._id);
                    if (org) {
                        print('update org ref using _id:', org._id.valueOf());
                        db.getSiblingDB(db_name).getCollection(collection).update(
                            { _id: { $in: doc._ids } },
                            { $set: { organization_id: org._id.valueOf() } },
                            { multi: true }
                        );
                        // db.getCollection(collection).updateMany(
                        //     { _id: { $in: doc._ids } },
                        //     {
                        //         $set: { organization_id: org._id.valueOf() }
                        //     }
                        // );
                    } else {
                        print('org_tag:', doc._id, ', not found in ngmReportHub.organization, update failed');
                    };
                });

            } else {
                print('\ncollection:', db_name + '.' + collection, ', no reference to duplicate organizations found');
            }
        });
    })
}

function find_duplicate_orgs_query() {
    return db.getSiblingDB('ngmReportHub').getCollection("organization").aggregate(
        [{
            $match: {
                "admin0pcode": admin0pcode,
            }
        }, {
            $sort: {
                "createdAt": 1,
            }
        }, {
            $group: {
                _id: {
                    adminRpcode: "$adminRpcode",
                    adminRname: "$adminRname",
                    admin0pcode: "$admin0pcode",
                    organization_type: "$organization_type",
                    organization_name: "$organization_name",
                    organization_tag: "$organization_tag",
                    organization: "$organization",
                    // cluster_id: "$cluster_id",
                    // cluster: "$cluster",
                },
                _ids: {
                    $addToSet: "$_id"
                },
                first_id: { $first: "$_id" },
                last_id: { $last: "$_id" },
                count: {
                    $sum: 1
                }
            }
        }, {
            $match: {
                count: {
                    $gte: 2
                }
            }
        }]
    )
}

function delete_duplicates(query_func, collection) {
    query_func().map(
        // get all duplicate _ids excluding first_ids
        function (i) {
            return i._ids.filter(function (value, index, arr) { return value.str != i.first_id.str; });
        }
    ).reduce(
        // flatten array
        function (c, b) { return c.concat(b) }, []
    ).forEach(function (obj_id) {
        // remove duplicate _ids
        collection.remove({ "_id": obj_id });
    });
}

function run_query_func(query_func) {
    var cursor = query_func();
    if (cursor.hasNext()) {
        cursor.forEach(printjson);
        print('\n');
    } else {
        print('query returns empty');
    }
}

function delete_duplicate_organizations() {
    print('run delete_duplicates on ngmReportHub.organization');
    delete_duplicates(
        find_duplicate_orgs_query,
        db.getSiblingDB('ngmReportHub').getCollection("organization")
    );
}
