var REPORTING_DUE_DATE_NOTIFICATIONS_CONFIG = sails.config.REPORTING_DUE_DATE_NOTIFICATIONS_CONFIG;
var moment = require('moment');

module.exports =  {
  /**
   * Common functions.
   */

	getConfig: function( admin0pcode, cluster_id ) {

    let config = REPORTING_DUE_DATE_NOTIFICATIONS_CONFIG.find(obj => obj.admin0pcode === admin0pcode);
    if (!config) config = REPORTING_DUE_DATE_NOTIFICATIONS_CONFIG.find(obj => obj.admin0pcode === "ALL");

    let notify = config.isDisabled ? false : true;

    // clusters that should be disabled for notification ['health']
    if (config.disabled && Array.isArray(config.disabled) && config.disabled.length && config.disabled.includes(cluster_id)) {
      notify = false;
    }
    // clusters that should be enabled for notification  ['health']
    if (config.enabled && Array.isArray(config.enabled) && config.enabled.length && !config.enabled.includes(cluster_id)) {
      notify = false;
    }

    let day = moment().date();

    return {
      soon: config.soon.includes(day),
      pending: config.pending.includes(day),
      today: config.today.includes(day),
      reporting_due_date: config.reporting_due_date,
      notify: notify
    }
  },

  shouldNotify: function( admin0pcode, cluster_id ) {

    let config = REPORTING_DUE_DATE_NOTIFICATIONS_CONFIG.find(obj => obj.admin0pcode === admin0pcode);
    if (!config) config = REPORTING_DUE_DATE_NOTIFICATIONS_CONFIG.find(obj => obj.admin0pcode === "ALL");

    let notify = config.isDisabled ? false : true;

    // if array of clusters that should be disabled ['health']
    if (config.disabled && Array.isArray(config.disabled) && config.disabled.length && config.disabled.includes(cluster_id)) {
      notify = false;
    }
    // if array of clusters that should be enabled ['health']
    if (config.enabled && Array.isArray(config.enabled) && config.enabled.length && !config.enabled.includes(cluster_id)) {
      notify = false;
    }

    console.log('here2',notify, admin0pcode, cluster_id)
    return notify;
  },

};
