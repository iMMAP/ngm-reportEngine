'use strict';

var agendaInit = require('./agenda-init');

/**
 * Initialization of hook
 *
 * @param {Sails} app
 * @returns {Function}
 */
module.exports = function ToInitialize(app) {
  return async function(cb) {
    return new Promise((resolve)=>{
      sails.on('hook:orm:loaded', ()=>{
        // Finish initializing custom hook
        // Then resolve.
        // agendaInit(app, cb);
        resolve(agendaInit(app, cb));
      });
    });
  }

  // return function(cb) {
  //   agendaInit(app, cb);
  // };

};
