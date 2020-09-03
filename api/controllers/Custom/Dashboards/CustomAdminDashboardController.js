/**
 * CustomAdminDashboardController
 *
 * @description :: Custom Admin Dashboard
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
var CustomAdminDashboardController = {

  //
  getCustomAdminIndicator: function( req, res ){

    // request input
    if ( !req.param( 'report_type_id' ) || !req.param( 'indicator' ) || !req.param( 'cluster_id' ) || !req.param( 'organization_tag' ) || !req.param( 'activity_type_id' ) || !req.param( 'adminRpcode' )  || !req.param( 'admin0pcode' ) || !req.param( 'start_date' ) || !req.param( 'end_date' ) ) {
      return res.json( 401, { err: 'report_type_id, indicator, cluster_id, organization_tag, activity_type_id, adminRpcode, admin0pcode, start_date, end_date required!' });
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
          report_type_id: req.param( 'report_type_id' ),
          // activity_type_id: req.param( 'activity_type_id' ) === 'all'? {} : { 'activity_type.activity_type_id': req.param( 'activity_type_id' ) },
          organization_tag: req.param( 'organization_tag' ),
          // cluster_filter: req.param( 'cluster_id' ) === 'all' || req.param( 'cluster_id' ) === 'acbar' ? {} : { cluster_id: req.param( 'cluster_id' ) },
          // cluster_filter: req.param('cluster_id') === 'all' || req.param('cluster_id') === 'acbar' ? {} : { $or: [{ cluster_id: req.param('cluster_id') }, { "activity_type.cluster_id": req.param('cluster_id') }] },
          cluster_filter: req.param('cluster_id') === 'all' ? {} : { cluster_id: req.param('cluster_id') },

          // acbar_partners_filter: req.param( 'cluster_id' ) === 'acbar' ? { project_acbar_partner: true } : {},
          organization_filter: req.param( 'organization_tag' ) === 'all' ? { organization_tag: { '!': $nin_organizations } } : { organization_tag: req.param( 'organization_tag' ) },
          organization_filter_Native: req.param( 'organization_tag' ) === 'all' ? { organization_tag: { '$nin': $nin_organizations } } : { organization_tag: req.param( 'organization_tag' ) },
          adminRpcode_filter: req.param( 'adminRpcode' ) === 'all' ? {} : { adminRpcode: req.param( 'adminRpcode' ).toUpperCase() },
          admin0pcode_filter: req.param( 'admin0pcode' ) === 'all' ? {} : { admin0pcode: req.param( 'admin0pcode' ).toUpperCase() },
          start_date: req.param( 'start_date' ),
          end_date: req.param( 'end_date' )
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

    }

  },

  // monthly reports
  getActivityIndicator: function( $nin_organizations, params, json2csv, moment, fields, fieldNames, req, res ){

    // switch on indicator
    switch( params.indicator ) {

      case 'latest':

        // get organizations by project
        CustomReport
          .find()
          .where( params.report_type_id )
          .where( params.organization_and_cluster_filter_Native )
          // .where( params.acbar_partners_filter )
          .where( params.adminRpcode_filter )
          .where( params.admin0pcode_filter )
          // .where( params.activity_type_id )
          .where( { project_start_date: { '<=': new Date( params.end_date ) } } )
          .where( { project_end_date: { '>=': new Date( params.start_date ) } } )
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
          CustomProject
            .find()
            .where( params.report_type_id )
            .where( params.organization_and_cluster_filter_Native )
            // .where( params.acbar_partners_filter )
            .where( params.adminRpcode_filter )
            .where( params.admin0pcode_filter )
            // .where( params.activity_type_id )
            .where( { project_start_date: { '<=': new Date( params.end_date ) } } )
            .where( { project_end_date: { '>=': new Date( params.start_date ) } } )
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

      case 'projects_total':

        // Projects total
        CustomReport
          .find()
          .where( params.report_type_id )
          .where( params.organization_and_cluster_filter_Native )
          // .where( params.acbar_partners_filter )
          .where( params.adminRpcode_filter )
          .where( params.admin0pcode_filter )
          .where( { report_active: true } )
          // .where( params.activity_type_id )
          .where( { report_status: [ 'todo', 'complete' ] } )
          .where( { reporting_period: { '>=': params.moment( params.start_date ).format('YYYY-MM-DD'), '<=': params.moment( params.end_date ).format('YYYY-MM-DD') } } )
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
        var filterObject = _.extend({}, params.report_type_id, params.organization_and_cluster_filter_Native,
                                      // params.acbar_partners_filter,
                                      params.adminRpcode_filter,
                                      params.admin0pcode_filter,
                                      // { report_active: true },
                                      // params.activity_type_id,
                                      { report_status: 'todo' },
                                      { reporting_period:
                                        { '$gte': new Date(params.moment( params.start_date ).format('YYYY-MM-DD')),
                                          '$lte': new Date(params.moment( params.end_date   ).format('YYYY-MM-DD'))
                                        }
                                      },
                                  );
        // reports due
        CustomReport.native(function(err, collection) {
          if (err) return res.serverError(err);

          collection.find(
            filterObject
            ).sort({updatedAt:-1 }).toArray(function (err, reports) {

              // return error
              if (err) return res.negotiate( err );

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

                  // find saved
                  CustomBeneficiaries.native(function(err, collection) {
                    if (err) return res.serverError(err);

                    collection.aggregate([
                        {
                          $match : {report_id:{"$in":reports_array}}
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
        var filterObject = _.extend({}, params.report_type_id, params.organization_and_cluster_filter_Native,
                                        // params.acbar_partners_filter,
                                        params.adminRpcode_filter,
                                        params.admin0pcode_filter,
                                        // { report_active: true },
                                        // params.activity_type_id,
                                        { report_status: 'complete' },
                                        { reporting_period:
                                          { '$gte': new Date(params.moment( params.start_date ).format('YYYY-MM-DD')),
                                            '$lte': new Date(params.moment( params.end_date   ).format('YYYY-MM-DD'))
                                          }
                                        },
                                      );

        CustomReport.native(function(err, collection) {
          if (err) return res.serverError(err);

          collection.find(
            filterObject
            ).sort({updatedAt:-1 }).toArray(function (err, reports) {

              // return error
              if (err) return res.negotiate( err );

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

                  CustomBeneficiaries.native(function(err, collection) {
                    if (err) return res.serverError(err);

                    collection.aggregate([
                        {
                          $match : {report_id:{"$in":reports_array}}
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
                  return res.json( 200, { 'value': reports.length });
              }
            });
          });

        break;

      case 'reports_due':

        // match clause for native mongo query
        var filterObject = _.extend({},	params.report_type_id, params.organization_and_cluster_filter_Native,
                                      // params.acbar_partners_filter,
                                      params.adminRpcode_filter,
                                      params.admin0pcode_filter,
                                      // { report_active: true },
                                      // params.activity_type_id,
                                      { report_status: 'todo' },
                                      { reporting_period:
                                        { '$gte': new Date(params.moment( params.start_date ).format('YYYY-MM-DD')),
                                          '$lte': new Date(params.moment( params.end_date   ).format('YYYY-MM-DD'))
                                        }
                                      },
                                  );

        // reports due
        CustomReport.native(function(err, collection) {
          if (err) return res.serverError(err);

          collection.find(
            filterObject
            ).sort({updatedAt:-1 }).toArray(function (err, reports) {

              // return error
              if (err) return res.negotiate( err );

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

                CustomBeneficiaries.native(function(err, collection) {
                  if (err) return res.serverError(err);

                  collection.aggregate([
                      {
                        $match : {report_id:{"$in":reports_array}}
                      },
                      {
                        $group: {
                          _id: '$report_id'
                        }
                      }
                    ]).toArray(function (err, results) {
                        if (err) return res.negotiate(err);

                        // for reports not submitted with entries
                        var non_empty_reports=_.map(results,'_id')

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
        CustomReport
          .find()
          .where( params.report_type_id )
          .where( params.adminRpcode_filter )
          .where( params.admin0pcode_filter )
          .where( params.organization_and_cluster_filter_Native )
          // .where( { report_active: true } )
          // .where( params.activity_type_id )
          .where( params.acbar_partners_filter )
          .where( { report_status: [ 'todo', 'complete' ] } )
          .where( { reporting_period: { '>=': params.moment( params.start_date ).format('YYYY-MM-DD'), '<=': params.moment( params.end_date ).format('YYYY-MM-DD') } } )
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
                Beneficiaries
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


      case 'reports_complete_total':

        // reports total
        CustomReport
          .find()
          .where( params.report_type_id )
          .where( params.cluster_filter )
          // .where( params.acbar_partners_filter )
          .where( params.adminRpcode_filter )
          .where( params.admin0pcode_filter )
          // .where( { report_active: true } )
          // .where( params.activity_type_id )
          .where( { reporting_period: { '>=': params.moment( params.start_date ).format('YYYY-MM-DD'), '<=': params.moment( params.end_date ).format('YYYY-MM-DD') } } )
          .where( params.organization_filter )
          .sort('updatedAt DESC')
          .exec( function( err, total_reports ){

            // return error
            if (err) return res.negotiate( err );

            // reports complete
            CustomReport
              .find()
              .where( params.report_type_id )
              .where( params.organization_and_cluster_filter_Native )
              // .where( params.acbar_partners_filter )
              .where( params.adminRpcode_filter )
              .where( params.admin0pcode_filter )
              // .where( { report_active: true } )
              // .where( params.activity_type_id )
              .where( { report_status: 'complete' } )
              .where( { reporting_period: { '>=': params.moment( params.start_date ).format('YYYY-MM-DD'), '<=': params.moment( params.end_date ).format('YYYY-MM-DD') } } )
              .sort('updatedAt DESC')
              .exec( function( err, reports ){

                // return error
                if (err) return res.negotiate( err );

                // return new Project
                return res.json(200, { 'value': reports.length, 'value_total': total_reports.length });

              });

            });

            break;

    }

  }

};

module.exports = CustomAdminDashboardController;
