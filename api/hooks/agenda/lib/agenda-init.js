'use strict';

var _ = require('lodash');
var Agenda = require('agenda');
const { promisify } = require('util');

module.exports = async function defineAgenda(app, cb) {
  cb = cb || _.noop;

  /**
   * Create a new Agenda instance
   */

  var agenda = new Agenda(app.config.agenda.connection);
  // get job function defined on CustomJobsController
  var jobFn = job => { console.log(job) };
  if (app.config.agenda.controller_jobs && sails.controllers[app.config.agenda.controller_jobs].job){
    jobFn = sails.controllers[app.config.agenda.controller_jobs].job;
  } else {
    sails.log('Job function on JobController required!');
  }

  // get job definitions from db and define
  const jobsReady = agenda._ready
  .then(async () => {
    const jobs = agenda._mdb.collection(app.config.agenda.collection_definitions || 'customjobdefinition');

    jobs.toArray = () => {
      const jobsCursor = jobs.find();
      return promisify(jobsCursor.toArray).bind(jobsCursor)();
    };

    await jobs.toArray()
      .then(jobsArray => Promise.all(jobsArray.map(job => agenda.define(job.name, job => jobFn(job)))));

    await agenda.start();
    return true;
  });

  await jobsReady;

  let graceful = () => {
    agenda.stop(() => process.exit(0));
  };

  process.on("SIGTERM", graceful);
  process.on("SIGINT", graceful);

  // Bind agenda to global sails
  app.agenda = agenda;

  return cb();
};
