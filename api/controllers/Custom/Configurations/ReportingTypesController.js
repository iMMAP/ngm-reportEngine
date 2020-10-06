/**
 * ReportingTypesController
 *
 * @description :: Reporting Type Controller
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

module.exports = {

  // get list of cluster activities
  getCustomReportingTypes: function( req, res ) {

    // admin0pcode
		var admin0pcode_filter = req.param( 'admin0pcode' ) ? { admin0pcode: { contains: req.param( 'admin0pcode' ) } } : {};

		if (req.param('adminRpcode')){
			var region_filter = req.param('adminRpcode').toLowerCase();
			if(region_filter === 'hq'){
				admin0pcode_filter = {}
			}
			if(region_filter === 'afro'){
				admin0pcode_filter  = { or: [{ admin0pcode: { contains: 'CD' } }, { admin0pcode: { contains: 'ET' }},{ admin0pcode: { contains: 'NG' }},{ admin0pcode: { contains: 'SS' }}] }
			}
			if(region_filter === 'amer'){
				admin0pcode_filter = { admin0pcode: { contains: 'COL' } };
			}
			if(region_filter === 'emro'){
				admin0pcode_filter = { or: [{ admin0pcode: { contains: 'AF' } }, { admin0pcode: { contains: 'SO' } }, { admin0pcode: { contains: 'SY' } }, { admin0pcode: { contains: 'YE' } }] }
			}
			if(region_filter === 'searo'){
				admin0pcode_filter = {
					admin0pcode: { contains: 'BD' },
					admin0pcode: { contains: 'CB' },
				};
				admin0pcode_filter = { or: [{ admin0pcode: { contains: 'BD' } }, { admin0pcode: { contains: 'CB' } }] }
			}
			if(region_filter === 'euro'){
				admin0pcode_filter = { admin0pcode: { contains: 'UA' } };
			}
    }

    var reporting_type_filter = req.param( 'reporting_type_id' ) ? { reporting_type_id: req.param( 'reporting_type_id' ) } : {};
    var status = req.param( 'status' ) ? { status: req.param( 'status' ) } : {};


    // get reporting type list
    CustomReportingType
      .find()
      .where( admin0pcode_filter )
      .where( reporting_type_filter )
      .where( status )
      .exec( function( err, reportingTypes ){

        // return error
        if ( err ) return res.negotiate( err );

        // return type
        return res.json( 200, reportingTypes );

      })

  },

  // get list of cluster activities
  getCustomReportingType: function( req, res ) {

    // request input
    if (!req.param('reporting_type_id')) {
      return res.json(401, { err: 'reporting_type_id required!' });
    }

    // get reporting types list
    CustomReportingType
      .findOne({ reporting_type_id: req.param( 'reporting_type_id' ) })
      .exec( function( err, reportingType ){

        // return error
        if ( err ) return res.negotiate( err );

        // return type
        return res.json( 200, reportingType );

      })

  },

  // set reporting type by definition
  saveCustomReportingType: async function( req, res ) {
    // request input
    if (!req.param('definition')) {
      return res.json(401, { err: 'definition required!' });
    }

    var definition = req.param('definition');

    if (!definition.reporting_type_id) {
      return res.json(401, { err: 'reporting_type_id required!' });
    }

    if (!definition.config) {
      return res.json(401, { err: 'config required!' });
    }

    if (!definition.id) {
      var exists = await CustomReportingType.findOne({ reporting_type_id: definition.reporting_type_id })
      if (exists) return res.json(401, { "error": `Reporting type id ${definition.reporting_type_id} already exists` });
    }

    CustomReportingType.updateOrCreate({ id: definition.id }, definition).exec(function (err, result) {
      if (err) return res.negotiate(err);
      return res.json(200, Utils.set_result(result));
    });



  },

  // delete reporting type
  deleteCustomReportingType: function(req, res) {

    if ( !req.param( 'id' ) ) {
      return res.json( 401, { err: 'id required!' } );
    }

    CustomReportingType.destroy( { id: req.param( 'id' ) } ).exec( function( err, result ) {
      if (err) return res.negotiate( err );
      return res.json( 200, { message: 'Reporting Type ' + req.param( 'id' ) + ' has been deleted!' } );
    });

  },

};

