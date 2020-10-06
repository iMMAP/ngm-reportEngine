/**
* CustomJobDefinition.js
*
* @description :: TODO: You might write a short summary of how this model works and what it represents here.
* @docs        :: http://sailsjs.org/#!documentation/models
*/

module.exports = {

  // connection
  connection: 'ngmCustomReportsServer',
  schema: false,

  updateOrCreate: function(criteria, values) {
    return new Promise((resolve, reject) => {
      if (!values) {
        values = criteria.where ? criteria.where : criteria;
      }

      this.findOne(criteria)
      .then((result) => {
        if (result) {
          return this.update(criteria, values);
        }

        return this.create(values);
      })
      .then((data) => {
        if (Array.isArray(data)) {
          data = data[0];
        }

        return data;
      })
      .then(resolve)
      .catch(reject);
    });
  }
}
