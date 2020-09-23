/**
* Documents.js
*
* @description :: FILE META DATA STORAGE.
* @docs        :: http://sailsjs.org/#!documentation/models
*/

module.exports = {

	// connection
    connection: 'ngmCustomReportsServer',

    schema: false,

    attributes: {
          fileid: {
              type: 'string',
          },
          filename: {
              type: 'string',
          },
          filename_extention: {
              type: 'string',
          },
          mime_type: {
              type: 'string',
          },
          fileid_local: {
              type: 'string',
          },
          project_id: {
              type: 'string',
          },
          adminRpcode: {
            type: 'string',
          },
          admin0pcode: {
              type: 'string',
          },
          organization_tag: {
              type: 'string',
          },
          cluster_id: {
            type: 'string',
          },
          fileowner: {
              type: 'string',
          },

          report_type_id: {
            type: 'string',
          },
          report_type_name: {
            type: 'string',
          },
    }

}
