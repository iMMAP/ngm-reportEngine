/**
* User.js
*
* @description :: TODO: You might write a short summary of how this model works and what it represents here.
* @docs        :: http://sailsjs.org/#!documentation/models
*/

module.exports = {

	// connection
	connection: 'ngmHealthClusterServer',

	// strict schema
	schema: true,

	// attributes
	attributes: {
		// region/country id
    adminRpcode: {
			type: 'string',
			required: true
    },
    adminRname: {
			type: 'string',
			required: true
    },
    admin0pcode: {
			type: 'string',
			required: true
    },
    admin0name: {
			type: 'string',
			required: true
    },
		organization_id: {
			type: 'string',
			required: true
		},
		organization_tag: {
			type: 'string',
			required: true
		},
		organization: {
			type: 'string',
			required: true
		},
		organization_name: {
			type: 'string',
			required: true
		},
		// implementing partners
		implementing_partners_checked: {
			type: 'boolean',
			defaultsTo: false
		},
		implementing_partners: {
			type: 'array'
		},
		// Programme partners
		programme_partners_checked: {
			type: 'boolean',
			defaultsTo: false
		},
		programme_partners: {
			type: 'array'
		},
		undaf_desarrollo_paz:{
			type: 'array'
		},
		acuerdos_de_paz:{
			type: 'array'
		},

		dac_oecd_development_assistance_committee:{
			type:'array'
		},
		ods_objetivos_de_desarrollo_sostenible:{
			type:'array'
		},
		cluster_id: {
			type: 'string',
			required: true
		},
		cluster: {
			type: 'string',
			required: true
		},
		name: {
			type: 'string',
			required: true
		},
		position: {
			type: 'string',
			required: true
		},
		phone: {
			type: 'string',
			required: true
		},
		email: {
			type: 'string',
			unique: true,
			required: true
		},
		username: {
			type: 'string',
			required: true
		},

		// add reference to Target beneficiaries
		// target_beneficiaries: {
		// 	collection: 'targetbeneficiaries',
		// 	via: 'project_id'
		// },
		// // add reference to Target Locations
		// target_locations: {
		// 	collection: 'targetlocation',
		// 	via: 'project_id'
  	// },
		// // add reference to Budget Progress
		// project_budget_progress: {
		// 	collection: 'budgetprogress',
		// 	via: 'project_id'
		// },

		location_groups_check: {
			type: 'boolean'
		},

		location_groups: {
			type: 'array'
		},

		location_grouping_by:{
			type: 'string'
		},

		// project
		project_acbar_partner: {
			type: 'boolean'
		},
		project_hrp_project: {
			type: 'boolean'
		},
		project_hrp_code: {
			type: 'string',
			required: true
		},

		//Response components COL
		plan_component: {
			type: 'array'
		},
		/*

		humanitarian_component:{
			type:'boolean'
		},

		construccion_de_paz_component:{
			type:'boolean'
		},

		desarrollo_sostenible_component:{
			type:'boolean'
		},

		flujos_migratorios_component:{
			type:'boolean'
		},

		//plan hrp/rmrp/undaf COL
		hrp_plan: {
			type: 'boolean'
		},
		rmrp_plan: {
			type: 'boolean'
		},
		interagencial_plan: {
			type: 'boolean'
		},
		*/

		project_status: {
			type: 'string',
			defaultsTo: 'active'
		},
		project_title: {
			type: 'string',
			required: true
		},
		project_description: {
			type: 'string',
			required: true
		},
		project_start_date: {
			type: 'date',
			required: true
		},
		project_end_date: {
			type: 'date',
			required: true
		},
		project_budget: {
			type: 'float'
		},
		project_budget_currency: {
			type: 'string',
			required: true
		},
		mpc_purpose: {
			type: 'array'
		},
		mpc_purpose_cluster_id: {
			type: 'string'
    },
    mpc_purpose_type_id: {
			type: 'string'
    },
    mpc_purpose_type_name: {
			type: 'string'
		},
		inter_cluster_activities: {
			type: 'array'
		},
		project_donor: {
			type: 'array'
		},
		project_gender_marker:{
			type:'string'
		},
		activity_type: {
			type: 'array',
			required: true
		},
		activity_description: {
			type: 'array'
		},

		// SOs
		strategic_objectives: {
			type: 'array'
		},

		// project_details
		project_details:{
			type: 'array'
		},



		private:{
			type: 'boolean',
			defaultsTo: false
		},



		/*********** 2016 *************/
		project_code: {
			type: 'string'
		},
		project_type: {
			type: 'array'
		},
		project_type_other: {
			type: 'string'
		},
		project_donor_other: {
			type: 'string'
		},
		activity_description_other: {
			type: 'string'
		},
		report_type_id:{
			type: 'string',
			defaultsTo: 'monthly'
		}

	},

  // updateOrCreate
    // http://stackoverflow.com/questions/25936910/sails-js-model-insert-or-update-records
  updateOrCreate: function( criteria, values ){
    var self = this; // reference for use by callbacks

    // if exists
    if( values.id ){
      return self.update( criteria, values );
    }else{
      return self.create( values );
    }    

  }

};
