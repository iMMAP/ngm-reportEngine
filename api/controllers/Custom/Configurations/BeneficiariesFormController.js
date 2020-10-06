/**
 * BeneficiariesFormController
 *
 * @description :: Beneficiaries Form Controller
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

module.exports = {

  // get list of cluster activities
  getCustomBeneficiariesForms: function( req, res ) {

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

    var form_id_filter = req.param( 'form_id' ) ? { status: req.param( 'form_id' ) } : {};
    var reporting_type_filter = req.param( 'reporting_type_id' ) ? { reporting_type_id: req.param( 'reporting_type_id' ) } : {};
    var form_type_filter = req.param( 'form_type_id' ) ? { form_type_id: req.param( 'form_type_id' ) } : {};
    var status = req.param( 'status' ) ? { status: req.param( 'status' ) } : {};


    // get activity list
    CustomBeneficiariesForm
      .find()
      .where( admin0pcode_filter )
      .where( form_type_filter )
      .where( reporting_type_filter )
      .where( form_id_filter )
      .where( status )
      .exec( function( err, forms ){

        // return error
        if ( err ) return res.negotiate( err );

        // return project
        return res.json( 200, forms );

      })

  },

  // get list of cluster activities
  getCustomBeneficiariesForm: function( req, res ) {

    // request input
    if (!req.param('form_id')) {
      return res.json(401, { err: 'form_id required!' });
    }

    // get activity list
    CustomBeneficiariesForm
      .findOne({ form_id: req.param( 'form_id' ) })
      .exec( function( err, form ){

        // return error
        if ( err ) return res.negotiate( err );

        // return project
        return res.json( 200, form );

      })

  },

  // set form
  saveCustomBeneficiariesForm: async function( req, res ) {

    // request input
    if (!req.param('form')) {
      return res.json(401, { err: 'form required!' });
    }

    var form = req.param('form');

    if (!form.form_id) {
      return res.json(401, { err: 'form_id required!' });
    }

    if (!form.config && !form.html && !form.plain) {
      return res.json(401, { err: 'config required!' });
    }

    if (!form.id) {
      var exists = await CustomBeneficiariesForm.findOne({ form_id: form.form_id })
      if (exists) return res.json(401, { "error": `Form id ${form.form_id} already exists` });
    }

    CustomBeneficiariesForm.updateOrCreate({ id: form.id }, form).exec(function (err, result) {
      if (err) return res.negotiate(err);
      return res.json(200, Utils.set_result(result));
    });
  },

  // delete form
  deleteCustomBeneficiariesForm: function(req, res) {

    if ( !req.param( 'id' ) ) {
      return res.json( 401, { err: 'id required!' } );
    }

    CustomBeneficiariesForm.destroy( { id: req.param( 'id' ) } ).exec( function( err, result ) {
      if (err) return res.negotiate( err );
      return res.json( 200, { message: 'Form ' + req.param( 'id' ) + ' has been deleted!' } );
    });

  },

};

