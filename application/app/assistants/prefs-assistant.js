function PrefsAssistant () { }

PrefsAssistant.prototype = {
  models: {
    viewSelector: {
      value: Yammer.prefs.mainView,
      disabled: false,
      choices: [
        { label: "Thread", value: 1 },
        { label: "All", value: 2 }
      ]
    },
    msgCt: {
      value: Yammer.prefs.loadCt,
      disabled: false,
      choices: [
        { label: "25", value: "25" },
        { label: "50", value: "50" },
        { label: "75", value: "75" },
        { label: "100", value: "100" }
      ]
    },
    threadCt: {
      value: Yammer.prefs.threadCt,
      disabled: false,
      choices: [
        { label: "25", value: "25" },
        { label: "50", value: "50" }
      ]
    },
    clearCache: {
      label: "Clear Cache",
      disabled: false
    }
  },

  handlers: { },

  setup: function () {

    this.controller.setupWidget('viewSelector', {
      labelPlacement: Mojo.Widget.labelPlacementRight,
      label: "Main View"
    }, this.models.viewSelector);

    this.controller.setupWidget('msgctSelector', {
      labelPlacement: Mojo.Widget.labelPlacementRight,
      label: "Message Ct"
    }, this.models.msgCt);

    this.controller.setupWidget('threadctSelector', {
      labelPlacement: Mojo.Widget.labelPlacementRight,
      label: "Thread Count"
    }, this.models.threadCt);

    this.controller.setupWidget("clearCache", {
    }, this.models.clearCache);

    // handlers
    this.handlers = {
      deactivate: this.deactivateWindow.bind(this),
      clearCache: this.clearCacheEvent.bind(this),
      view: this.viewSelectorEvent.bind(this),
      threadct: this.threadctEvent.bind(this),
      msgct: this.msgctEvent.bind(this)
    };

    // listeners
    Mojo.Event.listen(this.controller.get("clearCache"), Mojo.Event.tap, this.handlers.clearCache);
    Mojo.Event.listen(this.controller.get("viewSelector"), Mojo.Event.propertyChange, this.handlers.view);
    Mojo.Event.listen(this.controller.get("threadctSelector"), Mojo.Event.propertyChange, this.handlers.threadct);
    Mojo.Event.listen(this.controller.get("msgctSelector"), Mojo.Event.propertyChange, this.handlers.msgct);
    Mojo.Event.listen(this.controller.stageController.document, Mojo.Event.stageDeactivate, this.handlers.deactivate);
  },
  
  cleanup: function (event) {
    Yammer.savePrefs();
  },

  deactivateWindow: function (event) {
    Yammer.savePrefs();
  },

  msgctEvent: function (event) {
    Yammer.prefs.loadCt = event.value;
  },

  threadctEvent: function (event) {
    Yammer.prefs.threadCt = event.value;
  },

  viewSelectorEvent: function (event) {
    Yammer.prefs.mainView = event.value;
  },

  clearCacheEvent: function () {
    this.controller.showAlertDialog({
      onChoose: (function (value) {
        if (value) {
          Yammer.clearCache();
        }
      }).bind(this),
      title: "Clear Cache",
      message: "This will clear your cached posts and threads. Are you sure?",
      choices: [
        { label: "Yes, I'm Sure", value: true, type: 'negative' },
        { label: "Nevermind", value: false, type: 'dismiss' }
      ]
    });
  }
};
