// config/notifications.js
const REPORTING_DUE_DATE_NOTIFICATIONS_CONFIG = [
  {
    admin0pcode: "AF",
    soon: [8],
    pending: [12],
    today: [10],
    reporting_due_date: 10
  }, {
    admin0pcode: "CB",
    soon: [8],
    pending: [12],
    today: [10],
    reporting_due_date: 10,
    disabled: ['health']
  }, {
    admin0pcode: "ET",
    soon: [5],
    pending: [10],
    today: [7],
    reporting_due_date: 7
  }, {
    admin0pcode: "ALL",
    soon: [8],
    pending: [12],
    today: [10],
    reporting_due_date: 10
  }
]

module.exports.REPORTING_DUE_DATE_NOTIFICATIONS_CONFIG = REPORTING_DUE_DATE_NOTIFICATIONS_CONFIG;

const BIWEEKLY_REPORTING_DUE_DATE_NOTIFICATIONS_CONFIG = [
  {
    admin0pcode: "AF",
    first:{
      soon: [8],
      pending: [15],
      today: [10],
      reporting_due_date: 10
    },
    second: {
      soon: [23],
      pending: [22],
      today: [27],
      reporting_due_date: 27
    }
  },{
    admin0pcode: "ALL",
    first: {
      soon: [8],
      pending: [15],
      today: [10],
      reporting_due_date: 10
    },
    second: {
      soon: [23],
      pending: [22],
      today: [27],
      reporting_due_date: 27
    }
  }
]

module.exports.BIWEEKLY_REPORTING_DUE_DATE_NOTIFICATIONS_CONFIG = BIWEEKLY_REPORTING_DUE_DATE_NOTIFICATIONS_CONFIG;
