/**
 * CustomListController
 *
 * @description :: Custom List Controller
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

module.exports = {

  // get list of cluster activities
  getActivities: function( req, res ) {

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
    // get activity list
    CustomActivities
      .find()
      .where( admin0pcode_filter )
      .exec( function( err, activities ){

        // return error
        if ( err ) return res.negotiate( err );

        // return activities
        return res.json( 200, activities );

      })

  },

  // // get indicators
  // getIndicators: function( req, res ) {

  //   // get indicators list
  //   CustomIndicators
  //     .find()
  //     .exec( function( err, indicators ){

  //       // return error
  //       if ( err ) return res.negotiate( err );

  //       // return indicators
  //       return res.json( 200, indicators );

  //   });

  // },

  // get list of organizations
  getOrganizations: function( req, res ) {

    // get organizations list
    Organizations
      .find()
      .exec( function( err, organizations ){

        // return error
        if ( err ) return res.negotiate( err );

        // return organizations
        return res.json( 200, organizations );

      })

  },

  // getCustomLists: function (req, res) {

  //   // request input
  //   if (!req.param('filter')) {
  //     return res.json(401, { err: 'filter required!' });
  //   }

  //   CustomList
  //     .find(req.param('filter'))
  //     .sort('updatedAt DESC')
  //     .exec(function (err, lists) {

  //       // return error
  //       if (err) return res.negotiate(err);

  //       // else
  //       return res.json(200, lists);

  //     });

  // },

  // get list of cluster activities
  getCustomLists: function( req, res ) {

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

    var list_id_filter = req.param( 'list_id' ) ? { status: req.param( 'list_id' ) } : {};
    var reporting_type_filter = req.param( 'reporting_type_id' ) ? { reporting_type_id: req.param( 'reporting_type_id' ) } : {};
    var list_type_filter = req.param( 'list_type_id' ) ? { list_type_id: req.param( 'list_type_id' ) } : {};
    var status = req.param( 'status' ) ? { status: req.param( 'status' ) } : {};


    // get custom lists
    CustomList
      .find()
      .where( admin0pcode_filter )
      .where( list_type_filter )
      .where( reporting_type_filter )
      .where( status )
      .where( list_id_filter )
      .exec( function( err, lists ){

        // return error
        if ( err ) return res.negotiate( err );

        // return list
        return res.json( 200, lists );

      })

  },

  // get list of cluster activities
  getCustomList: function( req, res ) {

    // request input
    if (!req.param('list_id')) {
      return res.json(401, { err: 'list_id required!' });
    }

    // get custom list
    CustomList
      .findOne({ list_id: req.param( 'list_id' ) })
      .exec( function( err, list ){

        // return error
        if ( err ) return res.negotiate( err );

        // return list
        return res.json( 200, list );

      })
  },

  // set list
  saveCustomList: async function( req, res ) {
    // request input
    if (!req.param('list')) {
      return res.json(401, { err: 'list required!' });
    }

    var list = req.param('list');

    if (!list.list_id) {
      return res.json(401, { err: 'list_id required!' });
    }

    if (!list.list || !Array.isArray(list.list)) {
      return res.json(401, { err: 'list array required!' });
    }

    if (!list.id) {
      var exists = await CustomBeneficiariesForm.findOne({ list_id: list.list_id })
      if (exists) return res.json(401, { "error": `List id ${list.list_id} already exists` });
    }

    CustomList.updateOrCreate({ id: list.id }, list).exec(function (err, result) {
      if (err) return res.negotiate(err);
      return res.json(200, Utils.set_result(result));
    });
  },

  // delete list
  deleteCustomList: function(req, res) {

    if ( !req.param( 'id' ) ) {
      return res.json( 401, { err: 'id required!' } );
    }

    CustomList.destroy( { id: req.param( 'id' ) } ).exec( function( err, result ) {
      if (err) return res.negotiate( err );
      return res.json( 200, { message: 'List ' +  req.param( 'id' ) + ' has been deleted!' } );
    });

  },

};

