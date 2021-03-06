var _ = require('src/common');
_.initOptions();
var Menu = require('./views/menu');
var Commands = require('./views/command');
var Domains = require('./views/domain');
var utils = require('./utils');

var app = new Vue({
  el: '#app',
  template: '<component :is=type></component>',
  components: {
    Menu: Menu,
    Commands: Commands,
    Domains: Domains,
  },
  data: {
    type: 'Menu',
  },
  methods: {
    navigate: function (type) {
      this.type = type || 'Menu';
    },
  },
});

exports.navigate = app.navigate.bind(app);

!function () {
  function init() {
    var currentTab = utils.store.currentTab;
    chrome.tabs.sendMessage(currentTab.id, {cmd: 'GetPopup'});
    if (currentTab && /^https?:\/\//i.test(currentTab.url)) {
      var matches = currentTab.url.match(/:\/\/(?:www\.)?([^\/]*)/);
      var domain = matches[1];
      var domains = domain.split('.').reduceRight(function (res, part) {
        var last = res[0];
        if (last) part += '.' + last;
        res.unshift(part);
        return res;
      }, []);
      domains.length > 1 && domains.pop();
      utils.store.domains = domains;
    }
  }

  var commands = {
    SetPopup: function (data, src, _callback) {
      if (utils.store.currentTab.id !== src.tab.id) return;
      utils.store.commands = data.menus;
      _.sendMessage({
        cmd: 'GetMetas',
        data: data.ids,
      }).then(function (scripts) {
        utils.store.scripts = scripts;
      });
    },
    UpdateOptions: function (data) {
      _.options.update(data);
    },
  };
  chrome.runtime.onMessage.addListener(function (req, src, callback) {
    var func = commands[req.cmd];
    if (func) func(req.data, src, callback);
  });

  chrome.tabs.query({currentWindow: true, active: true}, function (tabs) {
    utils.store.currentTab = {
      id: tabs[0].id,
      url: tabs[0].url,
    };
    init();
  });
}();
