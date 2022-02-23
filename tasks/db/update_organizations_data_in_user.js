/* 
Description:
    update organization, organization_name data in user collection

Usage:

    // run mongo shell with this script
    mongo localhost:27017/ngmReportHub update_organizations_data_in_user.js --eval 'var admin0pcode="AF"'

    // set dryRun=true to simulate operation without performing it
    mongo localhost:27017/ngmReportHub update_organizations_data_in_user.js --eval 'var admin0pcode="AF",dryRun=true'

Parameter:
    parameter executed as javascript code in cli using --eval

    admin0pcode: [string]
    dryRun: [boolean]

    example: --eval 'var admin0pcode="AF",dryRun=true'

*/

if (typeof admin0pcode === 'undefined') {
    print('admin0pcode param not set, eg: --eval \'var admin0pcode="AF"\'')
    quit(1);
}

db.getSiblingDB('ngmReportHub').getCollection("organization").find(
    { 'admin0pcode': admin0pcode },
    {
        '_id': false,
        'admin0pcode': true,
        'organization_tag': true,
        'organization': true,
        'organization_name': true
    }
).sort({
    'admin0pcode': 1,
    'organization_tag': 1
}).forEach(function (org) {
    var printHeader = true;
    db.getSiblingDB('ngmReportHub').getCollection("user").find({
        'admin0pcode': org.admin0pcode,
        'organization_tag': org.organization_tag,
        $or: [
            { 'organization': { $ne: org.organization } },
            { 'organization_name': { $ne: org.organization_name } }
        ]
    }).forEach(function (user) {
        if (printHeader) {
            print('\norganization data:', JSON.stringify(org));
            print('user data to be updated:');
            printHeader = false;
        }
        print(JSON.stringify({ '_id': user._id.str, 'organization': user.organization, 'organization_name': user.organization_name }));
        if (typeof dryRun === 'undefined' || dryRun !== true) {
            user.organization = org.organization;
            user.organization_name = org.organization_name;
            // printjson(user);
            var writeResult = db.getSiblingDB('ngmReportHub').getCollection("user").save(user);
            // printjson(writeResult);
        }
    });
});
