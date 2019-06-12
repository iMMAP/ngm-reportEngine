/**
 * ImmapUserController
 *
 * @description :: Server-side logic for managing iMMAP users
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */
var fs = require('fs');

// email validator
const emailValid = (email) => {
  const emailRegex = /^([A-Za-z0-9_\-.])+@([A-Za-z0-9_\-.])+\.([A-Za-z]{2,4})$/;
  return emailRegex.test(email);
}

// immap email validator
const isImmapOrg = (email) => {
  const emailRegex = /^([A-Za-z0-9_\-.])+@immap.org$/;
  return emailRegex.test(email);
}

var ImmapUserController = {

    // create user
    create: function(req, res) {
  
      // check params
      if (!req.param( 'user' )) {
        return res.json(401, { msg: 'User Required!' });
      }
  
      // try to look up user using the provided username/email address
      ImmapUser.findOne({
        username: req.param( 'user' ).username
        // or: [{
        //     username: req.param( 'user' ).username
        //   },{
        //     email: req.param( 'user' ).email
        //   }]
      }, function foundUser( err, user ) {
  
        // user exists
        if ( user ) return res.json({ err: true, msg: 'Username is already taken!' } );
  
        // else create user
        ImmapUser
          .create( req.param( 'user' ) )
          .exec( function( err, user ) {
  
            // err
            if (err) return res.negotiate( err );
  
            // set token
            user.token = jwtToken.issueToken({ sid: user.id });
  
            // save
            user.save( function(err){
                    
                  // return user
                  res.json( 200, user );
                  var userHistory = _.clone( user );

                  userHistory.user_id = user.id;
                  delete userHistory.id;

                  ImmapUserLoginHistory
                    .create(userHistory).exec(function (err) { if (err) console.log(err); });
                  
                  userHistory.status = 'created';
                  ImmapUserHistory
                    .create(userHistory).exec(function (err) { if (err) console.log(err); });
                  return
                // });
            });
  
          });
  
      });
  
    },

    createByVerification: function(req, res) {
  
      // check params
      if (!req.param('user')) {
        return res.json(401, { msg: 'User Required!' });
      }
      if (!req.param('user').email) {
        return res.json(401, { msg: 'Email Required!' });
      }

      if (!req.param('user').username) {
        return res.json(401, { msg: 'Username Required!' });
      }

      if (!isImmapOrg(req.param('user').email)) {
        return res.json(401, { msg: 'Incorrect iMMAP email!' })
      }

      // try to look up user using the provided username/email address
      ImmapUser.findOne({
        username: req.param('user').username
        // or: [{
        //     username: req.param( 'user' ).username
        //   },{
        //     email: req.param( 'user' ).email
        //   }]
      }, function foundUser(err, user) {

        if (err) return res.negotiate(err);
        // user exists
        if (user) return res.json({ err: true, msg: 'Username is already taken!' });

        ImmapUser.findOne({
          email: req.param('user').email
        }, function foundUser(err, user) {
          if (err) return res.negotiate(err);
          if (user) return res.json({ err: true, msg: 'User with that email is already registered!' });

          // else create user

          req.param('user').status = 'notverified'
          ImmapUser
            .create(req.param('user'))
            .exec(function (err, user) {

              // err
              if (err) return res.negotiate(err);

              // set token
              user.token = jwtToken.issueToken({ sid: user.id });

              // save
              user.save(function (err) {

                // return user
                // res.json( 200, user );

                if (!fs.existsSync('/home/ubuntu/nginx/www/ngm-reportEngine/config/email.js')) return res.json(200, { 'data': 'No email config' });

                var url = req.protocol + '://' + req.host + '/api/immap/confirm/'

                // send email
                sails.hooks.email.send('immap-account-verification', {
                  user: user,
                  recipientName: user.username,
                  senderName: 'IMO Reporting',
                  url: url,
                }, {
                    to: user.email,
                    subject: 'IMO Reporting Account Verification ' + new Date()
                  }, function (err) {

                    // return error
                    if (err) return res.negotiate(err);

                    // email sent
                    return res.json(200, { 'data': 'success' });
                  });


                var userHistory = _.clone(user);

                userHistory.user_id = user.id;
                delete userHistory.id;

                ImmapUserLoginHistory
                  .create(userHistory).exec(function (err) { if (err) console.log(err); });

                userHistory.status = 'created';
                ImmapUserHistory
                  .create(userHistory).exec(function (err) { if (err) console.log(err); });
                return
                // });
              });

            });
        });
      });
  
    },

    confirm: function(req,res){
      if (!req.param( 'token' )) {
        return res.json(401, { msg: 'Token Required!' });
      }
      ImmapUser.findOne({ token: req.param( 'token' ) })
        .then(user => {
            if (user){
              if (user.status !== 'notverified') { return res.status(200).send("This account has already been verified. Please log in.")}

              user.status = 'active';
              user.save( function(err){
                    
                // return user
                res.status(200).send("The account has been verified. Please log in.");
                
                var userHistory = _.clone( user );

                userHistory.user_id = user.id;
                delete userHistory.id;
                
                ImmapUserHistory
                  .create(userHistory).exec(function (err) { if (err) console.log(err); });
                return
              // });
              });
            } else {
              return res.status(400).send("Invalid token!");
            }
        }).catch(err => res.serverError(err))
    },

    resend: function(req,res){
      if (!req.param( 'email' )) {
        return res.json(401, { msg: 'Email Required!' });
      }

      if(!isImmapOrg(req.param( 'email' ))){
        return res.json(401, { msg: 'Incorrect iMMAP email!' })
      }
      
      ImmapUser.findOne({ email: req.param( 'email' ) })
        .then(user => {
            if (user){
                    if (user.status !== 'notverified') { return res.json(200, { 'data': 'This account has already been verified. Please log in.' }) }
                    
                    if ( !fs.existsSync( '/home/ubuntu/nginx/www/ngm-reportEngine/config/email.js' ) ) return res.json(200, { 'data': 'No email config' });

                    var url = req.protocol + '://' + req.host + '/api/immap/confirm/'

                    // send email
                    sails.hooks.email.send( 'immap-account-verification', {
                        user: user,
                        recipientName: user.username,
                        senderName: 'IMO Reporting',
                        url: url,
                      }, {
                        to: user.email,
                        subject: 'IMO Reporting Account Verification ' + new Date()
                      }, function(err) {
  
                        // return error
                        if (err) return res.negotiate( err );
  
                        // email sent
                        return res.json(200, { 'data': 'success!' });
                    });
                    
            } else {
              return res.json(200, { 'data': 'No user with that email!' });
            }
        }).catch(err => res.serverError(err))
    },
  
    deactivate: function (req, res) {
      if (!req.param('username')) {
        return res.json(401, { msg: 'username Required' });
      }
      if (!req.userToken) {
        return res.forbidden();
      }
      ImmapUser.findOne({ token: req.userToken })
        .then(byuser => {
          if (byuser) {
            ImmapUser.update({ username: req.param('username') }, { status: 'deactivated' }).then(users => {
              user = users[0]
              if (user) {
                user.user_id = user.id;
                delete user.id;
                user.byuser = byuser.username;
                ImmapUserHistory
                  .create(user).then(done => res.json(200, { success: true }))
              } else {
                return res.forbidden();
              }
            })
          }
          else {
            return res.forbidden();
          }
        }).catch(err => res.serverError(err))
    },
    
    // delete user
    delete: function (req, res) {
      // check params
      if (!req.param('username')) {
        return res.json(401, { msg: 'username Required' });
      }
      if (!req.userToken) {
        return res.forbidden();
      }
      ImmapUser.findOne({ token: req.userToken })
        .then(byuser => {
          if (byuser) {
            ImmapUser.findOne({ username: req.param('username') }).then(user => {
              if (user) {
                ImmapUser.destroy({ username: user.username }).then(deleted => {
                  user.user_id = user.id;
                  delete user.id;
                  user.byuser = byuser.username;
                  user.status = 'deleted';
                  ImmapUserHistory
                    .create(user).then(done => res.json(200, { success: true }))
                })
              } else {
                return res.forbidden();
              }
            })
          } else {
            return res.forbidden();
          }
        }).catch(err => res.serverError(err))
    },
    // delete user
    deleteDeprecated: function (req, res) {
      // check params
      if (!req.param( 'user' )) {
        return res.json(401, { msg: 'User Required' });
      }
  
      ImmapUser
        .destroy( { id: req.param( 'user' ).id } )
        .exec( function( err ){
          
          // generic error
          if ( err ) return res.negotiate( err );
  
          // user destroyed
          res.json( 200, { success: true } );

          var userHistory = _.clone( req.param( 'user' ) );

          userHistory.user_id = user.id;
                  delete userHistory.id;
          userHistory.status = 'deleted';
                  ImmapUserHistory
                    .create(userHistory).exec(function (err) { if (err) console.log(err); });
          return
        });
  
    },
  
    // Check provided email address and password
    login: function (req, res) {
  
      // check params
      if (!req.param( 'user' )) {
        return res.json(401, { msg: 'user required' });
      }
  
      // try to look up user using the provided username/email address
      ImmapUser.findOne({
        username: req.param( 'user' ).username
        // or: [{
        //     username: req.param( 'user' ).username
        //   },{
        //     email: req.param( 'user' ).email
        //   }]
      }, function foundUser( err, user ) {
  
        // generic error
        if ( err ) return res.negotiate( err );
  
        // user not found
        if ( !user ) return res.json({ err: true, msg: 'Invalid Username! User exists?' });
  
        // user not active
        if ( user.status !== 'active' ) return res.json({ err: true, msg: 'User No Longer Active! Contact Admin' });
  
        // compare params passpwrd to the encrypted db password
        require( 'machinepack-passwords' ).checkPassword({
          passwordAttempt: req.param( 'user' ).password,
          encryptedPassword: user.password
        }).exec({
  
          // error
          error: function ( err ){
            return res.negotiate( err );
          },
  
          // password incorrect
          incorrect: function (){
            return res.json({ err: true, msg: 'Invalid Password! Forgot Password?' });
          },
  
          // on success
          success: function (){
  
            // update visit information
            user.visits = user.visits + 1;
  
            // add token
            user.token = jwtToken.issueToken({ sid: user.id });
            
            // save user data on session
            req.session.session_user = user;
  
            // save updates
            user.save( function( err ) {
  
              // err
              if( err ) return res.negotiate( err );
  
              // Send back user with token
              return res.json( 200, user );
  
              var userHistory = _.clone( user );
                userHistory.user_id = user.id;
                delete userHistory.id;

              ImmapUserLoginHistory
                .create(userHistory).exec(function (err) { });
            });
  
          }
        });
      });
  
    },
  
    // get by username for profile
    getUserByUsername: function(req, res){
  
      // check params
      if ( !req.param( 'username' ) ) {
        return res.json(401, { msg: 'username required' });
      }
  
      // new profile
      var username = req.param( 'username' );
  
      // users
      ImmapUser
        .findOne()
        .where( { username: username } )
        .exec( function( err, user ){
  
          // return error
          if ( err ) return res.negotiate( err );
  
          // return updated user
          return res.json( 200, user );
  
        }); 
  
    },
  
    // metrics
    updateLogin: function(req, res){
  
      // check params
      if ( !req.param( 'user' ) ) {
        return res.json(401, { msg: 'user required' });
      }
  
      // get user by username
      ImmapUser
        .findOne({ username: req.param( 'user' ).username })
        .exec(function(err, user){
  
          // return error
          if (err) return res.negotiate( err );
  
          // return error
          // if (!user) return res.json( 401, { msg: 'User not found!' } );
  
          // update visit information
          user.visits++;
  
          // save updates
          user.save(function(err) {
  
            // err
            if(err) return res.negotiate( err );
  
            // return updated user
            return res.json( 200, user );
  
          });
  
        });
  
    },
  
    // update user profile
    // TODO: Refactor
    updateProfile: function(req, res){
  
      // check params
      if ( !req.param( 'user' ) ) {
        return res.json(401, { msg: 'user required' });
      }
  
      // new profile
      var updatedUser = req.param( 'user' );
  
      // check to make sure username is not taken
      ImmapUser.findOne({
        username: updatedUser.username
      }, function foundUser( err, user ) {
  
        // generic error
        if (err) return res.negotiate( err );
  
        // if username exists twice!
        if ( user && user.id !== updatedUser.id ) {
  
          // username already taken
          return res.json( 200, { err: true, msg: 'Username already taken, try again!' });
  
        } else {
  
          ImmapUser.findOne({
            id: updatedUser.id
          }, function foundUser( err, originalUser ) {
            if (originalUser){
            ImmapUser
              .update( { id: updatedUser.id }, updatedUser )
              .exec( function( err, result ){
  
                // generic error
                if (err) return res.negotiate( err );
  
                // user object to update tables
                var updatedRelationsUser = {
                  username: result[0].username,
                  name: result[0].name,
                  // position: result[0].position,
                  phone: result[0].phone,
                  email: result[0].email
                }
  
                var findOriginalUser = {
                  username: originalUser.username
                }
  
                // each collection needs to be updated - this needs to change to relational!
  
                var Promise = require('bluebird');
  
                Promise.all([
                  ImmapLicense.update( findOriginalUser, updatedRelationsUser ),
                  ImmapProduct.update( findOriginalUser, updatedRelationsUser ),
                  ImmapReport.update( findOriginalUser, updatedRelationsUser ),
                  ImmapFile.update( findOriginalUser, updatedRelationsUser )
                ])
                  .catch( function(err) {
                    return res.negotiate( err );
                  })
                  .done( function() {
  
                    // the following is for tracking of iMMAP staff (for now)

                    // update user programme and track
                    if ( originalUser.programme_id && originalUser.programme_id !== result[0].programme_id || 
                        originalUser.contract_start_date && originalUser.contract_start_date.toString() !== result[0].contract_start_date && result[0].contract_start_date.toString() ||
                        originalUser.contract_end_date && originalUser.contract_end_date.toString() !== result[0].contract_end_date && result[0].contract_end_date.toString() ||
                        originalUser.admin0pcode !== result[0].admin0pcode ||
                        originalUser.site_name !== result[0].site_name ){
                    // profile details
                    ImmapUserController.updateProfileDetails( req, res, originalUser, result[0] );
                  } else {
                    
                    res.json( 200, { success: true, user: result[0] } );

                    
                    originalUser.user_id = originalUser.id;
                    originalUser.status = 'updated';
                    delete originalUser.id;
  
                    // create user history for tracking!
                    ImmapUserHistory
                      .create( originalUser )
                      .exec( function( err, newUserHistory ) {
                        
                      })

                    return;
                  }
                  });
  
              });
            } else { return res.badRequest() }
          });
  
        }
  
      });
  
    },
  
    // update the profile details 
    updateProfileDetails: function (req, res, originalUser, updatedUser) {

      // if country changes, make updates and add new history
      if (originalUser.admin0pcode !== updatedUser.admin0pcode) {

        // fetch
        ImmapOrganization
          .find()
          .where({ admin0pcode: updatedUser.admin0pcode })
          .exec(function (err, organization) {

            // generic error
            if (err) return res.negotiate(err);

            // if no results, create new organization
            if (!organization.length) {
              var newOrganizationAdmin0 = _.clone(updatedUser);
              delete newOrganizationAdmin0.id;

              // create new
              ImmapOrganization.create({
                admin0pcode: updatedUser.admin0pcode,
                admin0name: updatedUser.admin0name,
                    }).exec(function (err, neworganization){
                        
                  // generic error
                  if (err) return res.negotiate(err);

                  // update user country
                  ImmapUser
                    .update({ id: updatedUser.id }, { organization_id: neworganization.id })
                    .exec(function (err, newOrgUser) {

                      // create new userHistory
                      var newUserHistory = _.clone(newOrgUser[0]);
                      newUserHistory.user_id = newUserHistory.id;
                      newUserHistory.status = 'updated';
                      delete newUserHistory.id;

                      // create user history for tracking!
                      ImmapUserHistory
                        .create(newUserHistory)
                        .exec(function (err, newUserHistory) {

                          // err
                          if (err) return res.negotiate(err);

                          // return user
                          return res.json(200, { success: true, user: newOrgUser[0] });

                        });

                    });

                });

            } else {

              // update user country
              ImmapUser
                .update({ id: updatedUser.id }, { organization_id: organization[0].id })
                .exec(function (err, updatedOrgUser) {

                  // create new userHistory
                  var newUserHistory = _.clone(updatedOrgUser[0]);
                  newUserHistory.user_id = newUserHistory.id;
                  newUserHistory.status = 'updated';
                  delete newUserHistory.id;

                  // create user history for tracking!
                  ImmapUserHistory
                    .create(newUserHistory)
                    .exec(function (err, newUserHistory) {

                      // err
                      if (err) return res.negotiate(err);

                      // return user
                      return res.json(200, { success: true, user: updatedOrgUser[0] });

                    });

                });

            }

          });

        // udpate prgramme or duty station
      } else if (originalUser.programme_id !== updatedUser.programme_id ||
        originalUser.site_name !== updatedUser.site_name) {

        // create new userHistory
        var newUserHistory = _.clone(updatedUser);
        newUserHistory.user_id = newUserHistory.id;
        newUserHistory.status = 'updated';
        delete newUserHistory.id;

        // create user history for tracking!
        ImmapUserHistory
          .create(newUserHistory)
          .exec(function (err, newUserHistory) {

            // err
            if (err) return res.negotiate(err);

            // return user
            return res.json(200, { success: true, user: updatedUser });

          });

        // date updates only require update to UserHistory
      } else if (originalUser.contract_start_date.toString() !== updatedUser.contract_start_date.toString() ||
        originalUser.contract_end_date.toString() !== updatedUser.contract_end_date.toString()) {

            // return default
            res.json(200, { success: true, user: updatedUser });

            // create new userHistory
            var newUserHistory = _.clone(originalUser);
            newUserHistory.user_id = newUserHistory.id;
            newUserHistory.status = 'updated';
            delete newUserHistory.id;

            // create user history for tracking!
            ImmapUserHistory
              .create(newUserHistory)
              .exec(function (err, newUserHistory) {

              });
            return;

      } else {

        // return default
        return res.json(200, { success: true, user: updatedUser });
      }

    },
  
    // send email for password reset
    passwordResetEmail: function(req, res){
  
      // check params
      if ( !req.param( 'user' ) || !req.param( 'url' ) ) {
        return res.json(401, { msg: 'user, url required' });
      }
  
      // file system
      var fs = require('fs');
  
      // get user by email
      ImmapUser
        .find({ email: req.param( 'user' ).email })
        .exec(function(err, user){
  
            // return error
            if (err) return res.negotiate( err );
  
            // return error
            if (!user.length) return res.json({ err: true, msg: 'Account Not Found!' });
  
            var resets = [],
                counter = 0,
                length = user.length;
  
            //
            for (i = 0; i < user.length; i++) {
  
              // reset user
              var userReset = {
                adminRpcode: user[i].adminRpcode,
                admin0pcode: user[i].admin0pcode,
                admin0name: user[i].admin0name,
                organization_id: user[i].organization_id,
                organization_tag: user[i].organization_tag,
                organization: user[i].organization,
                user_id: user[i].id,
                name: user[i].name,
                username: user[i].username,
                email: user[i].email,
                token: jwtToken.issueToken({ sid: user[i].id })
              }
  
              // Add record in reset
              ImmapUserReset
                .create( userReset )
                .exec( function( err, reset ) {
  
                  // return error
                  if (err) return res.negotiate( err );
  
                  // push
                  resets.push(reset);
                  // incement
                  counter++;
                  if( counter === length ){
  
                    // if no config file, return, else send email ( PROD )
                    if ( !fs.existsSync( '/home/ubuntu/nginx/www/ngm-reportEngine/config/email.js' ) ) return res.json(200, { 'data': 'No email config' });
                    
                    // send email
                    sails.hooks.email.send( 'immap-password-reset', {
                        resets: resets,
                        recipientName: resets[0].username,
                        senderName: 'IMO Reporting',
                        url: req.param( 'url' ),
                      }, {
                        to: reset.email,
                        subject: 'IMO Reporting Password Reset ' + new Date()
                      }, function(err) {
  
                        // return error
                        if (err) return res.negotiate( err );
  
                        // email sent
                        return res.json(200, { 'data': 'success' });
                    });
                  }
  
                });
  
            }
  
  
          });
  
    },
  
    // password reset
    passwordReset: function(req, res){
  
      // check params
      if ( !req.param( 'reset' ) || !req.param( 'token' ) ) {
        return res.json(401, { msg: 'user, token required' });
      }
  
      // get reser user by username
      ImmapUserReset.findOne({ token: req.param( 'token' ) }).exec(function(err, userReset){
  
        // return error
        if (err) return res.negotiate( err );
  
        // return error
        if (!userReset) return res.json({ err: true, msg: 'Reset token not found!' });
  
        // get user with userReset params
        ImmapUser
          .findOne({ username: userReset.username })
          .exec(function(err, user){
  
            // return error
            if (err) return res.negotiate( err );
  
            // update newPassword
            // require( 'bcrypt' ).hash( req.param( 'reset' ).newPassword, 10, function passwordEncrypted( err, encryptedPassword ) {
            var bcrypt = require('bcrypt-nodejs');
            bcrypt.hash( req.param( 'reset' ).newPassword, bcrypt.genSaltSync( 10 ), null, function passwordEncrypted( err, encryptedPassword ) {
  
              // err
              if ( err ) return res.json({ err: true, msg: 'Reset password error' } );
  
              // new password
              user.password = encryptedPassword;
              // add new token
              user.token = jwtToken.issueToken( { sid: user.id } );
  
              // save updates
              user.save( function( err ) {
  
                // err
                if ( err ) return res.negotiate( err );
  
                // return updated user
                return res.json( 200, user );
  
              });
  
            });
  
          });
  
      });
  
    }
  
  };
  
  module.exports = ImmapUserController;