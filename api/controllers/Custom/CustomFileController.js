/**
 * CustomFileController
 *
 * @description :: Server-side logic for managing files
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */


var fs = require('fs')
var os = require('os');
var path = require('path');


module.exports = {

  // return array of documents meta by query params
	listCustomFiles: function(req,res) {

		params = this._getParams( req, res )

		if (params){
			filter = this._getFilter( params )
			CustomFiles.find( filter ).sort('updatedAt DESC')
					.then( docs => res.json( 200, docs ))
					.catch( err => res.negotiate(err) )
		}
  },

  _getParams: function( req, res ){

		allowed_params = [ 'project_id','report_id','organization_tag','cluster_id','admin0pcode','adminRpcode', 'start_date', 'end_date', 'type', 'report_type_id' ];

		// types of documents
		types = { monthly:'monthly', project: 'project', weekly: 'weekly', custom: 'custom', all: 'all' };

		// query params value for all docs
		ALL   = 'all' ;

		var params = req.allParams();
		params.types = types;
		params.ALL = ALL;

		// // at least 1 param present
		// if (!_.keys(params).filter(v=>allowed_params.includes(v)).length){
		// 	res.json(401, { error : { message: allowed_params.join(', ') + ' required!' } });
		// 	return false
		// } else if ( params.type && !Object.values(types).includes(params.type) ) {
		// 	res.json(401, { error : { message: Object.values(types).join(', ') + ' types required!' } });
		// 	return false
		// } else if ( params.type && !Date.parse(params.start_date) || !Date.parse(params.end_date) ) {
		// 	res.json(401, { error : { message: 'start_date, end_date required!' } });
		// 	return false
		// } else {

			// check here if user allowed for action with incoming query params
			// TODO: middleware if the action allowed

			return params
		// }
  },

  // construct filter for documents
	_getFilter: function( params ){

		var filter = {
      report_type_id: params.report_type_id ? params.report_type_id : null,
			adminRpcode: params.adminRpcode ? params.adminRpcode.toUpperCase() : null,
			admin0pcode: params.admin0pcode ? params.admin0pcode.toUpperCase() : null,
			cluster_id: params.cluster_id ? params.cluster_id : null,
			organization_tag: params.organization_tag ? params.organization_tag : null,
			project_id: params.project_id ? params.project_id : null,
			report_id: params.report_id ? params.report_id : null,
			reporting_period: params.type===params.types.monthly && params.start_date && params.end_date ?
								{ '>=' : new Date( params.start_date ), '<=' : new Date( params.end_date ) } : null,
			project_start_date: params.type===params.types.project && params.start_date && params.end_date ?
								{ '<=' : new Date( params.end_date ) } : null,
			project_end_date: params.type===params.types.project && params.start_date && params.end_date ?
								{ '>=' : new Date( params.start_date ) } : null,
			createdAt: params.type===params.types.all ?
								{ '>=' : new Date( params.start_date ), '<=' : new Date( params.end_date ) } : null
		}

		params.ALL_UC = params.ALL.toUpperCase()
		// remove key:value from filter query if value is null or all
		filter = _.omit(filter, (v,k,o)=>v===null||v===params.ALL||v===params.ALL_UC)

		return filter
	}

};
