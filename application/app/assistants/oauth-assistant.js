function OauthAssistant () {
  this.token = null;
  this.tokenSecret = null;
}

OauthAssistant.prototype = {
  models: {
    spinner: { spinning: false },
    btnLogin: {
      label: "Log In",
      buttonClass: "affirmative",
      disabled: false
    },
    btnAuth: {
      label: "Start Yammering",
      buttonClass: "affirmative",
      disabled: false
    },
    callbackToken: {
      value: "",
      disabled: false
    }
  },

  setup: function () {
    this.controller.setupWidget('mojoSpinner', { spinnerSize: 'large' }, this.models.spinner);
    this.controller.get('spinnerScrim').hide();

    // login
    this.controller.setupWidget("loginId", { }, this.models.btnLogin);

    // authorize
    this.controller.setupWidget("authorizeId", { }, this.models.btnAuth);

    // text field
    this.controller.setupWidget("callbackTokenId", {
      hintText: "Enter PIN",
      multiline: false,
      enterSubmits: false,
      focus: true
    }, this.models.callbackToken); 

    // check if there is an access token already available
    if (Yammer.prefs.access_token !== false) {
      this.messages();
    }

    this.requestTokenHandler = this.requestToken.bind(this);
    Mojo.Event.listen(this.controller.get("loginId"), Mojo.Event.tap, this.requestTokenHandler);

    this.exchangeTokenHandler = this.exchangeToken.bind(this);
    Mojo.Event.listen(this.controller.get("authorizeId"), Mojo.Event.tap, this.exchangeTokenHandler);
  },

  cleanup: function (event) {
    Mojo.Event.stopListening(this.controller.get("loginId"), Mojo.Event.tap, this.requestTokenHandler);
    Mojo.Event.stopListening(this.controller.get("authorizeId"), Mojo.Event.tap, this.exchangeTokenHandler);
  },

  requestToken: function () {
    this.spinnerSwitch(true);

    var url = Yammer.urls.requestTokenUrl, authHeader = Yammer.signRequest(url, null, null, null);

    new Ajax.Request(url, {
      method: "POST",
      encoding: "UTF-8",
      requestHeaders: ['Authorization', authHeader],
      onFailure: (function (response) {
        this.spinnerSwitch(false);

        Mojo.Controller.getAppController().showBanner("Error asking for auth. Yammer service may be down", { source : 'error' }); 
      }).bind(this),
      onSuccess: (function (response) {

        var $response = response.responseText.split("&"), i = 0, key, value, pair, oauth_token = false, oauth_token_secret = false, auth_url;

        for (i = 0; i < $response.length; i = i + 1) {
          pair = $response[i].split("=");
          key = pair[0];
          value = pair[1];
  
          switch (key) {
          case "oauth_token":
            oauth_token = value;
            break;
          case "oauth_token_secret":
            oauth_token_secret = value;
            break;
          }
        }

        auth_url = Yammer.urls.authorizeUrl.interpolate({ token: oauth_token, key: Yammer.key });

        this.token = oauth_token;
        this.tokenSecret = oauth_token_secret;

        // open the web browser
        this.controller.serviceRequest("palm://com.palm.applicationManager", {
          method: "open",
          parameters:  {
            id: 'com.palm.app.browser',
            params: {
              target: auth_url
            }
          }
        });

        this.spinnerSwitch(false);

        // hide the login and show the authorize
        this.controller.get('login').style.display = 'none';
        this.controller.get('authorize').style.display = 'block';

      }).bind(this)
    });
  },
  
  exchangeToken: function () {
    this.spinnerSwitch(true);

    var verifier = this.controller.get('callbackTokenId').mojo.getValue().toUpperCase(), 
      url = Yammer.urls.accessTokenUrl.interpolate({ verifier: verifier }), 
      authHeader = Yammer.signRequest(url, this.token, this.tokenSecret, verifier);

    new Ajax.Request(url, {
      method: "POST",
      encoding: 'UTF-8',
      requestHeaders: ['Authorization', authHeader],
      onFailure: (function (response) {
        this.spinnerSwitch(false);

        Mojo.Controller.getAppController().showBanner("Error verifying your PIN. Please try again", { source : 'error' }); 
      }).bind(this),
      onSuccess: (function (response) {

        var $response = response.responseText.split("&"), i = 0, key, value, pair, oauth_token, oauth_token_secret;

        for (i = 0; i < $response.length; i = i + 1) {
          pair = $response[i].split("=");
          key = pair[0];
          value = pair[1];
  
          switch (key) {
          case "oauth_token":
            oauth_token = value;
            break;
          case "oauth_token_secret":
            oauth_token_secret = value;
            break;
          }
        }

        // save onto db
        Yammer.prefs.access_token = oauth_token;
        Yammer.prefs.token_secret = oauth_token_secret;
        Yammer.savePrefs();

        this.spinnerSwitch(false);

        // push first scene
        Mojo.Controller.stageController.pushScene('messages');

      }).bind(this)
    });
  },

  spinnerSwitch: function (io) {
    if (io) {
      this.controller.get('spinnerScrim').show();
    } else {
      this.controller.get('spinnerScrim').hide();
    }

    this.models.spinner.spinning = io;
    this.controller.modelChanged(this.models.spinner);
  }
};
