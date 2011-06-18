function SplashAssistant () { }

SplashAssistant.prototype = {

  setup: function () {
    this.controller.setupWidget(Mojo.Menu.appMenu, { omitDefaultItems: true }, Yammer.appMenu);
    this.controller.get('version').innerHTML = "Version " + Mojo.appInfo.version;

    var init = Yammer.initialize((function () {
      Yammer.ServiceRequest.request('palm://com.palm.connectionmanager', {
        method: 'getstatus',
        parameters: { },
        onSuccess: (function (internet) {
          if (internet.isInternetConnectionAvailable === true) {
            
            if (Yammer.prefs.access_token === false || Yammer.prefs.token_secret === false) {
              Mojo.Controller.stageController.swapScene('oauth');
            } else {
              Mojo.Controller.stageController.swapScene('messages');
            }

          } else {
            Mojo.Controller.stageController.swapScene({ name: "network" });
          }
        }).bind(this)
      });
    }).bind(this));

  }

};
