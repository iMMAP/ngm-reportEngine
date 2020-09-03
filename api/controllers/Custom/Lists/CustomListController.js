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

        // return project
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

};

