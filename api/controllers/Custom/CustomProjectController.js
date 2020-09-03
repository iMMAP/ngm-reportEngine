/**
 * ProjectCustomController
 *
 * @description :: Server-side logic for managing auths
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

// libs
var Promise = require('bluebird');
var util = require('util');
var json2csv = require('json2csv');
var moment = require('moment');
var async = require('async');
var _under = require('underscore');
var $nin_organizations = [ 'immap', 'arcs' ];

var REPORTING_DUE_DATE_NOTIFICATIONS_CONFIG = sails.config.REPORTING_DUE_DATE_NOTIFICATIONS_CONFIG;

// project controller
var CustomProjectController = {

  // TASKS

  // parse results from sails
  set_result: function( result ) {
    if( util.isArray( result ) ) {
      // update ( array )
      return result[0];
    } else {
      // create ( object )
      return result;
    }
  },

  // return reports for a project
  getProjectReports: function( project, cb ) {

    // TODO update due dates functionality for different periods
    const admin0pcode = project.admin0pcode ? project.admin0pcode : "ALL";
    let config = REPORTING_DUE_DATE_NOTIFICATIONS_CONFIG.find(obj => obj.admin0pcode === admin0pcode);
    if (!config) config = REPORTING_DUE_DATE_NOTIFICATIONS_CONFIG.find(obj => obj.admin0pcode === 'ALL');

    const REPORTING_DUE_DATE = config.reporting_due_date;

    // ---START fn set periodicity---

    // constants
    const YEARS = 'years';
    const MONTHS = 'months';
    const WEEKS = 'weeks';

    const MONTHLY = 'monthly';
    const MONTHLY_2 = '2monthly';
    const WEEKLY = 'weekly';
    const WEEKLY_2 = '2weekly';
    const QUARTERLY = 'quarterly';
    const SEMIYEARLY = 'semiyearly';
    const YEARLY = 'yearly';
    const DEFAULT_PERIOD = 'monthly';

    // const period_types = {
    //   'monthly': MONTHS,
    //   '2monthly': MONTHS,
    //   'weekly': WEEKS,
    //   '2weekly': WEEKS,
    //   'quarterly': MONTHS,
    //   'semiyearly': MONTHS,
    //   'yearly': YEARS,
    //   'default': MONTHS
    // }

    let period_types = {};
    period_types[DEFAULT_PERIOD] = MONTHS;

    period_types[MONTHLY] = MONTHS;
    period_types[MONTHLY_2] = MONTHS;
    period_types[WEEKLY] = WEEKS;
    period_types[WEEKLY_2] = WEEKS;
    period_types[QUARTERLY] = MONTHS;
    period_types[SEMIYEARLY] = MONTHS;
    period_types[YEARLY] = YEARS;

    // const period_spans = {
    //   'monthly': 1,
    //   '2monthly': 2,
    //   'weekly': 1,
    //   '2weekly': 2,
    //   'quarterly': 3,
    //   'semiyearly': 6,
    //   'yearly': 1,
    //   'default': 1
    // }

    let period_spans = {};
    period_spans[DEFAULT_PERIOD] = 1;

    period_spans[MONTHLY] = 1;
    period_spans[MONTHLY_2] = 2;
    period_spans[WEEKLY] = 1;
    period_spans[WEEKLY_2] = 2;
    period_spans[QUARTERLY] = 3;
    period_spans[SEMIYEARLY] = 6;
    period_spans[YEARLY] = 1;

    var calcReportsNumber = function(period_type, s_date, e_date){
      if (period_type === MONTHS) {
        return moment.duration(e_date.diff(s_date)).asMonths().toFixed(0);
      } else if (period_type === WEEKS) {
        return moment.duration(e_date.diff(s_date)).asWeeks().toFixed(0);
      } else if (period_type === YEARS) {
        return moment.duration(e_date.diff(s_date)).asYears().toFixed(0);
      } else {
        return moment.duration(e_date.diff(s_date)).asMonths().toFixed(0);
      }
    };

    var period_span = period_spans['default'];
    if (period_spans[project.reporting_period_type]) {
      period_span = period_spans[project.reporting_period_type];
    } else {
      period_span = parseInt(project.reporting_period_type.replace(/[^0-9]/g, "")) || period_spans['default'];
    }

    var period_type = period_types['default'];
    if (period_types[project.reporting_period_type]) {
      period_type = period_types[project.reporting_period_type];
    } else {
      period_type = period_types[project.reporting_period_type.replace(/[0-9]/g, "")] || period_types['default'];
    }

    // ---END---

    // dates
    var project_start = moment( project.project_start_date ).startOf( period_type ),
        project_end = moment( project.project_end_date ).endOf( period_type ),
        // reports_end = moment().endOf( 'M' );
        reports_end = moment( project.project_end_date ).endOf( period_type );

    // variables
    var reports = [],
        // s_date = project_start < reports_end ? project_start : reports_end,
        // e_date = project_end < reports_end ? project_end : reports_end;
        s_date = project_start,
        e_date = project_end;

    // // number of reports
    // var reports_duration = moment.duration( e_date.diff( s_date ) ).asMonths().toFixed(0);

    // if (period_type==='w'){
    //   reports_duration = moment.duration( e_date.diff( s_date ) ).asWeeks().toFixed(0);
    // }

    reports_duration = calcReportsNumber(period_type, s_date, e_date);

    reports_duration = reports_duration / period_span;
    reports_duration = Math.ceil(reports_duration)

    console.log(reports_duration)

    // reports_duration array
    var reports_array = Array(parseInt( reports_duration )).fill().map((item, index) => 0 + index);

    console.log(reports_array)

    // prepare project for cloning
    var p = JSON.parse( JSON.stringify( project ) );
    delete p.id;
    delete p.createdAt;
    delete p.updatedAt;

    async.each( reports_array, function ( m, next ) {
      m = m*period_span;
      // create report
      console.log('d',m, '-',period_span, '-',m + period_span )
      var report = {
        project_id: project.id,
        report_status: 'todo',
        report_active: true,
        report_week: moment( s_date ).add( m, period_type ).week(),
        report_month: moment( s_date ).add( m, period_type ).month(),
        report_year: moment( s_date ).add( m, period_type ).year(),
        reporting_period: moment( s_date ).add( m, period_type ).startOf(period_type).format(),
        reporting_period_end: moment( s_date ).add( m + period_span - 1, period_type ).endOf(period_type).format(),
        reporting_due_date: moment( s_date ).add( m+1, period_type ).set( 'date', REPORTING_DUE_DATE ).format()
      };

      // add report with p to reports
      reports.push( _under.extend( {}, report, p ) );

      // next
      next();

    }, function ( err ) {
      if ( err ) return cb( err, false );
      // return the reports for the project period
      return cb( false, reports );
    });

  },

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
      delete r.createdAt;
      delete r.updatedAt;
      delete r.implementing_partners;

      // async loop target_beneficiaries
      async.each( target_locations, function ( target_location, tl_next ) {

        // prepare report for cloning
        var l = JSON.parse( JSON.stringify( target_location ) );
        l.target_location_reference_id = l.id.valueOf();
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


  // REST APIs

  // get all Projects by organization
  getProjectsList: function(req, res) {

    // request input
    if ( !req.param('filter') ) {
      return res.json(401, { err: 'filter required!' });
    }

    // get project by organization_id & status
    CustomProject
      .find( req.param( 'filter' ) )
      .sort('updatedAt DESC')
      .exec(function(err, projects){

        // return error
        if (err) return res.negotiate( err );

        // else
        return res.json(200, projects);

      });

  },

  // // get distinct sectors
  // getProjectSectors: function( req, res ) {

  //   // organization_id required
  //   // if ( !req.param('organization_tag') ) {
  //   //   return res.json(401, { err: 'organization_id required!' });
	// 	// }

	// 	if (!req.param('filter')) {
	// 		return res.json(401, { msg: 'filter required' });
	// 	}
  //   // get project by organization_id & status
  //   CustomProject
	// 		.find( req.param('filter') )
  //     .exec( function( err, projects ){

  //       // return error
  //       if (err) return res.negotiate( err );

  //       // uniq cluster_id
  //       var distinct_sectors = _.uniq( projects, function( x ){
  //         return x.cluster_id;
  //       });

  //       // else
  //       return res.json( 200, distinct_sectors );

  //     });

  // },


  // // get projects summary
  // getProjects: function(req, res){

  //     // Guards
  //     var reqQuery = req.param('query');

  //     if (!req.param('id') && !reqQuery) {
  //       return res.json(401, { err: 'params required!' });
  //     }

  //   var allowedParams =
  //       ['project_id','organization_id','cluster_id','organization_tag','implementer_id','project_type_component','activity_type_id','hrpplan','adminRpcode', 'admin0pcode','admin1pcode','admin2pcode', 'project_start_date', 'project_end_date', 'donor_id'];


  //     // if dissallowed parameters sent
  //     if (reqQuery && _.difference(Object.keys(reqQuery), allowedParams).length > 0) {
  //       return res.json(401, { err: 'ivalid query params!' });
  //     }

  //     // build query object
  //     // legacy `id` api backward compatibility
  //     if (req.param('id')) {
  //       var query = { project_id: req.param('id') };
  //       var queryProject = { id: req.param('id') };
  //     } else {

  //       // copy resquest object
  //       var query = Object.assign({}, reqQuery);

  //       // use uppercase admin
  //       if (query.adminRpcode === "hq") delete query.adminRpcode;
  //       if (query.adminRpcode) query.adminRpcode = query.adminRpcode.toUpperCase();
  //       if (query.admin0pcode) query.admin0pcode = query.admin0pcode.toUpperCase();

  //       // 4wplus ---
  //       // donor filter from 4wplus project plan and activities dashboards
  //       if ( reqQuery.donor_id ) {
  //         query.project_donor = { $elemMatch: { 'project_donor_id': reqQuery.donor_id } };
  //         delete query.donor_id;
  //       }

  //       // implementing partner filter from 4wplus project plan and activities dashboards
  //       if( reqQuery.implementer_id ){
  //         query.implementing_partners = { $elemMatch: { 'organization_tag': reqQuery.implementer_id } };
  //         delete query.implementer_id;
  //       }

  //       //project type and is hrp plan? filter from 4wplus project plan and activities dashboards
  //       if ( reqQuery.project_type_component && (reqQuery.hrpplan && reqQuery.hrpplan === 'true') ) {

  //         query.plan_component = { $in: [reqQuery.project_type_component, 'hrp_plan'] };
  //         delete query.project_type_component;
  //         delete query.hrpplan;

  //       } else if ( reqQuery.project_type_component && (reqQuery.hrpplan && reqQuery.hrpplan === 'false') ) {

  //         query.plan_component = { $in: [reqQuery.project_type_component], $nin: ['hrp_plan']};
  //         delete query.project_type_component;
  //         delete query.hrpplan;

  //       } else if ( reqQuery.project_type_component && !reqQuery.hrpplan ) {

  //         query.plan_component = {$in: [reqQuery.project_type_component]};
  //         delete query.project_type_component;

  //       } else if ( !reqQuery.project_type_component && (reqQuery.hrpplan && reqQuery.hrpplan === 'true') ) {

  //         query.plan_component = {$in: ['hrp_plan']};
  //         delete query.hrpplan;

  //       } else if ( !reqQuery.project_type_component && (reqQuery.hrpplan && reqQuery.hrpplan === 'false') ) {
  //         query.plan_component = {$nin: ['hrp_plan']};
  //         delete query.hrpplan;
  //       }

  //       //activity type filter from 4wplus project plan and activities dashboards
  //       if( reqQuery.activity_type_id ){

  //         query.activity_type = { $elemMatch: { 'activity_type_id': reqQuery.activity_type_id } };
  //         delete query.activity_type_id;

  //       }
  //       // end 4wplus ---

  //       // exclude immap
  //       if (!reqQuery.organization_tag && !reqQuery.project_id) {
  //         query.organization_tag = { '$nin': $nin_organizations };
  //       }

  //       // project_start_date and project_end_date filters
  //       if (reqQuery.project_start_date && reqQuery.project_end_date) {
  //         var ped = new Date(reqQuery.project_end_date);
  //         var psd = new Date(reqQuery.project_start_date);
  //         query.project_start_date = { $lte: ped };
  //         query.project_end_date = { $gte: psd };
  //       }

  //       if (reqQuery.cluster_id) {
  //         // include multicluster projects
  //         query.$or = [{ cluster_id: reqQuery.cluster_id }, { "activity_type.cluster_id": reqQuery.cluster_id }]
  //         delete query.cluster_id
  //       }

  //       // pick props for locations
  //       queryLocations = _.pick(query, ['project_id', 'adminRpcode', 'admin0pcode', 'admin1pcode', 'admin2pcode', 'project_start_date', 'project_end_date', 'organization_tag']);

  //       // use admin1,2 only for locations
  //       delete query.admin1pcode;
  //       delete query.admin2pcode;

  //       queryProject = Object.assign({}, query);

  //       // if query by project id
  //       if ( reqQuery.project_id ) {
  //         queryProject.id = queryProject.project_id;
  //         delete queryProject.project_id;
  //       }

  //   }

  //   var csv = req.param('csv');

  //   // process request pipeline
  //   var pipe = Promise.resolve()
  //     .then(function(){ return actions._getProjectData(queryProject, query, queryLocations) })
  //     .then(function(data){ return actions._addProjectData(data) })
  //     .then(function(data){ return actions._processCollections(data) })
  //     .then(function($project){ return actions._doResponse($project) })
  //     .catch(function(err){ return err === 'NO PROJECT' } , function(err) { return actions._errorNoProjectRes(err) })
  //     .catch(function(err){ return actions._error(err) });

  //   // pipeline actions definitions
  //   var actions = {

  //   _error : function(err){
  //     return res.negotiate(err);
  //   },

  //   _errorNoProjectRes : function(err){
  //     return res.json( 200, { data: "NO PROJECTS" } );
  //   },

  //   _getProjectData : function(queryProject, query, queryLocations){

  //                 // total beneficiaries by project
  //                 var queryBeneficiaries =  new Promise((resolve, reject) => {
  //                   Beneficiaries.native((err, collection) => {
  //                     if (err) reject(err)
  //                     else collection.aggregate([
  //                       {
  //                         $match: query
  //                       },
  //                       { $group:
  //                           { _id: "$project_id",
  //                               total:
  //                                 { $sum:
  //                                     {
  //                                         "$add":  [ { "$ifNull": ["$total_beneficiaries", 0] } ]
  //                                     }
  //                                 },
  //                               totalcluster:
  //                                 { $sum:
  //                                     {
  //                                       $cond: {
  //                                         if: reqQuery.cluster_id,
  //                                         then: { $cond: { if: { $eq: ["$cluster_id", reqQuery.cluster_id] }, then: { "$ifNull": ["$total_beneficiaries", 0] }, else: 0 } },
  //                                         else: { "$ifNull": ["$total_beneficiaries", 0] }
  //                                       }
  //                                     }
  //                                 }
  //                           }
  //                       }
  //                     ]).toArray((err, results) => {
  //                       if (err) reject(err);
  //                       else resolve(results);
  //                     });
  //                   })
  //                 });

  //                 return Promise.props({
  //                   project: Project.find( queryProject ),
  //                   budget: BudgetProgress.find( query ),
  //                   targetbeneficiaries: TargetBeneficiaries.find( query ),
  //                   targetlocations: TargetLocation.find( queryLocations ),
  //                   beneficiaries: queryBeneficiaries,
  //                 })

  //   },

  //   _addProjectData : function(data){

  //     var unique_project_ids = _.uniq(data.project.map(project => project.id));
  //     var unique_organization_ids = _.uniq(data.project.map(project => project.organization_id));

  //     data.documents = Documents.find({ project_id: { $in: unique_project_ids } });
  //     data.organizations = Organization.find({ id: { $in: unique_organization_ids } });

  //     return Promise.props(data)

  //   },

  //   _processCollections : function(data){

  //     // no project found
  //     if ( !data.project.length ) return Promise.reject('NO PROJECT');

  //     //new Projects array to print in the csv
  //      $projectsToPrint = [];

  //     //admin1pcode filter, filter the projects by admin1pcode --- 4wplus
  //     if (queryLocations.admin1pcode) {

  //       async.each(data.project, function (pro) {

  //         const exist2 = _.filter(data.targetlocations, { 'project_id': pro.id });

  //         if (exist2.length > 0) {

  //           $projectsToPrint.push(pro);

  //         }

  //       });

  //     } else {

  //       $projectsToPrint = data.project

  //     }

  //     // all projects
  //     $project = [];

  //     var _comparatorBuilder = this._comparatorBuilder

  //     // populate & sort fields
  //     var uppendDataToProject = function(project, i){

  //                   var projectId = project.id;
  //                   //var i = data.project.indexOf(project);
  //                   // var i = $projectsToPrint.indexOf(project);

  //                   // assemble project data
  //                   $project[i] = project;
  //                   $project[i].project_budget_progress = _.filter(data.budget, { 'project_id' : projectId}) ;
  //                   $project[i].target_beneficiaries = _.filter(data.targetbeneficiaries, { 'project_id' : projectId}) ;
  //                   $project[i].target_locations = _.filter(data.targetlocations,       { 'project_id' : projectId}) ;
  //                   $project[i].documents = _.filter(data.documents,       { 'project_id' : projectId}) ;
  //                   $project[i].total_beneficiaries_arr = _.filter(data.beneficiaries, { '_id': projectId });
  //                   $project[i].total_beneficiaries = $project[i].total_beneficiaries_arr.length ? $project[i].total_beneficiaries_arr[0].total : 0;
  //                   $project[i].total_cluster_beneficiaries = $project[i].total_beneficiaries_arr.length ? $project[i].total_beneficiaries_arr[0].totalcluster : 0;

  //                   $project[i].organization_info = _.filter(data.organizations, { 'id': project.organization_id });

  //                   if($project[i].organization_info.length ){

  //                     $project[i].organization_name = $project[i].organization_info[0].organization_name;

  //                   } else {
  //                     $project[i].organization_name = '';
  //                   };

  //                   // total of target beneficiaries
  //                   $project[i].total_target_beneficiaries = 0;
  //                   $project[i].total_cluster_target_beneficiaries = 0;
  //                   $project[i].target_beneficiaries.forEach(function (tb) {
  //                     var sum = tb.boys + tb.girls + tb.men + tb.women + tb.elderly_men + tb.elderly_women;
  //                     $project[i].total_target_beneficiaries += sum;
  //                     if(reqQuery.cluster_id && tb.cluster_id === reqQuery.cluster_id) {
  //                       $project[i].total_cluster_target_beneficiaries += sum;
  //                     }
  //                   })

  //                   /// order
  //                   $project[i].target_beneficiaries
  //                              .sort(function(a, b){ return a.id.localeCompare( b.id ) });
  //                   $project[i].project_budget_progress
  //                              .sort(function(a, b){ return a.id > b.id });
  //                   $project[i].target_locations
  //                              .sort(function(a, b){
  //                                 if (a.site_type_name){
  //                                   if(a.admin3name){
  //                                     return eval(_comparatorBuilder(['admin1name','admin2name','admin3name','site_type_name','site_name']));
  //                                   } else {
  //                                     return eval(_comparatorBuilder(['admin1name','admin2name','site_type_name','site_name']));
  //                                   }
  //                                 } else {
  //                                     if( a.admin3name){
  //                                       return eval(_comparatorBuilder(['admin1name','admin2name','admin3name','site_name']));
  //                                     } else {
  //                                       return eval(_comparatorBuilder(['admin1name','admin2name','site_name']));
  //                                     }
  //                                   }
  //                   });

  //                   $project[i].project_start_date = moment($project[i].project_start_date).format('YYYY-MM-DD');
  //                   $project[i].project_end_date   = moment($project[i].project_end_date).format('YYYY-MM-DD');
  //                   $project[i].createdAt          = moment( $project[i].createdAt ).format('YYYY-MM-DD');
  //                   $project[i].updatedAt          = moment( $project[i].updatedAt ).format('YYYY-MM-DD');

  //                   baseUrl = req.param('url') ? req.param('url') : req.protocol + '://' + req.host + "/desk/#/cluster/projects/details/";
  //                   $project[i].url = baseUrl + projectId;
  //                   // callback if error or post work can be called here `cb()`;
  //               };

  //     //async.each(data.project, uppendDataToProject);


  //     async.eachOf($projectsToPrint, uppendDataToProject);


  //     return $project;
  //   },

  //   // build a to b localeCompare from array of props
  //   _comparatorBuilder : function(compareObj){
  //       var compareArr = [];
  //       compareObj.forEach( function (criteria, i ) {
  //         compareArr.push('a'+'.'+criteria + '.' + 'localeCompare(b.' + criteria + ')');
  //       });
  //       return compareArr.join('||')
  //   },

  //   // do response
  //   _doResponse : function($project){
  //     if (csv) {


  //       //columns to COL or columns to others countries
  //       if (queryProject.admin0pcode === 'COL') {

  //         // var fields = [ 'cluster', 'organization', 'admin0name', 'id', 'project_status', 'name', 'email', 'phone','project_code','project_title', 'project_description', 'project_start_date', 'project_end_date', 'project_budget', 'project_budget_currency','urls_list', 'project_gender_marker','project_donor_list' , 'implementing_partners_list','componente_humanitario','plan_hrp_plan','componente_construccion_de_paz','componente_desarrollo_sostenible','plan_interagencial','componente_flujos_migratorios','plan_rmrp_plan','strategic_objectives_list', 'beneficiary_type_list','activity_type_list','target_beneficiaries_list','undaf_desarrollo_paz_list','acuerdos_de_paz_list','dac_oecd_development_assistance_committee_list','ods_objetivos_de_desarrollo_sostenible_list', 'target_locations_list','createdAt']

  //         // fieldNames = [ 'Cluster', 'Organización',  'País', 'Project ID', 'Estado del Proyecto', 'Punto Focal', 'Email', 'Teléfono', 'Código del Proyecto','Título del Proyecto',  'Descripción del Proyecto', 'Fecha Inicio del Proyecto', 'Fecha Finalización del Proyecto', 'Presupuesto del Proyecto', 'Moneda de Presupuesto del Proyecto','Soporte Documentos del Proyecto','Marcador de Género - GAM', 'Donantes del Proyecto'  ,  'Socios Implementadores', 'Componente Humanitario', 'Plan HRP','Componente Construcción de Paz','Componente Desarrollo Sostenible','Plan Interagencial','Componente Flujos Migratorios','Plan RMRP','Strategic Objectives', 'Beneficiary types','Tipos de Actividades','Beneficiarios Objetivo', 'Undaf Desarrollo Paz','Acuerdos de Paz','DAC - OECD Development Assistance Committee','ODS - Objetivos de Desarrollo Sostenible','Ubicaciones Objetivo','Fecha Creación'];
  //         var fields = ['cluster', 'organization', 'organization_name', 'admin0name', 'id', 'project_status', 'name', 'email', 'phone', 'project_code', 'project_title', 'project_description', 'project_start_date', 'project_end_date', 'project_budget', 'project_budget_currency', 'urls_list', 'project_gender_marker', 'project_donor_list', 'implementing_partners_list', 'strategic_objectives_list', 'beneficiary_type_list', 'activity_type_list', 'target_beneficiaries_list', 'plan_component_list', 'undaf_desarrollo_paz_list', 'acuerdos_de_paz_list', 'dac_oecd_development_assistance_committee_list', 'ods_objetivos_de_desarrollo_sostenible_list', 'target_locations_list', 'createdAt'];

  //         var fieldNames = ['Cluster', 'Organization', 'Organization Name', 'Country', 'Project ID', 'Project Status', 'Focal Point', 'Email', 'Phone', 'Project Organization Code', 'Project Title', 'Project Description', 'Project Start Date', 'Project End Date', 'Project Budget', 'Project Budget Currency', 'Project Documents', 'Gender Marker - GAM', 'Project Donors', 'Implementing Partners', 'Strategic Objectives', 'Beneficiary types', 'Activity types', 'Target Beneficiaries', 'Componentes de Respuesta', 'Undaf Desarrollo Paz', 'Acuerdos de Paz', 'DAC - OECD Development Assistance Committee', 'ODS - Objetivos de Desarrollo Sostenible', 'Target Locations', 'Creation Date'];



  //       } else {
  //         var fields = ['cluster', 'organization', 'admin0name', 'id', 'project_status', 'project_details_list', 'name', 'email', 'phone', 'project_title', 'project_description', 'project_hrp_code', 'project_start_date', 'project_end_date', 'project_budget', 'project_budget_currency', 'project_donor_list', 'implementing_partners_list', 'strategic_objectives_list', 'beneficiary_type_list', 'hrp_beneficiary_type_list', 'activity_type_list', 'target_beneficiaries_list', 'target_locations_list', 'createdAt', 'updatedAt', 'total_target_beneficiaries', 'total_beneficiaries', 'url'];
  //         var fieldNames = ['Cluster', 'Organization', 'Country', 'Project ID', 'Project Status', 'Project Details', 'Focal Point', 'Email', 'Phone', 'Project Title', 'Project Description', 'HRP Project Code', 'project_start_date', 'project_end_date', 'Project Budget', 'Project Budget Currency', 'Project Donors', 'Implementing Partners', 'Strategic Objectives', 'Beneficiary types', 'HRP Beneficiary Type', 'Activity types', 'Target Beneficiaries', 'Target locations', 'Created', 'Last Updated', 'Planned Beneficiaries', 'Services to Beneficiaries', 'URL'];
  //         // add cluster only totals
  //         if (reqQuery.cluster_id) {
  //           fields.push('total_cluster_target_beneficiaries', 'total_cluster_beneficiaries');
  //           fieldNames.push(reqQuery.cluster_id.toUpperCase() + ' Planned Beneficiaries', reqQuery.cluster_id.toUpperCase() + ' Services to Beneficiaries');
  //         }
  //       }

  //       $project = this._projectJson2Csv($project);

  //       json2csv({ data: $project, fields: fields, fieldNames: fieldNames}, function( err, csv ) {
  //         if ( err ) return res.negotiate( err );
  //         return res.json( 200, { data: csv } );
  //       });

  //     } else {
  //     // return Project
  //     return res.json( 200, $project.length===1?$project[0]:$project );
  //     }
  //   },

  //   // flatten subdocuments values
  //   // takes array of projects
  //   _projectJson2Csv : function(projects){

  //       var setKey = function(p, keyfrom, keyto, array, removeDuplicates){
  //         if ( p.hasOwnProperty(keyfrom)&&Array.isArray(p[keyfrom]) ) {
  //               var pa = [];
  //               p[keyfrom].forEach( function( p,i ){
  //                 if(p&&typeof p==='object'&&p!==null){
  //                   var ka = [];
  //                   var row = array.forEach(function( v,i ){
  //                     if (v.substring(0,4)==='key:'){
  //                       if (p.hasOwnProperty(v.substring(4))){
  //                         ka.push( v.substring(4)+':'+p[v.substring(4)] );
  //                       }
  //                     }else{
  //                       if (p.hasOwnProperty(v)) ka.push( p[v] );
  //                     }
  //                   });
  //                   var kl = ka.join(',');
  //                   if (p && (!removeDuplicates || (removeDuplicates && !pa.includes(kl)))) pa.push(kl);
  //                 } //else if (p) pa.push(p);
  //                   //if old no obj array benef format
  //               });
  //             p[keyto] = pa.join('; ');
  //           }
  //         };

  //         //to COL: change true, false values in components and plan columns

  //         var changevalues = function(val){
  //           var object;

  //           if(val == undefined){
  //             object = "";
  //           }else if(val == false){
  //             object = "NO";
  //           }else if(val == true){
  //             object = "SI";
  //           }
  //           return object;
  //         };

  //         //function to set urls as string

  //         var seturls = function (docs){

  //           var urls = [];

  //           docs.forEach(function (d,i){

  //             d.url = 'https://drive.google.com/uc?export=download&id='+d.fileid;
  //             urls.push(d.url);

  //           });
  //           urlsfinal = urls.join('; ');
  //           return urlsfinal;

  //         }


  //       // takes subdocuments key and produces flattened list of its values ->key_list
  //       var updateJson = function(project){
  //           setKey( project, 'implementing_partners','implementing_partners_list',['organization_name'] );
  //           setKey( project, 'strategic_objectives', 'strategic_objectives_list', ['objective_type_name', 'objective_type_description'] );
  //           setKey( project, 'target_beneficiaries', 'beneficiary_type_list', ['beneficiary_type_name'], true );
  //           // setKey( project, 'project_donor', 'project_donor_list', ['project_donor_name'] );
  //           setKey( project, 'activity_type', 'activity_type_list', ['cluster', 'activity_type_name'] );
  //           setKey( project, 'inter_cluster_activities', 'inter_cluster_activities_list', ['cluster'] );

  //           //values in columns to COL or values to others countries

  //           if(queryProject.admin0pcode == 'COL'){

  //             project.urls_list = seturls(project.documents);

  //             project.target_beneficiaries.forEach(function(tb,i){

  //               if(!tb.beneficiary_category_name){
  //                 tb.beneficiary_category_name = "Otros";
  //               }

  //               if(!tb.unit_type_id){
  //                 tb.unit_type_id = "Sin Información";
  //               }

  //             });

  //             project.target_locations.forEach(function(tb,i){

  //             if(!tb.site_implementation_name){
  //               tb.site_implementation_name = "Otro";
  //             }
  //            });

  //              if(project.plan_component){
  //                project.plan_component_list = project.plan_component.join('; ');
  //              }






  //           setKey( project, 'project_donor', 'project_donor_list', ['project_donor_name', 'key:project_donor_budget'] );
  //           setKey( project, 'target_beneficiaries', 'target_beneficiaries_list', ['key:beneficiary_type_name', 'key:beneficiary_category_name', 'key:activity_type_name', 'key:activity_description_name','key:indicator_name','key:strategic_objective_name','key:strategic_objective_description','key:sector_objective_name','key:sector_objective_description','key:delivery_type_name',
  //            'key:units', 'key:cash_amount', 'key:households', 'key:sessions', 'key:families', 'key:boys_0_5','key:boys_6_11', 'key:boys_12_17', 'key:girls_0_5', 'key:girls_6_11','key:girls_12_17', 'key:men', 'key:women', 'key:elderly_men', 'key:elderly_women', 'key:total_male', 'key:total_female','key:unit_type_id' ]  );
  //           setKey( project, 'target_locations', 'target_locations_list', ['key:admin0name', 'key:admin1name','key:admin1pcode','key:admin2name','key:admin2pcode','key:site_implementation_name','key:site_type_name','key:site_name','key:admin2lng','key:admin2lat','key:name', 'key:email']  );

  //           setKey(project, 'undaf_desarrollo_paz','undaf_desarrollo_paz_list', ['code','name_tag','description'] );
  //           setKey(project, 'acuerdos_de_paz','acuerdos_de_paz_list',['code','name_tag','description']);
  //           setKey(project, 'dac_oecd_development_assistance_committee','dac_oecd_development_assistance_committee_list',['code','name_tag','description']);
  //           setKey(project, 'ods_objetivos_de_desarrollo_sostenible','ods_objetivos_de_desarrollo_sostenible_list',['code','name_tag','description']);

  //           }else{
  //               setKey( project, 'project_donor', 'project_donor_list', ['project_donor_name'] );
  //               setKey( project, 'project_details', 'project_details_list', ['project_detail_name'] );

  //               setKey( project, 'target_beneficiaries', 'target_beneficiaries_list', ['beneficiary_type_name', 'beneficiary_category_name', 'activity_type_name', 'activity_description_name','indicator_name','strategic_objective_name','strategic_objective_description','sector_objective_name','sector_objective_description','delivery_type_name',
  //           'key:units', 'key:cash_amount', 'key:households', 'key:sessions', 'key:families', 'key:boys', 'key:girls', 'key:men', 'key:women', 'key:elderly_men', 'key:elderly_women', 'key:unit_type_id' ]  );
  //                setKey( project, 'target_locations', 'target_locations_list', ['admin0name', 'admin1name','key:admin1pcode','admin2name','key:admin2pcode','site_implementation_name','site_type_name','site_name','key:admin2lng','key:admin2lat', 'key:conflict','key:name', 'email']  );
  //             setKey(project, 'target_beneficiaries', 'hrp_beneficiary_type_list', ['hrp_beneficiary_type_name'], true);

  //           }
  //           // setKey( project, 'target_beneficiaries', 'target_beneficiaries_list', ['beneficiary_type_name', 'beneficiary_category_name', 'activity_type_name', 'activity_description_name','indicator_name','strategic_objective_name','strategic_objective_description','sector_objective_name','sector_objective_description','delivery_type_name',
  //           // 'key:units', 'key:cash_amount', 'key:households', 'key:sessions', 'key:families', 'key:boys', 'key:girls', 'key:men', 'key:women', 'key:elderly_men', 'key:elderly_women', 'key:unit_type_id' ]  );
  //           // setKey( project, 'target_locations', 'target_locations_list', ['admin0name', 'admin1name','key:admin1pcode','admin2name','key:admin2pcode','site_implementation_name','site_type_name','site_name','key:admin2lng','key:admin2lat', 'key:conflict','key:name', 'email']  );

  //       };

  //       async.each(projects, updateJson);

  //       return projects;
  //       }
  //     }
  // },

  // get project details by id
  getProjectById: function(req, res){

    // request input
    if (!req.param('id')) {
      return res.json(401, { err: 'id required!' });
    }

    // project for UI
    var project = {
      // target_beneficiaries: [],
      // target_locations: [],
    };
    // var target_beneficiaries;
    // var target_locations;

    // promise
    Promise.all([
      CustomProject.find( { id: req.param('id') } ),
      // TargetBeneficiaries.find( { project_id: req.param('id') } ),
      // TargetLocation.find( { project_id: req.param('id') } )
    ])
    .catch( function( err ) {
      return res.negotiate( err );
    })
    .then( function( result ) {

      // gather results
      if ( result[ 0 ][ 0 ] ) {
        project = result[ 0 ][ 0 ];
        // target_beneficiaries = result[ 1 ];
        // target_locations = result[ 2 ];
      }

      // create project
      // project.target_beneficiaries = target_beneficiaries ? target_beneficiaries : [];
      // project.target_locations = target_locations ? target_locations : [];

      // return Project
      return res.json( 200, project );

    });

  },

  // set project details ( UNDER CONSTRUCTION )
  setProjectById: function(req, res) {

    // request input
    if (!req.param('project')) {
      return res.json(401, { err: 'project required!' });
    }

    // get project
    var project = req.param('project');
    // var target_beneficiaries = req.param('project').target_beneficiaries;
    // var target_locations = req.param('project').target_locations;

    // update project status if new
    if( project.project_status === 'new' ){
      project.project_status = 'active';
    }

    // find project
    var findProject = { project_id: project.id }

    // copy project
    var project_copy = JSON.parse( JSON.stringify( project ) );
    delete project_copy.id;
    delete project_copy.target_beneficiaries;
    delete project_copy.target_locations;
    delete project_copy.createdAt;
    delete project_copy.updatedAt;
    delete project_copy.admin1pcode;
    delete project_copy.admin2pcode;
    delete project_copy.admin3pcode;

    var project_copy_no_cluster = JSON.parse( JSON.stringify( project_copy ) );
    delete project_copy_no_cluster.cluster;
    delete project_copy_no_cluster.cluster_id;


    // promise
    Promise.all([
      CustomProject.updateOrCreate( { id: project.id }, project ),
      // budget_progress, target_beneficiaries, target_locations, report, location ( below )
      CustomBeneficiaries.update( findProject, project_copy_no_cluster ),
    ])
    .catch( function( err ) {
      return res.negotiate( err );
    })
    .then( function( update_result ) {

      // project update
      var project_update = CustomProjectController.set_result( update_result[ 0 ] );
      // update project_id (for newly created projects)
      findProject = { project_id: project_update.id }
      // project_update.target_beneficiaries = [];
      // project_update.target_locations = [];

      // reports holder
      var reports = [];

      // async
      var target_locations_counter = 0;
      var target_reports_counter = 0;
      var delete_reports_counter = 0;
      var async_counter = 0;
      var async_requests = 1;

      // return the project_update
      var returnProject = function(err) {
        if (err) return res.negotiate(err);
        // make locations
        if ( target_locations_counter && target_reports_counter ) {
          target_locations_counter = 0;
          target_reports_counter = 0;
          setLocations();
        }
        if ( delete_reports_counter ) {
          delete_reports_counter = 0
          removeReports();
        }
        // ++
        async_counter++;
        if ( async_counter === async_requests ) {
          return res.json( 200, project_update );
        }
      }

      // // ASYNC REQUEST
      // // async loop target_beneficiaries
      // async.eachOf( target_beneficiaries, function ( d, ib, next ) {
      //   var t_beneficiary = _under.extend( {}, d, project_copy_no_cluster );
      //   TargetBeneficiaries.updateOrCreate( findProject, { id: t_beneficiary.id }, t_beneficiary ).exec(function( err, result ){
      //     project_update.target_beneficiaries[ib] = ProjectController.set_result( result );
      //     next(err);
      //   });
      // }, function ( err ) {
      //   returnProject(err);
      // });

      // // ASYNC REQUEST
      // // async loop target_locations
      // async.eachOf( target_locations, function ( d, il, next ) {
      //   var t_location = _under.extend( {}, d, project_copy_no_implementing_partners, {
      //     name: d.name,
      //     position: d.position,
      //     phone: d.phone,
      //     email: d.email,
      //     username: d.username
      //   } );
      //   TargetLocation.updateOrCreate( findProject, { id: t_location.id }, t_location ).exec(function( err, result ){
      //     project_update.target_locations[il] = ProjectController.set_result( result );
      //     next(err);
      //   });
      // }, function ( err ) {
      //   if ( err ) return returnProject(err);
      //   target_locations_counter++;
      //   returnProject();
      // });

      // generate reports for duration of project_update
      CustomProjectController.getProjectReports( project_update, function( err, project_reports ){
        // err
        if (err) return returnProject(err);
        // ASYNC REQUEST 1
        // async loop project_reports
        async.each( project_reports, function ( d, next ) {
          // Report.updateOrCreate( findProject, { project_id: project_update.id, report_month: d.report_month, report_year: d.report_year }, d ).exec(function( err, result ){
          CustomReport.findOne( { project_id: project_update.id, report_month: d.report_month, report_year: d.report_year } ).then( function ( report ){
            if( !report ) { report = { id: null } }
            if ( report ) { d.report_status = report.report_status; d.report_active = report.report_active, d.updatedAt = report.updatedAt }
            if ( d.project_status === 'complete' ) d.report_status = 'complete';
            // Report update or create
            CustomReport.updateOrCreate( findProject, { id: report.id }, d ).exec(function( err, result ){
              reports.push( CustomProjectController.set_result( result ) );
              next(err);
            });
          });
        }, function ( err ) {
          if ( err ) return returnProject(err);
          target_reports_counter++;
          returnProject();
        });

      });

      // ASYNC REQUEST
      var removeReports = async function () {
        // construct find query
        const lt_project_start_date = new Date(moment(project_update.project_start_date).subtract(1, 'month').endOf('month'))
        const gt_project_end_date = new Date(moment(project_update.project_end_date).add(1, 'month').startOf('month'))

        const find = {
          project_id: project_update.id,
          $or: [
            {
              reporting_period: { $lte: new Date(lt_project_start_date) }
            },
            {
              reporting_period: { $gte: new Date(gt_project_end_date) }
            }
          ]
        };

        try {
          // find reports outside of project dates
          const reports = await CustomReport.find(find, { select: ['id'] });
          const uniq_reports = [...new Set(reports.map(b => b.id))];

          const beneficiaries = await CustomBeneficiaries.find({ report_id: { $in: uniq_reports } }, { select: ['report_id'] })
          const uniq_reports_with_beneficiaries = [...new Set(beneficiaries.map(b => b.report_id))];

          const reports_to_delete = _.difference(uniq_reports, uniq_reports_with_beneficiaries);

          await Promise.all([
            CustomReport.destroy({ id: { $in: reports_to_delete } }),
            CustomLocation.destroy({ report_id: { $in: reports_to_delete } }),
          ]);

          returnProject(null);

        } catch (err) {
          returnProject(err);
        }

      };

      // // locations
      // var setLocations = function() {

      //   // generate locations for each report ( requires report_id )
      //   ProjectController.getProjectReportLocations( reports, project_update.target_locations, function( err, locations ){

      //     // err
      //     if ( err ) return returnProject(err);

      //     // ASYNC REQUEST
      //     // async loop project_update locations
      //     async.each( locations, function ( d, next ) {
      //       Location.findOne( { project_id: project_update.id, target_location_reference_id: d.target_location_reference_id, report_month: d.report_month, report_year: d.report_year } ).then( function ( location ){
      //         if( !location ) { location = { id: null } }
      //         if ( d.project_status === 'complete' ) d.report_status = 'complete';
      //         // relations set in getProjectReportLocations
      //         Location.updateOrCreate( findProject, { id: location.id }, d ).exec(function( err, result ){
      //           // no need to return locations
      //           next();
      //         });
      //       });
      //     }, function ( err ) {
      //       if ( err ) return returnProject(err);
      //       delete_reports_counter++;
      //       returnProject();
      //     });

      //   });
      // }

    });

  },

  // // remove target beneficiary
  // removeBeneficiaryById: function(req, res) {
  //   // request input
  //   if ( !req.param( 'id' ) ) {
  //     return res.json({ err: true, error: 'id required!' });
  //   }

  //   var id = req.param( 'id' );

  //   // target beneficiaries
  //   TargetBeneficiaries
  //     .update( { id: id }, { project_id: null } )
  //     .exec( function( err, result ){

  //       // return error
  //       if ( err ) return res.json({ err: true, error: err });

  //       // return Project
  //       return res.json( 200, { msg: 'Success!' } );

  //     });
  // },

  // // remove target location
  // removeLocationById: async function( req, res ) {

  //   // request input
  //   if (!req.param('id')) {
  //     return res.json({ err: true, error: 'id required!' });
  //   }

  //   // get id
  //   var id = req.param('id');

  //   try {
  //     // find locations containing beneficiaries first
  //     const beneficiaries = await Beneficiaries.find({ target_location_reference_id: id }, { select: ['location_id'] })
  //     const uniq_locations = [...new Set(beneficiaries.map(b => b.location_id))];

  //     await Promise.all([
  //       TargetLocation.destroy({ id: id }),
  //       Location.destroy({ target_location_reference_id: id, id: { $nin: uniq_locations } })
  //     ])

  //     return res.json(200, { msg: 'Success!' });

  //   } catch (err) {
  //     return res.negotiate(err);
  //   }

  // },

  // delete project
  deleteProjectById: function(req, res) {

    // request input
    if ( !req.param( 'project_id' ) ) {
      return res.json( 401, { err: 'project_id required!' } );
    }

    // project id
    var project_id = req.param( 'project_id' );

    // promise
    Promise.all([
      CustomProject.destroy( { id: project_id } ),
      // TargetBeneficiaries.destroy( { project_id: project_id } ),
      // TargetLocation.destroy( { project_id: project_id } ),
      CustomReport.destroy( { project_id: project_id } ),
      CustomLocation.destroy( { project_id: project_id } ),
      CustomBeneficiaries.destroy( { project_id: project_id } )
    ])
    .catch( function( err ) {
      return res.negotiate( err );
    })
    .then( function( result ) {

      // return
      return res.json( 200, { msg: 'Project ' + project_id + ' has been deleted!' } );

    });
  },


  // request as csv
	getProjectCsv: function( req, res ) {

    // request input
    if ( !req.param( 'project_id' ) ) {
      return res.json( 401, { err: 'project_id required!' });
    }

    let { fields, fieldNames } = FieldsService.getReportCsvFields();

    // beneficiaries
    CustomBeneficiaries
      .find( )
      .where( { project_id: req.param( 'project_id' ) } )
      .exec(function( err, response ){

        // error
        if ( err ) return res.negotiate( err );

        // format  / sum
        response.forEach(function( d, i ){

          d.implementing_partners = Utils.arrayToString(d.implementing_partners, "organization");
          d.programme_partners = Utils.arrayToString(d.programme_partners, "organization");
          d.donors = Utils.arrayToString(d.project_donor, "organization");

          response[i].report_month = moment( response[i].reporting_period ).format( 'MMMM' );

          d.updatedAt = moment(d.updatedAt).format('YYYY-MM-DD HH:mm:ss');
          d.createdAt = moment(d.createdAt).format('YYYY-MM-DD HH:mm:ss');

        });

        // return csv
        json2csv({ data: response, fields: fields, fieldNames: fieldNames }, function( err, csv ) {

          // error
          if ( err ) return res.negotiate( err );

          // success
          return res.json( 200, { data: csv } );

        });

      });

  },

  // update beneficiaries by id ( cluster admin correction )
  setBeneficiariesById: function (req, res) {
    // request input
    if (!req.param('beneficiaries') || !Array.isArray(req.param('beneficiaries'))) {
      return res.json(401, { err: 'beneficiaries array required!' });
    }
    let beneficiaries = req.param('beneficiaries');
    let beneficiaries_update = [];

    // return res
    let returnBeneficiaries = function (err) {
      if (err) return res.json(500, { err: err });
      return res.json(200, { beneficiaries: beneficiaries_update });
    }

    async.eachOf(beneficiaries, function (b, ib, next) {
      delete b.updatedAt;
      delete b.createdAt;
      if (b.id) {
        let id = b.id;
        CustomBeneficiaries.update({ id: b.id }, b).exec(function (err, result) {
          if (err) return next(err);
          let resultObj = Utils.set_result(result);
          if (resultObj) {
            resultObj.updated = true
            beneficiaries_update[ib] = resultObj;
          } else {
            b.updated = false
            b.id = id;
            beneficiaries_update[ib] = b;
          }
          next();
        });
      } else {
        b.updated = false
        beneficiaries_update[ib] = b;
        next();
      }
    }, function (err) {
      returnBeneficiaries(err);
    });
  },

  setBeneficiaryById: async function (req, res) {
    // request input
    let beneficiary = req.param('beneficiary');

    if (!beneficiary) {
      return res.json(401, { err: 'beneficiary required!' });
    }

    if (!beneficiary.id) {
      return res.json(401, { err: 'id required!' });
    }

    // check if user can modify record
    let edit = await AuthService.canEditRecord(req.token, 'CustomBeneficiaries', beneficiary.id);
    if (edit.err){
      return res.json(edit.code, { err: err.err });
    }

    delete beneficiary.updatedAt;
    delete beneficiary.createdAt;
    // update of next fields not allowed
    delete beneficiary.adminRpcode;
    delete beneficiary.admin0pcode;
    delete beneficiary.organization;
    delete beneficiary.organization_id;
    delete beneficiary.organization_tag;
    delete beneficiary.report_id;
    delete beneficiary.project_id;
    delete beneficiary.location_id;


    if (beneficiary.id) {
      CustomBeneficiaries.update({ id: beneficiary.id }, beneficiary).exec(function (err, result) {
        if (err) return res.negotiate(err);
        result = Utils.set_result(result);
        if (!result) {
          return res.json(404, { err: 'Beneficiary with such id not found!' });
        }
        return res.json(200, { beneficiary: result });
      });
    } else {
      return res.json(401, { err: 'id required!' });
    }

  },

};

module.exports = CustomProjectController;
