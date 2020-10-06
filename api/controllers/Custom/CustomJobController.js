/**
 * CustomJobController
 *
 * @description :: Custom Job Controller
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

var moment = require( 'moment' );

var QUARTZ_REGEX = /^\s*($|#|\w+\s*=|(\?|\*|(?:[0-5]?\d)(?:(?:-|\/|\,)(?:[0-5]?\d))?(?:,(?:[0-5]?\d)(?:(?:-|\/|\,)(?:[0-5]?\d))?)*)\s+(\?|\*|(?:[0-5]?\d)(?:(?:-|\/|\,)(?:[0-5]?\d))?(?:,(?:[0-5]?\d)(?:(?:-|\/|\,)(?:[0-5]?\d))?)*)\s+(\?|\*|(?:[01]?\d|2[0-3])(?:(?:-|\/|\,)(?:[01]?\d|2[0-3]))?(?:,(?:[01]?\d|2[0-3])(?:(?:-|\/|\,)(?:[01]?\d|2[0-3]))?)*)\s+(\?|\*|(?:0?[1-9]|[12]\d|3[01])(?:(?:-|\/|\,)(?:0?[1-9]|[12]\d|3[01]))?(?:,(?:0?[1-9]|[12]\d|3[01])(?:(?:-|\/|\,)(?:0?[1-9]|[12]\d|3[01]))?)*)\s+(\?|\*|(?:[1-9]|1[012])(?:(?:-|\/|\,)(?:[1-9]|1[012]))?(?:L|W)?(?:,(?:[1-9]|1[012])(?:(?:-|\/|\,)(?:[1-9]|1[012]))?(?:L|W)?)*|\?|\*|(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)(?:(?:-)(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC))?(?:,(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)(?:(?:-)(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC))?)*)\s+(\?|\*|(?:[1-7]|MON|TUE|WED|THU|FRI|SAT|SUN)(?:(?:-|\/|\,|#)(?:[1-5]))?(?:L)?(?:,(?:[1-7]|MON|TUE|WED|THU|FRI|SAT|SUN)(?:(?:-|\/|\,|#)(?:[1-5]))?(?:L)?)*|\?|\*|(?:MON|TUE|WED|THU|FRI|SAT|SUN)(?:(?:-)(?:MON|TUE|WED|THU|FRI|SAT|SUN))?(?:,(?:MON|TUE|WED|THU|FRI|SAT|SUN)(?:(?:-)(?:MON|TUE|WED|THU|FRI|SAT|SUN))?)*)(|\s)+(\?|\*|(?:|\d{4})(?:(?:-|\/|\,)(?:|\d{4}))?(?:,(?:|\d{4})(?:(?:-|\/|\,)(?:|\d{4}))?)*))$/;


module.exports = {

  // required
  job: async function (job) {
    try {
      var data = JSON.parse(JSON.stringify(job.attrs.data));

      this.getIndicatorReport(data, function (err, result) {
        // TODO handle any indicator result error
        console.log('JOB', data.name, 'error:', err);
        console.log('JOB', data.name, 'result:', result);
      });
    } catch (err) {
      console.log(err);
    }
  },

  saveJob: async function (req, res) {

    var data = req.param('data');

    var verified = this.checkJobParams(data);
    if (verified.error) {
      return res.json(400, { error: verified.message })
    }

    var params = this.getJobParams(data);

    if (!data.name) data.name = params.name;

    // TODO remove line
    console.log('params: ', params);

    var jobDefinition = await CustomJobDefinition.updateOrCreate({ name: params.name }, params.data);

    sails.agenda.define(params.name, job => this.job(job));

    if (params.schedule_type === 'every') {
      var schedule;
      if (params.schedule) {
        schedule = params.schedule
      } else {
        schedule = this.formatCron(params);
      }

      // TODO remove line
      console.log('cron schedule: ', schedule);

      if (!this.isValidCronExpression('quartz', schedule)) {
        return res.json(400, { error: 'incorrect cron format' })
      }

      var job = await sails.agenda.every(schedule, params.name, params.data, { timezone: params.timezone });
    } else {
      // once
      var job = await sails.agenda.schedule(params.schedule_datetime, params.name, params.data, { timezone: params.timezone });
    }

    return res.json(200, job);

  },

  isValidCronExpression: function (cronFormat, expression) {
    if (!expression) {
      return false;
    }
    const formattedExpression = expression.toUpperCase();
    switch (cronFormat) {
        case 'quartz':
            return !!formattedExpression.match(QUARTZ_REGEX);
        default:
            return false;
    }
  },

  getJobParams: function(params){

    if (!params.name) params.name = params.reporting_type_id + '_' + moment().utc().format('YYYY-MM-DDTHH:mm:ss.SSS[Z]');

    return {
      reporting_type_id: params.reporting_type_id,
      filter: params.filter,

      name: params.name,

      schedule: params.schedule,
      schedule_period: params.schedule_period,
      schedule_type: params.schedule_type,
      schedule_shift_period: params.schedule_shift_period || 1,
      schedule_shift_days: params.schedule_shift_days || 1,
      schedule_datetime: params.schedule_datetime,
      schedule_time: params.schedule_time,

      report_start_date_type: params.report_start_date_type,
      report_start_date_shift_period: params.report_start_date_shift_period || -1,
      report_start_date_shift_days: params.report_start_date_shift_days || 0,
      report_end_date_type: params.report_end_date_type,
      report_end_date_shift_period: params.report_end_date_shift_period || -1,
      report_end_date_shift_days: params.report_end_date_shift_days || 0,
      report_start_date: params.start_date,
      report_end_date: params.end_date,

      data: params,

      timezone: params.timezone || 'Europe/Berlin',
    }
  },

  checkJobParams: function(params){
    var ONCE = 'once';
    var EVERY = 'every';
    var CUSTOM = 'custom';
    var schedule_periods = ['day','week','month','quarter','year', 'custom'];
    var report_date_types = ['day','week','month','quarter','year', 'custom'];
    // ADD schedule_report_type
    var schedule_report_types = ['beneficiaries'];

    if (!params){
      return { error: true, message: "data required!", params: params }
    }
    if (!params.reporting_type_id){
      return { error: true, message: "reporting_type_id required!", params: params }
    }

    // if (!params.name){
    //   return { error: true, message: "name required!", params: params }
    // }
    if (!params.schedule_type || ![EVERY,ONCE].includes(params.schedule_type)){
      return { error: true, message: "every or once schedule_type required!", params: params }
    }
    // if (params.schedule_type===EVERY && !params.schedule_shift_period || !params.schedule_shift_days){
    //   return { error: true, message: "schedule_shift_period, schedule_shift_daysrequired!", params: params }
    // }
    if (params.schedule_type===ONCE && !params.schedule_datetime){
      return { error: true, message: "schedule_datetime required!", params: params }
    }
    if (!params.schedule_report_type || !schedule_report_types.includes(params.schedule_report_type)){
      return { error: true, message: "valid schedule_report_type required!", params: params }
    }
    if (!params.schedule && (!params.schedule_period || !schedule_periods.includes(params.schedule_period))){
      return { error: true, message: "valid 'day','week','month','quarter','year', 'custom' schedule_periods required!", params: params }
    }
    if (!params.report_start_date_type || !report_date_types.includes(params.report_start_date_type)){
      return { error: true, message: "valid 'day','week','month','quarter','year', 'custom' report_start_date_type required!", params: params }
    }
    if (params.report_start_date_type === CUSTOM && !params.report_start_date) {
      return { error: true, message: "report_start_date required!", params: params }
    }
    if (!params.report_end_date_type || !report_date_types.includes(params.report_end_date_type)){
      return { error: true, message: "valid 'day','week','month','quarter','year', 'custom' report_start_date_type required!", params: params }
    }
    if (params.report_end_date_type ===CUSTOM && !params.report_end_date){
      return { error: true, message: "report_start_date required!", params: params }
    }

    if (!params.filter){
      return { error: true, message: "filter required!", params: params }
    }

    var validFilter = this.checkFilterParams(params.schedule_report_type, params.filter);
    if (validFilter.error){
      validFilter.params = params;
      return validFilter;
    }

    return { error: false, message: "", params: params };
  },

  checkFilterParams: function(schedule_report_type, filter){
    // ADD schedule_report_type
    // matched with indicator getParams
    var beneficiaries = 'beneficiaries';
    if (schedule_report_type === beneficiaries) {
      if (!filter['indicator'] ||
        !filter['cluster_id'] ||
        !filter['adminRpcode'] ||
        !filter['admin0pcode'] ||
        !filter['organization_tag'] ||
        !filter['admin1pcode'] ||
        !filter['admin2pcode'] ||
        !filter['start_date'] ||
        !filter['end_date']) {
        return { error: true, message: "filter indicator, cluster_id, adminRpcode, admin0pcode, organization_tag, admin1pcode, admin2pcode, start_date, end_date required!" };
      }
    }
    return { error: false, message: "" };

  },

  formatCron: function(params){
    var seconds = '0';
    var minutes = '0';
    var hours = '12';
    var days = '*';
    var months = '*';
    var dayOfWeek = '*';
    var years = '*';
    if (params.schedule_time) {
      hours = moment('2020-01-01 ' + params.schedule_time).hour();
      minutes = moment('2020-01-01 ' + params.schedule_time).minute();
    }
    if (params.schedule_period === 'month') {
      months = '1/' + params.schedule_shift_period;
      days = params.schedule_shift_days;
    } else if (params.schedule_period === 'day') {
      days = params.schedule_shift_days + '/' + params.schedule_shift_period;
    } else if (params.schedule_period === 'week') {
      dayOfWeek = params.schedule_shift_days + (schedule_shift_period > 1 ? '#' + params.schedule_shift_period : '');
    } else if (params.schedule_period === 'quarter') {
      days = params.schedule_shift_days;
      months = '1/' + 3 * params.schedule_shift_period;
    } else if (params.schedule_period === 'year') {
      years = '1/' + params.schedule_shift_period;
      days = params.schedule_shift_days;
      months = 1;
    }
    var cron_quartz = `${seconds} ${minutes} ${hours} ${days} ${months} ${dayOfWeek}`;
    return cron_quartz;

  },

  getIndicatorFilter: function(params){
    var CUSTOM = 'custom';
    var filter = params.filter;
    if (params.report_start_date_type !== CUSTOM) {
      filter.start_date = moment().startOf(params.report_start_date_type).add(params.report_start_date_shift_period, params.report_start_date_type).add(params.report_start_date_shift_days, 'days').format('YYYY-MM-DD');
    } else {
      filter.start_date = params.report_start_date;
    }
    if (params.report_start_date_type !== CUSTOM) {
      filter.end_date = moment().endOf(params.report_end_date_type).add(params.report_end_date_shift_period, params.report_end_date_type).add(params.report_start_date_shift_days, 'days').format('YYYY-MM-DD');
    } else {
      filter.end_date = params.report_end_date;
    }

    if (filter.report) filter.report = `${filter.report}-${filter.start_date}-to-${filter.end_date}-extracted-${moment().format('YYYY-MM-DD')}`;
    return filter
  },

  getIndicatorUrl: function(schedule_report_type){
    // ADD schedule_report_type
    var types = {
      beneficiaries: 'http://localhost/api/custom/indicator',
      default: 'http://localhost/api/custom/indicator'
    }

    return types[schedule_report_type] || types['default']

  },

  getIndicatorReport: async function(data, cb){

    var params = this.getJobParams(data);

    var filter = this.getIndicatorFilter(params);

    // TODO remove line
    console.log('job filter: ', filter)

    var url = this.getIndicatorUrl(data.schedule_report_type);
      // req.body = job.attrs.data;
      // sails.controllers['custom/dashboards/customdashboard'].getIndicator(req, res);
      request = require( 'request' );

      // options
			var options = {
			  method: 'post',
			  body: filter,
			  json: true,
			  url: url,
			  headers: {
			    'Authorization': sails.config.agenda.RH_API_KEY
			  }
      }

      // request
			request( options, function ( err, response, body ) {
        if (err) return cb(err);
        return cb(null, body)
      });
  },

  getJobs: async function(req, res){

    var filter = {};
    if (req.param('admin0pcode')) filter['data.admin0pcode'] = req.param('admin0pcode');
    if (req.param('organization_tag')) filter['data.organization_tag'] = req.param('organization_tag');
    if (req.param('cluster_id')) filter['data.cluster_id'] = req.param('cluster_id');
    if (req.param('reporting_type_id')) filter['data.reporting_type_id'] = req.param('reporting_type_id');

    var jobs = await CustomJob.find(filter);

    return res.json(200, { jobs: jobs });

  },

  deleteJob: async function(req, res){

    var name = req.param('name');
    var job = await sails.agenda.cancel({name: name});
    var jobDefinition = await CustomJobDefinition.destroy({name: name});

    return res.json(200, { job: job })

  },

};

