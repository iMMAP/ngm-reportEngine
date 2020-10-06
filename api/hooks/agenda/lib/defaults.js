'use strict';

module.exports = {

  /**
   * Main Agenda configuration object
   */
  agenda: {

    /**
     * Connection config
     *
     * All avaialble configs form {@link https://github.com/rschmukler/agenda#configuring-an-agenda} might be used here
     */
    connection: {
      /**
       * Database configuration
       */
      db: {
        /**
         * Database address
         * @type {String}
         */
        address: 'mongodb://localhost/ngmCustomReports',

        /**
         * Collection name
         *
         * @type {String}
         */
        collection: 'customjob',
        options: { useNewUrlParser: true, useUnifiedTopology: true }
      },

      /**
       * Takes a string name and sets lastModifiedBy to it in the job database.
       * Useful for if you have multiple job processors (agendas) and want to see which job queue last ran the job.
       *
       * @type {String}
       */
      name: 'sails-queue',
    },
      RH_API_KEY: 'Bearer RH_API_KEY',
      collection_jobs: 'customjob',
      collection_definitions: 'customjobdefinition',
      controller_jobs: 'custom/customjob'
  },


};
