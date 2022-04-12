/**
 * ReportController
 *
 * @description :: Server-side logic for managing auths
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

// libs
var _under = require('underscore');
var moment = require('moment');
var async = require('async');

var REPORTING_DUE_DATE_NOTIFICATIONS_CONFIG = sails.config.REPORTING_DUE_DATE_NOTIFICATIONS_CONFIG;

// ReportTasksController
var ReportTasksController = {

  // TASKs

  // return locations for reports
  getProjectReportLocations: function( reports, target_locations, cb ){

    // report locations
    var locations = [];

    // async loop target_beneficiaries
    async.each( reports, function ( report, next ) {

      // clone report
      var r = JSON.parse( JSON.stringify( report ) );

      // prepare report for cloning
      r.report_id = r.id.valueOf();
      delete r.id;

      // async loop target_beneficiaries
      async.each( target_locations, function ( target_location, tl_next ) {

        // prepare report for cloning
        var l = JSON.parse( JSON.stringify( target_location ) );
        l.target_location_reference_id = l.id.valueOf();
        delete l.id;

        // push to locations
        locations.push( _under.extend( {}, r, l ) );

        // tl next
        tl_next();

      }, function ( err ) {
        if ( err ) return cb( err, false );
        next();
      });

    }, function ( err ) {
      if ( err ) return cb( err, false );
      return cb( false, locations );
    });

  },

  // return locations for warehouses
  getStockReportLocations: function( reports, target_locations, cb ){

    // report locations
    var locations = [];

    // async loop target_beneficiaries
    async.each( reports, function ( report, next ) {

      // clone report
      var r = JSON.parse( JSON.stringify( report ) );

      // prepare report for cloning
      r.report_id = r.id.valueOf();
      delete r.id;
      delete r.createdAt;
      delete r.updatedAt;

      // async loop target_beneficiaries
      async.each( target_locations, function ( target_location, tl_next ) {

        // prepare report for cloning
        var l = JSON.parse( JSON.stringify( target_location ) );
        l.stock_warehouse_id = l.id.valueOf()
        delete l.id;
        delete l.createdAt;
        delete l.updatedAt;

        // push to locations
        locations.push( _under.extend( {}, r, l ) );

        // tl next
        tl_next();

      }, function ( err ) {
        if ( err ) return cb( err, false );
        next();
      });

    }, function ( err ) {
      if ( err ) return cb( err, false );
      return cb( false, locations );
    });

  },
  // APIs

  // updates reports required for completion
  // run this 1st day of the month
  setReportsToDo: function( req, res ) {

    // find active projects
    Project
      .find()
      .where( { project_start_date: { $lte: moment().endOf( 'M' ).format( 'YYYY-MM-DD' ) } } )
      .where( { project_end_date: { $gte: moment().startOf( 'M' ).format( 'YYYY-MM-DD' ) } } )
      .where({ project_status: "active" })
      .exec( function( err, projects ){

        // err
        if ( err ) return err;


        // ASYNC REQUEST 1
        // async loop target_beneficiaries
        async.each( projects, function ( project, next ) {

          var findProject = { project_id: project.id }

          const admin0pcode = project.admin0pcode;

          let config = REPORTING_DUE_DATE_NOTIFICATIONS_CONFIG.find(obj => obj.admin0pcode === admin0pcode);
          if (!config) config = REPORTING_DUE_DATE_NOTIFICATIONS_CONFIG.find(obj => obj.admin0pcode === "ALL");

          // for now make report twice a month, can be applied for 1 week 1 report
          var bi_weekly_reporting = [
            {
              // reporting_period: 1,
              // reporting_due_date: 10
              reporting_period: 1,
              reporting_due_date: 19,
              period_biweekly :1
            }, {
              // reporting_period: 15,
              // reporting_due_date: 27
              reporting_period: 16,
              reporting_due_date: 4,
              period_biweekly: 2
            }
          ];
          var bi_weekly_newreports =[]
          
          if (project.report_type_id && (project.report_type_id === 'bi-weekly')){
            bi_weekly_reporting.forEach(function(w){
              var r = {
                project_id: project.id,
                report_status: 'todo',
                report_active: true,
                report_month: moment().month(),
                report_year: moment().year(),
                reporting_period: moment().set('date', w.reporting_period).format(),
                reporting_due_date: moment().set('date', w.reporting_due_date).format()
              };
              if(w.period_biweekly>1){
                r.reporting_due_date = moment().add(1, 'M').set('date', w.reporting_due_date).format()
              }
              // clone project
              var p = JSON.parse(JSON.stringify(project));
              delete p.id;

              // create report
              var new_report = _under.extend({}, p, r);
              delete new_report.createdAt;
              delete new_report.updatedAt;
              bi_weekly_newreports.push(new_report)
            })

            bi_weekly_newreports.forEach(function(new_report){
              
              // find reports
              Report.findOne({ project_id: new_report.project_id, report_month: new_report.report_month, report_year: new_report.report_year, report_type_id: new_report.report_type_id, reporting_period: { $gte: moment(new_report.reporting_period).startOf('day').toDate(), $lte: moment(new_report.reporting_period).endOf('day').toDate() } }).then(function (report) {

                // set
                if (!report) { report = { id: null } }
                if (report) { new_report.report_status = report.report_status; new_report.report_active = report.report_active, new_report.updatedAt = report.updatedAt }

                // create reports
                Report.updateOrCreate(findProject, { id: report.id }, new_report).exec(function (err, report_result) {

                  // err
                  if (err) return err;

                  // make array ( sails returns object on create, array on update )
                  if (!report.id) {

                    report_result = [report_result];
                  }

                  // get target_locations
                  TargetLocation
                    .find()
                    .where(findProject)
                    .exec(function (err, target_locations) {

                      // err
                      if (err) return err;

                      // generate locations for each report ( requires report_id )
                      ReportTasksController.getProjectReportLocations(report_result, target_locations, function (err, locations) {

                        // err
                        if (err) return err;

                        // ASYNC REQUEST 1.1
                        // async loop project_update locations
                        async.each(locations, function (d, next) {

                          // find
                          Location.findOne({ project_id: project.id, target_location_reference_id: d.target_location_reference_id, report_month: d.report_month, report_year: d.report_year, report_type_id: d.report_type_id, reporting_period: { $gte: moment(d.reporting_period).startOf('day').toDate(), $lte: moment(d.reporting_period).endOf('day').toDate() }}).then(function (location) {
                            if (!location) { location = { id: null }; }
                            // relations set in getProjectReportLocations
                            Location.updateOrCreate(findProject, { id: location.id }, d).exec(function (err, location_result) {

                              // err
                              if (err) return err;

                              // no need to return locations
                              // next();

                            });
                          });
                        }, function (err) {
                          if (err) return err;
                          next();
                        });

                      });

                    });

                });
              });
            })

            
           
            
          }else{
            // create report
            var r = {
              project_id: project.id,
              report_status: 'todo',
              report_active: true,
              report_month: moment().month(),
              report_year: moment().year(),
              reporting_period: moment().set('date', 1).format(),
              reporting_due_date: moment().add(1, 'M').set('date', config.reporting_due_date).format()
            };

            // clone project
            var p = JSON.parse(JSON.stringify(project));
            delete p.id;

            // create report
            var new_report = _under.extend({}, p, r);
            delete new_report.createdAt;
            delete new_report.updatedAt;

            // find reports
            Report.findOne({ project_id: new_report.project_id, report_month: new_report.report_month, report_year: new_report.report_year }).then(function (report) {

              // set
              if (!report) { report = { id: null } }
              if (report) { new_report.report_status = report.report_status; new_report.report_active = report.report_active, new_report.updatedAt = report.updatedAt }

              // create reports
              Report.updateOrCreate(findProject, { id: report.id }, new_report).exec(function (err, report_result) {

                // err
                if (err) return err;

                // make array ( sails returns object on create, array on update )
                if (!report.id) {
                  report_result = [report_result];
                }

                // get target_locations
                TargetLocation
                  .find()
                  .where(findProject)
                  .exec(function (err, target_locations) {

                    // err
                    if (err) return err;

                    // generate locations for each report ( requires report_id )
                    ReportTasksController.getProjectReportLocations(report_result, target_locations, function (err, locations) {

                      // err
                      if (err) return err;

                      // ASYNC REQUEST 1.1
                      // async loop project_update locations
                      async.each(locations, function (d, next) {

                        // find
                        Location.findOne({ project_id: project.id, target_location_reference_id: d.target_location_reference_id, report_month: d.report_month, report_year: d.report_year }).then(function (location) {
                          if (!location) { location = { id: null } }
                          // relations set in getProjectReportLocations
                          Location.updateOrCreate(findProject, { id: location.id }, d).exec(function (err, location_result) {

                            // err
                            if (err) return err;

                            // no need to return locations
                            next();

                          });
                        });
                      }, function (err) {
                        if (err) return err;
                        next();
                      });

                    });

                  });

              });
            });
          }
          

        }, function ( err ) {
          if ( err ) return err;
          return res.json( 200, { msg: 'success' } );
        });

      });

  },

  setStocksToDo: function( req, res ) {

    let month = moment().month();
    let year = moment().year();
    let reporting_period =  moment().set( 'date', 1 ).format();
    let reporting_due_date =  moment().add( 1, 'M' ).set( 'date', 10 ).format();

    let queryOrganization = { organization_tag: { '!': null } };

    // request input
    if ( req.param( 'organization_id' ) && req.param( 'year' ) && req.param( 'month' )) {
      queryOrganization = { id: req.param( 'organization_id' ) }
      month = req.param( 'month' );
      year  = req.param( 'year' );
      reporting_period =  moment().set({'year': year, 'month': month}).set( 'date', 1 ).format();
      reporting_due_date =  moment().set({'year': year, 'month': month}).add( 1, 'M' ).set( 'date', 10 ).format();
    }
    // find active projects
    Organization
      .find( queryOrganization )
      .exec( function( err, organizations ){

        // err
        if ( err ) return res.negotiate( err );

        // ASYNC REQUEST 1
        // async loop target_beneficiaries
        async.each( organizations, function ( organization, next ) {

          var findOrganization = { organization_id: organization.id }

          // const admin0pcode = organization.admin0pcode;
          // let config = REPORTING_STOCK_DUE_DATE_NOTIFICATIONS_CONFIG.find(obj => obj.admin0pcode === admin0pcode);
          // if (!config) config = REPORTING_STOCK_DUE_DATE_NOTIFICATIONS_CONFIG.find(obj => obj.admin0pcode === "ALL");

          // create report
          var r = {
            report_status: 'todo',
            report_active: true,
            report_month: month,
            report_year: year,
            reporting_period,
            reporting_due_date,
            organization_id : organization.id
          };

          // clone project
          var o = JSON.parse( JSON.stringify( organization ) );
          delete o.id;

          // create report
          var new_report = _under.extend( {}, o, r );
          delete new_report.createdAt;
          delete new_report.updatedAt;

          StockWarehouse
                .find()
                .where( findOrganization )
                .exec( function( err, target_locations ){

                  // err
                  if ( err ) return res.negotiate( err );

                  // if warehouses exist
                  if (target_locations.length){
                      // find reports
                      StockReport.findOne( { organization_id: new_report.organization_id, report_month: new_report.report_month, report_year: new_report.report_year } ).then( function ( report ){

                        // set
                        if( !report ) { report = { id: null } }
                        if ( report ) { new_report.report_status = report.report_status; new_report.report_active = report.report_active, new_report.updatedAt = report.updatedAt }

                        // create reports
                        StockReport.updateOrCreate( findOrganization, { id: report.id }, new_report ).exec(function( err, report_result ){

                          // err
                          if ( err ) return res.negotiate( err );

                          // make array ( sails returns object on create, array on update )
                          if ( !report.id ) {
                            report_result = [ report_result ];
                          }

                          // generate locations for each report ( requires report_id )
                          ReportTasksController.getStockReportLocations( report_result, target_locations, function( err, locations ){

                            // err
                            if ( err ) return res.negotiate( err );

                            // ASYNC REQUEST 1.1
                            // async loop project_update locations
                            async.each( locations, function ( d, next ) {

                              // find
                              StockLocation.findOne( { organization_id: organization.id, stock_warehouse_id: d.stock_warehouse_id, report_month: d.report_month, report_year: d.report_year } ).then( function ( location ){
                                if( !location ) { location = { id: null } }
                                // relations set in getProjectReportLocations
                                StockLocation.updateOrCreate( findOrganization, { id: location.id }, d ).exec(function( err, location_result ){
                                  // err
                                  if ( err ) return res.negotiate( err );
                                  // no need to return locations
                                  next();

                                  });
                                });
                              }, function ( err ) {
                                if ( err ) return res.negotiate( err );
                                next();
                              });

                            });

                          });
                        });
                  } else {
                    next();
                  }
            });

          }, function ( err ) {
            if ( err ) return err;
            return res.json( 200, { msg: 'success' } );
          });

      });

  },

  setReportsToDoPreviousMonth: function( req, res ) {

    // find active projects
    Project
      .find()
      .where( { project_start_date: { $lte: moment().subtract(1, 'month' ).endOf( 'M' ).format( 'YYYY-MM-DD' ) } } )
      .where( { project_end_date: { $gte: moment().subtract(1, 'month' ).startOf( 'M' ).format( 'YYYY-MM-DD' ) } } )
      .exec( function( err, projects ){

        // return error
        if ( err ) return res.negotiate( err );


        // ASYNC REQUEST 1
        // async loop target_beneficiaries
        async.each( projects, function ( project, next ) {

          var findProject = { project_id: project.id }

          // for now make report twice a month, can be applied for 1 week 1 report
          var bi_weekly_reporting = [
            {
              // reporting_period: 1,
              // reporting_due_date: 10
              reporting_period: 1,
              reporting_due_date: 19,
              period_biweekly: 1
            }, {
              // reporting_period: 15,
              // reporting_due_date: 27
              reporting_period: 16,
              reporting_due_date: 4,
              period_biweekly: 2
            }
          ];
          var bi_weekly_newreports = []

          if (project.report_type_id && (project.report_type_id === 'bi-weekly')) {
            bi_weekly_reporting.forEach(function (w) {
              var r = {
                project_id: project.id,
                report_status: 'todo',
                report_active: true,
                report_month: moment().month(),
                report_year: moment().year(),
                reporting_period: moment().set('date', w.reporting_period).format(),
                reporting_due_date: moment().set('date', w.reporting_due_date).format()
              };
               if(w.period_biweekly>1){
                r.reporting_due_date = moment().add(1, 'M').set('date', w.reporting_due_date).format()
              }
              // clone project
              var p = JSON.parse(JSON.stringify(project));
              delete p.id;

              // create report
              var new_report = _under.extend({}, p, r);
              delete new_report.createdAt;
              delete new_report.updatedAt;
              bi_weekly_newreports.push(new_report)
            })

            bi_weekly_newreports.forEach(function (new_report) {

              // find reports
              Report.findOne({ project_id: new_report.project_id, report_month: new_report.report_month, report_year: new_report.report_year, report_type_id: new_report.report_type_id, reporting_period: { $gte: moment(new_report.reporting_period).startOf('day').toDate(), $lte: moment(new_report.reporting_period).endOf('day').toDate() } }).then(function (report) {

                // set
                if (!report) { report = { id: null } }
                if (report) { new_report.report_status = report.report_status; new_report.report_active = report.report_active, new_report.updatedAt = report.updatedAt }

                // create reports
                Report.updateOrCreate(findProject, { id: report.id }, new_report).exec(function (err, report_result) {

                  // err
                  if (err) return err;

                  // make array ( sails returns object on create, array on update )
                  if (!report.id) {

                    report_result = [report_result];
                  }

                  // get target_locations
                  TargetLocation
                    .find()
                    .where(findProject)
                    .exec(function (err, target_locations) {

                      // err
                      if (err) return err;

                      // generate locations for each report ( requires report_id )
                      ReportTasksController.getProjectReportLocations(report_result, target_locations, function (err, locations) {

                        // err
                        if (err) return err;

                        // ASYNC REQUEST 1.1
                        // async loop project_update locations
                        async.each(locations, function (d, next) {

                          // find
                          Location.findOne({ project_id: project.id, target_location_reference_id: d.target_location_reference_id, report_month: d.report_month, report_year: d.report_year, report_type_id: d.report_type_id, reporting_period: { $gte: moment(d.reporting_period).startOf('day').toDate(), $lte: moment(d.reporting_period).endOf('day').toDate() } }).then(function (location) {
                            if (!location) { location = { id: null }; }
                            // relations set in getProjectReportLocations
                            Location.updateOrCreate(findProject, { id: location.id }, d).exec(function (err, location_result) {

                              // err
                              if (err) return err;

                              // no need to return locations
                              // next();

                            });
                          });
                        }, function (err) {
                          if (err) return err;
                          next();
                        });

                      });

                    });

                });
              });
            })




          }else{
            // create report
            var r = {
              project_id: project.id,
              report_status: 'todo',
              report_active: true,
              report_month: moment().month(),
              report_year: moment().year(),
              reporting_period: moment().set('date', 1).format(),
              reporting_due_date: moment().add(1, 'M').set('date', 10).format()
            };

            // clone project
            var p = JSON.parse(JSON.stringify(project));
            delete p.id;

            // create report
            var new_report = _under.extend({}, p, r);

            // find reports
            Report.findOne({ project_id: new_report.project_id, report_month: new_report.report_month, report_year: new_report.report_year }).then(function (report) {

              // set
              if (!report) { report = { id: null } }
              if (report) { new_report.report_status = report.report_status; new_report.report_active = report.report_active, new_report.updatedAt = report.updatedAt }

              // create reports
              Report.updateOrCreate(findProject, { id: report.id }, new_report).exec(function (err, report_result) {

                // err
                if (err) return err;

                // make array ( sails returns object on create, array on update )
                if (!report.id) {
                  report_result = [report_result];
                }

                // get target_locations
                TargetLocation
                  .find()
                  .where(findProject)
                  .exec(function (err, target_locations) {

                    // err
                    if (err) return err;

                    // generate locations for each report ( requires report_id )
                    ReportTasksController.getProjectReportLocations(report_result, target_locations, function (err, locations) {

                      // err
                      if (err) return err;

                      // ASYNC REQUEST 1.1
                      // async loop project_update locations
                      async.each(locations, function (d, next) {

                        // find
                        Location.findOne({ project_id: project.id, target_location_reference_id: d.target_location_reference_id, report_month: d.report_month, report_year: d.report_year }).then(function (location) {
                          if (!location) { location = { id: null } }
                          // relations set in getProjectReportLocations
                          Location.updateOrCreate(findProject, { id: location.id }, d).exec(function (err, location_result) {

                            // err
                            if (err) return err;

                            // no need to return locations
                            next();

                          });
                        });
                      }, function (err) {
                        if (err) return err;
                        next();
                      });

                    });

                  });

              });
            });
          }

          

        }, function ( err ) {
          if ( err ) return err;
          return res.json( 200, { msg: 'success' } );
        });

    });

  },

  // send notification for new reporting period
    // run this on return of above method on 1st day of the month
  setReportsOpen: function( req, res ) {

    // active projects ids
    var moment = require('moment'),
        nStore = {},
        notifications =[];


    // only run if date is above monthly reporting period
    if ( moment().date() === 1 ) {

    Report
      .find()
      .where( { project_id: { '!' : null } } )
      .where( { report_month: moment().month() } )
      .where( { report_year: moment().year() } )
      .where( { report_active: true } )
      .where( { report_status: 'todo' } )
      .exec( function( err, reports ){

        if ( err ) return res.negotiate( err );
        // find active reports for the next reporting period
        Location
          .find()
          .where( { report_id: { '!' : null } } )
          .where( { report_month: moment().month() } )
          .where( { report_year: moment().year() } )
          .where( { report_active: true } )
          .where( { report_status: 'todo' } )
          .exec( function( err, locations ){

            // return error
            if ( err ) return res.negotiate( err );

            // no reports return
            if ( !locations.length ) return res.json( 200, { msg: 'No reports pending for ' + moment().format( 'MMMM, YYYY' ) + '!' } );

            // for each report, group by username
            locations.forEach( function( location, i ) {

              if ( NotificationService.shouldNotify( location.admin0pcode, location.cluster_id ) ) {
                // if username dosnt exist
                if ( !nStore[ location.email ] ) {

                // add for notification email template
                nStore[ location.email ] = {
                  email: location.email,
                  username: location.username,
                  report_month: moment().format( 'MMMM' ),
                  report_year: moment().format('YYYY'),
                  report_month_year: moment().format('MMMM, YYYY'),
                  reportsStore: []
                };

              }

              // group reports by report!
                if ( !nStore[ location.email ].reportsStore[ location.report_id ] ){
                  var _periodExplanation = "Monthly";
                  if (location.report_type_id && location.report_type_id === 'bi-weekly') {
                    var number_date_of_reporting_period = moment.utc(location.reporting_period).format('D')
                    _periodExplanation = (number_date_of_reporting_period <= 15 ? 'First Period' : 'Second Period');
                  }
                  // add location urls
                    if (_periodExplanation !== 'Second Period'){
                      nStore[ location.email ].reportsStore[ location.report_id ] = {
                        country: location.admin0name,
                        cluster: location.cluster,
                        username: location.username,
                        project_title: location.project_title,
                        report_type_id: location.report_type_id === 'bi-weekly' ? location.report_type_id : 'monthly',
                        period_explaination: _periodExplanation,
                          report_url: 'https://' + req.host + '/desk/#/cluster/projects/report/' + location.project_id + '/' + location.report_id
                      };
                    }
                }
              }
            });

            // catching up with project focal points who are not in locations
            // for each report, group by username
            reports.forEach( function( location, i ) {

              if (  NotificationService.shouldNotify( location.admin0pcode, location.cluster_id ) ) {
                location.report_id = location.id;
                // if username dosnt exist
                if ( !nStore[ location.email ] ) {

                // add for notification email template
                nStore[ location.email ] = {
                  email: location.email,
                  username: location.username,
                  report_month: moment().format( 'MMMM' ),
                  report_year: moment().format('YYYY'),
                  report_month_year: moment().format('MMMM, YYYY'),
                  reportsStore: []
                };

              }

              // group reports by report!
              if ( !nStore[ location.email ].reportsStore[ location.report_id ] ){
                var _periodExplanation = "Monthly"
                if (location.report_type_id && location.report_type_id === 'bi-weekly'){
                  var number_date_of_reporting_period = moment.utc(location.reporting_period ).format('D')
                  _periodExplanation = (number_date_of_reporting_period <= 15 ? 'First Period' : 'Second Period');
                }

                // add location urls
                if (_periodExplanation !== 'Second Period'){
                    nStore[ location.email ].reportsStore[ location.report_id ] = {
                      country: location.admin0name,
                      cluster: location.cluster,
                      username: location.username,
                      project_title: location.project_title,
                      report_type_id: location.report_type_id === 'bi-weekly' ? location.report_type_id:'monthly',
                      period_explaination: _periodExplanation,
                        report_url: 'https://' + req.host + '/desk/#/cluster/projects/report/' + location.project_id + '/' + location.report_id
                    };
                  }
                }
              }
            });

            // each user, send only one email!
            for ( var user in nStore ) {

              // flatten and order
              for ( var report in nStore[ user ].reportsStore ) {
                if ( !nStore[ user ].reports ) {
                  nStore[ user ].reports = [];
                }
                nStore[ user ].reports.push( nStore[ user ].reportsStore[ report ] );
              }

              // sort
              nStore[ user ].reports.sort(function(a, b) {
                return a.country.localeCompare(b.country) ||
                        a.cluster.localeCompare(b.cluster) ||
                        a.project_title.localeCompare(b.project_title);
              });

              // push
              notifications.push( nStore[ user ] );

            }

            // counter
            var counter = 0,
                length = notifications.length;

            // for each
            notifications.forEach( function( notification, i ){

              // get name
              User
                .findOne()
                .where({ email: notifications[i].email })
                .exec( function( err, result ){

                  // return error
                  if ( err ) return res.negotiate( err );

                  // really have no idea whats
                  if( !result ) {
                    result = {
                      name: notifications[i].username
                    }
                  }
                  var _type = 'monthly activity';
                  var _period_column = false;
                  if (notifications[i].reports.length){
                    var check_type_report = notifications[i].reports.map(x => x.report_type_id)
                    if ((check_type_report.indexOf('monthly') >-1) && (check_type_report.indexOf('bi-weekly')>-1)){
                      _type = 'monthly and biweekly activity'
                      _period_column = true;
                    } else if (check_type_report.indexOf('bi-weekly') > -1){
                      _type = 'biweekly activity'
                      _period_column = true;
                    }else{
                      _type = 'monthly activity'
                      _period_column = false;
                    }
                  }
                  // send email
                  sails.hooks.email.send( 'notification-open', {
                      // type: 'monthly activity',
                      type: _type,
                      name: result.name,
                      email: notifications[i].email,
                      report_month: notifications[i].report_month,
                      report_year: notifications[i].report_year,
                      report_month_year: notifications[i].report_month_year,
                      reports: notifications[i].reports,
                      period_column: _period_column,
                      sendername: 'ReportHub'
                    }, {
                      to: notifications[i].email,
                      subject: 'ReportHub - Project Reporting Period for ' + moment().format( 'MMMM' ).toUpperCase() + ' Now Open.'
                    }, function(err) {

                      // return error
                      if (err) return res.negotiate( err );

                      // add to counter
                      counter++;
                      if ( counter === length ) {

                        // email sent
                        return res.json(200, { 'data': 'success' });
                      }

                    });

                });

            });

        });
      });

    } else {

      // return reports
      return res.json( 200, { msg: 'Reporting not open for ' + moment().format( 'MMMM' ) + '!' } );
    }

  },

  // sends reminder for active reports not yet submitted
  setReportsReminderAllMonths: function( req, res ) {

    // active projects ids
    var due_date = 10;
    var nStore = {}
    var notifications = [];

    // only run if date is 1 week before monthly reporting period required
    // if ( moment().date() <= 10 ) {
    Report
      .find()
      .where( { project_id: { '!' : null } } )
      .where( { report_year: moment().subtract( 1, 'M' ).year() })
      .where( { report_month: { '<=': moment().subtract( 1, 'M' ).month() } } )
      .where( { report_active: true } )
      .where( { report_status: 'todo' } )
      .sort( 'report_month DESC' )
      .exec( function( err, reports ){

          if ( err ) return res.negotiate( err );
          // no reports return
          if ( !reports.length ) return res.json( 200, { msg: 'No reports pending for ' + moment().subtract( 1, 'M' ).format( 'MMMM' ) + '!' } );

          // for each report, group by username
          reports.forEach( function( location, i ) {

            location.report_id = location.id;
            // if username dosnt exist
            if ( !nStore[ location.email ] ) {
              var due_message = 'PENDING';

              // add for notification email template
              nStore[ location.email ] = {
                email: location.email,
                username: location.username,
                report_month: moment().subtract( 1, 'M' ).format( 'MMMM' ),
                report_year: moment().subtract(1, 'M').format('YYYY'),
                reporting_due_date: moment( location.reporting_due_date ).format( 'DD MMMM, YYYY' ),
                reporting_due_message: due_message,
                projectsStore: []
              };
            }

            // group reports by report!
            if ( !nStore[ location.email ].projectsStore[ location.project_id ] ){
              // add report urls
              nStore[ location.email ].projectsStore[ location.project_id ] = {
                country: location.admin0name,
                cluster: location.cluster,
                project_title: location.project_title,
                reports: []
              }

            }

            // one report per month
            if (!nStore[location.email].projectsStore[location.project_id].reports[location.report_id]) {
              var _periodExplanation = "Monthly"
              if (location.report_type_id && location.report_type_id === 'bi-weekly') {
                var number_date_of_reporting_period = moment.utc(location.reporting_period).format('D')
                _periodExplanation = (number_date_of_reporting_period <= 15 ? 'First Period' : 'Second Period');
              }
              // project reports
              nStore[location.email].projectsStore[location.project_id].reports.push({
                report_value: location.report_month,
                report_month: moment(location.reporting_period).format('MMMM'),
                report_year: moment(location.reporting_period).format('YYYY'),
                report_type_id: location.report_type_id === 'bi-weekly' ? location.report_type_id : 'monthly',
                period_explaination: _periodExplanation,
                report_url: 'https://' + req.host + '/desk/#/cluster/projects/report/' + location.project_id + '/' + location.report_id
              });
              // avoids report row per location
              nStore[location.email].projectsStore[location.project_id].reports[location.report_id] = [{ report: true }];
            }
           

          });

          // each user, send only one email!
          for ( var user in nStore ) {

            // flatten and order
            for ( var project in nStore[ user ].projectsStore ) {
              if ( !nStore[ user ].projects ) {
                nStore[ user ].projects = [];
              }
              nStore[ user ].projects.push( nStore[ user ].projectsStore[ project ] );
            }

            // sort
            nStore[ user ].projects.sort(function(a, b) {
              return a.country.localeCompare(b.country) ||
                      a.cluster.localeCompare(b.cluster) ||
                      a.project_title.localeCompare(b.project_title);
            });

            // push
            notifications.push( nStore[ user ] );

          }

          // counter
          var counter = 0,
              length = notifications.length;

          // for each
          notifications.forEach( function( notification, i ){

            User
              .findOne()
              .where({ email: notifications[i].email })
              .exec( function( err, result ){

                // return error
                if ( err ) return res.negotiate( err );

                // really have no idea whats
                if( !result ) {
                  result = {
                    name: notifications[i].username
                  }
                }

                // send email
                sails.hooks.email.send( 'notification-due-reports', {
                    type: 'monthly activity',
                    name: result.name,
                    email: notifications[i].email,
                    report_month: notifications[i].report_month,
                    reporting_due_date: notifications[i].reporting_due_date,
                    reporting_due_message: notifications[i].reporting_due_message,
                    projects: notifications[i].projects,
                    sendername: 'ReportHub'
                  }, {
                    to: notifications[i].email,
                    subject: 'ReportHub - Project Reports ' + notifications[i].reporting_due_message + '.'
                  }, function(err) {

                    // return error
                    if (err) return res.negotiate( err );

                    // add to counter
                    counter++;
                    if ( counter === length ) {

                      // email sent
                      return res.json( 200, { 'data': 'success' });
                    }

                  });

            });

          });

        });
      // } else { return res.json( 200, { msg: 'No reports pending for ' + moment().subtract( 1, 'M' ).format( 'MMMM' ) + '!' } ); }

  },

  // sends reminder for active current reporting period month not yet submitted
  setReportsReminder: function( req, res ) {

    // active projects ids
    var due_date = 10;
    var nStore = {}
    var notifications = [];

    // only run if date is 1 week before monthly reporting period required
    // if ( moment().date() <= 10 ) {
    Report
      .find()
      .where( { project_id: { '!' : null } } )
      .where( { report_year: moment().subtract( 1, 'M' ).year() })
      .where( { report_month: moment().subtract( 1, 'M' ).month() } )
      .where( { report_active: true } )
      .where( { report_status: 'todo' } )
      .where({ report_type_id: { '!': "bi-weekly" } })
      .where( { project_status : "active" } )
      .sort( 'report_month DESC' )
      .exec( function( err, reports ){

          if ( err ) return res.negotiate( err );
          // no reports return
          if ( !reports.length ) return res.json( 200, { msg: 'No reports pending for ' + moment().subtract( 1, 'M' ).format( 'MMMM, YYYY' ) + '!' } );

          // for each report, group by username
          reports.forEach( function( location, i ) {

            let config = NotificationService.getConfig( location.admin0pcode, location.cluster_id );

            if ( config.notify && ( config.soon || config.pending || config.today ) ) {

              location.report_id = location.id;
              // if username dosnt exist
              if ( !nStore[ location.email ] ) {
                var due_message = 'DUE SOON';
                // set due message TODAY
                if ( config.today ) {
                  due_message = 'DUE TODAY';
                }
                // set due message PENDING
                if ( config.pending ) {
                  due_message = 'PENDING';
                }

                // add for notification email template
                nStore[ location.email ] = {
                  email: location.email,
                  username: location.username,
                  report_month: moment().subtract( 1, 'M' ).format( 'MMMM' ),
                  report_year: moment().subtract(1, 'M').format('YYYY'),
                  report_month_year: moment().subtract(1, 'M').format('MMMM, YYYY'),
                  reporting_due_date: moment( location.reporting_due_date ).format( 'DD MMMM, YYYY' ),
                  reporting_due_message: due_message,
                  projectsStore: []
                };
              }

              // group reports by report!
              if ( !nStore[ location.email ].projectsStore[ location.project_id ] ){
                // add report urls
                nStore[ location.email ].projectsStore[ location.project_id ] = {
                  country: location.admin0name,
                  cluster: location.cluster,
                  project_title: location.project_title,
                  reports: []
                }

              }

              // one report per month
              if ( !nStore[ location.email ].projectsStore[ location.project_id ].reports[ location.report_id ] ) {
                // project reports
                nStore[ location.email ].projectsStore[ location.project_id ].reports.push({
                  report_value: location.report_month,
                  report_month: moment( location.reporting_period ).format( 'MMMM' ),
                  report_year: moment(location.reporting_period).format('YYYY'),
                  report_month_year: moment().subtract(1, 'M').format('MMMM, YYYY'),
                  report_url: 'https://' + req.host + '/desk/#/cluster/projects/report/' + location.project_id + '/' + location.report_id
                });
                // avoids report row per location
                nStore[ location.email ].projectsStore[ location.project_id ].reports[ location.report_id ] = [{ report: true }];
              }
            }
          });

          // each user, send only one email!
          for ( var user in nStore ) {

            // flatten and order
            for ( var project in nStore[ user ].projectsStore ) {
              if ( !nStore[ user ].projects ) {
                nStore[ user ].projects = [];
              }
              nStore[ user ].projects.push( nStore[ user ].projectsStore[ project ] );
            }

            // sort
            nStore[ user ].projects.sort(function(a, b) {
              return a.country.localeCompare(b.country) ||
                      a.cluster.localeCompare(b.cluster) ||
                      a.project_title.localeCompare(b.project_title);
            });

            // push
            notifications.push( nStore[ user ] );

          }

          // counter
          var counter = 0,
              length = notifications.length;
          
          if (!notifications.length) { return res.json(200, { msg: 'Not the time to send a notification email about  due soon report, due to today report, or pending reports for period ' + moment().subtract(1, 'M').format('MMMM YYYY') + '!' }) }
          // for each
          notifications.forEach( function( notification, i ){

            User
              .findOne()
              .where({ email: notifications[i].email })
              .exec( function( err, result ){

                // return error
                if ( err ) return res.negotiate( err );

                // really have no idea whats
                if( !result ) {
                  result = {
                    name: notifications[i].username
                  }
                }

                // send email
                sails.hooks.email.send( 'notification-due', {
                    type: 'monthly activity',
                    name: result.name,
                    email: notifications[i].email,
                    report_month: notifications[i].report_month,
                    report_year: notifications[i].report_year,
                    report_month_year: notifications[i].report_month_year,
                    reporting_due_date: notifications[i].reporting_due_date,
                    reporting_due_message: notifications[i].reporting_due_message,
                    projects: notifications[i].projects,
                    sendername: 'ReportHub'
                  }, {
                    to: notifications[i].email,
                    subject: 'ReportHub - Project Reporting Period for ' + moment().subtract( 1, 'M' ).format( 'MMMM' ).toUpperCase() + ' is ' + notifications[i].reporting_due_message + '.'
                  }, function(err) {

                    // return error
                    if (err) return res.negotiate( err );

                    // add to counter
                    counter++;
                    if ( counter === length ) {

                      // email sent
                      return res.json( 200, { 'data': 'success' });
                    }

                  });

            });

          });

        });
      // } else { return res.json( 200, { msg: 'No reports pending for ' + moment().subtract( 1, 'M' ).format( 'MMMM' ) + '!' } ); }

  },
  // sends reminder for active current reporting period month not yet submitted
  setReportsReminderBiWeekly: function (req, res) {

    var nStore = {}
    var notifications = [];

    var reminder_biweekly_period = moment.utc().format('D')
    // if this function run before 15 then reminder for biweely first period viceversa
    var biweekly_period = (reminder_biweekly_period > 15  ? 'first' : 'second');

    
    // request input
    // if (!req.param('biweekly_period')) {
    //   // biweekly_period is first or second
    //   return res.json(401, { err: 'biweekly_period required!' });
    // }
    // var biweekly_period = req.param('biweekly_period')
    if(biweekly_period === 'first'){
      var date_period = moment().set('date', 1).format()
      var findReportingPeriod = { reporting_period: { 
                                    $gte: moment(date_period).startOf('day').toDate(), 
                                    $lte: moment(date_period).endOf('day').toDate()
                                  }};
      var findReportMonth = moment().month();
      var findReportYear = moment().year();
      var no_report_pending = moment().format('MMMM, YYYY')
    }else{
      var date_period = moment().subtract(1, 'M').set('date', 16).format()
      var findReportingPeriod = {
        reporting_period: {
          $gte: moment(date_period).startOf('day').toDate(),
          $lte: moment(date_period).endOf('day').toDate()
        }
      };
      var findReportMonth = moment().subtract(1, 'M').month();
      var findReportYear = moment().subtract(1, 'M').year();
      var no_report_pending = moment().subtract(1, 'M').format('MMMM, YYYY')
    };

    // only run if date is 1 week before monthly reporting period required
    // if ( moment().date() <= 10 ) {
    Report
      .find()
      .where({ project_id: { '!': null } })
      .where({ report_year: findReportYear })
      .where({ report_month: findReportMonth })
      .where({ report_active: true })
      .where({ report_type_id:"bi-weekly"})
      .where({ report_status: 'todo' })
      .where({ project_status: "active" })
      .where(findReportingPeriod)
      .sort('report_month DESC')
      .exec(function (err, reports) {

        if (err) return res.negotiate(err);
        // no reports return
        if (!reports.length) return res.json(200, { msg: 'No reports pending for ' + no_report_pending + '!' });
        // for each report, group by username
        reports.forEach(function (location, i) {

          let config = NotificationService.getConfigBiWeekly(location.admin0pcode, location.cluster_id, biweekly_period);;

          if (config.notify && (config.soon || config.pending || config.today)) {

            location.report_id = location.id;
            // if username dosnt exist
            if (!nStore[location.email]) {
              var due_message = 'DUE SOON';
              // set due message TODAY
              if (config.today) {
                due_message = 'DUE TODAY';
              }
              // set due message PENDING
              if (config.pending) {
                due_message = 'PENDING';
              }

              // add for notification email template
              nStore[location.email] = {
                email: location.email,
                username: location.username,
                report_month: biweekly_period === 'first' ? moment().format('MMMM') : moment().subtract(1, 'M').format('MMMM'),
                report_year: biweekly_period === 'first' ? moment().format('YYYY') : moment().subtract(1, 'M').format('YYYY'),
                report_month_year: moment().format('MMMM, YYYY'),
                reporting_due_date: moment(location.reporting_due_date).format('DD MMMM, YYYY'),
                reporting_due_message: due_message,
                projectsStore: []
              };
            }

            // group reports by report!
            if (!nStore[location.email].projectsStore[location.project_id]) {
              // add report urls
              nStore[location.email].projectsStore[location.project_id] = {
                country: location.admin0name,
                cluster: location.cluster,
                project_title: location.project_title,
                reports: []
              }

            }

            // one report per month
            if (!nStore[location.email].projectsStore[location.project_id].reports[location.report_id]) {
              // project reports
              nStore[location.email].projectsStore[location.project_id].reports.push({
                report_value: location.report_month,
                report_month: moment(location.reporting_period).format('MMMM'),
                report_year: moment(location.reporting_period).format('YYYY'),
                report_month_year: moment().format('MMMM, YYYY'),
                report_url: 'https://' + req.host + '/desk/#/cluster/projects/report/' + location.project_id + '/' + location.report_id
              });
              // avoids report row per location
              nStore[location.email].projectsStore[location.project_id].reports[location.report_id] = [{ report: true }];
            }
          }
        });

        // each user, send only one email!
        for (var user in nStore) {

          // flatten and order
          for (var project in nStore[user].projectsStore) {
            if (!nStore[user].projects) {
              nStore[user].projects = [];
            }
            nStore[user].projects.push(nStore[user].projectsStore[project]);
          }

          // sort
          nStore[user].projects.sort(function (a, b) {
            return a.country.localeCompare(b.country) ||
              a.cluster.localeCompare(b.cluster) ||
              a.project_title.localeCompare(b.project_title);
          });

          // push
          notifications.push(nStore[user]);

        }

        // counter
        var counter = 0,
          length = notifications.length;

        // for each
        var biweekly_period_text = (biweekly_period === 'first')? 'Biweekly First Period': 'Biweekly Second Period';
        if (!notifications.length) { return res.json(200, { msg: 'Not the time to send a notification email about  due soon report, due to today report, or pending reports for ' + biweekly_period_text + ', ' + no_report_pending + '!' })}
        notifications.forEach(function (notification, i) {

          User
            .findOne()
            .where({ email: notifications[i].email })
            .exec(function (err, result) {

              // return error
              if (err) return res.negotiate(err);

              // really have no idea whats
              if (!result) {
                result = {
                  name: notifications[i].username
                }
              }

              // send email
              sails.hooks.email.send('notification-due-biweekly', {
                type: 'biweekly activity',
                name: result.name,
                email: notifications[i].email,
                report_month: notifications[i].report_month,
                report_year: notifications[i].report_year,
                report_month_year: notifications[i].report_month_year,
                reporting_due_date: notifications[i].reporting_due_date,
                reporting_due_message: notifications[i].reporting_due_message,
                projects: notifications[i].projects,
                biweekly_period: biweekly_period_text,
                sendername: 'ReportHub'
              }, {
                to: notifications[i].email,
                subject: 'ReportHub - Project Reporting for ' + biweekly_period_text + ', ' + (biweekly_period === 'first' ? moment().format('MMMM') : moment().subtract(1, 'M').format('MMMM')).toUpperCase()  + ' is ' + notifications[i].reporting_due_message + '.'
              }, function (err) {

                // return error
                if (err) return res.negotiate(err);

                // add to counter
                counter++;
                if (counter === length) {

                  // email sent
                  return res.json(200, { 'data': 'success' });
                }

              });

            });

        });

      });
    // } else { return res.json( 200, { msg: 'No reports pending for ' + moment().subtract( 1, 'M' ).format( 'MMMM' ) + '!' } ); }

  }

};

module.exports = ReportTasksController;
