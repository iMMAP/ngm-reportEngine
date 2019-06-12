/**
* ImmapUser.js
*
* @description :: TODO: You might write a short summary of how this model works and what it represents here.
* @docs        :: http://sailsjs.org/#!documentation/models
*/

module.exports = {

	// connection
    connection: 'ngmiMMAPServer',
    schema: false,
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
        roles: {
			type: 'array',
			defaultsTo: [ "USER" ]
		},
		status: {
			type: 'string',
			defaultsTo: 'inactive'
		},
		visits: {
			type: 'integer',
			defaultsTo: 1
		},
    },
    
    // encrypt password before create, assign org_id
	beforeCreate: function ( user, next ) {

		// encrypts the password/confirmation to be stored in the db
		// require( 'bcrypt' ).hash( user.password, 10, function passwordEncrypted( err, encryptedPassword ) {
		var bcrypt = require('bcrypt-nodejs');
		bcrypt.hash( user.password, bcrypt.genSaltSync( 10 ), null, function passwordEncrypted( err, encryptedPassword ) {
			
			// return error
			if ( err ) return next( err );
				
			// encrypt password
			user.password = encryptedPassword;
			// check if org exists
			ImmapOrganization
				.find()
				// .where( { admin0pcode: user.admin0pcode, cluster_id: user.cluster_id, organization: user.organization } )
				.where( { admin0pcode: user.admin0pcode } )
				.exec(function ( err, organization ){
					
					// error
					if ( err ) return next( err );

					// if org exists, add
					if( organization.length ){

						// organization_id
						user.organization_id = organization[0].id;

							// next!
							next();

							// else create
					} else {

						// create org_id
						ImmapOrganization.create({
							admin0pcode: user.admin0pcode,
							admin0name: user.admin0name,
						}).exec(function (err, created){
								
								// return error
								if ( err ) return next( err );
							
								// organization_id
								user.organization_id = created.id;

								// set the first user as ORG!
								user.roles.push('ORG');

								// next!
								next();						

							});

					}
					
					});

		});			

	},

	// after create ensure not malicious user
	afterCreate: function ( user, next ) {

		// file system
		var fs = require('fs'),
				org_names = '',
				org_emails = '',
				org_admin = [];

    // get user by email
    ImmapUser
    	.find()
    	.where({ admin0pcode: user.admin0pcode, organization_id: user.organization_id })
    	.sort('createdAt ASC')
    	.exec( function( err, admin ){

				// return
			  if ( err ) return next( err );

			  // if no config file, return, else send email ( PROD )
			  if ( !fs.existsSync( '/home/ubuntu/nginx/www/ngm-reportEngine/config/email.js' ) ) return next();

			  // if more then 1 user for that org
				if ( admin.length > 1 ) {

					// get ORGs
					org_admin = admin.filter(function( user ) {
						return user.roles.indexOf( 'ORG' ) !== -1; 
					});

					// set admin
					admin = org_admin.length ? org_admin : admin;

					// set emails
					admin.forEach(function( d, i ) {
						org_names += d.name + ', ';
						org_emails += d.email + ',';
					});
					// remove last comma
					org_names = org_names.slice( 0, -1 );
					org_emails = org_emails.slice( 0, -1 );

	        // send email
	        sails.hooks.email.send( 'immap-new-user', {
	            org_names: org_names,
	            username: user.username,
	            name: user.name,
	            position: user.position,
	            phone: user.phone,
	            email: user.email,
	            url: 'https://reporthub.immap.org/desk/#/immap/profile/' + user.username,
	            sendername: 'IMO Reporting'
	          }, {
	            to: org_emails,
	            subject: 'ReportHub - New ' + admin[0].organization + ' User !'
	          }, function(err) {
		
							// return
						  if ( err ) return next( err );

					  	// next
							next();

	          });

	    	} else {

			  	// next
					next();

	    	}

      });

	}

};

// };