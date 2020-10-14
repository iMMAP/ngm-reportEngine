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


  },

  updateOrCreate: function( criteria, values ){
    var self = this;
    if (values.id) {
      return self.update(criteria, values);
    } else {
      return self.create(values);
    }

  }

};

