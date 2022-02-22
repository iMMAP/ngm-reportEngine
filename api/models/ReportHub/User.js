/**
* User.js
*
* @description :: TODO: You might write a short summary of how this model works and what it represents here.
* @docs        :: http://sailsjs.org/#!documentation/models
*/
const PENDING_STATUS = 'deactivated';
const DEACTIVATED_STATUS = 'deactivated';
const ACTIVE_STATUS = 'active';

module.exports = {

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
		adminRtype_name: {
			type: 'string'
		},
    admin0pcode: {
			type: 'string',
			required: true
    },
    admin0name: {
			type: 'string',
			required: true
    },
		admin0type_name: {
			type: 'string'
		},
    admin1pcode: {
			type: 'string'
    },
    admin1name: {
			type: 'string'
    },
		admin1type_name: {
			type: 'string'
		},
		organization_id: {
			type: 'string'
		},
		organization_type: {
			type: 'string',
			required: true
		},
		organization_name: {
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
		cluster_id: {
			type: 'string',
			required: true
		},
		cluster: {
			type: 'string',
			required: true
		},
		contract_start_date: {
			type: 'date'
		},
		contract_end_date: {
			type: 'date'
		},
		programme_id: {
			type: 'string'
		},
		programme_name: {
			type: 'string'
		},
		username: {
			type: 'string',
			unique: true,
			required: true
		},
		password: {
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
		profile: {
			type: 'string'
		},
		software: {
			type: 'string'
		},
		phone: {
			type: 'string',
			required: true
		},
		skype: {
			type: 'string'
		},
		email: {
			type: 'string',
			unique: true,
			required: true
		},
		anonymous: {
			type: 'boolean',
			defaultsTo: false
		},
		status: {
			type: 'string',
			defaultsTo: 'active'
		},
		roles: {
			type: 'array',
			defaultsTo: [ "USER" ]
		},
		app_home: {
			type: 'string',
			defaultsTo: '/cluster/organization/'
		},
		menu: {
			type: 'array',
			defaultsTo: [{
        icon: 'zoom_in',
        liClass: 'teal z-depth-2',
        aClass: 'white-text',
        iClass: 'medium material-icons',
        href: '/cluster/projects/list',
        title: 'MY PROJECTS'
       }]
		},
		visits: {
			type: 'integer',
			defaultsTo: 1
		},
		gravatar_url: {
			type: 'string'
		},

		site_class: {
			type: 'string'
		},
		site_type_id: {
			type: 'string'
		},
		site_type_name: {
			type: 'string'
		},
		site_status: {
			type: 'string'
		},
		site_name: {
			type: 'string'
		},
		adminRlng: {
			type: 'float'
		},
		adminRlat: {
			type: 'float'
		},
		admin0lng: {
			type: 'float'
		},
		admin0lat: {
			type: 'float'
		},
		admin1lng: {
			type: 'float'
		},
		admin1lat: {
			type: 'float'
		},
		site_lng: {
			type: 'float'
		},
		site_lat: {
			type: 'float'
		},
		cluster_contact:{
			type: 'boolean'
		},
		last_logged_in:{
			type: 'date'
		},
		api_key:{
			type: 'string'
		}

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

      // check if organization with closed registration
      // Organizations.findOne({ or: [{ admin0pcode: { contains: user.admin0pcode } }, { admin0pcode: { contains: 'ALL' } }], organization_tag: user.organization_tag, organization: user.organization, organization_name: user.organization_name }).exec(function (err, o) {
      //   if ( err ) return next( err );
      //   if (o && o.closed_registration && o.closed_registration.indexOf(user.admin0pcode) !== -1) {
      //     user.status = PENDING_STATUS;
      //     user.visits = 0;
      //   }
      Organization.findOne({ admin0pcode: user.admin0pcode, organization_tag: user.organization_tag, organization: user.organization }).exec(function (err, o) {
        if ( err ) return next( err );
        if (o && o.closed_registration){
          user.status = PENDING_STATUS;
          user.visits = 0;
        }
        // check if org exists
        Organization
          .find()
          // .where( { admin0pcode: user.admin0pcode, cluster_id: user.cluster_id, organization: user.organization } )
          .where( { admin0pcode: user.admin0pcode, organization: user.organization } )
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
              Organization.create({
                adminRpcode: user.adminRpcode,
                adminRname: user.adminRname,
                admin0pcode: user.admin0pcode,
                admin0name: user.admin0name,
                organization_type: user.organization_type,
                organization_name: user.organization_name,
                organization_tag: user.organization_tag,
                organization: user.organization,
                // cluster_id: user.cluster_id,
                // cluster: user.cluster
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
    User
    	.find()
    	.where({ admin0pcode: user.admin0pcode, organization_id: user.organization_id, status: "active" })
    	.sort('createdAt ASC')
    	.exec( function( err, admin ){

				// return
			  if ( err ) return next( err );

			  // if no config file, return, else send email ( PROD )
			  if ( !fs.existsSync( '/home/ubuntu/nginx/www/ngm-reportEngine/config/email.js' ) ) return next();
			  // if more then 1 user for that org
        if (admin.length > 1 || (admin.length && user.status === PENDING_STATUS)) {

					// get ORGs
					org_admin = admin.filter(function( user ) {
						return user.roles.indexOf( 'ORG' ) !== -1;
					});

					// set admin
					admin = org_admin.length ? org_admin : admin;

					// set emails
					// admin.forEach(function( d, i ) {
					// 	org_names += d.name + ', ';
					// 	org_emails += d.email + ',';
					// });
					// remove last comma
					// org_names = org_names.slice( 0, -1 );
					// org_emails = org_emails.slice( 0, -1 );

			var admin_contacts = [];
			// set email
			admin.forEach(function (d, i) {
				admin_contacts.push({ name: d.name, email: d.email })
			});
			var contact_length = admin_contacts.length;
          if (user.status === PENDING_STATUS) {
            // sails.hooks.email.send( 'new-user-pending', {
	        //     org_names: org_names,
	        //     sector: user.cluster,
	        //     username: user.username,
	        //     name: user.name,
	        //     position: user.position,
	        //     phone: user.phone,
	        //     email: user.email,
	        //     url: 'https://reporthub.org/desk/#/profile/' + user.username,
	        //     sendername: 'ReportHub'
	        //   }, {
	        //     to: org_emails,
	        //     subject: 'ReportHub - New ' + admin[0].organization + ' User Pending!'
	        //   }, function(err) {
			// 				// return
			// 			  if ( err ) return next( err );
			// 		  	// next
            //   next();
            // });
			var count_contact =0;
			admin_contacts.forEach(function(contact,i){
				sails.hooks.email.send('new-user-pending', {
					org_names: 'org',
					recipient:contact.name,
					sector: user.cluster,
					username: user.username,
					name: user.name,
					position: user.position,
					phone: user.phone,
					email: user.email,
					user_org: user.organization_name,
					org_abbr: user.organization,
					country: user.admin0name,
					url: 'https://reporthub.org/desk/#/profile/' + user.username,
					sendername: 'ReportHub'
				}, {
					to: contact.email,
					subject: 'ReportHub - New ' + admin[0].organization + ' User Pending!'
				}, function (err) {
					count_contact = count_contact +1;
					// return
					if (err) return next(err);
					// next
					if(count_contact === contact_length ){
						next();
					}
				});
			});
          } else {
            // send email
            // sails.hooks.email.send( 'new-user', {
            //     org_names: org_names,
            //     sector: user.cluster,
            //     username: user.username,
            //     name: user.name,
            //     position: user.position,
            //     phone: user.phone,
            //     email: user.email,
            //     url: 'https://reporthub.org/desk/#/profile/' + user.username,
            //     sendername: 'ReportHub'
            //   }, {
            //     to: org_emails,
            //     subject: 'ReportHub - New ' + admin[0].organization + ' User!'
            //   }, function(err) {

            //     // return
            //     if ( err ) return next( err );

            //     // next
            //     next();

            //   });

			var count_contact =0;
			admin_contacts.forEach(function(contact,i){
				sails.hooks.email.send('new-user', {
					org_names:'org',
					recipient:contact.name,
					sector: user.cluster,
					username: user.username,
					name: user.name,
					position: user.position,
					phone: user.phone,
					email: user.email,
					user_org: user.organization_name,
					org_abbr: user.organization,
					country: user.admin0name,
					url: 'https://reporthub.org/desk/#/profile/' + user.username,
					sendername: 'ReportHub'
				}, {
					to: contact.email,
					subject: 'ReportHub - New ' + admin[0].organization + ' User!'
				}, function (err) {
					count_contact = count_contact +1;
					// return
					if (err) return next(err);
					// next
					if(count_contact === contact_length ){
						next();
					}
				});
			});
          }
        // if no active users for that org notify cluster and country admins
	    	} else {
          User
            .find()
            .where({ admin0pcode: user.admin0pcode, or: [{ cluster_id: user.cluster_id, roles: { $in: ['CLUSTER'] } }, { roles: { $in: ['COUNTRY_ADMIN'] } }], status: "active" })
            .sort('createdAt ASC')
            .exec( function( err, admin ){
              if ( err ) return next( err );
              if ( admin.length ) {
                // set emails
                var admin_names = '';
	              var admin_emails = '';
								admin.forEach(function( d, i ) {
									admin_names += d.name + ', ';
									admin_emails += d.email + ',';
								});
								// remove last comma
								admin_names = admin_names.slice( 0, -1 );
                admin_emails = admin_emails.slice( 0, -1 );

				var admin_contacts =[{name:"Reporthub Admin",email:"ngmreporthub@gmail.com"}];
				admin.forEach(function (d, i) {
					admin_contacts.push({ name: d.name, email: d.email})
				});
				var contact_length = admin_contacts.length;

                // new organization by default ORG
                let isNewOrganization = false;
                if (user.roles.indexOf( 'ORG' ) !== -1){
                  isNewOrganization = true;
                }
                if (user.status === PENDING_STATUS) {
                  template = 'cluster-new-user-pending';
                  subject = isNewOrganization ? 'ReportHub - New Organization ' + user.organization + ' Pending!' : 'ReportHub - New ' + user.organization + ' User Pending!';
                } else {
                  template = 'cluster-new-user';
                  subject = isNewOrganization ? 'ReportHub - New Organization ' + user.organization + '!' : 'ReportHub - New ' + user.organization + ' User!';
                }
                // send email
                // sails.hooks.email.send( template, {
                //   org_names: admin_names,
                //   sector: user.cluster,
                //   organization: user.organization,
                //   username: user.username,
                //   name: user.name,
                //   position: user.position,
                //   phone: user.phone,
                //   email: user.email,
                //   url: 'https://reporthub.org/desk/#/profile/' + user.username,
                //   sendername: 'ReportHub'
                // }, {
                //   to: admin_emails,
                //   subject: subject
                // }, function(err) {

                //   // return
                //   if ( err ) return next( err );
                //   // next
                //   next();

                // });
				var count_contact =0;
				admin_contacts.forEach(function(contact){
					sails.hooks.email.send(template, {
						// org_names: admin_names,
						org_names: 'org',
						recipient: contact.name,
						sector: user.cluster,
						organization: user.organization,
						username: user.username,
						name: user.name,
						position: user.position,
						phone: user.phone,
						email: user.email,
						user_org: user.organization_name,
						org_abbr: user.organization,
						country: user.admin0name,
						url: 'https://reporthub.org/desk/#/profile/' + user.username,
						sendername: 'ReportHub'
					}, {
						to: contact.email,
						subject: subject
					}, function (err) {
						count_contact = count_contact + 1;
						// return
						if (err) return next(err);
						// next
						if (count_contact === contact_length) {
							next();
						}

					});
				})
              } else {
                next();
              }
            })

	    	}

      });

	}

};

