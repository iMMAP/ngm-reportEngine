/**
* CustomList.js
*
* @description :: Collection for storing lists
* @docs        :: http://sailsjs.org/#!documentation/models
*/

module.exports = {

  // connection
  connection: 'ngmCustomReportsServer',

  // strict schema
  schema: false,

  // attributes
  attributes: {
    // default
    // region/country
    adminRpcode: {
      type: 'string',
      // required: true
    },
    adminRname: {
      type: 'string',
      // required: true
    },
    admin0pcode: {
      type: 'string',
      // required: true
    },
    admin0name: {
      type: 'string',
      // required: true
    },
    organization_id: {
      type: 'string',
      // required: true
    },
    organization_tag: {
      type: 'string',
      // required: true
    },
    organization: {
      type: 'string',
      // required: true
    },
    cluster_id: {
      type: 'string'
    },
    cluster: {
      type: 'string'
    },
    cluster_ids: {
      type: 'array'
    },
    clusters: {
      type: 'array'
    },

    name: {
      type: 'string',
      // required: true
    },
    position: {
      type: 'string',
      // required: true
    },
    phone: {
      type: 'string',
      // required: true
    },
    email: {
      type: 'string',
      // unique: true,
      // required: true
    },
    username: {
      type: 'string',
      // required: true
    },


    // global/project
    list_type_id: {
      type: 'string',
      required: true
    },
    list_type_name: {
      type: 'string',
      // required: true
    },

    reporting_type_id: {
      type: 'string',
      // required: true
    },
    reporting_type_name: {
      type: 'string',
      // required: true
    },

    list_id: {
      type: 'string',
      required: true
    },

    list_name: {
      type: 'string',
      // required: true
    },

    status: {
      type: 'string',
      defaultsTo: 'active'
    },

    start_date: {
			type: 'date',
		},
		end_date: {
			type: 'date',
    },

    list: {
      type: 'json',
      required: 'true'
    }

  },

  // updateOrCreate
  // http://stackoverflow.com/questions/25936910/sails-js-model-insert-or-update-records
  updateOrCreate: function( criteria, values ){
    var self = this; // reference for use by callbacks
    // if exists
    if (values.id) {
      return self.update(criteria, values);
    } else {
      return self.create(values);
    }

  }

};

