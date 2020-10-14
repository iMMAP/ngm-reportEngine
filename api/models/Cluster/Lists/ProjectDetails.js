/**
* ProjectDetails.js
*
* @description :: TODO: You might write a short summary of how this model works and what it represents here.
* @docs        :: http://sailsjs.org/#!documentation/models
*/

module.exports = {

	// connection
  connection: 'ngmHealthClusterServer',
  schema: false,

  updateOrCreate: function (criteria, values) {
    var self = this;
    if (values.id) {
      return self.update(criteria, values);
    } else {
      return self.create(values);
    }
  },

}
