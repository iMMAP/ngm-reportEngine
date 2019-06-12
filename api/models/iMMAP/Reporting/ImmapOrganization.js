/**
* ImmapOrganization.js
*
* @description :: TODO: You might write a short summary of how this model works and what it represents here.
* @docs        :: http://sailsjs.org/#!documentation/models
*/

module.exports = {

	// connection
	connection: 'ngmiMMAPServer',

	attributes: {
		organization_tag: {
			type: 'string',
			defaultsTo: 'immap'
		},
		organization: {
			type: 'string',
			defaultsTo: 'iMMAP'
		},
		organization_name: {
			type: 'string',
			defaultsTo: 'iMMAP'
		},
    },
};