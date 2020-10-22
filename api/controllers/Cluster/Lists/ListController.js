/**
 * ReportController
 *
 * @description :: Server-side logic for managing auths
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
    Activities
      .find()
      .where( admin0pcode_filter )
      .exec( function( err, activities ){

        // return error
        if ( err ) return res.negotiate( err );

        // return project
        return res.json( 200, activities );

      })

  },

  // get list of donors
  getDonors: function( req, res ) {

    // get donor list
    Donors
      .find()
      .exec( function( err, donors ){

        // return donors
        if ( err ) return res.negotiate( err );

        // return donors
        return res.json( 200, donors );

      })

  },

  // get indicators
  getIndicators: function( req, res ) {

    // get indicators list
    Indicators
      .find()
      .limit( 1 )
      .exec( function( err, indicators ){

        // return error
        if ( err ) return res.negotiate( err );

        // return indicators
        return res.json( 200, indicators[ 0 ] );

    });

  },

  // get list of stockitems
  getStockItems: function( req, res ) {

    // get stockitems list
    StockItems
      .find()
      .exec( function( err, stockitems ){

        // return error
        if ( err ) return res.negotiate( err );

        // return stockitems
        return res.json( 200, stockitems );

      })

  },

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


  getList: async function (req, res) {

    var lists = ['clusters', 'activities', 'stockitems', 'stocktargetedgroups', 'stockstatuses', 'donors', 'indicators', 'organizations', 'beneficiarytypes', 'hrpbeneficiarytypes', 'beneficiarycategories', 'sitetypes', 'siteimplementations', 'mpctypes', 'units', 'currencies', 'projectdetails', 'deliverytypes', 'indicators' ];

    var GET = 'GET';
    var POST = 'POST';
    var DELETE = 'DELETE';

    var MODELS = {
      'activities': Activities,
      'donors': Donors,
      'stockitems': StockItems,
      'stocktargetedgroups': StockTargetedGroups,
      'stockstatuses': StockStatuses,
      'beneficiarytypes': BeneficiaryTypes,
      'hrpbeneficiarytypes': HrpBeneficiaryTypes,
      'beneficiarycategories': BeneficiaryCategories,
      'sitetypes': SiteTypes,
      'siteimplementations': SiteImplementations,
      'mpctypes': MpcTypes,
      'clusters': Clusters,
      'units': Units,
      'currencies': Currencies,
      'projectdetails': ProjectDetails,
      'deliverytypes': DeliveryTypes,
      'organizations': Organizations,
      'indicators': Indicators,

    };
    var ITEM_NAMES = {
      'activities': 'Activity',
      'donors': 'Donor',
      'stockitems': 'Stock Item',
      'stocktargetedgroups': 'Stock Targeted Group',
      'stockstatuses': 'Stock Status',
      'beneficiarytypes': 'Beneficiary Type',
      'hrpbeneficiarytypes': 'HRP Beneficiary Type',
      'beneficiarycategories': 'Beneficiary Category',
      'sitetypes': 'Site Type',
      'siteimplementations': 'Site Implementation',
      'mpctypes': 'MPC Type',
      'clusters': 'Cluster',
      'units': 'Units',
      'currencies': 'Currencies',
      'projectdetails': 'Project Detail',
      'deliverytypes': 'Delivery Type',
      'organizations': 'Organizations',
      'indicators': 'Indicators',

    }


    if ( !req.param( 'id' ) || !lists.includes(req.param( 'id' )) ) {
      return res.json( 400, { err: 'id required!' } );
    }

    if ( req.method !== GET && !req.param( 'data' ) || typeof req.param( 'data' ) !== 'object' && req.param( 'data' ) === null  ) {
      return res.json( 400, { err: 'data required!' } );
    }

    if ( req.method === DELETE && !req.param( 'data' ).id ) {
      return res.json( 400, { err: 'record id required!' } );
    }

    var id = req.param( 'id' );
    var data = req.param( 'data' );
    var MODEL = MODELS[id];
    var ITEM_NAME = ITEM_NAMES[id];

    if (MODEL){
      if (req.method === POST) {
        MODEL.updateOrCreate({ id: data.id }, data).exec(function (err, result) {
          if (err) return res.negotiate(err);
          var result = Utils.set_result(result);
          if (!result) return res.json(400, { error: `${ITEM_NAME} ${data.id} not found` });
          return res.json(200, result);
        });
      } else if (req.method === DELETE) {
        MODEL.destroy( { id: data.id } ).exec( function( err, result ) {
          if (err) return res.negotiate( err );
            var result = Utils.set_result(result);
            if (!result) return res.json(400, { error: `${ITEM_NAME} ${data.id} not found` });
            return res.json(200, { message: `${ITEM_NAME} ${data.id} has been deleted!` });
          });
      } else {
        // default GET
        var admin0pcodeFilter = req.param( 'admin0pcode' ) ? { admin0pcode: { contains: req.param( 'admin0pcode' ) } } : {};
        var clusterFilter = req.param( 'cluster_id' ) ? { cluster_id: { contains: req.param( 'cluster_id' ) } } : {};
        var filter = Object.assign({}, admin0pcodeFilter, clusterFilter);
        // get activity list
        MODEL
        .find()
        .where( filter )
        .exec( function( err, list ){
          // return error
          if ( err ) return res.negotiate( err );
          // return project
          return res.json( 200, list );
        })
      }
    } else {
      switch (id) {
        case 'activities':
          break;

        default:
          return res.json(400, {error: "Invalid admin list!"});
          break;
      }
    }

  },

  uploadList: async function (req, res) {
    try {
      var lists = ['clusters', 'activities', 'stockitems', 'stockstatuses', 'stocktargetedgroups', 'donors', 'indicators', 'organizations', 'beneficiarytypes', 'hrpbeneficiarytypes', 'beneficiarycategories', 'sitetypes', 'siteimplementations', 'mpctypes', 'units', 'currencies', 'projectdetails', 'deliverytypes', 'indicators' ];

      var MODELS = {
        'activities': Activities,
        'donors': Donors,
        'stockitems': StockItems,
        'stocktargetedgroups': StockTargetedGroups,
        'stockstatuses': StockStatuses,
        'beneficiarytypes': BeneficiaryTypes,
        'hrpbeneficiarytypes': HrpBeneficiaryTypes,
        'beneficiarycategories': BeneficiaryCategories,
        'sitetypes': SiteTypes,
        'siteimplementations': SiteImplementations,
        'mpctypes': MpcTypes,
        'clusters': Clusters,
        'units': Units,
        'currencies': Currencies,
        'projectdetails': ProjectDetails,
        'deliverytypes': DeliveryTypes,
        'organizations': Organizations,
        'indicators': Indicators,
      };
      if ( !req.param( 'id' ) || !lists.includes(req.param( 'id' )) ) {
        return res.json( 400, { err: 'id required!' } );
      }
      if ( !req.param( 'data' ) || !Array.isArray(req.param( 'data' ))  ) {
        return res.json( 400, { err: 'data required!' } );
      }

      var admin0pcodeFilter = req.param( 'admin0pcode' ) ? { admin0pcode: req.param( 'admin0pcode' ) } : {};
      var clusterFilter = req.param( 'cluster_id' ) ? { cluster_id: req.param( 'cluster_id' ) } : {};
      var filter = Object.assign({}, admin0pcodeFilter, clusterFilter);

      var id = req.param( 'id' );
      var data = req.param( 'data' );
      var MODEL = MODELS[id];

      if (MODEL){

        var destroyed = await MODEL.destroy(filter);
        var result = await MODEL.create(data);

        return res.json(200, result);

      } else {
        // if specific
        switch (id) {

          case 'stocks':
            break;

          default:
            return res.json(400, { error: `No such list!` });
            break;
        }
        }

    } catch (err) {
      return res.negotiate(err);
    }
  }
};

