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
    admin0pcode: "SO",
    soon: [3],
    pending: [7],
    today: [5],
    reporting_due_date: 5
  },{
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
    // first:{
    //   soon: [8],
    //   pending: [15],
    //   today: [10],
    //   reporting_due_date: 10
    // },
    // second: {
    //   soon: [23],
    //   pending: [28],
    //   today: [27],
    //   reporting_due_date: 27
    // }
    first: {
      soon: [16],
      pending: [20],
      today: [19],
      reporting_due_date: 19
    },
    second: {
      soon: [1],
      pending: [5],
      today: [4],
      reporting_due_date: 4
    }
  },{
    admin0pcode: "ALL",
    // first: {
    //   soon: [8],
    //   pending: [15],
    //   today: [10],
    //   reporting_due_date: 10
    // },
    // second: {
    //   soon: [23],
    //   pending: [28],
    //   today: [27],
    //   reporting_due_date: 27
    // }
    first: {
      soon: [16],
      pending: [20],
      today: [19],
      reporting_due_date: 19
    },
    second: {
      soon: [1],
      pending: [5],
      today: [4],
      reporting_due_date: 4
    }
  }
]

module.exports.BIWEEKLY_REPORTING_DUE_DATE_NOTIFICATIONS_CONFIG = BIWEEKLY_REPORTING_DUE_DATE_NOTIFICATIONS_CONFIG;
