/* 
Usage:

    # open mongo shell with count_duplicates.js script
    mongo localhost:27017/ngmHealthCluster count_duplicates.js --shell

    # call run_aggregate_queries() to show number of duplicates
    run_aggregate_queries()

    # call delete_stock_duplicates() 
    delete_stock_duplicates()

    # call run_aggregate_queries() again to check result
    run_aggregate_queries()
*/

var queries = [];

queries.push({
    'key': 'total_duplicates_group_by_org_year_month',
    'desc': 'Total duplicates group by org, year, month',
    'query': function () {
        return db.stock.aggregate(
            [{
                $match: {
                    report_year: 2021,
                    admin0pcode: "AF",
                    // organization_tag: "akah",
                }
            }, {
                $sort: {
                    "_id": 1,
                }
            }, {
                $group: {
                    _id: {
                        report_id: "$report_id",
                        organization_tag: "$organization_tag",
                        location_id: "$location_id",
                        cluster_id: "$cluster_id",
                        stock_item_type: "$stock_item_type",
                        stock_targeted_groups_id: "$stock_targeted_groups_id",
                        stock_status_name: "$stock_status_name",
                        unit_type_id: "$unit_type_id",
                        number_in_stock: "$number_in_stock",
                        beneficiaries_covered: "$beneficiaries_covered",
                        admin0pcode: "$admin0pcode",
                        report_status: "$report_status",
                        reporting_period: "$reporting_period",
                        number_in_pipeline: "$number_in_pipeline",
                        report_year: "$report_year",
                        report_month: "$report_month",
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
})

queries.push({
    'key': 'total_unique_and_duplicate_reports',
    'desc': 'Total unique and duplicate reports\n:\ntotal_reports = total_unique + total_not_unique\nduplicates = total_reports - total_with_duplicates_removed\ntotal_not_unique_with_duplicates_removed = total_not_unique - duplicates\ntotal_with_duplicates_removed = total_unique + total_not_unique_with_duplicates_removed',
    'query': function () {
        return db.stock.aggregate(
            [{
                $match: {
                    report_year: 2021,
                    admin0pcode: "AF"
                }
            }, {
                // sort _id before apply $first or $last $_id
                $sort: {
                    "_id": 1,
                }
            }, {
                $group: {
                    _id: {
                        report_id: "$report_id",
                        organization_tag: "$organization_tag",
                        location_id: "$location_id",
                        cluster_id: "$cluster_id",
                        stock_item_type: "$stock_item_type",
                        stock_targeted_groups_id: "$stock_targeted_groups_id",
                        stock_status_name: "$stock_status_name",
                        unit_type_id: "$unit_type_id",
                        number_in_stock: "$number_in_stock",
                        beneficiaries_covered: "$beneficiaries_covered",
                        admin0pcode: "$admin0pcode",
                        report_status: "$report_status",
                        reporting_period: "$reporting_period",
                        number_in_pipeline: "$number_in_pipeline",
                        report_year: "$report_year",
                        report_month: "$report_month",
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
                $group: {
                    _id: null,
                    total_reports: {
                        $sum: "$count"
                    },
                    total_unique: {
                        "$sum": {
                            "$cond": [
                                { "$eq": ["$count", 1] },
                                "$count",
                                0
                            ]
                        }
                    },
                    total_not_unique: {
                        "$sum": {
                            "$cond": [
                                { "$gte": ["$count", 2] },
                                "$count",
                                0
                            ]
                        }
                    },
                    total_not_unique_with_duplicates_removed: {
                        "$sum": {
                            "$cond": [
                                { "$gte": ["$count", 2] },
                                1,
                                0
                            ]
                        }
                    },
                    total_with_duplicates_removed: {
                        $sum: 1
                    },
                }
            }, {
                $project: {
                    _id: false,
                    total_reports: true,
                    total_unique: true,
                    total_not_unique: true,
                    total_not_unique_with_duplicates_removed: true,
                    duplicates: { $subtract: ["$total_reports", "$total_with_duplicates_removed"], },
                    total_with_duplicates_removed: true, // = total_unique + total_not_unique - duplicates
                }
            }]
        )
    }
})

queries.push({
    'key': 'all_organization_reports',
    'desc': 'All organization reports ',
    'query': function () {
        return db.stock.aggregate(
            [{
                $match: {
                    report_year: 2021,
                    admin0pcode: "AF"
                }
            }, {
                $group: {
                    _id: {
                        organization_tag: "$organization_tag",
                    },
                }
            }, {
                $group: {
                    _id: null,
                    organizations: {
                        $addToSet: "$_id.organization_tag"
                    },
                    total: {
                        $sum: 1
                    },
                }
            }]
        )
    }
})

queries.push({
    'key': 'organization_with_duplicate_reports',
    'desc': 'Organization with duplicate reports ',
    'query': function () {
        return db.stock.aggregate(
            [{
                $match: {
                    report_year: 2021,
                    admin0pcode: "AF"
                }
            }, {
                // sort _id before apply $first or $last $_id
                $sort: {
                    "_id": 1,
                }
            }, {
                $group: {
                    _id: {
                        report_id: "$report_id",
                        organization_tag: "$organization_tag",
                        location_id: "$location_id",
                        cluster_id: "$cluster_id",
                        stock_item_type: "$stock_item_type",
                        stock_targeted_groups_id: "$stock_targeted_groups_id",
                        stock_status_name: "$stock_status_name",
                        unit_type_id: "$unit_type_id",
                        number_in_stock: "$number_in_stock",
                        beneficiaries_covered: "$beneficiaries_covered",
                        admin0pcode: "$admin0pcode",
                        report_status: "$report_status",
                        reporting_period: "$reporting_period",
                        number_in_pipeline: "$number_in_pipeline",
                        report_year: "$report_year",
                        report_month: "$report_month",
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
            }, {
                $group: {
                    _id: {
                        organization_tag: "$_id.organization_tag"
                    },
                    total_not_unique: {
                        $sum: "$count"
                    },
                    total_not_unique_with_duplicates_removed: {
                        $sum: 1
                    }
                }
            }, {
                $project: {
                    _id: true,
                    total_not_unique: true,
                    total_not_unique_with_duplicates_removed: true,
                    duplicates: { $subtract: ["$total_not_unique", "$total_not_unique_with_duplicates_removed"], },
                }
                // }, {
                //     $group: {
                //         _id: null,
                //         organizations: {
                //             $addToSet: "$_id.organization_tag"
                //         },
                //         total: {
                //             $sum: 1
                //         },
                //     }
            }]
        )
    }
})

// make queries object from queries array
var queries_obj = queries.reduce(function (acc, cur, i) { acc[cur['key']] = cur; return acc; }, {});

function deletedocs(collection, cursor) {
    cursor.forEach(function (doc) {
        db.getCollection(collection).remove({ "_id": doc._id });
    });
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
    ).forEach(function (ObjectId) {
        // remove duplicate _ids
        collection.remove({ "_id": ObjectId });
    });
}

function run_query(key) {
    print(queries_obj[key]['desc']);
    queries_obj[key]['query']().forEach(printjson);
    print('\n');
}

function delete_stock_duplicates() {
    print('run delete_duplicates on stock');
    delete_duplicates(queries_obj['total_duplicates_group_by_org_year_month']['query'], db.stock);
    delete_duplicates(queries_obj['total_duplicates_group_by_org_year_month']['query'], db.stock);
}

function run_aggregate_queries() {
    print('\n');
    run_query('total_unique_and_duplicate_reports');
    run_query('all_organization_reports');
    run_query('organization_with_duplicate_reports');
};

function show_commands() {
    print('');
    print('Available commands:\n');
    Object.keys(queries_obj).map(function (key) { print('run_query(\'' + key + '\')') });
    // Object.keys(queries_obj).map(function (key) {print(`run_query('${key}')`)});
    print('delete_stock_duplicates()');
    print('run_aggregate_queries()');
    print('show_commands()');
    print('');
};

show_commands();