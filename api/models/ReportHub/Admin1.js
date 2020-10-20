/**
* User.js
*
* @description :: TODO: You might write a short summary of how this model works and what it represents here.
* @docs        :: http://sailsjs.org/#!documentation/models
*/

module.exports = {

	// connection
	connection: 'ngmReportHubServer',

	// strict schema
	schema: false,

  updateOrCreate: function (criteria, values) {
    var self = this;
    if (values.id) {
      return self.update(criteria, values);
    } else {
      return self.create(values);
    }
  },

	// attributes
	// attributes: {
	// 	prov_code: {
	// 		type: 'integer',
	// 		required: true
	// 	},
	// 	prov_name: {
	// 		type: 'string',
	// 		required: true
	// 	}
	// }

};

