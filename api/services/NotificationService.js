var REPORTING_DUE_DATE_NOTIFICATIONS_CONFIG = sails.config.REPORTING_DUE_DATE_NOTIFICATIONS_CONFIG;
var BIWEEKLY_REPORTING_DUE_DATE_NOTIFICATIONS_CONFIG = sails.config.BIWEEKLY_REPORTING_DUE_DATE_NOTIFICATIONS_CONFIG;
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

  getConfigBiWeekly: function (admin0pcode, cluster_id, period) {

    let config = BIWEEKLY_REPORTING_DUE_DATE_NOTIFICATIONS_CONFIG.find(obj => obj.admin0pcode === admin0pcode);
    if (!config) config = BIWEEKLY_REPORTING_DUE_DATE_NOTIFICATIONS_CONFIG.find(obj => obj.admin0pcode === "ALL");

    let notify = config.isDisabled ? false : true;

    // clusters that should be disabled for notification ['health']
    if (config[period].disabled && Array.isArray(config[period].disabled) && config[period].disabled.length && config[period].disabled.includes(cluster_id)) {
      notify = false;
    }
    // clusters that should be enabled for notification  ['health']
    if (config[period].enabled && Array.isArray(config[period].enabled) && config[period].enabled.length && !config[period].enabled.includes(cluster_id)) {
      notify = false;
    }

    let day = moment().date();

    return {
      soon: config[period].soon.includes(day),
      pending: config[period].pending.includes(day),
      today: config[period].today.includes(day),
      reporting_due_date: config[period].reporting_due_date,
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
  shouldNotifyBiweekly: function (admin0pcode, cluster_id) {

    let config = BIWEEKLY_REPORTING_DUE_DATE_NOTIFICATIONS_CONFIG.find(obj => obj.admin0pcode === admin0pcode);
    if (!config) config = BIWEEKLY_REPORTING_DUE_DATE_NOTIFICATIONS_CONFIG.find(obj => obj.admin0pcode === "ALL");

    let notify = config.isDisabled ? false : true;

    // if array of clusters that should be disabled ['health']
    if (config.disabled && Array.isArray(config.disabled) && config.disabled.length && config.disabled.includes(cluster_id)) {
      notify = false;
    }
    // if array of clusters that should be enabled ['health']
    if (config.enabled && Array.isArray(config.enabled) && config.enabled.length && !config.enabled.includes(cluster_id)) {
      notify = false;
    }

    console.log('here2', notify, admin0pcode, cluster_id)
    return notify;
  },

};
