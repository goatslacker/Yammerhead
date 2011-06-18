var Yammer = {

  // Menu
  appMenu: {
    visible: true,
    items: [
      Mojo.Menu.editItem,
      { label: "Preferences", command: 'prefs' },
      { label: "About", command: 'about' }
    ]
  },

  urls: {
    requestTokenUrl: "https://www.yammer.com/oauth/request_token",
    authorizeUrl: "https://m.yammer.com/oauth/authorize?oauth_token=#{token}&oauth_consumer=#{key}",
    accessTokenUrl: "https://www.yammer.com/oauth/access_token?callback_token=#{verifier}",
    messages: "https://www.yammer.com/api/v1/messages.json",
    thread: "https://www.yammer.com/api/v1/messages/in_thread/#{id}.json",
    like: "https://www.yammer.com/api/v1/messages/liked_by/#{user_id}.json"
  },

  // Methods
  Metrix: false,
  AjaxRequest: false,
  ServiceRequest: false,
  Database: false,

  // Attributes
  $cache: {
    last_request: false,
    ttl_request: 0,
    posts: [],
    threads: [],
    users: {}
  },

  // Preferences
  prefs: {
    mainView: 1,
    access_token: false,
    token_secret: false,
    loadCt: 25,
    threadCt: 25,
    refreshTimer: false
  },

  initialize: function (callback) {
    this.Metrix = this.Metrix || new Metrix();
    this.AjaxRequest = this.AjaxRequest || new AjaxRequestWrapper();
    this.ServiceRequest = this.ServiceRequest || new ServiceRequestWrapper();

    // load the database
    if (!this.Database) {

      // open db
      this.Database = new Mojo.Depot({
        name: "yammalicious"
      }, (function () {

        // load preferences
        this.Database.get('prefs', (function (data) {

          // default attributes
          data = Turbo.defaults(data, {
            mainView: this.prefs.mainView,
            access_token: this.prefs.access_token,
            token_secret: this.prefs.token_secret,
            loadCt: this.prefs.loadCt,
            threadCt: this.prefs.threadCt,
            refreshTimer: this.prefs.refreshTimer
          });

          this.prefs = data;

          // load cached data
          this.Database.get('yammer', (function (data) {

            // default attributes
            data = Turbo.defaults(data, {
              posts: this.$cache.posts,
              threads: this.$cache.threads,
              users: this.$cache.users,
              last_request: this.$cache.last_request
            });

            this.$cache = data;

            // successfully callback
            if (callback) {
              callback();
            }

          }).bind(this), (function () {
            // error loading cached data, just callback
            if (callback) {
              callback();
            }
          }).bind(this));

        }).bind(this), function () { Mojo.Log.error('There was an error loading the preferences'); });

      }).bind(this), function () { Mojo.Log.error('There was an error setting up the database'); });
    } else {
      // database is already loaded, just callback
      if (callback) {
        callback();
      }
    }
  },

  likeHandler: function (message_id, method, callback) {
    var url = this.urls.like.interpolate({ user_id: 'current' }),
      authHeader = this.signRequest(url, this.prefs.access_token, this.prefs.token_secret, null);

    new Ajax.Request(url, {
      method: method,
      encoding: 'UTF-8',
      requestHeaders: ['Authorization', authHeader],
      parameters: {
        message_id: message_id
      },
      onComplete: (function (response) {
        // TODO response...
        Mojo.Log.error(response.responseText);
      }).bind(this)
    });
  },

  unlikeMessage: function (message_id, callback) {
    callback = callback || null;
    this.likeHandler(message_id, 'DELETE', callback);
  },

  likeMessage: function (message_id, callback) {
    callback = callback || null;
    this.likeHandler(message_id, 'POST', callback);
  },

  postMessage: function (text, reply_to, onSuccess, onFailure) {
    if (text) {
      var authHeader = this.signRequest(this.urls.messages, this.prefs.access_token, this.prefs.token_secret, null), parameters = {};

      parameters.body = text;

      if (reply_to) {
        parameters.replied_to_id = reply_to;
      }

      new Ajax.Request(this.urls.messages, {
        method: 'POST',
        encoding: 'UTF-8',
        requestHeaders: ['Authorization', authHeader],
        parameters: parameters,
        onComplete: onSuccess,
        onFailure: onFailure
      });
    }
  },

  getThread: function (message_id, callback) {
    new Ajax.Request(this.urls.thread.interpolate({ id: message_id }), {
      method: 'GET',
      onComplete: this.parseMessages.bind(this, callback, false)
    });
  },

  getMessages: function (callback) {

    if (Date.now() < (this.$cache.ttl_request + 60000)) {
      callback([]);
    } else {

      var parameters = { };
      parameters.threaded = true;

      if (this.$cache.last_request) {
        parameters.newer_than = this.$cache.last_request;
      }

      new Ajax.Request(this.urls.messages, {
        method: 'GET',
        parameters: parameters,
        onComplete: this.parseMessages.bind(this, callback, true)
      });

      this.$cache.ttl_request = Date.now();
    }

  },

  parseMessages: function (callback, use_cache, response) {
    var json = response.responseText.evalJSON(true), 
      i = 0,
      j = 0,
      $messages = {}, 
      $users = {}, 
      $posts = [];

    // fill in the previous request
    if (json.messages.length > 0) {
      this.$cache.last_request = json.messages[i].id;

      // load messages into temp messages object

      for (i = 0; i < json.messages.length; i = i + 1) {

        // loop through cache and remove this entry if it already exists
        for (j = 0; j < this.$cache.posts.length; j = j + 1) {
          if (this.$cache.posts[j].message.id === json.messages[i].id) {
            this.$cache.posts.splice(j, 1);
            break;
          }
        }

        $messages[json.messages[i].id] = json.messages[i];
      }

      // load the references
      for (i = 0; i < json.references.length; i = i + 1) {
        switch (json.references[i].type) {
        // if it's a user, put it in the Yammer users object
        case 'user':
          this.$cache.users[json.references[i].id] = json.references[i];
          break;
        // if it's a thread, find the thread's message and load it in there
        case 'thread':
          // set the last request...
          if (this.$cache.last_request < json.references[i].stats.latest_reply_id) {
            this.$cache.last_request = json.references[i].stats.latest_reply_id;
          }
          // set the thread object
          $messages[json.references[i].id].thread = json.references[i];
          break;
        }
      }

      // liked messages...
      if (json.meta.liked_message_ids !== undefined) {
        for (i = 0; i < json.meta.liked_message_ids.length; i = i + 1) {
          $messages[json.meta.liked_message_ids[i]].liked = true;
        }
      }

      // loop through messages object and post into a temporary var
      for (i in $messages) {
        if ($messages.hasOwnProperty(i)) {

          if ($messages[i].replied_to_id !== null) {
            $messages[i].className = "reply";
          } else if ($messages[i].thread.stats.updates > 0) {
            $messages[i].thread.stats.updates = ($messages[i].thread.stats.updates - 1);
          }

          $posts.push({
            message: $messages[i],
            user: Yammer.$cache.users[$messages[i].sender_id]
          });
        }
      }

      // show latest messages first
      $posts.reverse();

      // callback
      callback($posts);

      if (use_cache === true) {
        // cache the posts
        this.cache($posts);
      }

    } else {
      // no results
      callback($posts);
    }
  },

  signRequest: function (url, token, secret, verifier) {
    token = token || null;
    secret = secret || null;
    verifier = verifier || null;

    var timestamp = OAuth.timestamp(), nonce = OAuth.nonce(11), message = {};

    message.method = 'POST';
    message.action = url;
    message.parameters = [];

    message.parameters.push(['oauth_consumer_key', this.key]);
    message.parameters.push(['oauth_nonce', nonce]);
    message.parameters.push(['oauth_signature_method', 'PLAINTEXT']);
    message.parameters.push(['oauth_timestamp', timestamp]);
    message.parameters.push(['oauth_version', '1.0']);

    if (token) {
    	message.parameters.push(['oauth_token', token]);
    }
 
    if (verifier) {
      message.parameters.push(['oauth_verifier', verifier]);
    }

    message.parameters.sort();

    OAuth.SignatureMethod.sign(message, {
      consumerSecret: this.secret,
      tokenSecret: secret
    });

    return OAuth.getAuthorizationHeader("", message.parameters);
  },

  cache: function ($posts) {
    $posts = $posts || [];
    this.$cache.posts = $posts.concat(this.$cache.posts);
    this.$cache.posts.slice(0, this.prefs.loadCt);

    // save to DB!
    this.save();
  },

  cacheThread: function (id, thread) {
    thread = thread || {};
    thread.thread_id = id;
    this.$cache.threads.push(thread);
    this.$cache.threads.slice(0, this.prefs.threadCt);

    this.save();
  },

  clearCache: function () {
    this.$cache = {
      last_request: false,
      posts: [],
      threads: [],
      users: {},
    };
    this.saveYammer();
  },

  save: function () {
    this.saveYammer();
    this.savePrefs();
  },

  saveYammer: function () {
    this.Database.add("yammer", this.$cache);
  },

  savePrefs: function () {
    this.Database.add("prefs", this.prefs);
  }

};
