/**
 * AdminDashboardController
 *
 * @description :: Health Cluster Dashboard
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

var async = require('async');

// flatten json
function flatten( json ) {
  var array = [];
  for( var i in json ) {
    if ( json.hasOwnProperty( i ) && json[ i ] instanceof Object ){
      array.push( json[ i ] );
    }
  }
  return array;
}

// admin controller
var AdminDashboardController = {

  //
  getClusterAdminIndicator: function( req, res ){

    // request input
    if ( !req.param( 'report_type' ) || !req.param( 'indicator' ) || !req.param( 'cluster_id' ) || !req.param( 'organization_tag' ) || !req.param( 'activity_type_id' ) || !req.param( 'adminRpcode' )  || !req.param( 'admin0pcode' ) || !req.param( 'start_date' ) || !req.param( 'end_date' ) ) {
      return res.json( 401, { err: 'report_type, indicator, cluster_id, organization_tag, activity_type_id, adminRpcode, admin0pcode, start_date, end_date required!' });
    }

    // organizations to exclude totally
		var $nin_organizations = [ 'immap', 'arcs' ];

    // variables
    var params = {
          moment: require( 'moment' ),
          csv: req.param( 'csv' ),
          list: req.param( 'list' ),
          indicator: req.param( 'indicator' ),
          report_type: req.param( 'report_type' ),
          activity_type_id: req.param( 'activity_type_id' ) === 'all'? {} : { 'activity_type.activity_type_id': req.param( 'activity_type_id' ) },
          organization_tag: req.param( 'organization_tag' ),
          // cluster_filter: req.param( 'cluster_id' ) === 'all' || req.param( 'cluster_id' ) === 'acbar' ? {} : { cluster_id: req.param( 'cluster_id' ) },
          cluster_filter: req.param('cluster_id') === 'all' || req.param('cluster_id') === 'acbar' ? {} : { $or: [{ cluster_id: req.param('cluster_id') }, { "activity_type.cluster_id": req.param('cluster_id') }] },
          acbar_partners_filter: req.param( 'cluster_id' ) === 'acbar' ? { project_acbar_partner: true } : {},
          organization_filter: req.param( 'organization_tag' ) === 'all' ? { organization_tag: { '!': $nin_organizations } } : { $or: [{ organization_tag: req.param( 'organization_tag' ) }, { "implementing_partners.organization_tag": req.param('organization_tag') }, { "programme_partners.organization_tag": req.param('organization_tag') }] },
          organization_filter_Native: req.param( 'organization_tag' ) === 'all' ? { organization_tag: { '$nin': $nin_organizations } } : { $or: [{ organization_tag: req.param( 'organization_tag' ) }, { "implementing_partners.organization_tag": req.param('organization_tag') }, { "programme_partners.organization_tag": req.param('organization_tag') }] },
          adminRpcode_filter: req.param( 'adminRpcode' ) === 'all' ? {} : { adminRpcode: req.param( 'adminRpcode' ).toUpperCase() },
          admin0pcode_filter: req.param( 'admin0pcode' ) === 'all' ? {} : { admin0pcode: req.param( 'admin0pcode' ).toUpperCase() },
          start_date: req.param( 'start_date' ),
          end_date: req.param( 'end_date' ),
          report_period_type: req.param('report_period_type_id') === 'all' ? {} : (req.param('report_period_type_id') === 'bi-weekly' ? { report_type_id: req.param('report_period_type_id') } : { report_type_id: { $ne: 'bi-weekly' } }),
          project_detail: req.param('project_detail') === 'all' ? {} : { project_details: { $elemMatch: { project_detail_id: req.param('project_detail') } } },
          response: req.param('response') === 'all' ? {} : { response: { $elemMatch: { response_id: req.param('response') } } }

      }

    params.organization_and_cluster_filter_Native = { $and: [params.cluster_filter, params.organization_filter_Native] };

    // csv export
    var json2csv = require( 'json2csv' ),
        moment = require( 'moment' ),
        fields = [ 'cluster', 'organization', 'username', 'email', 'project_title', 'report_month_format', 'status_title', 'report_link' ],
        fieldNames = [ 'Cluster', 'Organization', 'User', 'Contact', 'Project Title', 'Month', 'Status', 'Link' ];

    // url
    params.url = req.protocol + '://' + req.get('host') + '/desk/';

    // stock/activity
    if ( params.report_type === 'stock' ) {
      AdminDashboardController.getStockIndicator( $nin_organizations, params, json2csv, moment, fields, fieldNames, req, res );
    } else {
      AdminDashboardController.getActivityIndicator( $nin_organizations, params, json2csv, moment, fields, fieldNames, req, res );
    }

  },

  // stock reports
  getStockIndicator: function( $nin_organizations, params, json2csv, moment, fields, fieldNames, req, res ){

    // switch on indicator
    switch( params.indicator ) {

      case 'latest':

        // get organizations by project
        StockReport
          .find()
          .where( params.acbar_partners_filter )
          .where( params.adminRpcode_filter )
          .where( params.admin0pcode_filter )
          .where( { reporting_period: { '>=': new Date( params.start_date ), '<=': new Date( params.end_date ) } } )
          .where( params.organization_filter )
          .sort( 'updatedAt DESC' )
          .limit(1)
          .exec( function( err, reports ){

            // return error
            if (err) return res.negotiate( err );


            // return org list
            return res.json( 200, reports[0] );

          });

        break;

      case 'organizations':

          var organizations = [];

          // get organizations by project
          StockReport
            .find()
            .where( params.acbar_partners_filter )
            .where( params.adminRpcode_filter )
            .where( params.admin0pcode_filter )
            .where( { reporting_period: { '>=': new Date( params.start_date ), '<=': new Date( params.end_date ) } } )
            .where( params.organization_filter )
            .exec( function( err, projects ){

              // return error
              if (err) return res.negotiate( err );

              // projects
              projects.forEach(function( d, i ){

                // if not existing
                if( !organizations[d.organization] ) {
                  organizations[ d.organization ] = {};
                  organizations[ d.organization ].organization_tag = d.organization_tag;
                  organizations[ d.organization ].organization = d.organization;
                }

              });

              // flatten
              organizations = flatten( organizations );

              // order
              organizations.sort(function(a, b) {
                return a.organization.localeCompare(b.organization);
              });

              // default
              organizations.unshift({
                organization_tag: 'all',
                organization: 'ALL',
              });

              // orgs
              Organizations
                .find()
                .where( { organization_tag: params.organization_tag } )
                .exec( function( err, organization ){

                  // return error
                  if (err) return res.negotiate( err );

                  if ( !projects.length ) {
                    organizations[1] = organization[0];
                  }

                  // get a list of projects for side menu
                  if ( params.list ) {
                    // return org list
                    return res.json( 200, organizations );
                  } else {
                    // return indicator
                    return res.json( 200, { 'value': organizations.length-1 });
                  }

                });

            });

          break;

      case 'warehouses_total':

        StockReport
          .find( {}, { fields: {_id: 1} } )
          .where( params.acbar_partners_filter )
          .where( params.adminRpcode_filter )
          .where( params.admin0pcode_filter )
          .where( { report_status: [ 'todo', 'complete' ] } )
          .where( { reporting_period: { '>=': new Date( params.start_date ), '<=': new Date( params.end_date ) } } )
          .where( params.organization_filter )
          .where( { report_active: true } )
          .exec( function( err, reports ) {
            if (err) return res.negotiate(err);
            reports = reports.map( report => report.id);
            StockLocation
                .find({ report_id: reports }, { fields: { stock_warehouse_id: 1 } })
                .exec(function(err, locations) {
                  if (err) return res.negotiate(err);
                  locations = _.uniq(locations.map(location => location.stock_warehouse_id));
                  count = locations.length;
                  return res.json( 200, { 'value': count });
                })
          })

        break;

      case 'target_locations':

        // get organizations by project
        StockWarehouse
          .find()
          .where(params.organization_and_cluster_filter_Native)
          .where(params.acbar_partners_filter)
          .where(params.adminRpcode_filter)
          .where(params.admin0pcode_filter)
          .where({ createdAt: { '>=': new Date(params.start_date) } })
          .where({ createdAt: { '<=': new Date(params.end_date) } })
          .sort('createdAt DESC')
          .exec(function (err, locations) {

            // return error
            if (err) return res.negotiate(err);

            // csv
            if (params.csv) {

              locations = locations.map(l => {
                return {
                  ...l,
                  updatedAt: moment(l.updatedAt).format('YYYY-MM-DD HH:mm:ss'),
                  createdAt: moment(l.createdAt).format('YYYY-MM-DD HH:mm:ss')
                }
              });
              // return csv
              json2csv({ data: locations }, function (err, csv) {

                // error
                if (err) return res.negotiate(err);

                // success
                return res.json(200, { data: csv });

              });
            } else if (params.list) {
              return res.json(200, locations);
            } else {
              return res.json(200, { 'value': locations.length });
            }

          });


        break;

      case 'reports_total':

        // reports total
        StockReport
          .find()
          .where( params.acbar_partners_filter )
          .where( params.adminRpcode_filter )
          .where( params.admin0pcode_filter )
          .where( { report_status: [ 'todo', 'complete' ] } )
          .where( { reporting_period: { '>=': new Date( params.start_date ), '<=': new Date( params.end_date ) } } )
          .where( params.organization_filter )
          .where( { report_active: true } )
          .sort('updatedAt DESC')
          .exec( function( err, reports ){

            // return error
            if (err) return res.negotiate( err );

            // return
            if ( params.list ) {

              // counter
              var counter=0,
                  length=reports.length;

              // reports
              reports.forEach( function( d, i ){

                // check if form has been edited
                Stock
                  .count( { report_id: d.id } )
                  .exec(function( err, b ){

                    // return error
                    if (err) return res.negotiate( err );

                    // add status / icon
                    reports[i].status = '#e57373';
                    reports[i].icon = 'fiber_manual_record';

                    // if benficiaries
                    if ( b ) {
                      // add status
                      reports[i].status = reports[i].report_status === 'complete' ? '#4db6ac' : '#fff176'
                    }

                    // reutrn
                    counter++;
                    if ( counter === length ) {
                      // table
                      return res.json( 200, reports );
                    }

                  });

              });

            } else {

              // return indicator
              return res.json( 200, { 'value': reports.length });
            }

          });

        break;

      case 'reports_due':

        // reports due
        StockReport
          .find()
          .where( params.acbar_partners_filter )
          .where( params.adminRpcode_filter )
          .where( params.admin0pcode_filter )
          .where( { report_active: true } )
          .where( { report_status: 'todo' } )
          .where( { reporting_period: { '>=': new Date( params.start_date ), '<=': new Date( params.end_date ) } } )
          .where( params.organization_filter )
          .sort('updatedAt DESC')
          .exec( function( err, reports ){

            // return error
            if (err) return res.negotiate( err );

            // return
            if ( params.list ) {

              // counter
              var counter=0,
                  length=reports.length;

              // if no reports
              if ( length === 0 ) {

                // return empty
                return res.json( 200, [] );

              } else {

                // reports
                reports.forEach( function( d, i ){

                  // check if form has been edited
                  Stock
                    .count( { report_id: d.id } )
                    .exec(function( err, b ){

                      // return error
                      if (err) return res.negotiate( err );

                      // add status
                      reports[i].status = '#e57373'
                      reports[i].icon = 'watch_later';
                      reports[i].status_title = 'Due';
                      reports[i].report_month_format = moment( reports[i].report_month+1, 'MM' ).format('MMMM');
                      reports[i].report_link = params.url + '#/cluster/stocks/report/' + reports[i].organization_id + '/' + reports[i].id;

                      // if benficiaries
                      if ( b ) {
                        // add status
                        reports[i].status = '#fff176'
                        reports[i].status_title = 'Pending';
                      }

                      // reutrn
                      counter++;
                      if ( counter === length ) {

                        // !csv
                        if ( !params.csv ) {
                          // table
                          return res.json( 200, reports );
                        }

                        // csv
                        if ( params.csv ) {
                          // return csv
                          json2csv({ data: reports, fields: fields, fieldNames: fieldNames  }, function( err, csv ) {

                            // error
                            if ( err ) return res.negotiate( err );

                            // success
                            return res.json( 200, { data: csv } );

                          });
                        }

                      }

                    });

                });

              }

            } else {

              // return indicator
              return res.json( 200, { 'value': reports.length });
            }


          });

        break;

      case 'reports_submitted':

        // reports complete
        StockReport
          .find()
          .where( params.acbar_partners_filter )
          .where( params.adminRpcode_filter )
          .where( params.admin0pcode_filter )
          .where( { reporting_period: { '>=': new Date( params.start_date ), '<=': new Date( params.end_date ) } } )
          .where( params.organization_filter )
          .where( { report_active: true } )
          .where( { report_status: 'complete' } )
          .sort('updatedAt DESC')
          .exec( function( err, reports ){

            // return error
            if (err) return res.negotiate( err );

            // return
            if ( params.list ) {

              // counter
              var counter=0,
                  length=reports.length;

              // if no reports
              if ( length === 0 ) {

                // return empty
                return res.json( 200, [] );

              } else {

                // reports
                reports.forEach( function( d, i ){

                  // check if form has been edited
                  Stock
                    .find( { report_id: d.id } )
                    .exec(function( err, b){

                      // return error
                      if (err) return res.negotiate( err );

                      // add status
                      reports[i].status = '#4db6ac'
                      reports[i].icon = 'check_circle';
                      reports[i].status_title = 'Complete';
                      reports[i].report_month_format = moment( reports[i].report_month+1, 'MM' ).format('MMMM');
                      reports[i].report_link = params.url + '#/cluster/stocks/report/' + reports[i].organization_id + '/' + reports[i].id;

                      // if benficiaries
                      if ( !b.length ) {
                        // add status
                        reports[i].status = '#80cbc4';
                        reports[i].icon = 'adjust'
                        reports[i].status_title = 'Empty Submission';
                      }

                      // reutrn
                      counter++;
                      if ( counter === length ) {

                        // !csv
                        if ( !params.csv ) {
                          // table
                          return res.json( 200, reports );
                        }

                        // csv
                        if ( params.csv ) {
                          // return csv
                          json2csv({ data: reports, fields: fields, fieldNames: fieldNames  }, function( err, csv ) {

                            // error
                            if ( err ) return res.negotiate( err );

                            // success
                            return res.json( 200, { data: csv } );

                          });
                        }

                      }

                    });

                });

              }

            } else {

              // return indicator
              return res.json( 200, { 'value': reports.length });
            }

          });

        break;

        // TODO: with native queries
        case 'reports_saved':

        // reports due
        StockReport
          .find()
          .where(params.acbar_partners_filter)
          .where(params.adminRpcode_filter)
          .where(params.admin0pcode_filter)
          .where({ report_active: true })
          .where({ report_status: 'todo' })
          .where({ reporting_period: { '>=': new Date(params.start_date), '<=': new Date(params.end_date) } })
          .where(params.organization_filter)
          .sort('updatedAt DESC')
          .exec(function (err, reports) {

            // return error
            if (err) return res.negotiate(err);

            // counter
            var counter = 0,
              length = reports.length;
              reports_saved = 0

            // if no reports
            if (length === 0) {

              // return empty
              return res.json(200, { 'value': reports_saved });

            } else {

              // reports
              reports.forEach(function (d, i) {

                // if stocks records
                Stock
                  .count({ report_id: d.id })
                  .exec(function (err, b) {

                    if (b) {
                      reports_saved += 1;
                    }

                    counter++;
                    if (counter === length) {

                      return res.json(200, { 'value': reports_saved });

                    }
                  });
              });
            }
          });

        break;

      case 'reports_complete_total':

        // reports total
        StockReport
          .find()
          .where( params.acbar_partners_filter )
          .where( params.adminRpcode_filter )
          .where( params.admin0pcode_filter )
          .where( { reporting_period: { '>=': new Date( params.start_date ), '<=': new Date( params.end_date ) } } )
          .where( params.organization_filter )
          .where( { report_active: true } )
          .sort('updatedAt DESC')
          .exec( function( err, total_reports ){

            // return error
            if (err) return res.negotiate( err );

            // reports complete
            Report
              .find()
              .where( params.organization_and_cluster_filter_Native )
              .where( params.acbar_partners_filter )
              .where( params.adminRpcode_filter )
              .where( params.admin0pcode_filter )
              .where( { reporting_period: { '>=': new Date( params.start_date ), '<=': new Date( params.end_date ) } } )
              .where( { report_active: true } )
              .where( { report_status: 'complete' } )
              .sort('updatedAt DESC')
              .exec( function( err, reports ){

                // return error
                if (err) return res.negotiate( err );

                // return new Project
                return res.json(200, { 'value': reports.length, 'value_total': total_reports.length });

              });

            });

						break;
			case 'progress_beneficiaries':
				return res.json(200, {})
        break;
      case 'organization_cluster_contact':
        return res.json(200,{});
        break;

    }

  },

  // monthly reports
  getActivityIndicator: function( $nin_organizations, params, json2csv, moment, fields, fieldNames, req, res ){

    // switch on indicator
    switch( params.indicator ) {

      case 'latest':

        // get organizations by project
        Report
          .find()
          .where( params.organization_and_cluster_filter_Native )
          .where( params.acbar_partners_filter )
          .where( params.adminRpcode_filter )
          .where( params.admin0pcode_filter )
          .where( params.activity_type_id )
          .where( { project_start_date: { '<=': new Date( params.end_date ) } } )
          .where( { project_end_date: { '>=': new Date( params.start_date ) } } )
          .where( params.report_period_type )
          .where( params.project_detail )
          .sort( 'updatedAt DESC' )
          .limit(1)
          .exec( function( err, reports ){

            // return error
            if (err) return res.negotiate( err );


            // return org list
            return res.json( 200, reports[0] );

          });

        break;

      case 'organizations':

          var organizations = [];

          // get organizations by project
          Project
            .find()
            .where( params.organization_and_cluster_filter_Native )
            .where( params.acbar_partners_filter )
            .where( params.adminRpcode_filter )
            .where( params.admin0pcode_filter )
            .where( params.activity_type_id )
            .where( { project_start_date: { '<=': new Date( params.end_date ) } } )
            .where( { project_end_date: { '>=': new Date( params.start_date ) } } )
            .where(params.report_period_type)
            .where( params.project_detail )
            .exec( function( err, projects ){

              // return error
              if (err) return res.negotiate( err );

              // projects
              projects.forEach(function( d, i ){

                // if not existing
                if( !organizations[d.organization] ) {
                  organizations[ d.organization ] = {};
                  organizations[ d.organization ].organization_tag = d.organization_tag;
                  organizations[ d.organization ].organization = d.organization;
                }

              });

              // flatten
              organizations = flatten( organizations );

              // order
              organizations.sort(function(a, b) {
                return a.organization.localeCompare(b.organization);
              });

              // default
              organizations.unshift({
                organization_tag: 'all',
                organization: 'ALL',
              });

              // orgs
              Organizations
                .find()
                .where( { organization_tag: params.organization_tag } )
                .exec( function( err, organization ){

                  // return error
                  if (err) return res.negotiate( err );

                  if ( !projects.length ) {
                    if(organization.length){
                      organizations[1] = organization[0];
                    }
                  }

                  // get a list of projects for side menu
                  if ( params.list ) {
                    // return org list
                    return res.json( 200, organizations );
                  } else {
                    // return indicator
                    return res.json( 200, { 'value': organizations.length-1 });
                  }

                });

            });

          break;

      case 'target_locations':

        TargetLocation
          .find()
          .where(params.organization_and_cluster_filter_Native)
          .where(params.acbar_partners_filter)
          .where(params.adminRpcode_filter)
          .where(params.admin0pcode_filter)
          .where(params.activity_type_id)
          .where({ project_end_date: { '>=': new Date(params.start_date) } })
          .where({ project_start_date: { '<=': new Date(params.end_date) } })
          .where(params.report_period_type)
          .sort('createdAt DESC')
          .exec(function (err, locations) {

            // return error
            if (err) return res.negotiate(err);

            // csv
            if (params.csv) {

              locations = locations.map(l => {
                return {
                  ...l,
                  project_start_date: moment(l.project_start_date).format('YYYY-MM-DD'),
                  project_end_date: moment(l.project_end_date).format('YYYY-MM-DD'),
                  updatedAt: moment(l.updatedAt).format('YYYY-MM-DD HH:mm:ss'),
                  createdAt: moment(l.createdAt).format('YYYY-MM-DD HH:mm:ss')
                }
              });

              // return csv
              if(locations.length >0){
                json2csv({ data: locations }, function (err, csv) {
  
                  // error
                  if (err) return res.negotiate(err);
  
                  // success
                  return res.json(200, { data: csv });
  
                });
              }else{
                return res.json(200, { data: "NO Target Location" });
              }
            } else if (params.list) {
              return res.json(200, locations);
            } else {
              return res.json(200, { 'value': locations.length });
            }

          });

        break;

      case 'projects_total':

        // Projects total
        Report
          .find()
          .where( params.organization_and_cluster_filter_Native )
          .where( params.acbar_partners_filter )
          .where( params.adminRpcode_filter )
          .where( params.admin0pcode_filter )
          .where( { report_active: true } )
          .where( params.activity_type_id )
          .where( { report_status: [ 'todo', 'complete' ] } )
          .where( { reporting_period: { '>=': params.moment( params.start_date ).format('YYYY-MM-DD'), '<=': params.moment( params.end_date ).format('YYYY-MM-DD') } } )
          .where(params.report_period_type)
          .where( params.project_detail )
          .sort('updatedAt DESC')
          .exec( function( err, reports ){

            // return error
            if (err) return res.negotiate( err );

            // filter by project_id
            var projects = _.countBy( reports, 'project_id' );

            // return indicator
            return res.json( 200, { 'value': Object.keys( projects ).length });

          });

        break;

      case 'reports_saved':

        // match clause for native mongo query
        var filterObject = _.extend({}, params.organization_and_cluster_filter_Native,
                                      params.acbar_partners_filter,
                                      params.adminRpcode_filter,
                                      params.admin0pcode_filter,
                                      { report_active: true },
                                      params.activity_type_id,
                                      { report_status: 'todo' },
                                      { reporting_period:
                                        { '$gte': new Date(params.moment( params.start_date ).format('YYYY-MM-DD')),
                                          '$lte': new Date(params.moment( params.end_date   ).format('YYYY-MM-DD'))
                                        }
                                      },
                                      params.report_period_type,
                                      params.project_detail
                                  );
        // reports due
        Report.native(function(err, collection) {
          if (err) return res.serverError(err);

          collection.find(
            filterObject
            ).sort({updatedAt:-1 }).toArray(function (err, reports) {

              // return error
              if (err) return res.negotiate( err );

              // temporarry solution, remove after setReportTodo biweekly deploy on PROD
              if (reports && reports.length) {
                reports = reports.filter(r => r && r.reporting_period && (moment().format('YYYY-MM-DD') >= moment(r.reporting_period).format('YYYY-MM-DD')))
              };


                // counter
                var counter = 0,
                    length  = reports.length,
                    reports_saved = 0;

                // if no reports
                if ( length === 0 ) {

                  // return empty
                  return res.json( 200, [] );

                } else {

                  // reports ids
                  var reports_array = _.map(reports,function(report){return report._id.toString()});
                  var _filterBenefSaved = _.extend({}, { report_id: { "$in": reports_array } }, params.project_detail, params.response)
                  // find saved
                  Beneficiaries.native(function(err, collection) {
                    if (err) return res.serverError(err);

                    collection.aggregate([
                        {
                        $match: _filterBenefSaved
                        },
                        {
                          $group: {
                            _id: '$report_id'
                          }
                        }
                      ]).toArray(function (err, results) {

                          // err
                          if (err) return res.negotiate(err);

                          // for reports not submitted with entries
                          var non_empty_reports=_.map(results,'_id')

                          // status
                          reports.forEach( function( d, i ){

                            // if benficiaries
                            if ( non_empty_reports.indexOf(d._id.toString())>-1) {
                              // add status
                              reports_saved++;
                            }

                            // return
                            counter++;
                            if ( counter === length ) {
                              // return indicator
                              return res.json( 200, { 'value': reports_saved });
                            }

                          });

                      });

                  });
                }

            });
        });

        break;

      case 'reports_submitted':

        // reports complete
        var filterObject = _.extend({}, params.organization_and_cluster_filter_Native,
                                        params.acbar_partners_filter,
                                        params.adminRpcode_filter,
                                        params.admin0pcode_filter,
                                        { report_active: true },
                                        params.activity_type_id,
                                        { report_status: 'complete' },
                                        { reporting_period:
                                          { '$gte': new Date(params.moment( params.start_date ).format('YYYY-MM-DD')),
                                            '$lte': new Date(params.moment( params.end_date   ).format('YYYY-MM-DD'))
                                          }
                                        },
                                        params.report_period_type,
                                        params.project_detail
                                      );

        Report.native(function(err, collection) {
          if (err) return res.serverError(err);

          collection.find(
            filterObject
            ).sort({updatedAt:-1 }).toArray(function (err, reports) {

              // return error
              if (err) return res.negotiate( err );

              // temporarry solution, remove after setReportTodo biweekly deploy on PROD
              if (reports && reports.length) {
                reports = reports.filter(r => r && r.reporting_period && (moment().format('YYYY-MM-DD') >= moment(r.reporting_period).format('YYYY-MM-DD')))
              }

              // return
              if ( params.list ) {

                // counter
                var counter= 0,
                    length = reports.length;

                // if no reports
                if ( length === 0 ) {

                  // return empty
                  return res.json( 200, [] );

                } else {

                  var reports_array = _.map(reports,function(report){return report._id.toString()});

                  Beneficiaries.native(function(err, collection) {
                    if (err) return res.serverError(err);
                    var _filterBenefSubmitted = _.extend({}, { report_id: { "$in": reports_array }}, params.project_detail,params.response)
                    
                    collection.aggregate([
                        {
                        $match: _filterBenefSubmitted
                        },
                        {
                          $group: {
                            _id: '$report_id'
                          }
                        }
                      ]).toArray(function (err, results) {
                        if (err) return res.serverError(err);

                        // for reports not submitted with entries
                        var non_empty_reports=_.map(results,'_id')
                        
                        // reports
                        reports.forEach( function( d, i ){

                              // add status
                              reports[i].id           = reports[i]._id.toString();
                              reports[i].location_groups = reports[i].location_groups ? reports[i].location_groups.length : 0;
                              reports[i].status       = '#4db6ac'
                              reports[i].status_title = 'Complete';
  														reports[i].icon         = 'check_circle';
  														if (reports[i].report_validation && reports[i].report_validation === 'valid') {
  															reports[i].icon = 'done_all';
  															reports[i].status = '#4db6ac';
  														}
  														if (reports[i].report_validation && reports[i].report_validation === 'invalid') {
  															reports[i].icon = 'not_interested';
  															reports[i].status = '#f44336';
  														}
  														if (reports[i].report_validation && reports[i].report_validation === 'checked') {
  															reports[i].icon = 'watch_later';
  															reports[i].status = '#4db6ac';
  														}
                              reports[i].report_month_format = moment( reports[i].report_month+1, 'MM' ).format('MMMM');
                              reports[i].report_link = params.url + '#/cluster/projects/report/' + reports[i].project_id + '/' + reports[i]._id.toString();

                              // if benficiaries
                              if ( non_empty_reports.indexOf(d._id.toString())<0 ) {
                                        // add status
                                        reports[i].status       = '#80cbc4';
                                        reports[i].icon         = 'adjust';
                                        reports[i].status_title = 'Empty Submission';
                                      }

                                      // set implementing partners icon
                                      if (req.param('organization_tag') !== 'all' && d.implementing_partners && d.implementing_partners.length) {
                                        if (d.implementing_partners.filter(o => o.organization_tag === req.param('organization_tag')).length) {
                                          reports[i].icon = 'group';
                                          reports[i].status = '#2196F3';
                                          reports[i].status_title = 'Complete';
                                        }
                                      }

                                      // set programme partners icon
                                      if (req.param('organization_tag') !== 'all' && d.programme_partners && d.programme_partners.length) {
                                        if (d.programme_partners.filter(o => o.organization_tag === req.param('organization_tag')).length) {
                                          reports[i].icon = 'supervisor_account';
                                          reports[i].status = '#2196F3';
                                          reports[i].status_title = 'Complete';
                                        }
                                      }
                                      // return
                                      counter++;
                                      if ( counter === length ) {

                                        if (req.param('response') !== 'all') {
                                          var reports_with_response = reports.filter(r => non_empty_reports.indexOf(r._id.toString()) > -1)
                                          reports = reports_with_response;
                                        }

                                        // !csv
                                        if ( !params.csv ) {
                                          // table
                                          return res.json( 200, reports );
                                        }

                                        // csv
                                        if ( params.csv ) {

                                          // return csv
                                          json2csv({ data: reports, fields: fields, fieldNames: fieldNames  }, function( err, csv ) {

                                            // error
                                            if ( err ) return res.negotiate( err );

                                            // success
                                            return res.json( 200, { data: csv } );

                                          });
                                        }
                                      }
                        });

                      });
                  });
                }

              } else {
                  // return indicator
                  // return res.json( 200, { 'value': reports.length });

                var reports_array_value = _.map(reports, function (report) { return report._id.toString() });
                Beneficiaries.native(function (err, collection) {
                  if (err) return res.serverError(err);
                  var _filterBenefSubmitted = _.extend({}, { report_id: { "$in": reports_array_value } }, params.project_detail, params.response)

                  collection.aggregate([
                    {
                      $match: _filterBenefSubmitted
                    },
                    {
                      $group: {
                        _id: '$report_id'
                      }
                    }
                  ]).toArray(function (err, results) {
                    if (err) return res.serverError(err);

                    // for reports not submitted with entries
                    var non_empty_reports = _.map(results, '_id')
                    if (req.param('response') !== 'all') {
                      var reports_dup_value = reports.filter(r => non_empty_reports.indexOf(r._id.toString()) > -1)
                      reports = reports_dup_value;
                    }
                    return res.json(200, { 'value': reports.length })
                  })
                })
              
              }
            });
          });

        break;

      case 'reports_due':

        // match clause for native mongo query
        var filterObject = _.extend({},	params.organization_and_cluster_filter_Native,
                                      params.acbar_partners_filter,
                                      params.adminRpcode_filter,
                                      params.admin0pcode_filter,
                                      { report_active: true },
                                      params.activity_type_id,
                                      { report_status: 'todo' },
                                      { reporting_period:
                                        { '$gte': new Date(params.moment( params.start_date ).format('YYYY-MM-DD')),
                                          '$lte': new Date(params.moment( params.end_date   ).format('YYYY-MM-DD'))
                                        }
                                      },
                                      params.report_period_type,
                                      params.project_detail
                                  );

        // reports due
        Report.native(function(err, collection) {
          if (err) return res.serverError(err);

          collection.find(
            filterObject
            ).sort({updatedAt:-1 }).toArray(function (err, reports) {

              // return error
              if (err) return res.negotiate( err );

              // temporarry solution, remove after setReportTodo biweekly deploy on PROD
              if (reports && reports.length) {
                reports = reports.filter(r => r && r.reporting_period && (moment().format('YYYY-MM-DD') >= moment(r.reporting_period).format('YYYY-MM-DD')))
              }


              // counter
              var counter = 0,
                  length  = reports.length;

              // if no reports
              if ( length === 0 ) {

                // return empty
                return res.json( 200, [] );

              } else {

                // reports ids
                var reports_array = _.map(reports,function(report){return report._id.toString()});

                Beneficiaries.native(function(err, collection) {
                  if (err) return res.serverError(err);
                  var _filterBenefDue = _.extend({}, { report_id: { "$in": reports_array } })
                  collection.aggregate([
                      {
                      $match: _filterBenefDue
                      },
                      {
                        $group: {
                          _id: '$report_id',
                          response: { $addToSet: '$response' },
                        }
                      }
                    ]).toArray(function (err, results) {
                      
                        if (err) return res.negotiate(err);

                      results.forEach(function (x) {
                        var _temp = [];
                        if (x.response && (x.response.length)) {
                          x.response.forEach(function (y) {
                            _temp.push(...y)
                          })
                        }
                        x.response = _temp
                      })

                        // for reports not submitted with entries
                        var non_empty_reports=_.map(results,'_id')
                        var results_with_response = results.filter(x => x.response && x.response.findIndex(r => r.response_id === 'winterization') > -1);
                        var non_empty_reports_with_response = _.map(results_with_response, '_id')

                        // status
                        reports.forEach( function( d, i ){

                              // add status
                              reports[i].id     = reports[i]._id.toString();
                              reports[i].location_groups = reports[i].location_groups ? reports[i].location_groups.length : 0;
                              reports[i].status = '#e57373'
                              reports[i].status_title = 'Due';
                              reports[i].icon = 'error';
                              reports[i].report_month_format = moment( reports[i].report_month+1, 'MM' ).format('MMMM');
                              reports[i].report_link = params.url + '#/cluster/projects/report/' + reports[i].project_id + '/' + reports[i]._id.toString();
                              // if benficiaries
                              if ( non_empty_reports.indexOf(d._id.toString())>-1) {
                                // add status
                                reports[i].icon = 'watch_later';
                                reports[i].status = '#fff176';
                                reports[i].status_title = 'Pending';
                              }

                              // set implementing partners icon
                              if (req.param('organization_tag') !== 'all' && d.implementing_partners && d.implementing_partners.length) {
                                if (d.implementing_partners.filter(o => o.organization_tag === req.param('organization_tag')).length) {
                                  reports[i].icon = 'group';
                                  reports[i].status = '#2196F3';
                                  reports[i].status_title = 'Pending';
                                }
                              }

                              // set implementing partners icon
                              if (req.param('organization_tag') !== 'all' && d.programme_partners && d.programme_partners.length) {
                                if (d.programme_partners.filter(o => o.organization_tag === req.param('organization_tag')).length) {
                                  reports[i].icon = 'supervisor_account';
                                  reports[i].status = '#2196F3';
                                  reports[i].status_title = 'Pending';
                                }
                              }
                              // return
                              counter++;
                              if ( counter === length ) {

                                // value
                                if ( !params.list ) {
                                  // return indicator
                                  return res.json( 200, { 'value': reports.length - non_empty_reports.length });
                                }

                                if (req.param('response') !== 'all'){
                                  non_empty_reports_without_response = non_empty_reports.filter(r => non_empty_reports_with_response.indexOf(r)<0);
                                  _temp_reports = reports.filter(r => non_empty_reports_without_response.indexOf(r.id) <0);
                                  reports = _temp_reports;
                                }

                                // !csv
                                if ( !params.csv ) {
                                  // table
                                  return res.json( 200, reports );
                                }

                                // csv
                                if ( params.csv ) {

                                  // return csv
                                  json2csv({ data: reports, fields: fields, fieldNames: fieldNames  }, function( err, csv ) {

                                    // error
                                    if ( err ) return res.negotiate( err );

                                    // success
                                    return res.json( 200, { data: csv } );

                                  });
                                }

                              }

                          });

                       });
                });
              }

            });
        });

        break;

      case 'reports_total':

        // reports total
        Report
          .find()
          .where( params.adminRpcode_filter )
          .where( params.admin0pcode_filter )
          .where( params.organization_and_cluster_filter_Native )
          .where( { report_active: true } )
          .where( params.activity_type_id )
          .where( params.acbar_partners_filter )
          .where( { report_status: [ 'todo', 'complete' ] } )
          .where( { reporting_period: { '>=': params.moment( params.start_date ).format('YYYY-MM-DD'), '<=': params.moment( params.end_date ).format('YYYY-MM-DD') } } )
          .where(params.report_period_type)
          .where( params.project_detail )
          .sort('updatedAt DESC')
          .exec( function( err, reports ){

            // temporarry solution, remove after setReportTodo biweekly deploy on PROD
            if (reports && reports.length) {
              reports = reports.filter(r => r && r.reporting_period && (moment().format('YYYY-MM-DD') >= moment(r.reporting_period).format('YYYY-MM-DD')))
            }


            // return error
            if (err) return res.negotiate( err );

            if (req.param('response') !== 'all') {
              var reports_array_value = _.map(reports, function (report) { return report.id });
              Beneficiaries.native(function (err, collection) {
                if (err) return res.serverError(err);
                var _filterBeneftotal = _.extend({}, { report_id: { "$in": reports_array_value } })

                collection.aggregate([
                  {
                    $match: _filterBeneftotal
                  },
                  {
                    $group: {
                      _id: '$report_id',
                      response: { $addToSet: '$response'  },
                    }
                  }
                ]).toArray(function (err, results) {
                  if (err) return res.serverError(err);

                  results.forEach(function(x){
                    var _temp=[];
                    if (x.response && (x.response.length)){
                        x.response.forEach(function(y){
                          _temp.push(...y)
                        })
                    }
                    x.response = _temp
                  })

                  // for reports not submitted with entries
                  var non_empty_reports = _.map(results, '_id')
                  var results_with_response = results.filter(x => x.response && x.response.findIndex(r => r.response_id === 'winterization') > -1);
                  var non_empty_reports_with_response = _.map(results_with_response, '_id')


                  var report_pending = reports.filter(r => non_empty_reports.indexOf(r.id) < 0 && r.report_status === 'todo');
                  var report_submitted_empty = reports.filter(r => non_empty_reports.indexOf(r.id) < 0 && r.report_status === 'complete');
                  var report_saved = reports.filter(r => non_empty_reports_with_response.indexOf(r.id) > -1 && r.report_status === 'todo');
                  var report_submitted = reports.filter(r => non_empty_reports_with_response.indexOf(r.id) > -1 && r.report_status === 'complete');
                  
                  var final = [...report_pending, ...report_saved, ...report_submitted]
                  

                  if(params.list){
                    // counter
                    var counter = 0,
                      length = reports.length;

                    // reports
                    final.forEach(function (d, i) {

                      // check if form has been edited
                      Beneficiaries
                        .where(params.project_detail)
                        .where(params.response)
                        .count({ report_id: d.id })
                        .exec(function (err, b) {

                          // return error
                          if (err) return res.negotiate(err);

                          // add status / icon
                          final[i].status = '#e57373';
                          final[i].icon = 'fiber_manual_record';

                          // if benficiaries
                          if (b) {
                            // add status
                            final[i].status = final[i].report_status === 'complete' ? '#4db6ac' : '#fff176'
                          }

                          // reutrn
                          counter++;
                          if (counter === length) {
                            // table
                            return res.json(200, final);
                          }

                        });

                    });
                  }else{
                    return res.json(200, { 'value': final.length })
                  }

                })
              })
            } else{
            // return
            if ( params.list ) {

              // counter
              var counter=0,
                  length=reports.length;

              // reports
              reports.forEach( function( d, i ){

                // check if form has been edited
                Beneficiaries
                  .where(params.project_detail)
                  .where(params.response)
                  .count( { report_id: d.id } )
                  .exec(function( err, b ){

                    // return error
                    if (err) return res.negotiate( err );

                    // add status / icon
                    reports[i].status = '#e57373';
                    reports[i].icon = 'fiber_manual_record';

                    // if benficiaries
                    if ( b ) {
                      // add status
                      reports[i].status = reports[i].report_status === 'complete' ? '#4db6ac' : '#fff176'
                    }

                    // reutrn
                    counter++;
                    if ( counter === length ) {
                      // table
                      return res.json( 200, reports );
                    }

                  });

              });

            } else {

              // return indicator
              return res.json( 200, { 'value': reports.length });
            }
          }

          });

        break;


      case 'reports_complete_total':

        // reports total
        Report
          .find()
          .where( params.cluster_filter )
          .where( params.acbar_partners_filter )
          .where( params.adminRpcode_filter )
          .where( params.admin0pcode_filter )
          .where( { report_active: true } )
          .where( params.activity_type_id )
          .where( { reporting_period: { '>=': params.moment( params.start_date ).format('YYYY-MM-DD'), '<=': params.moment( params.end_date ).format('YYYY-MM-DD') } } )
          .where( params.organization_filter )
          .where( params.report_period_type )
          .where( params.project_detail )
          .sort('updatedAt DESC')
          .exec( function( err, total_reports ){

            // return error
            if (err) return res.negotiate( err );

            // reports complete
            Report
              .find()
              .where( params.organization_and_cluster_filter_Native )
              .where( params.acbar_partners_filter )
              .where( params.adminRpcode_filter )
              .where( params.admin0pcode_filter )
              .where( { report_active: true } )
              .where( params.activity_type_id )
              .where( { report_status: 'complete' } )
              .where( { reporting_period: { '>=': params.moment( params.start_date ).format('YYYY-MM-DD'), '<=': params.moment( params.end_date ).format('YYYY-MM-DD') } } )
              .where(params.report_period_type)
              .sort('updatedAt DESC')
              .exec( function( err, reports ){

                // return error
                if (err) return res.negotiate( err );

                // temporarry solution, remove after setReportTodo biweekly deploy on PROD
                if (reports && reports.length) {
                  reports = reports.filter(r => r && r.reporting_period && (moment().format('YYYY-MM-DD') >= moment(r.reporting_period).format('YYYY-MM-DD')))
                }

                // return new Project
                return res.json(200, { 'value': reports.length, 'value_total': total_reports.length });

              });

            });

            break;

      // raw data export
      case 'financial_report':

        // fields
        var fields = [ 'cluster', 'organization', 'admin0name', 'project_title', 'project_description', 'project_hrp_code', 'project_budget', 'project_budget_currency', 'project_donor_name', 'grant_id', 'currency_id', 'project_budget_amount_recieved', 'contribution_status', 'project_budget_date_recieved', 'budget_funds_name', 'financial_programming_name', 'multi_year_funding_name', 'funding_2017', 'reported_on_fts_name', 'fts_record_id', 'email', 'createdAt', 'comments' ]
            fieldNames = [ 'Cluster', 'Organization', 'Country', 'Project Title', 'Project Description', 'HRP Project Code', 'Project Budget', 'Project Budget Currency', 'Project Donor', 'Donor Grant ID', 'Currency Recieved', 'Ammount Received', 'Contribution Status', 'Date of Payment', 'Incoming Funds', 'Financial Programming', 'Multi-Year Funding', '2017 Funding', 'Reported on FTS', 'FTS ID', 'Email', 'createdAt', 'Comments' ];

        // get beneficiaries by project
        BudgetProgress
          .find()
          .where( { project_id: { '!': null } } )
          .where( params.adminRpcode_filter )
          .where( params.admin0pcode_filter )
          .where( params.organization_and_cluster_filter_Native )
          .where( params.activity_type_id )
          .where( params.acbar_partners_filter )
          .where( { project_budget_date_recieved: { '>=': new Date( params.start_date ), '<=': new Date( params.end_date ) } } )
          .where(params.report_period_type)
          .exec( function( err, budget ){

            // return error
            if (err) return res.negotiate( err );

            // return csv
            json2csv({ data: budget, fields: fields, fieldNames: fieldNames }, function( err, csv ) {

              // error
              if ( err ) return res.negotiate( err );

              // success
              if ( params.ocha ) {
                res.set('Content-Type', 'text/csv');
                return res.send( 200, csv );
              } else {
                return res.json( 200, { data: csv } );
              }

            });

          });

				break;

			case 'progress_beneficiaries':

				function nFormatter (num) {
					if (num >= 1000000000) {
						return (num / 1000000000).toFixed(1).replace(/\.0$/, '') + 'G';
					}
					if (num >= 1000000) {
						return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
					}
					if (num >= 1000) {
						return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
					}
					return num;
				}
				function filterProgressBeneficiaries(){
					return{
						adminRpcode_Native: req.param('adminRpcode') === 'hq' ? {} : { adminRpcode: req.param('adminRpcode').toUpperCase() },
						admin0pcode_Native: req.param('admin0pcode') === 'all' ? {} : { admin0pcode: req.param('admin0pcode').toUpperCase() },
						// cluster_id_Native: (req.param('cluster_id') === 'all' || req.param('cluster_id') === 'rnr_chapter' || req.param('cluster_id') === 'acbar')
						// 	? {}
						// 	: (req.param('cluster_id') !== 'cvwg')
						// 		? { $or: [{ cluster_id: req.param('cluster_id') }, { mpc_purpose_cluster_id: { $regex: req.param('cluster_id') } }] }
						// 		: { $or: [{ cluster_id: req.param('cluster_id') }, { mpc_purpose_cluster_id: { $regex: req.param('cluster_id') } }, { activity_description_id: { $regex: 'cash' } }] },
						// cluster_id_Native: (req.param('cluster_id') === 'all' ) ? {} : { cluster_id: req.param('cluster_id') },
						cluster_id_Native: (req.param('cluster_id') === 'all' ) ? {} : { $or: [{ cluster_id: req.param('cluster_id') }, { "activity_type.cluster_id": req.param('cluster_id') }] },
						// organization_tag_Native: req.param('organization_tag') === 'all' ? { organization_tag: { $nin: $nin_organizations } } : { organization_tag: req.param('organization_tag') },
						organization_tag_Native: req.param('organization_tag') === 'all' ? { organization_tag: { $nin: $nin_organizations } } : { $or: [{ organization_tag: req.param('organization_tag') }, { "implementing_partners.organization_tag": req.param('organization_tag') }, { "programme_partners.organization_tag": req.param('organization_tag') }] },
						project_startDateNative: { project_start_date: { $lte: new Date(req.param('end_date')) }},
						project_endDateNative: { project_end_date: { $gte: new Date(req.param('start_date')) }},
						default_native: { project_id: { $ne: null }},
						activity_typeNative: req.param('activity_type_id') === 'all' ? {} : { 'activity_type.activity_type_id': req.param('activity_type_id') },
            report_period_typeNative: req.param('report_period_type_id') === 'all' ? {} : (req.param('report_period_type_id') === 'bi-weekly' ? { report_type_id: req.param('report_period_type_id') } : { report_type_id: { $ne: 'bi-weekly' } }),
						// organization_default_Native: { organization_tag: { $nin: $nin_organizations } }
						activity_typeNative: req.param('activity_type_id') === 'all' ? {} : { 'activity_type.activity_type_id': req.param('activity_type_id') },
            // organization_default_Native: { organization_tag: { $nin: $nin_organizations } }
            project_detail: req.param('project_detail') === 'all' ? {} : { project_details: { $elemMatch: { project_detail_id: req.param('project_detail') } } },
            response: req.param('response') === 'all' ? {} : { response: { $elemMatch: { response_id: req.param('response') } } }
					}
				}
				var filters = filterProgressBeneficiaries(params);
				var filterObject = _.extend({},
					filters.default_native,
					filters.adminRpcode_Native,
					filters.admin0pcode_Native,
          { $and: [filters.cluster_id_Native, filters.organization_tag_Native] },
					filters.activity_typeNative,
					filters.project_startDateNative,
          filters.project_endDateNative, 
          filters.report_period_typeNative,
          filters.project_detail,
          filters.response)

				TargetBeneficiaries.native(function (err, results_target_beneficiaries) {
					if (err) return res.serverError(err);
					results_target_beneficiaries.aggregate([
						{ $match: filterObject},{
							$group: {
								_id:'$project_id',
								project_id: { $first: '$project_id'},
								project_title: { $first: '$project_title'},
								cluster_id: { $first: '$cluster_id' },
								cluster: { $first: '$cluster' },
								organization_tag: { $first:'$organization_tag'},
								organization_id: { $first: '$organization_id' },
								organization: { $first: '$organization' },
                implementing_partners: { $first: '$implementing_partners'},
                programme_partners: { $first: '$programme_partners'},
								target_total:{ $sum: { $add: [ "$men", "$women","$boys","$girls","$elderly_men","$elderly_women" ] } }
							}
						}
					]).toArray(function (err, target_beneficiaries) {

						Beneficiaries.native(function (err, results_report_benefciaries) {
							if (err) return res.serverError(err);
							results_report_benefciaries.aggregate([
								{ $match: filterObject }, {
									$group: {
										_id: '$project_id',
										project_id: { $first: '$project_id'},
										project_title: { $first: '$project_title' },
										cluster_id: { $first: '$cluster_id' },
										cluster: { $first: '$cluster' },
										organization_tag: { $first: '$organization_tag' },
										organization_id: { $first: '$organization_id' },
										organization: { $first: '$organization' },
                    // report_total: { $sum: { $add: ["$men", "$women", "$boys", "$girls", "$elderly_men", "$elderly_women"] } },
                    report_total: { $sum:"$total_beneficiaries"},
                    new_beneficiaries_total: {$sum:{$cond:{if:{$eq:["$delivery_type_id","population"]},then:"$total_beneficiaries",else:0}}}
									}
								}
							]).toArray(function (err, report_beneficairies) {
								for(var i=0 ;i<report_beneficairies.length;i++){
									for(var j=0;j<target_beneficiaries.length;j++){
										if (target_beneficiaries[j]._id === report_beneficairies[i]._id){
                      target_beneficiaries[j].report_total = report_beneficairies[i].report_total;
                      target_beneficiaries[j].new_beneficiaries_total = report_beneficairies[i].new_beneficiaries_total;
										}
									}
								}
								target_beneficiaries.forEach( function (el,i) {
									if(!el.report_total){
										el.report_total =0;
										if (el.target_total < 1){
											el.progress_percentage = "N/A";
										}else{
											el.progress_percentage = 0;
										}
									} else{
										if (el.target_total<1){
											el.progress_percentage = "N/A";
										}else{
											el.progress_percentage = (el.report_total/el.target_total)*100;
										}
									}
									if (!el.report_total_format || !el.target_total_format){
										if (el.target_total<1){
											el.target_total_format = "N/A"
										}else{
											el.target_total_format = nFormatter(el.target_total);
										}
										el.report_total_format = nFormatter(el.report_total);
                  }
                  
                  if (!el.new_beneficiaries_total){
                    el.new_beneficiaries_total =0;
                    if (el.target_total < 1) {
                      el.new_benefeciaries_progress_percentage = "N/A";
                    } else {
                      el.new_benefeciaries_progress_percentage = 0;
                    }
                  }else{
                    if (el.target_total < 1) {
                      el.new_benefeciaries_progress_percentage = "N/A";
                    } else {
                      el.new_benefeciaries_progress_percentage = (el.new_beneficiaries_total / el.target_total) * 100;
                    }
                  }
                  el.new_beneficiaries_total_format = nFormatter(el.new_beneficiaries_total);
                  if (el.implementing_partners && Array.isArray(el.implementing_partners)) {
                    el.implementing_partners = el.implementing_partners.map(x => x.organization ? x.organization : x.organization_tag).join(", ");
                  }
                  if (el.programme_partners && Array.isArray(el.programme_partners)) {
                    el.programme_partners = el.programme_partners.map(x => x.organization ? x.organization : x.organization_tag).join(", ");
                  }
                });
								return res.json(200, target_beneficiaries);
							})
						})
					})


				})

        break;
        
      case 'organization_cluster_contact':
        function filter() {
          return {
            adminRpcode_Native: req.param('adminRpcode') === 'hq' ? {} : { adminRpcode: req.param('adminRpcode').toUpperCase() },
            admin0pcode_Native: req.param('admin0pcode') === 'all' ? {} : { admin0pcode: req.param('admin0pcode').toUpperCase() },
            cluster_id_Native: (req.param('cluster_id') === 'all') ? {} : { $or: [{ cluster_id: req.param('cluster_id') }, { "activity_type.cluster_id": req.param('cluster_id') }] },
            organization_tag_Native: req.param('organization_tag') === 'all' ? { organization_tag: { $nin: $nin_organizations } } : { $or: [{ organization_tag: req.param('organization_tag') }, { "implementing_partners.organization_tag": req.param('organization_tag') }, { "programme_partners.organization_tag": req.param('organization_tag') }] },
            // project_startDateNative: { project_start_date: { $lte: new Date(req.param('end_date')) } },
            // project_endDateNative: { project_end_date: { $gte: new Date(req.param('start_date')) } },
            reporting_periodDateNative: { reporting_period: { $gte: new Date(req.param('start_date')), $lte: new Date(req.param('end_date'))}},
            default_native: { project_id: { $ne: null } },
            activity_typeNative: req.param('activity_type_id') === 'all' ? {} : { 'activity_type.activity_type_id': req.param('activity_type_id') },
            report_period_typeNative: req.param('report_period_type_id') === 'all' ? {} : (req.param('report_period_type_id') === 'bi-weekly' ? { report_type_id: req.param('report_period_type_id') } : { report_type_id: { $ne: 'bi-weekly' } }),
            project_detail: req.param('project_detail') === 'all' ? {} : { project_details: { $elemMatch: { project_detail_id: req.param('project_detail') } } },
            response: req.param('response') === 'all' ? {} : { response: { $elemMatch: { response_id: req.param('response') } } }
          }
        }

        var filters = filter(params);
        var filterObject = _.extend({},
          filters.default_native,
          filters.adminRpcode_Native,
          filters.admin0pcode_Native,
          { $and: [filters.cluster_id_Native, filters.organization_tag_Native] },
          filters.activity_typeNative,
          // filters.project_startDateNative,
          // filters.project_endDateNative,
          filters.reporting_periodDateNative,
          filters.report_period_typeNative,
          filters.project_detail,
          filters.response)

        Beneficiaries.native(function (err, results_report_benefciaries) {
          if (err) return res.serverError(err);
          results_report_benefciaries.aggregate([
            { $match: filterObject }, {
              $group: {
                _id: '$project_id',
                cluster_id: { $first: '$cluster_id' },
                cluster: { $first: '$cluster' },
                organization_tag: { $first: '$organization_tag' },
                organization_id: { $first: '$organization_id' },
                organization: { $first: '$organization' },
                username:{$first:'$username'},
                name:{$first:'$name'},
                email:{$first:'$email'},
                phone:{$first:'$phone'}
              }
            }
          ]).toArray(function (err, report_beneficairies) {
            // uniq cluster_id
            var distinct_sectors = _.uniq(report_beneficairies, function (x) {
              return x.cluster_id;
            });
            distinct_sectors = distinct_sectors.map((x)=>{return {cluster_id:x.cluster_id,cluster:x.cluster}});
            report_beneficairies.forEach((c)=>{
              index = distinct_sectors.findIndex(x=>x.cluster_id === c.cluster_id);
              if (! distinct_sectors[index]['organization']){
                distinct_sectors[index]['organization'] =[]
              }
              distinct_sectors[index]['organization'].push({
                organization_tag:  c.organization_tag,
                organization_id:  c.organization_id,
                organization:  c.organization,
                fullname: c.name,
                username:  c.username,
                email:  c.email,
                phone:  c.phone,
                cluster_id: c.cluster,
                cluster:c.cluster_id
              })
            })
            distinct_sectors.forEach((z)=>{
              if(z.organization && z.organization.length){
                z.organization = z.organization.filter(function (a) {
                  var key = a.organization_id + '|' + a.email + '|' + a.phone;
                  if (!this[key]) {
                    this[key] = true;
                    return true;
                  }
                }, Object.create(null));
              }
              z.sum_org = z.organization && z.organization.length ? z.organization.length :0
            })

            
            

            return res.json(200, distinct_sectors);
          })
        })
        break;

      case 'target_beneficiaries':
        function filterTargetBeneficiaries() {
          return {
            adminRpcode_Native: req.param('adminRpcode') === 'hq' ? {} : { adminRpcode: req.param('adminRpcode').toUpperCase() },
            admin0pcode_Native: req.param('admin0pcode') === 'all' ? {} : { admin0pcode: req.param('admin0pcode').toUpperCase() },
            cluster_id_Native: (req.param('cluster_id') === 'all') ? {} : { $or: [{ cluster_id: req.param('cluster_id') }, { "activity_type.cluster_id": req.param('cluster_id') }] },
            organization_tag_Native: req.param('organization_tag') === 'all' ? { organization_tag: { $nin: $nin_organizations } } : { $or: [{ organization_tag: req.param('organization_tag') }, { "implementing_partners.organization_tag": req.param('organization_tag') }, { "programme_partners.organization_tag": req.param('organization_tag') }] },
            project_startDateNative: { project_start_date: { $lte: new Date(req.param('end_date')) } },
            project_endDateNative: { project_end_date: { $gte: new Date(req.param('start_date')) } },
            default_native: { project_id: { $ne: null } },
            activity_typeNative: req.param('activity_type_id') === 'all' ? {} : { 'activity_type.activity_type_id': req.param('activity_type_id') },
            report_period_typeNative: req.param('report_period_type_id') === 'all' ? {} : (req.param('report_period_type_id') === 'bi-weekly' ? { report_type_id: req.param('report_period_type_id') } : { report_type_id: { $ne: 'bi-weekly' } }),
            project_detail: req.param('project_detail') === 'all' ? {} : { project_details: { $elemMatch: { project_detail_id: req.param('project_detail') } } },
            response: req.param('response') === 'all' ? {} : { response: { $elemMatch: { response_id: req.param('response') } } }
          }
        }
        var filters = filterTargetBeneficiaries(params);
        var filterObject = _.extend({},
          filters.default_native,
          filters.adminRpcode_Native,
          filters.admin0pcode_Native,
          { $and: [filters.cluster_id_Native, filters.organization_tag_Native] },
          filters.activity_typeNative,
          filters.project_startDateNative,
          filters.project_endDateNative,
          filters.report_period_typeNative,
          filters.project_detail,
          filters.response)
        
        TargetBeneficiaries.native(function (err, results_target_beneficiaries) {
          if (err) return res.serverError(err);
          results_target_beneficiaries.aggregate([
            { $match: filterObject }
          ]).toArray(function (err, target_beneficiaries) {
            if (err) return res.serverError(err);
            var _cluster= req.param('cluster_id');
            var _admin0pcode=req.param('admin0pcode').toUpperCase();
            if (req.param('csv')) {
              let { fields, fieldNames } = FieldsService.getTargetBeneficiariesDownloadFields(_admin0pcode, _cluster);
              var total = 0;

              // format beneficiaries
              async.eachLimit(target_beneficiaries, 200, function (d, next) {
                d._id = d._id.toString();
                // hrp code
                if (!d.project_hrp_code) {
                  d.project_hrp_code = '-';
                }
                // project code
                if (!d.project_code) {
                  d.project_code = '-';
                }
                // project donor
                if (d.project_donor) {
                  var da = [];
                  d.project_donor.forEach(function (d, i) {
                    if (d) da.push(d.project_donor_name);
                  });
                  da.sort();
                  d.donor = da.join(', ');
                }

                // implementing_partner
                if (Array.isArray(d.implementing_partners)) {
                  var im = [];
                  d.implementing_partners.forEach(function (impl, i) {
                    if (impl) im.push(impl.organization);
                  });
                  im.sort();
                  d.implementing_partners = im.join(', ');
                }

                // programme_partners
                if (Array.isArray(d.programme_partners)) {
                  var pp = [];
                  d.programme_partners.forEach(function (p, i) {
                    if (p) pp.push(p.organization);
                  });
                  pp.sort();
                  d.programme_partners = pp.join(', ');
                }

                d.project_details = Utils.arrayToString(d.project_details, "project_detail_name");
                d.response = Utils.arrayToString(d.response, "response_name");

                //plan_component
                if (Array.isArray(d.plan_component)) {
                  d.plan_component = d.plan_component.join(', ');
                }

                // sum
                // var sum = d.boys + d.girls + d.men + d.women + d.elderly_men + d.elderly_women;
                // beneficiaries
                // d.total = sum;
                d.project_start_date = moment(d.project_start_date).format('YYYY-MM-DD');
                d.project_end_date = moment(d.project_end_date).format('YYYY-MM-DD');
                d.updatedAt = moment(d.updatedAt).format('YYYY-MM-DD HH:mm:ss');
                d.createdAt = moment(d.createdAt).format('YYYY-MM-DD HH:mm:ss');
                // grand total
                // total += sum;
                total += d.total_beneficiaries;
                next();

              }, function (err) {
                if (err) return res.negotiate(err);
                // return csv
                json2csv({ data: target_beneficiaries, fields: fields, fieldNames: fieldNames }, function (err, csv) {

                  // error
                  if (err) return res.negotiate(err);

                  // success
                    return res.json(200, { data: csv });
                });
              });
              
            }
          })
        })
        break;
      
      case 'location_empty_beneficiary':

        // reports complete
        var filterObject = _.extend({}, params.organization_and_cluster_filter_Native,
          params.acbar_partners_filter,
          params.adminRpcode_filter,
          params.admin0pcode_filter,
          { report_active: true },
          params.activity_type_id,
          { report_status: 'complete' },
          {
            reporting_period:
            {
              '$gte': new Date(params.moment(params.start_date).format('YYYY-MM-DD')),
              '$lte': new Date(params.moment(params.end_date).format('YYYY-MM-DD'))
            }
          },
          params.report_period_type,
          params.project_detail
        );

        Report.native(function (err, collection) {
          if (err) return res.serverError(err);

          collection.find(
            filterObject
          ).sort({ updatedAt: -1 }).toArray(function (err, reports) {

            // return error
            if (err) return res.negotiate(err);

              var reports_array_value = _.map(reports, function (report) { return report._id.toString() });
              Location.native(function(err, collection){
                if (err) return res.serverError(err);
                var _filterLocation = _.extend({}, { report_id: { "$in": reports_array_value } })

                collection.aggregate([
                  {
                    $match: _filterLocation
                  },
                  {
                    $group: {
                      _id: {
                        // project_id: '$project_id',
                        // report_id: '$report_id',
                        // site_lat: '$site_lat',
                        // site_lng: '$site_lng',
                        // site_name: '$site_name',
                        // cluster: '$cluster',
                        // organization: '$organization',
                        // project_title: '$project_title',
                        // report_year:'$report_year',
                        // report_month: '$report_month',
                        // reporting_period: '$reporting_period',
                        // report_type_id:'$report_type_id',
                        // location_group_id:'$location_group_id',
                        // admin0name: '$admin0name',
                        // admin1name: '$admin1name',
                        // admin2name: '$admin2name',
                        // admin3name: '$admin3name',
                        // admin4name: '$admin4name',
                        // admin5name: '$admin5name',
                        // cluster_id: '$cluster_id',
                        // site_type_name: '$site_type_name',
                        // site_name: '$site_name',
                        // name: '$name',
                        // position: '$position',
                        // phone: '$phone',
                        // email: '$email',
                        // id: '$_id'

                        /// 
                        project_id: '$project_id',
                        report_id: '$report_id',
                        id: '$_id',
                        cluster_id: '$cluster_id',
                        cluster: '$cluster',
                        name: '$name',
                        phone: '$phone',
                        email: '$email',
                        organization: '$organization',
                        programme_partners: '$programme_partners',
                        implementing_partners: '$implementing_partners',
                        project_hrp_code: '$project_hrp_code',
                        project_code: '$project_code',
                        project_title: '$project_title',
                        project_start_date: '$project_start_date',
                        project_end_date: '$project_end_date',
                        project_status: '$project_status',
                        project_details: '$project_details',
                        project_donor: '$project_donor',
                        project_budget: '$project_budget',
                        project_budget_currency: '$project_budget_currency',
                        report_month_number: '$report_month_number',
                        report_month: '$report_month',
                        report_year: '$report_year',
                        reporting_period: '$reporting_period',
                        admin0pcode: '$admin0pcode',
                        admin0name: '$admin0name',
                        admin1pcode: '$admin1pcode',
                        admin1name: '$admin1name',
                        admin2pcode: '$admin2pcode',
                        admin2name: '$admin2name',
                        admin3pcode: '$admin3pcode',
                        admin3name: '$admin3name',
                        admin4pcode: '$admin4pcode',
                        admin4name: '$admin4name',
                        admin5pcode: '$admin5pcode',
                        admin5name: '$admin5name',
                        conflict: '$conflict',
                        site_id: '$site_id',
                        site_class: '$site_class',
                        site_status: '$site_status',
                        site_population: '$site_population',
                        site_hub_id: '$site_hub_id',
                        site_hub_name: '$site_hub_name',
                        site_implementation_name: '$site_implementation_name',
                        site_type_name: '$site_type_name',
                        site_name: '$site_name',
                        admin1lng: '$admin1lng',
                        admin1lat: '$admin1lat',
                        admin2lng: '$admin2lng',
                        admin2lat: '$admin2lat',
                        admin3lng: '$admin3lng',
                        admin3lat: '$admin3lat',
                        admin4lng: '$admin4lng',
                        admin4lat: '$admin4lat',
                        admin5lng: '$admin5lng',
                        admin5lat: '$admin5lat',
                        site_lng: '$site_lng',
                        site_lat: '$site_lat',
                        updatedAt: '$updatedAt',
                        createdAt: '$createdAt'
                      }
                    }
                  }
                ]).toArray(function (err, locations) {
                  var array_of_locations = _.map(locations, function (location) { return location._id.id.toString() })
                  Beneficiaries.native(function (err, collection) {
                    if (err) return res.serverError(err);
                    var _filterBenefSubmitted = _.extend({}, { location_id: { "$in": array_of_locations } })

                    collection.aggregate([
                      {
                        $match: _filterBenefSubmitted
                      },
                      {
                        $group: {
                          _id: {
                            project_id: '$project_id',
                            report_id: '$report_id',
                            location_id: '$location_id'
                          },
                          total: {
                            "$sum": "$total_beneficiaries"
                          }
                        }
                      }
                    ]).toArray(function (err, results) {
                      if (err) return res.serverError(err);
                      
                      if(results.length){
                        var real = results.filter(x=>x.total >0);
                        var real = results.filter(x=>x.total >= 0);
                        var location_with_beneficiary = real.map(x=>x._id.location_id);
                      }else{
                        var location_with_beneficiary =[];
                      }
                      var locations_with_empty_beneficiary = locations.filter(l => location_with_beneficiary.indexOf(l._id.id.toString())<0);

                      locations_with_empty_beneficiary = locations_with_empty_beneficiary.map(x=>x._id);
                      if(locations_with_empty_beneficiary.length){
                        locations_with_empty_beneficiary.forEach(function(x){

                          var filterReport = reports.filter(r => r._id.toString() === x.report_id);
                          if(filterReport.length){
                            dataFromReport = filterReport[0]
                          }

                          // project donor
                          if (Array.isArray(x.project_donor)) {
                            var da = [];
                            x.project_donor.forEach(function (d, i) {
                              if (d) da.push(d.project_donor_name);
                            });
                            da.sort();
                            x.donor = da.join(', ');
                          }

                          // implementing_partner
                          if (Array.isArray(x.implementing_partners)) {
                            var im = [];
                            x.implementing_partners.forEach(function (impl, i) {
                              if (impl) im.push(impl.organization);
                            });
                            im.sort();
                            x.implementing_partners = im.join(', ');
                          }

                          // programme_partners
                          if (Array.isArray(x.programme_partners)) {
                            var pp = [];
                            x.programme_partners.forEach(function (p, i) {
                              if (p) pp.push(p.organization);
                            });
                            pp.sort();
                            x.programme_partners = pp.join(', ');
                          }
                          
                          // project_details
                          x.project_details = dataFromReport.project_details && dataFromReport.project_details.length ? dataFromReport.project_details:[];
                          x.project_details = Utils.arrayToString(x.project_details, "project_detail_name");

                          // response
                          x.response = Utils.arrayToString(x.response, "response_name");

                          //plan_component
                          x.plan_component = dataFromReport.plan_component && dataFromReport.plan_component.length ? dataFromReport.plan_component: [];
                          if (Array.isArray(x.plan_component)) {
                            x.plan_component = x.plan_component.join(', ');
                          }

                          x.report_month_number = x.report_month + 1;
                          x.report_month = moment(x.reporting_period).format('MMMM');
                          x.reporting_period = moment(x.reporting_period).format('YYYY-MM-DD');
                          x.project_start_date = moment(x.project_start_date).format('YYYY-MM-DD');
                          x.project_end_date = moment(x.project_end_date).format('YYYY-MM-DD');

                          x.updatedAt = moment(dataFromReport.updatedAt).format('YYYY-MM-DD HH:mm:ss');
                          x.createdAt = moment(dataFromReport.createdAt).format('YYYY-MM-DD HH:mm:ss');
                          if (x.report_type_id && x.report_type_id === 'bi-weekly'){
                            var biweeekly_period = (moment.utc(x.reporting_period).format('D') <= 15 ? 'Biweekly Period 1' : 'Biweekly Period 2');
                            x.report_month += ' ' + biweeekly_period;
                          }
                          // x.url = !x.location_group_id ? req.host + '/desk/#/cluster/projects/report/' + x.project_id + '/' + x.report_id : req.host + '/desk/#/cluster/projects/group/' + x.project_id + '/' + x.report_id;
                        })
                      }
                      let { fields, fieldNames } = FieldsService.getLocationWithEmptyBeneficiaries();
                      json2csv({ data: locations_with_empty_beneficiary, fields: fields, fieldNames: fieldNames }, function (err, csv) {

                        // error
                        if (err) return res.negotiate(err);

                        // success
                        
                        return res.json(200, { data: csv });
                      });
                    })
                  })

                })

              })  
          });
        });

        break;

    }

  }

};

module.exports = AdminDashboardController;
